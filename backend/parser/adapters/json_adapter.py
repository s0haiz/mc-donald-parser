"""
JSON adapter.

Handles both sample shapes we've seen:
  - Vendor A: sensors carry SensorID/SensorName as DIRECT children.
  - Vendor B: same skeleton, sensor ID lives inside nested "Keys",
              plus an Alarms[] array.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from . import ParsedLog


_IDENT_KEYS = {
    "EquipmentID", "LotID", "WaferID", "RecipeID", "CtrlJobID",
    "PRJobID", "RecipeStepID", "ModuleID", "SlotID", "Type",
}


def parse(path):
    p = Path(path)
    with open(p, "r", encoding="utf-8") as f:
        doc = json.load(f)
    out = ParsedLog()
    out.meta["format"] = "json"
    _collect_idents(doc, out.raw_fields)
    _walk_modules(doc, out)
    return out


def _collect_idents(node, bag):
    if isinstance(node, dict):
        for k, v in node.items():
            if k in _IDENT_KEYS and isinstance(v, (str, int, float)) and k not in bag:
                bag[k] = v
            _collect_idents(v, bag)
    elif isinstance(node, list):
        for item in node:
            _collect_idents(item, bag)


def _walk_modules(node, out):
    if isinstance(node, dict):
        for k, v in node.items():
            if k == "ModuleProcessReports" and isinstance(v, list):
                for module in v:
                    _handle_module(module, out)
            else:
                _walk_modules(v, out)
    elif isinstance(node, list):
        for item in node:
            _walk_modules(item, out)


def _handle_module(module, out):
    keys = module.get("Keys") or {}
    for k in ("WaferID", "RecipeStepID", "ModuleID"):
        if k in keys and k not in out.raw_fields:
            out.raw_fields[k] = keys[k]

    for sensor in module.get("SensorData") or []:
        if not isinstance(sensor, dict):
            continue
        skey = sensor.get("Keys") or {}
        label = (
            skey.get("SensorName")
            or sensor.get("SensorName")
            or skey.get("SensorID")
            or sensor.get("SensorID")
            or "Sensor"
        )
        measurements = sensor.get("Measurements") or []
        if measurements:
            first = measurements[0]
            if label not in out.raw_fields:
                out.raw_fields[label] = first.get("Value") if isinstance(first, dict) else first
            for m in measurements:
                if not isinstance(m, dict):
                    continue
                out.events.append({
                    "lineNumber": len(out.events) + 1,
                    "timestamp": m.get("DateTime"),
                    "lineType": "SENSOR_READ",
                    "extractedParams": {"sensor": label, "value": m.get("Value")},
                })

    for alarm in module.get("Alarms") or []:
        if not isinstance(alarm, dict):
            continue
        if "AlarmCode" in alarm and "AlarmCode" not in out.raw_fields:
            out.raw_fields["AlarmCode"] = alarm["AlarmCode"]
        if "Severity" in alarm and "Severity" not in out.raw_fields:
            out.raw_fields["Severity"] = alarm["Severity"]
        out.events.append({
            "lineNumber": len(out.events) + 1,
            "timestamp": alarm.get("DateTime"),
            "lineType": "ALARM",
            "extractedParams": {
                "alarmId": alarm.get("AlarmID"),
                "alarmCode": alarm.get("AlarmCode"),
                "severity": alarm.get("Severity"),
                "message": alarm.get("Message"),
                "parameterValue": alarm.get("ParameterValue"),
            },
        })

    events_node = (module.get("Attributes") or {}).get("Events") or {}
    for ev in events_node.get("ControlStateEvents") or []:
        if not isinstance(ev, dict):
            continue
        out.events.append({
            "lineNumber": len(out.events) + 1,
            "timestamp": ev.get("DateTime"),
            "lineType": "INFO",
            "extractedParams": {"name": ev.get("Name")},
        })
