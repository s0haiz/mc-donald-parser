"""
Plain-text event log adapter (unstructured).

Target: EUV scanner event log.
An event block looks like:

    01/13/2026 06:16:03.4412 Machine:MCH_0001 (Rel:VER0001, TEMP [thm], TEMPsensor.c, ?.?, 198)
    SYSTEM ALARM: ALM-TEMP_HIGH
    Chamber temperature exceeded upper control limit. Measured: 91.5 C, UCL: 90.0 C.
    Auto-corrective action: RF power ramped down to 130 W.
    <blank line>

Strategy:
    - Split the file into blocks on blank lines.
    - The first line of each block is the header (timestamp + metadata).
    - The second line is the type ("SYSTEM ALARM | WARNING | EVENT: <code>").
    - The rest is the body — we attempt regex extraction of common
      numeric phrases ("<N> mTorr", "<N> C", "<N> W", "<N> sccm") and
      named identifiers (Lot, Recipe, Wafer).
"""
from __future__ import annotations

import re
from datetime import datetime
from pathlib import Path

from . import ParsedLog


_HEADER_RE = re.compile(
    r"^(?P<date>\d{2}/\d{2}/\d{4})\s+"
    r"(?P<time>\d{2}:\d{2}:\d{2}\.\d+)\s+"
    r"Machine:(?P<machine>\S+)\s+"
    r"\((?P<meta>[^)]*)\)\s*$"
)
_TYPE_RE = re.compile(
    r"^SYSTEM\s+(?P<sev>ALARM|WARNING|EVENT|INFO)\s*:\s*(?P<code>\S+)"
)

# numeric phrase extractors
_PHRASE_PATTERNS = [
    (r"(-?\d+(?:\.\d+)?)\s*mTorr",  "pressure_mTorr"),
    (r"(-?\d+(?:\.\d+)?)\s*C\b",    "temperature_C"),
    (r"(-?\d+(?:\.\d+)?)\s*W\b",    "rf_power_W"),
    (r"(-?\d+(?:\.\d+)?)\s*sccm",   "gas_flow_sccm"),
]
_IDENT_PATTERNS = [
    (r"\bLot\s+(\S+)",     "LotID"),
    (r"\bWafer\s+(\S+)",   "WaferID"),
    (r"\bRecipe:\s*(\S+)", "RecipeID"),
    (r"\bstep\s+(\S+?)[)\.]", "process_step"),
]


def parse(path: str | Path) -> ParsedLog:
    out = ParsedLog()
    out.meta["format"] = "text"

    text = Path(path).read_text(encoding="utf-8", errors="replace")
    # strip leading banner (====...)
    lines = text.splitlines()

    blocks: list[list[str]] = []
    current: list[str] = []
    in_banner = True
    for ln in lines:
        if in_banner:
            if ln.startswith("=") or ln.strip() == "" or not _HEADER_RE.match(ln):
                # still in banner / pre-amble
                if _HEADER_RE.match(ln):
                    in_banner = False
                    current = [ln]
                continue
            else:
                in_banner = False
                current = [ln]
                continue
        if ln.strip() == "":
            if current:
                blocks.append(current)
                current = []
        else:
            current.append(ln)
    if current:
        blocks.append(current)

    line_no = 0
    for blk in blocks:
        line_no += 1
        if not blk:
            continue
        header = blk[0]
        mh = _HEADER_RE.match(header)
        if not mh:
            continue

        ts = _to_iso(mh.group("date"), mh.group("time"))
        machine = mh.group("machine")
        meta = mh.group("meta")

        type_line = blk[1] if len(blk) > 1 else ""
        mt = _TYPE_RE.match(type_line)
        if mt:
            sev = mt.group("sev")
            alarm_code = mt.group("code")
            line_type = {
                "ALARM": "ALARM",
                "WARNING": "WARNING",
                "EVENT": "INFO",
                "INFO": "INFO",
            }.get(sev, "INFO")
        else:
            sev = "INFO"
            alarm_code = ""
            line_type = "INFO"

        body = " ".join(blk[2:]).strip()

        extracted: dict = {}
        # numeric phrases
        for pat, key in _PHRASE_PATTERNS:
            m = re.search(pat, body)
            if m:
                extracted[key] = m.group(1)
        # identifiers
        for pat, key in _IDENT_PATTERNS:
            m = re.search(pat, body)
            if m:
                extracted[key] = m.group(1)

        if alarm_code:
            extracted["alarm_code"] = alarm_code
            out.raw_fields.setdefault("alarm_code", alarm_code)
        if sev:
            extracted["Severity"] = sev
            out.raw_fields.setdefault("Severity", sev)

        for k, v in extracted.items():
            out.raw_fields.setdefault(k, v)
        out.raw_fields.setdefault("Machine", machine)

        out.events.append({
            "lineNumber": line_no,
            "timestamp": ts,
            "lineType": line_type,
            "extractedParams": {
                "machine": machine,
                "meta": meta,
                "body": body,
                **extracted,
            },
        })

    return out


def _to_iso(date: str, time: str) -> str:
    try:
        # date is MM/DD/YYYY, time HH:MM:SS.ffff
        dt = datetime.strptime(f"{date} {time}", "%m/%d/%Y %H:%M:%S.%f")
        return dt.strftime("%Y-%m-%dT%H:%M:%S.") + f"{dt.microsecond:06d}"
    except ValueError:
        return f"{date}T{time}"
