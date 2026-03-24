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
# Thai month name  e.g.  "6 มี.ค. 69" or "06 มีนาคม 2569"
_THAI_MONTHS: dict[str, int] = {
    "ม.ค.": 1, "ก.พ.": 2, "มี.ค.": 3, "เม.ย.": 4,
    "พ.ค.": 5, "มิ.ย.": 6, "ก.ค.": 7, "ส.ค.": 8,
    "ก.ย.": 9, "ต.ค.": 10, "พ.ย.": 11, "ธ.ค.": 12,
    "มกราคม": 1, "กุมภาพันธ์": 2, "มีนาคม": 3, "เมษายน": 4,
    "พฤษภาคม": 5, "มิถุนายน": 6, "กรกฎาคม": 7, "สิงหาคม": 8,
    "กันยายน": 9, "ตุลาคม": 10, "พฤศจิกายน": 11, "ธันวาคม": 12,
}
# Amount: optional thousands separator, optional decimal
_AMOUNT_RE = re.compile(r"([0-9]{1,3}(?:,\d{3})*(?:\.\d{1,2})?)")
_TIME_RE = re.compile(r"\b([01]?\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?\b")

_CREDIT_RE = re.compile(
    r"โอนเข้า|รับโอน|ฝาก|เงินเข้า|credit|CR\b|deposit", re.IGNORECASE
)
_DEBIT_RE = re.compile(
    r"โอนออก|ถอน|ชำระ|เงินออก|จ่าย|debit|DR\b|withdraw|payment", re.IGNORECASE
)


def _parse_date(text: str) -> Optional[date]:
    # Try numeric formats first
    m = _DATE_RE.search(text)
    if m:
        try:
            d, mo, y = int(m.group(1)), int(m.group(2)), int(m.group(3))
            if y < 100:
                y += 2000
            if y > 2400:
                y -= 543
            return date(y, mo, d)
        except ValueError:
            pass
    # Thai month name format
    for thai_month, month_num in _THAI_MONTHS.items():
        pat = re.compile(rf"(\d{{1,2}})\s*{re.escape(thai_month)}\s*(\d{{2,4}})")
        m2 = pat.search(text)
        if m2:
            try:
                d, y = int(m2.group(1)), int(m2.group(2))
                if y < 100:
                    y += 2000
                if y > 2400:
                    y -= 543
                return date(y, month_num, d)
            except ValueError:
                continue
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


def _parse_txn_amount(text: str) -> Optional[Decimal]:
    """
    For line-based (text fallback) parsing.
    Prefer amounts WITHOUT thousands comma separator — those are transaction
    amounts (e.g. '90.00').  Amounts with commas (e.g. '10,095.65') are
    typically running balances and are used only as a last resort.
    """
    plain: list[Decimal] = []
    all_amounts: list[Decimal] = []
    for m in _AMOUNT_RE.finditer(text):
        raw_str = m.group(1)
        try:
            val = Decimal(raw_str.replace(",", ""))
            if val > 0:
                all_amounts.append(val)
                if "," not in raw_str:
                    plain.append(val)
        except InvalidOperation:
            continue
    return max(plain) if plain else (max(all_amounts) if all_amounts else None)


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


def _parse_table_with_headers(table: list[list[Any]]) -> list[dict[str, Any]]:
    """
    Parse a structured table where the first row is a header.
    Detects debit/credit/balance/date/time/description columns by name.
    Supports KBank, SCB, KTB, BBL, BAY, TTB and falls back to generic matching.
    """
    if not table or len(table) < 2:
        return []

    # ── Bank-specific column keyword profiles ────────────────────────────────
    # Each profile is: { field: [keywords...] }
    # Fields: date, time, debit, credit, balance, desc, txn_type
    BANK_PROFILES: list[dict[str, list[str]]] = [
        # KBank (กสิกรไทย)
        {
            "_name": ["กสิกร", "kbank", "kasikorn"],
            "date":     ["วันที่"],
            "time":     ["เวลา"],
            "debit":    ["ถอน"],
            "credit":   ["ฝาก"],
            "balance":  ["ยอดคง", "คงเหลือ"],
            "desc":     ["รายละเอียด"],
            "txn_type": ["รายการ", "ช่องทาง"],
        },
        # SCB (ไทยพาณิชย์)
        {
            "_name": ["ไทยพาณิชย์", "scb"],
            "date":     ["วันที่", "date"],
            "time":     ["เวลา", "time"],
            "debit":    ["เดบิต", "จ่าย", "dr"],
            "credit":   ["เครดิต", "รับ", "cr"],
            "balance":  ["ยอดคง", "balance"],
            "desc":     ["รายการ", "คำอธิบาย", "description"],
            "txn_type": ["ประเภท"],
        },
        # KTB (กรุงไทย)
        {
            "_name": ["กรุงไทย", "ktb", "krungthai"],
            "date":     ["วันที่"],
            "time":     ["เวลา"],
            "debit":    ["ถอน", "จ่าย"],
            "credit":   ["ฝาก", "รับ"],
            "balance":  ["ยอดคง"],
            "desc":     ["รายการ", "รายละเอียด"],
            "txn_type": ["ประเภท"],
        },
        # BBL (กรุงเทพ)
        {
            "_name": ["กรุงเทพ", "bbl", "bangkok bank"],
            "date":     ["date", "วันที่"],
            "time":     ["time", "เวลา"],
            "debit":    ["withdrawal", "debit", "ถอน"],
            "credit":   ["deposit", "credit", "ฝาก"],
            "balance":  ["balance", "ยอดคง"],
            "desc":     ["description", "particulars", "รายละเอียด"],
            "txn_type": ["transaction", "รายการ"],
        },
        # BAY (กรุงศรี)
        {
            "_name": ["กรุงศรี", "bay", "krungsri"],
            "date":     ["วันที่", "date"],
            "time":     ["เวลา"],
            "debit":    ["เดบิต", "ถอน"],
            "credit":   ["เครดิต", "ฝาก"],
            "balance":  ["ยอดคง"],
            "desc":     ["รายละเอียด", "รายการ"],
            "txn_type": ["ประเภท"],
        },
        # TTB (ทหารไทยธนชาต)
        {
            "_name": ["ทหารไทย", "ธนชาต", "ttb", "tmb"],
            "date":     ["วันที่", "date"],
            "time":     ["เวลา"],
            "debit":    ["ถอน", "จ่าย"],
            "credit":   ["ฝาก", "รับ"],
            "balance":  ["ยอดคง"],
            "desc":     ["รายละเอียด", "รายการ"],
            "txn_type": ["ประเภท"],
        },
    ]
    # Generic fallback profile (catches any bank not listed above)
    GENERIC_PROFILE: dict[str, list[str]] = {
        "date":     ["วันที่", "date"],
        "time":     ["เวลา", "time"],
        "debit":    ["ถอน", "จ่าย", "debit", "dr", "withdrawal", "payment"],
        "credit":   ["ฝาก", "รับ", "credit", "cr", "deposit"],
        "balance":  ["ยอดคง", "คงเหลือ", "balance"],
        "desc":     ["รายละเอียด", "detail", "description", "memo", "หมายเหตุ", "particulars"],
        "txn_type": ["รายการ", "ประเภท", "type", "transaction", "ช่องทาง"],
    }

    header_raw = [str(cell or "") for cell in table[0]]
    header = [h.strip().lower() for h in header_raw]
    full_header_text = " ".join(header)

    # ── Select the best matching profile ────────────────────────────────────
    profile = GENERIC_PROFILE
    for p in BANK_PROFILES:
        if any(k in full_header_text for k in p["_name"]):  # type: ignore[index]
            profile = {k: v for k, v in p.items() if k != "_name"}  # type: ignore[assignment]
            break

    # ── Map header columns ───────────────────────────────────────────────────
    date_col = time_col = debit_col = credit_col = balance_col = desc_col = txn_type_col = None
    for i, h in enumerate(header):
        if date_col is None and any(k in h for k in profile["date"]):
            date_col = i
        elif time_col is None and any(k in h for k in profile["time"]):
            time_col = i
        elif debit_col is None and any(k in h for k in profile["debit"]):
            debit_col = i
        elif credit_col is None and any(k in h for k in profile["credit"]):
            credit_col = i
        elif balance_col is None and any(k in h for k in profile["balance"]):
            balance_col = i
        elif desc_col is None and any(k in h for k in profile["desc"]):
            desc_col = i
        elif txn_type_col is None and any(k in h for k in profile["txn_type"]):
            txn_type_col = i

    last_date: Optional[date] = None  # carry forward for merged/empty date cells

    results: list[dict[str, Any]] = []
    for row in table[1:]:
        if not row:
            continue

        # ── Date ─────────────────────────────────────────────────────────────
        date_text = str(row[date_col] or "") if date_col is not None else ""
        txn_date = _parse_date(date_text)
        if not txn_date:
            for cell in row:
                txn_date = _parse_date(str(cell or ""))
                if txn_date:
                    break
        if txn_date:
            last_date = txn_date          # update carryover
        elif last_date:
            txn_date = last_date          # use last known date (merged cell)
        else:
            continue

        # ── Amount & type ─────────────────────────────────────────────────────
        amount: Optional[Decimal] = None
        txn_type = "expense"

        if debit_col is not None and credit_col is not None:
            # Separate debit / credit columns
            debit_val = _parse_amount(str(row[debit_col] or ""))
            credit_val = _parse_amount(str(row[credit_col] or ""))
            if credit_val and credit_val > 0:
                amount, txn_type = credit_val, "income"
            elif debit_val and debit_val > 0:
                amount, txn_type = debit_val, "expense"
        elif debit_col is not None:
            # Single combined column (e.g. "ถอนเงิน / ฝากเงิน")
            amount = _parse_amount(str(row[debit_col] or ""))
            type_text = str(row[txn_type_col] or "") if txn_type_col is not None else ""
            if not type_text:
                type_text = " ".join(str(c) for c in row if c)
            txn_type = _detect_type(type_text)
        elif credit_col is not None:
            # Only credit column found
            amount = _parse_amount(str(row[credit_col] or ""))
            txn_type = "income"
        else:
            # No dedicated amount column: scan real-value cells only
            _skip = {c for c in [date_col, time_col, balance_col] if c is not None}
            candidates: list[Decimal] = []
            for i, cell in enumerate(row):
                if i in _skip:
                    continue
                v = _parse_amount(str(cell or ""))
                if v and v > 0:
                    candidates.append(v)
            if candidates:
                amount = min(candidates)
            type_text = str(row[txn_type_col] or "") if txn_type_col is not None else ""
            if not type_text:
                type_text = " ".join(str(c) for c in row if c)
            txn_type = _detect_type(type_text)

        if not amount:
            continue

        # ── Time ──────────────────────────────────────────────────────────────
        time_text = str(row[time_col] or "") if time_col is not None else ""
        txn_time = _parse_time(time_text)

        # ── Description ───────────────────────────────────────────────────────
        desc = str(row[desc_col] or "").strip() if desc_col is not None else ""
        if not desc and txn_type_col is not None:
            desc = str(row[txn_type_col] or "").strip()

        row_text = " ".join(str(c) for c in row if c)
        results.append({
            "date": txn_date,
            "transaction_time": txn_time,
            "amount": amount,
            "merchant_name": None,
            "description": desc[:200] if desc else None,
            "type": txn_type,
            "source": "pdf",
            "raw_text": row_text[:300],
        })
    return results


def extract_from_pdf(file_bytes: bytes, password: str = "") -> list[dict[str, Any]]:
    """
    Parse a bank-statement PDF from bytes (never written to disk).
    Strategy:
      1. extract_tables() per page → use header-aware column mapping.
      2. If no table rows found, fallback to extract_text() line-by-line.
    """
    results: list[dict[str, Any]] = []
    buf = io.BytesIO(file_bytes)
    try:
        pdf_ctx = pdfplumber.open(buf, password=password) if password else pdfplumber.open(buf)
        with pdf_ctx as pdf:
            for page in pdf.pages:
                page_results: list[dict[str, Any]] = []

                # ── Strategy 1: structured tables with header detection ───────
                tables = page.extract_tables()
                for table in tables:
                    page_results.extend(_parse_table_with_headers(table))

                # ── Strategy 2: raw text fallback ────────────────────────────
                if not page_results:
                    raw = page.extract_text(x_tolerance=3, y_tolerance=3) or ""
                    for line in raw.splitlines():
                        line = line.strip()
                        if len(line) < 5:
                            continue
                        txn_date = _parse_date(line)
                        amount = _parse_txn_amount(line)
                        if txn_date and amount:
                            desc_text = re.sub(r"\d{1,2}[/\-\.]\d{1,2}[/\-\.]\d{2,4}", "", line)
                            desc_text = re.sub(_AMOUNT_RE, "", desc_text)
                            desc_text = re.sub(r"\s{2,}", " ", desc_text).strip()
                            page_results.append({
                                "date": txn_date,
                                "transaction_time": _parse_time(line),
                                "amount": amount,
                                "merchant_name": None,
                                "description": desc_text[:200] or None,
                                "type": _detect_type(line),
                                "source": "pdf",
                                "raw_text": line[:300],
                            })

                results.extend(page_results)
    finally:
        buf.close()
        del buf
        del file_bytes

    return results
