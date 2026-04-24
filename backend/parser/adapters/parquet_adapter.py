"""
Parquet adapter.

The vendorC Parquet stores every column as a JSON *string*, so each
logical row needs a per-column json.loads to recover the nested objects.

Each row in vendorC represents ONE measurement from ONE sensor (long-form),
not a batch.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from . import ParsedLog


def parse(path):
    try:
        import pyarrow.parquet as pq
    except ImportError as exc:
        raise RuntimeError(
            "pyarrow is required to read Parquet files. "
            "Install with: pip install pyarrow --break-system-packages"
        ) from exc

    table = pq.read_table(path)
    rows = table.to_pylist()

    out = ParsedLog()
    out.meta["format"] = "parquet"
    out.meta["row_count"] = len(rows)

    for row_idx, row in enumerate(rows, 1):
        stitched = {col: _maybe_json(val) for col, val in row.items()}

        # Lift identifiers from known container columns
        for key_col in ("ControlJobKeys", "ProcessJobKeys",
                        "ModuleProcessReportKeys", "SensorKey",
                        "ControlJobAttributes", "ProcessJobAttributes",
                        "ModuleProcessReportAttributes"):
            block = stitched.get(key_col)
            if isinstance(block, dict):
                for k, v in block.items():
                    if isinstance(v, (str, int, float)):
                        out.raw_fields.setdefault(k, v)

        # Sensor + measurements reconstruction
        skey = stitched.get("SensorKey") or {}
        sensor_name = None
        if isinstance(skey, dict):
            sensor_name = skey.get("SensorName") or skey.get("SensorID")

        meas = stitched.get("Measurements")
        measurement_list = meas if isinstance(meas, list) else ([meas] if isinstance(meas, dict) else [])

        for m in measurement_list:
            if not isinstance(m, dict):
                continue
            value = m.get("Value")
            if sensor_name and sensor_name not in out.raw_fields:
                out.raw_fields[sensor_name] = value
            out.events.append({
                "lineNumber": len(out.events) + 1,
                "timestamp": m.get("DateTime"),
                "lineType": "SENSOR_READ",
                "extractedParams": {
                    "sensor": sensor_name,
                    "value": value,
                    "rowIndex": row_idx,
                },
            })

    return out


def _maybe_json(val):
    if not isinstance(val, str):
        return val
    s = val.strip()
    if not s or s[0] not in "{[":
        return val
    try:
        return json.loads(s)
    except json.JSONDecodeError:
        return val
