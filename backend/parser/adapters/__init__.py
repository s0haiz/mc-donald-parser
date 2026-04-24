"""
Per-format adapters.

Each adapter exposes `parse(path) -> ParsedLog`.

ParsedLog:
    raw_fields : dict[str, Any]  — a representative flat sample of raw field
                                    names -> one example value (used by mapper).
    events     : list[dict]      — structured per-line events (timestamp, type,
                                    extractedParams, lineNumber, severity, …).
    meta       : dict            — anything else worth keeping (tool_type hint,
                                    vendor hint, row_count, sensor_name_map …).
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class ParsedLog:
    raw_fields: dict[str, Any] = field(default_factory=dict)
    events: list[dict[str, Any]] = field(default_factory=list)
    meta: dict[str, Any] = field(default_factory=dict)
