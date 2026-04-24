"""
Syslog + key-value-pair adapter.

Target format (CMP tool):
    2026-01-13T06:00:05.312Z cmp-tool-002 cmp_controller[1042]: KEY=VAL KEY=VAL ...

A generic shlex-style tokenizer is used so values may be quoted with
double quotes (e.g. MSG="Friction coefficient exceeded ...").
"""
from __future__ import annotations

import re
import shlex
from pathlib import Path

from . import ParsedLog


_SYSLOG_HEADER = re.compile(
    r"^(?P<ts>\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?)\s+"
    r"(?P<host>\S+)\s+"
    r"(?P<proc>[\w\-]+)(?:\[(?P<pid>\d+)\])?:\s*"
    r"(?P<body>.*)$"
)


def parse(path: str | Path) -> ParsedLog:
    out = ParsedLog()
    out.meta["format"] = "syslog"

    with open(path, "r", encoding="utf-8") as f:
        line_no = 0
        for raw in f:
            line = raw.rstrip("\n")
            if not line.strip() or line.lstrip().startswith("#"):
                continue
            line_no += 1
            m = _SYSLOG_HEADER.match(line)
            if not m:
                continue
            ts = m.group("ts")
            body = m.group("body")
            host = m.group("host")
            proc = m.group("proc")

            kvps = _parse_kvps(body)

            # Populate raw_fields sample (first occurrence wins)
            for k, v in kvps.items():
                out.raw_fields.setdefault(k, v)
            out.raw_fields.setdefault("hostname", host)
            out.raw_fields.setdefault("process", proc)

            line_type = _classify(kvps)
            out.events.append({
                "lineNumber": line_no,
                "timestamp": ts,
                "lineType": line_type,
                "extractedParams": {
                    "process": proc,
                    "hostname": host,
                    **kvps,
                },
            })

    return out


def _parse_kvps(body: str) -> dict[str, str]:
    """Split 'KEY=VAL KEY="quoted val"' into a dict."""
    try:
        tokens = shlex.split(body, posix=True)
    except ValueError:
        tokens = body.split()
    kv: dict[str, str] = {}
    for tok in tokens:
        if "=" in tok:
            k, v = tok.split("=", 1)
            kv[k.strip()] = v.strip()
    return kv


def _classify(kvps: dict[str, str]) -> str:
    ev = kvps.get("EVENT", "").upper()
    sev = kvps.get("SEVERITY", "").upper()
    if ev == "ALARM" or sev in ("ALARM", "CRITICAL"):
        return "ALARM"
    if sev == "WARNING" or "WARN" in ev:
        return "WARNING"
    if "SENSOR" in ev:
        return "SENSOR_READ"
    if "STEP" in ev or "RECIPE" in ev:
        return "PROCESS_STEP"
    return "INFO"
