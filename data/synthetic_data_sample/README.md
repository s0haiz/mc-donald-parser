# Synthetic Semiconductor Tool Log Samples
## Micron @ AISG National AI Student Challenge

This folder contains one synthetic log file per format type, simulating realistic
semiconductor fab equipment data. No actual Micron tool logs are included.

---

## Files

| File | Format | Tool / Use Case | Structure Type |
|------|--------|-----------------|----------------|
| `dry_etch_vendorA.json` | JSON | Dry Etch Tool (Vendor A) — sensor trace with events | Structured |
| `euv_scanner_dose_recipe.xml` | XML | EUV Scanner — dose recipe configuration | Structured |
| `sensor_trace.csv` | CSV | Dry Etch Tool — time-series sensor metrology table | Structured |
| `euv_event_log.txt` | Plain Text | EUV Scanner — runtime event/alarm log | Unstructured |
| `cmp_syslog_kvp.log` | Syslog + Key-Value Pairs | CMP Tool — process event stream | Semi-structured |
| `highspeed_diag.bin` | Binary (proprietary) | Dry Etch Tool — high-speed diagnostic sensor dump | Unstructured (binary) |

---

## Format Details

### 1. `dry_etch_vendorA.json` — Structured (JSON)
Mimics a real dry etch tool vendor JSON schema with nested ControlJob →
ProcessJob → ModuleProcessReport → SensorData hierarchy. Contains sensor
measurements for Chamber Pressure, RF Power, and Temperature, plus control
state events and alarm/error arrays.

### 2. `euv_scanner_dose_recipe.xml` — Structured (XML)
Mimics an ASML ADELdr recipe XML schema. Contains machine header metadata,
process parameters (dose, focus, scan speed), slit profile Legendre coefficients,
alignment settings, and an audit log.

### 3. `sensor_trace.csv` — Structured (CSV)
Flat tabular time-series of all sensor readings across two wafers (WFR_0001,
WFR_0002) through the full process sequence: STABILIZE → ETCH → PURGE → IDLE.
Includes a temperature alarm event (ALM_TEMP_HIGH) mid-process.

### 4. `euv_event_log.txt` — Unstructured (Plain Text)
Free-form timestamped event log mimicking EUV scanner runtime output. Mixed
line structure: single-line events, multi-line warnings, alarm blocks. Requires
regex/NLP to extract fields like machine ID, event code, severity, and message.

### 5. `cmp_syslog_kvp.log` — Semi-structured (Syslog + Key-Value Pairs)
Standard syslog-style header (timestamp hostname process[pid]) followed by
space-separated KEY=VALUE pairs. Covers a full CMP wafer processing cycle
including slurry flow, platen/head control, friction alarm, auto-correction,
endpoint detection, and wafer completion.

### 6. `highspeed_diag.bin` — Unstructured (Binary/Proprietary)
Custom binary format with:
- Magic bytes: `4D 43 52 4E` ("MCRN")
- File header: version, flags, record count, equipment ID, lot ID
- Sensor map block: maps sensor IDs to human-readable names
- Data records (32 bytes each): sequence, timestamp_ms (uint64), sensor_id,
  value (float64), status byte
- EOF marker: `FF FF FF FF`

Requires the binary specification above to decode. Sensors encoded:
  - ID 1 → ChamberPressure_mTorr
  - ID 2 → Temperature_C
  - ID 3 → RFPower_W

---

## Simulated Equipment Coverage

| Equipment Type | Logs Covered |
|----------------|-------------|
| Dry Etch (CVD/ICP) | JSON, CSV, BIN |
| EUV Scanner (Lithography) | XML, TXT |
| CMP (Chemical Mechanical Planarization) | Syslog/KVP |
