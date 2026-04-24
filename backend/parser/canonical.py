"""
Canonical schema and alias dictionary.

This is the seed data that powers Tier-1 (exact alias) and Tier-2 (fuzzy)
matching. In production this lives in the Supabase tables `canonical_keys`
and `key_aliases`; here it is kept in-memory for demo speed.

Each canonical key has:
    - canonical_name : the normalized field name we store as
    - tool_type      : which tool family this applies to ("*" = any)
    - data_type      : expected Python type for values
    - unit           : canonical unit we normalize values to
    - description    : human readable description for LLM fallback prompt
    - aliases        : known raw field names we map from

Unit conversions are defined in normalize.py, not here.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(frozen=True)
class CanonicalKey:
    canonical_name: str
    tool_type: str
    data_type: str
    unit: str | None
    description: str
    aliases: tuple[str, ...] = field(default_factory=tuple)


# ----------------------------------------------------------------------
# Canonical dictionary
# ----------------------------------------------------------------------
# Tool types covered: dry_etch, euv_scanner, cmp
# `*` = applies to any tool
CANONICAL_KEYS: list[CanonicalKey] = [
    # ---------- shared ----------
    CanonicalKey(
        "equipment_id", "*", "string", None,
        "Unique identifier of the physical tool / equipment.",
        ("EquipmentID", "equipment_id", "EQP_ID", "Machine", "MachineID",
         "tool_id", "ToolID"),
    ),
    CanonicalKey(
        "lot_id", "*", "string", None,
        "Manufacturing lot identifier.",
        ("LotID", "lot_id", "LOT", "Lot", "LOT_ID"),
    ),
    CanonicalKey(
        "wafer_id", "*", "string", None,
        "Wafer identifier.",
        ("WaferID", "wafer_id", "WAFER_ID", "Wafer"),
    ),
    CanonicalKey(
        "recipe_id", "*", "string", None,
        "Process recipe identifier.",
        ("RecipeID", "recipe_id", "RECIPE", "RECIPE_ID", "Recipe"),
    ),
    CanonicalKey(
        "process_step", "*", "string", None,
        "Named stage of the recipe currently executing.",
        ("STEP", "process_step", "RECIPE_STEP", "stepName",
         "RecipeStepID", "recipe_step", "Step"),
    ),
    CanonicalKey(
        "timestamp", "*", "datetime", "ISO8601",
        "Wall-clock timestamp of the observation.",
        ("DateTime", "timestamp", "Timestamp", "TS", "time", "Time"),
    ),

    # ---------- dry etch / CVD / plasma sensors ----------
    CanonicalKey(
        "temperature_c", "dry_etch", "float", "celsius",
        "Chamber or wafer temperature in degrees Celsius.",
        ("TEMP", "Temperature", "ChamberTemp", "TEMPC", "temp_c",
         "degree_C", "temperature_C", "Temperature_C", "TEMPERATURE_C",
         "WaferTemperature"),
    ),
    CanonicalKey(
        "pressure_pa", "dry_etch", "float", "pascal",
        "Chamber pressure in Pascals (canonicalized from mTorr, Torr, psi).",
        ("PRESSURE", "pressurePa", "PRES", "chamber_pressure",
         "PressurePa", "pressure_mTorr", "ChamberPressure_mTorr",
         "CARRIER_PRESSURE_psi", "RETAINER_PRESSURE_psi"),
    ),
    CanonicalKey(
        "rf_power_w", "dry_etch", "float", "watt",
        "RF generator forward power in Watts.",
        ("RFPWR", "rf_power", "RFPower", "rf_power_w", "RF_POWER",
         "rf_power_W", "RFPower_W"),
    ),
    CanonicalKey(
        "gas_flow_sccm", "dry_etch", "float", "sccm",
        "Mass flow controller reading in standard cubic centimetres per minute.",
        ("gas_flow_He_sccm", "gas_flow_CF4_sccm", "gas_flow_O2_sccm",
         "GAS_FLOW", "mfc_flow", "flow_sccm"),
    ),
    CanonicalKey(
        "etch_rate_nm_min", "dry_etch", "float", "nm/min",
        "Instantaneous etch rate in nanometres per minute.",
        ("etch_rate_nm_min", "ETCH_RATE", "etch_rate"),
    ),

    # ---------- alarms / faults ----------
    CanonicalKey(
        "alarm_code", "*", "string", None,
        "Fault / alarm code issued by the tool.",
        ("ALRM", "alarm", "ALARM_CODE", "alarmCode", "fault_code",
         "AlarmCode", "alarm_code", "ALARM"),
    ),
    CanonicalKey(
        "alarm_severity", "*", "string", None,
        "Severity level: INFO / WARNING / ALARM / CRITICAL.",
        ("Severity", "SEVERITY", "severity", "level"),
    ),
    CanonicalKey(
        "alarm_message", "*", "string", None,
        "Free-text alarm description.",
        ("Message", "MSG", "msg", "message", "AlarmMessage"),
    ),

    # ---------- EUV scanner ----------
    CanonicalKey(
        "exposure_dose_mj_cm2", "euv_scanner", "float", "mJ/cm^2",
        "EUV exposure dose in millijoules per square centimetre.",
        ("ExposureDose", "exposure_dose", "DOSE"),
    ),
    CanonicalKey(
        "focus_offset_nm", "euv_scanner", "float", "nm",
        "Focus offset relative to best-focus plane in nanometres.",
        ("FocusOffset", "focus_offset", "FOCUS"),
    ),
    CanonicalKey(
        "scan_speed_mm_s", "euv_scanner", "float", "mm/s",
        "Wafer stage scan speed in millimetres per second.",
        ("ScanSpeed", "scan_speed"),
    ),
    CanonicalKey(
        "pulse_energy_mj", "euv_scanner", "float", "mJ",
        "Per-pulse laser/EUV source energy in millijoules.",
        ("PulseEnergy", "pulse_energy"),
    ),
    CanonicalKey(
        "numerical_aperture", "euv_scanner", "float", None,
        "Projection optics numerical aperture (dimensionless).",
        ("NAValue", "NA", "numerical_aperture"),
    ),

    # ---------- CMP ----------
    CanonicalKey(
        "down_force_n", "cmp", "float", "newton",
        "Polishing head down force in Newtons.",
        ("DOWN_FORCE_N", "down_force", "downforce"),
    ),
    CanonicalKey(
        "friction_coeff", "cmp", "float", None,
        "Dimensionless coefficient of friction between wafer and pad.",
        ("FRICTION_COEFF", "friction_coefficient", "mu"),
    ),
    CanonicalKey(
        "removal_rate_nm_min", "cmp", "float", "nm/min",
        "Material removal rate in nanometres per minute.",
        ("REMOVAL_RATE_nm_min", "removal_rate", "RR"),
    ),
    CanonicalKey(
        "platen_speed_rpm", "cmp", "float", "rpm",
        "Platen rotation speed in revolutions per minute.",
        ("PLATEN_SPEED_rpm", "platen_speed"),
    ),
    CanonicalKey(
        "head_speed_rpm", "cmp", "float", "rpm",
        "Carrier head rotation speed in revolutions per minute.",
        ("HEAD_SPEED_rpm", "head_speed"),
    ),
    CanonicalKey(
        "torque_nm", "cmp", "float", "N*m",
        "Motor torque in Newton-metres.",
        ("TORQUE_Nm", "torque"),
    ),
    CanonicalKey(
        "slurry_flow_ml_min", "cmp", "float", "mL/min",
        "Slurry flow rate in millilitres per minute.",
        ("FLOW_RATE_mL_min", "slurry_flow"),
    ),
]


def build_alias_index() -> dict[str, CanonicalKey]:
    """Return a case-insensitive alias -> CanonicalKey map for Tier-1 matching."""
    idx: dict[str, CanonicalKey] = {}
    for ck in CANONICAL_KEYS:
        idx[ck.canonical_name.lower()] = ck
        for alias in ck.aliases:
            idx[alias.lower()] = ck
    return idx


def canonical_keys_for(tool_type: str | None) -> list[CanonicalKey]:
    """Return canonical keys applicable to this tool_type (includes '*' keys)."""
    if not tool_type:
        return list(CANONICAL_KEYS)
    return [ck for ck in CANONICAL_KEYS if ck.tool_type in ("*", tool_type)]


# Precomputed for fast lookup
ALIAS_INDEX = build_alias_index()
