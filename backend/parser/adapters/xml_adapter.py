"""
XML adapter.

Targets the EUV scanner ADELdr v1.5 recipe/dose files but is written
generically: flatten every leaf element's text into raw_fields and
emit any <AuditLog><Event>...</Event></AuditLog> children as events.
"""
from __future__ import annotations

import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Any

from . import ParsedLog


def parse(path: str | Path) -> ParsedLog:
    out = ParsedLog()
    out.meta["format"] = "xml"
    tree = ET.parse(path)
    root = tree.getroot()

    # 1) Flatten every leaf into raw_fields (first occurrence wins)
    _flatten_leaves(root, out.raw_fields)

    # 2) Lift <AuditLog>/<Event> as events if present
    line_no = 0
    for event in root.iter():
        tag = _strip_ns(event.tag)
        if tag in ("Event", "AuditEntry", "LogEntry"):
            line_no += 1
            ts = event.get("timestamp") or event.findtext("Timestamp") or event.findtext("DateTime")
            severity = event.get("severity") or event.findtext("Severity") or "INFO"
            line_type = _severity_to_linetype(severity)
            params = {_strip_ns(c.tag): (c.text or "").strip()
                      for c in event if c.text and c.text.strip()}
            # Also include attributes on the event element itself
            for k, v in event.attrib.items():
                params.setdefault(k, v)
            out.events.append({
                "lineNumber": line_no,
                "timestamp": ts,
                "lineType": line_type,
                "extractedParams": params,
            })

    return out


def _strip_ns(tag: str) -> str:
    return tag.split("}", 1)[-1] if "}" in tag else tag


def _flatten_leaves(node: ET.Element, bag: dict[str, Any]) -> None:
    # include attributes as "<tag>@<attr>" keys (keep short name too)
    for k, v in node.attrib.items():
        bag.setdefault(k, v)
    children = list(node)
    if not children:
        text = (node.text or "").strip()
        if text:
            bag.setdefault(_strip_ns(node.tag), text)
        return
    for c in children:
        _flatten_leaves(c, bag)
