import base64
import re
from datetime import date, time as dt_time
from decimal import Decimal, InvalidOperation
from typing import Any, Optional

import requests

from ..config import get_settings

settings = get_settings()

VISION_URL = "https://vision.googleapis.com/v1/images:annotate"
# ── Date / Amount / Time regex patterns ─────────────────────────────────────────────────────
_DATE_PATTERNS = [
    # DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
    re.compile(r"(\d{1,2})[/\-\.](\d{1,2})[/\-\.](\d{2,4})"),
    # YYYY/MM/DD
    re.compile(r"(\d{4})[/\-\.](\d{1,2})[/\-\.](\d{1,2})"),
]

_THAI_MONTHS: dict[str, int] = {
    "ม.ค.": 1, "ก.พ.": 2, "มี.ค.": 3, "เม.ย.": 4,
    "พ.ค.": 5, "มิ.ย.": 6, "ก.ค.": 7, "ส.ค.": 8,
    "ก.ย.": 9, "ต.ค.": 10, "พ.ย.": 11, "ธ.ค.": 12,
    "มกราคม": 1, "กุมภาพันธ์": 2, "มีนาคม": 3, "เมษายน": 4,
    "พฤษภาคม": 5, "มิถุนายน": 6, "กรกฎาคม": 7, "สิงหาคม": 8,
    "กันยายน": 9, "ตุลาคม": 10, "พฤศจิกายน": 11, "ธันวาคม": 12,
}

_TIME_RE = re.compile(r"\b([01]?\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?\b")

_AMOUNT_RE = re.compile(
    r"(?:THB|฿|บาท)?\s*([0-9]{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*(?:THB|฿|บาท)?",
    re.IGNORECASE,
)


def _parse_time(text: str) -> Optional[dt_time]:
    m = _TIME_RE.search(text)
    if not m:
        return None
    try:
        return dt_time(int(m.group(1)), int(m.group(2)))
    except ValueError:
        return None


def _parse_date(text: str) -> Optional[date]:
    for pattern in _DATE_PATTERNS:
        m = pattern.search(text)
        if m:
            g = m.groups()
            try:
                if len(g[0]) == 4:
                    y, mo, d = int(g[0]), int(g[1]), int(g[2])
                else:
                    d, mo, y = int(g[0]), int(g[1]), int(g[2])
                    if y < 100:
                        y += 2000
                # Convert Buddhist Era to CE
                if y > 2400:
                    y -= 543
                return date(y, mo, d)
            except (ValueError, TypeError):
                continue

    # Thai month-name format, e.g. "9 มี.ค. 68"
    for thai_month, month_num in _THAI_MONTHS.items():
        pat = re.compile(rf"(\d{{1,2}})\s*{re.escape(thai_month)}\s*(\d{{2,4}})")
        m = pat.search(text)
        if m:
            try:
                d, y = int(m.group(1)), int(m.group(2))
                if y < 100:
                    y += 2000
                if y > 2400:
                    y -= 543
                return date(y, month_num, d)
            except (ValueError, TypeError):
                continue
    return None


def _parse_amount(text: str) -> Optional[Decimal]:
    amounts: list[Decimal] = []
    for m in _AMOUNT_RE.finditer(text):
        raw = m.group(1).replace(",", "")
        try:
            amounts.append(Decimal(raw))
        except InvalidOperation:
            continue
    return max(amounts) if amounts else None


def extract_from_image(image_bytes: bytes) -> dict[str, Any]:
    """
    Call Google Vision REST API (TEXT_DETECTION) using an API Key.
    Returns: { date, amount, raw_text, source }
    Raises RuntimeError on API error.
    """
    if not settings.vision_api_key:
        raise RuntimeError("VISION_API_KEY is not set in .env")

    encoded = base64.b64encode(image_bytes).decode("utf-8")
    payload: dict[str, Any] = {
        "requests": [
            {
                "image": {"content": encoded},
                "features": [{"type": "TEXT_DETECTION", "maxResults": 1}],
            }
        ]
    }

    response = requests.post(
        VISION_URL,
        params={"key": settings.vision_api_key},
        json=payload,
        timeout=30,
    )

    if response.status_code != 200:
        raise RuntimeError(
            f"Vision API returned {response.status_code}: {response.text[:200]}"
        )

    resp = response.json().get("responses", [{}])[0]
    if "error" in resp:
        raise RuntimeError(f"Vision API error: {resp['error'].get('message', 'unknown')}")

    annotations = resp.get("textAnnotations", [])
    full_text = annotations[0].get("description", "") if annotations else ""

    return {
        "date": _parse_date(full_text),
        "transaction_time": _parse_time(full_text),
        "amount": _parse_amount(full_text),
        "raw_text": full_text[:500],
        "source": "slip",
    }
