"""
Value / unit normalization.

Converts raw string readings like "85.2C", "8.9 mTorr", "150W" into a
typed (float, canonical_unit) pair for the canonical key.

Kept intentionally small — only the units we see in the provided samples.
"""
from __future__ import annotations

import re
from typing import Any

# mTorr -> Pa:  1 mTorr = 0.1333223684 Pa
_MTORR_TO_PA = 0.1333223684
# Torr -> Pa:   1 Torr  = 133.3223684 Pa
_TORR_TO_PA = 133.3223684
# psi -> Pa:    1 psi   = 6894.757 Pa
_PSI_TO_PA = 6894.757293168

_NUM_RE = re.compile(r"-?\d+(?:\.\d+)?(?:[eE][-+]?\d+)?")


def _coerce_number(raw: Any) -> float | None:
    if raw is None:
        return None
    if isinstance(raw, (int, float)):
        return float(raw)
    s = str(raw).strip()
    if not s:
        return None
    m = _NUM_RE.search(s)
    return float(m.group(0)) if m else None


def normalize_value(canonical_name: str, raw_value: Any, source_field: str = "") -> tuple[Any, str | None]:
    """
    Return (normalized_value, canonical_unit) for a given canonical key.
    Falls back to the raw value + None unit if we don't have a rule.
    """
    sf = (source_field or "").lower()
    raw_s = str(raw_value).lower() if raw_value is not None else ""

    if canonical_name == "temperature_c":
        v = _coerce_number(raw_value)
        return v, "celsius"

    if canonical_name == "pressure_pa":
        v = _coerce_number(raw_value)
        if v is None:
            return raw_value, None
        # Disambiguate the incoming unit from source field name or value string
        if "mtorr" in sf or "mtorr" in raw_s:
            return round(v * _MTORR_TO_PA, 6), "pascal"
        if "psi" in sf or "psi" in raw_s:
            return round(v * _PSI_TO_PA, 6), "pascal"
        if "torr" in sf or "torr" in raw_s:
            return round(v * _TORR_TO_PA, 6), "pascal"
        if "pa" in sf or "pa" in raw_s:
            return v, "pascal"
        # default: assume Pa
        return v, "pascal"

    if canonical_name == "rf_power_w":
        return _coerce_number(raw_value), "watt"

    if canonical_name == "gas_flow_sccm":
        return _coerce_number(raw_value), "sccm"

    if canonical_name == "etch_rate_nm_min":
        return _coerce_number(raw_value), "nm/min"

    if canonical_name in ("down_force_n",):
        return _coerce_number(raw_value), "newton"

    if canonical_name in ("friction_coeff", "numerical_aperture"):
        return _coerce_number(raw_value), None

    if canonical_name in ("removal_rate_nm_min",):
        return _coerce_number(raw_value), "nm/min"

    if canonical_name in ("platen_speed_rpm", "head_speed_rpm"):
        return _coerce_number(raw_value), "rpm"

    if canonical_name == "torque_nm":
        return _coerce_number(raw_value), "N*m"

    if canonical_name == "slurry_flow_ml_min":
        return _coerce_number(raw_value), "mL/min"

    if canonical_name == "exposure_dose_mj_cm2":
        return _coerce_number(raw_value), "mJ/cm^2"
    if canonical_name == "focus_offset_nm":
        return _coerce_number(raw_value), "nm"
    if canonical_name == "scan_speed_mm_s":
        return _coerce_number(raw_value), "mm/s"
    if canonical_name == "pulse_energy_mj":
        return _coerce_number(raw_value), "mJ"

    # Non-numeric canonical: pass through
    return raw_value, None
