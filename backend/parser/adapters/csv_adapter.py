"""
CSV adapter.

Flat tabular logs (e.g. sensor_trace.csv). Handles the mid-file header
repeat we saw by skipping rows whose first cell equals the header's
first cell.

Emits one event per data row with lineType chosen by alarm_flag/recipe_step.
"""
from __future__ import annotations

import csv
from pathlib import Path
from typing import Any

from . import ParsedLog


def parse(path: str | Path) -> ParsedLog:
    out = ParsedLog()
    out.meta["format"] = "csv"
    with open(path, "r", encoding="utf-8", newline="") as f:
        reader = csv.reader(f)
        header: list[str] | None = None
        row_idx = 0
        for row in reader:
            if not row or all(cell == "" for cell in row):
                continue
            if header is None:
                header = row
                continue
            # skip repeated header row
            if row[0] == header[0]:
                continue

            row_idx += 1
            record = {h: v for h, v in zip(header, row)}

            # keep a sample of each column in raw_fields (first non-empty value)
            for col, val in record.items():
                if col not in out.raw_fields and val not in ("", None):
                    out.raw_fields[col] = val

            # decide lineType
            alarm_flag = record.get("alarm_flag", "")
            alarm_code = record.get("alarm_code", "")
            if alarm_flag and alarm_flag not in ("0", "", "false", "False"):
                line_type = "ALARM"
            elif record.get("recipe_step"):
                line_type = "PROCESS_STEP"
            else:
                line_type = "SENSOR_READ"

            params: dict[str, Any] = {k: v for k, v in record.items() if v != ""}
            out.events.append({
                "lineNumber": row_idx,
                "timestamp": record.get("timestamp"),
                "lineType": line_type,
                "extractedParams": params,
            })

    return out
