"""
Format detection.

Uses a cheap cascade:
    1. File extension (fastest, right 90% of the time)
    2. Content sniff (first N bytes) — handles mislabelled files
    3. Fallback to 'text'

Returned format labels:
    json | xml | csv | parquet | syslog | text | binary
"""
from __future__ import annotations

import re
from pathlib import Path

_EXT_MAP = {
    ".json": "json",
    ".xml":  "xml",
    ".csv":  "csv",
    ".parquet": "parquet",
    ".log":  "syslog",   # default guess for .log; refined by sniff
    ".txt":  "text",
    ".bin":  "binary",
    ".dat":  "binary",
}

# Parquet magic number: files start with "PAR1" and also end with it.
_PARQUET_MAGIC = b"PAR1"
# Common text sniff patterns
_SYSLOG_RE = re.compile(
    rb"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.*?\s\S+\[\d+\]:", re.MULTILINE
)
_KVP_RE = re.compile(rb"[A-Z_][A-Z0-9_]*=\S+")


def detect_format(path: str | Path) -> str:
    p = Path(path)
    ext_guess = _EXT_MAP.get(p.suffix.lower(), None)

    # Read a head sample for sniffing
    try:
        with open(p, "rb") as f:
            head = f.read(4096)
    except OSError:
        return ext_guess or "text"

    # --- binary magic checks first (before treating as text) ---
    if head.startswith(_PARQUET_MAGIC):
        return "parquet"
    # Our custom MCRN binary
    if head.startswith(b"MCRN"):
        return "binary"
    # Generic non-printable heavy → binary
    if _is_mostly_binary(head) and ext_guess in (None, "binary"):
        return "binary"

    # --- text content sniffing ---
    stripped = head.lstrip()
    if stripped.startswith(b"{") or stripped.startswith(b"["):
        return "json"
    if stripped.startswith(b"<?xml") or stripped.startswith(b"<"):
        # be stricter: require an XML-like close tag in head
        if b"</" in head or b"/>" in head or stripped.startswith(b"<?xml"):
            return "xml"

    if _SYSLOG_RE.search(head):
        return "syslog"

    # CSV heuristic: comma-separated header line with >=2 columns
    first_line = head.split(b"\n", 1)[0]
    if b"," in first_line and first_line.count(b",") >= 2 and b"{" not in first_line:
        return "csv"

    # Key-value pair heavy plain text (without syslog frame)
    if _KVP_RE.search(head):
        return "syslog"

    return ext_guess or "text"


def _is_mostly_binary(buf: bytes) -> bool:
    if not buf:
        return False
    printable = sum(1 for b in buf if 32 <= b < 127 or b in (9, 10, 13))
    return (printable / len(buf)) < 0.85
