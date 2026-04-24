"""
Orchestrator — glues format detection, adapter dispatch and the
3-tier mapper into the single public entrypoint `parse_and_normalize`.

Returns the envelope described in NAISC_Master_Context.md's API contract.
"""
from __future__ import annotations

import datetime as _dt
import hashlib
import os
from pathlib import Path
from typing import Any

from .formats import detect_format
from .mapper import map_field
from .normalize import normalize_value
from .adapters import ParsedLog
from .adapters import (
    json_adapter,
    xml_adapter,
    csv_adapter,
    syslog_adapter,
    text_adapter,
    parquet_adapter,
    binary_adapter,
)


_ADAPTERS = {
    "json":    json_adapter.parse,
    "xml":     xml_adapter.parse,
    "csv":     csv_adapter.parse,
    "parquet": parquet_adapter.parse,
    "syslog":  syslog_adapter.parse,
    "text":    text_adapter.parse,
    "binary":  binary_adapter.parse,
}


# Fields that are pure identifiers — never a sensor reading, always a
# string. Skip them when populating normalizedFields (they appear in
# mappingMetadata / rawFields only to keep normalizedFields numeric-ish).
_IDENTIFIER_CANONICALS = {
    "equipment_id", "lot_id", "wafer_id", "recipe_id",
    "process_step", "alarm_code", "alarm_severity", "alarm_message",
    "timestamp",
}


def parse_and_normalize(
    file_path: str | Path,
    tool_type: str | None = None,
    vendor: str | None = None,
) -> dict[str, Any]:
    p = Path(file_path)
    fmt = detect_format(p)

    adapter_fn = _ADAPTERS.get(fmt)
    if adapter_fn is None:
        raise ValueError(f"No adapter available for format '{fmt}'")

    parsed: ParsedLog = adapter_fn(p)
    parsed.meta.setdefault("format", fmt)

    # Infer tool type if caller didn't supply one
    tool_type = tool_type or _infer_tool_type(parsed, str(p))

    normalized_fields: dict[str, dict[str, Any]] = {}
    mapping_metadata: dict[str, dict[str, Any]] = {}
    review_queue: list[dict[str, Any]] = []

    neighbor_names = list(parsed.raw_fields.keys())

    for raw_name, sample_val in parsed.raw_fields.items():
        mr = map_field(
            raw_name,
            sample_value=sample_val,
            tool_type=tool_type,
            vendor=vendor,
            neighbors=neighbor_names,
        )

        mapping_metadata[raw_name] = {
            "sourceField": raw_name,
            "canonical": mr.canonical_name,
            "method": mr.method,
            "confidence": mr.confidence,
        }

        if mr.canonical_name is None:
            review_queue.append({
                "rawField": raw_name,
                "suggestedCanonical": None,
                "confidence": 0.0,
                "sampleValue": _safe(sample_val),
            })
            continue

        if mr.canonical_name in _IDENTIFIER_CANONICALS:
            continue

        norm_val, unit = normalize_value(mr.canonical_name, sample_val, raw_name)
        # Only keep the best (highest-confidence) hit per canonical name
        existing = normalized_fields.get(mr.canonical_name)
        if existing and existing["confidence"] >= mr.confidence:
            continue
        normalized_fields[mr.canonical_name] = {
            "value": _safe(norm_val),
            "unit": unit,
            "method": mr.method,
            "confidence": mr.confidence,
            "sourceField": raw_name,
        }

    # Pick a representative timestamp
    ts = _first_timestamp(parsed)

    file_id = hashlib.sha1(str(p.resolve()).encode()).hexdigest()[:12]

    return {
        "fileId": file_id,
        "fileName": p.name,
        "format": fmt,
        "toolType": tool_type,
        "vendor": vendor,
        "timestamp": ts,
        "normalizedFields": normalized_fields,
        "rawFields": {k: _safe(v) for k, v in parsed.raw_fields.items()},
        "events": parsed.events,
        "reviewQueue": review_queue,
        "mappingMetadata": mapping_metadata,
        "validationPassed": _validate(normalized_fields, parsed),
        "parserMeta": parsed.meta,
    }


# ------------------------------------------------------------------ helpers

def _infer_tool_type(parsed: ParsedLog, path: str) -> str:
    """Best-effort tool_type inference from filename + raw field vocabulary."""
    hay = " ".join([path.lower(), *map(str, parsed.raw_fields.keys()), *map(str, parsed.raw_fields.values())])
    if "euv" in hay or "scanner" in hay or "adel" in hay:
        return "euv_scanner"
    if "cmp" in hay or "platen" in hay or "slurry" in hay or "removal_rate" in hay:
        return "cmp"
    # default to dry_etch — covers all remaining samples in this dataset
    return "dry_etch"


def _first_timestamp(parsed: ParsedLog) -> str:
    for ev in parsed.events:
        ts = ev.get("timestamp")
        if ts:
            return str(ts)
    return _dt.datetime.now(_dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _validate(normalized: dict, parsed: ParsedLog) -> bool:
    """Cheap demo-grade validation: we mapped at least one sensor field."""
    return len(normalized) > 0 or len(parsed.events) > 0


def _safe(v: Any) -> Any:
    """Coerce unserialisable values (e.g. numpy scalars) to plain Python."""
    try:
        import json
        json.dumps(v)
        return v
    except Exception:
        try:
            return float(v)
        except Exception:
            return str(v)
