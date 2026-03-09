import json
import re
from datetime import date
from decimal import Decimal, InvalidOperation
from typing import Optional

from google.cloud import vision
from google.oauth2 import service_account

from ..config import get_settings

settings = get_settings()

# Regular expression patterns for parsing slip text
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

_AMOUNT_RE = re.compile(
    r"(?:THB|฿|บาท)?\s*([0-9]{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*(?:THB|฿|บาท)?",
    re.IGNORECASE,
)


def _get_vision_client() -> vision.ImageAnnotatorClient:
    creds_json = settings.google_application_credentials_json
    if creds_json:
        creds_dict = json.loads(creds_json)
        credentials = service_account.Credentials.from_service_account_info(creds_dict)
        return vision.ImageAnnotatorClient(credentials=credentials)
    # Falls back to GOOGLE_APPLICATION_CREDENTIALS env var / ADC
    return vision.ImageAnnotatorClient()


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


def extract_from_image(image_bytes: bytes) -> dict:
    """
    Call Google Vision text_detection on a slip image.
    Returns a dict with keys: date, amount, raw_text, source.
    Raises RuntimeError if the Vision API returns an error.
    """
    client = _get_vision_client()
    image = vision.Image(content=image_bytes)
    response = client.text_detection(image=image)

    if response.error.message:
        raise RuntimeError(f"Vision API error: {response.error.message}")

    full_text = (
        response.full_text_annotation.text
        if response.full_text_annotation
        else ""
    )

    return {
        "date": _parse_date(full_text),
        "amount": _parse_amount(full_text),
        # Truncate raw text so the response stays small
        "raw_text": full_text[:500],
        "source": "slip",
    }
