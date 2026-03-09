"""
PDF Statement parser — processes files entirely in RAM (no disk writes).
"""
import io
import re
from datetime import date, time as dt_time
from decimal import Decimal, InvalidOperation
from typing import Any, Optional

import pdfplumber

_DATE_RE = re.compile(r"(\d{1,2})[/\-\.](\d{1,2})[/\-\.](\d{2,4})")
_AMOUNT_RE = re.compile(r"([0-9]{1,3}(?:,\d{3})*(?:\.\d{2}))")
_TIME_RE = re.compile(r"\b([01]?\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?\b")

_CREDIT_RE = re.compile(
    r"โอนเข้า|รับโอน|ฝาก|เงินเข้า|credit|CR\b|deposit", re.IGNORECASE
)
_DEBIT_RE = re.compile(
    r"โอนออก|ถอน|ชำระ|เงินออก|debit|DR\b|withdraw|payment", re.IGNORECASE
)


def _parse_date(text: str) -> Optional[date]:
    m = _DATE_RE.search(text)
    if not m:
        return None
    try:
        d, mo, y = int(m.group(1)), int(m.group(2)), int(m.group(3))
        if y < 100:
            y += 2000
        if y > 2400:
            y -= 543
        return date(y, mo, d)
    except ValueError:
        return None


def _parse_amount(text: str) -> Optional[Decimal]:
    amounts: list[Decimal] = []
    for m in _AMOUNT_RE.finditer(text):
        raw = m.group(1).replace(",", "")
        try:
            val = Decimal(raw)
            if val > 0:
                amounts.append(val)
        except InvalidOperation:
            continue
    return max(amounts) if amounts else None


def _detect_type(row_text: str) -> str:
    if _CREDIT_RE.search(row_text):
        return "income"
    if _DEBIT_RE.search(row_text):
        return "expense"
    return "expense"  # safe default


def _parse_time(text: str) -> Optional[dt_time]:
    m = _TIME_RE.search(text)
    if not m:
        return None
    try:
        return dt_time(int(m.group(1)), int(m.group(2)))
    except ValueError:
        return None


def extract_from_pdf(file_bytes: bytes, password: str = "") -> list[dict[str, Any]]:
    """
    Parse a bank-statement PDF from bytes (never written to disk).

    Returns list of dicts with keys: date, amount, description, type, source.
    All in-memory buffers are explicitly deleted after extraction.
    """
    results: list[dict[str, Any]] = []
    buf = io.BytesIO(file_bytes)
    try:
        if password:
            pdf_ctx = pdfplumber.open(buf, password=password)
        else:
            pdf_ctx = pdfplumber.open(buf)
        with pdf_ctx as pdf:
            for page in pdf.pages:
                tables = page.extract_tables()
                for table in tables:
                    for row in table:
                        if not row:
                            continue
                        row_text = " ".join(
                            str(cell) for cell in row if cell is not None
                        )
                        txn_date = _parse_date(row_text)
                        amount = _parse_amount(row_text)
                        if txn_date and amount:
                            results.append(
                                {
                                    "date": txn_date,
                                    "transaction_time": _parse_time(row_text),
                                    "amount": amount,
                                    "merchant_name": row_text[:200],
                                    "description": None,
                                    "type": _detect_type(row_text),
                                    "source": "pdf",
                                }
                            )
    finally:
        buf.close()
        del buf
        del file_bytes  # hint to GC

    return results
