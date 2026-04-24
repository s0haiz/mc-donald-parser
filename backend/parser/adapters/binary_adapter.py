"""
Binary adapter for the vendor "MCRN" high-speed diagnostic format.

Layout (all multi-byte integers / floats are big-endian):

    Header (52 bytes)
    ─────────────────
      0x00  4B   magic         b"MCRN"
      0x04  u16  version       (currently 2)
      0x06  u16  flags
      0x08  u32  record_count
      0x0C  16B  equipment_id  null-padded ASCII
      0x1C  24B  lot_id        null-padded ASCII

    Sensor table
    ─────────────
      0x34  u32  sensor_count (N)
      then N entries of 34 bytes each:
          u16  sensor_id
          32B  sensor_name   null-padded ASCII

    Data records (begin immediately after sensor table,
    padded up to a 16-byte boundary — observed start 0xA0)
    Each record is 32 bytes:
          0   u16    seq_no
          2   u64    timestamp_ms   (unix milliseconds)
         10   u16    sensor_id      (foreign key into sensor table)
         12   f64    value
         20   u8     status         (0 = ok, 1 = alarm, ...)
         21  11B    padding

Because the sample_value handed to the mapper matters, we lift the
FIRST reading per sensor into raw_fields keyed by sensor name.
"""
from __future__ import annotations

import struct
from pathlib import Path

from . import ParsedLog


_HEADER_FMT = ">4sHHI16s24s"    # magic, version, flags, record_count, eqp_id, lot_id
_HEADER_SIZE = struct.calcsize(_HEADER_FMT)  # 52

_SENSOR_ENTRY_FMT = ">H32s"     # sensor_id, name
_SENSOR_ENTRY_SIZE = struct.calcsize(_SENSOR_ENTRY_FMT)  # 34

_RECORD_FMT = ">HQHdB11x"       # seq, ts_ms, sensor_id, value, status, padding
_RECORD_SIZE = struct.calcsize(_RECORD_FMT)  # 32


def parse(path: str | Path) -> ParsedLog:
    data = Path(path).read_bytes()
    out = ParsedLog()
    out.meta["format"] = "binary"

    if len(data) < _HEADER_SIZE or data[:4] != b"MCRN":
        raise ValueError("Not an MCRN binary file (magic bytes missing).")

    magic, version, flags, record_count, eqp_id, lot_id = struct.unpack_from(
        _HEADER_FMT, data, 0
    )
    eqp_id = eqp_id.split(b"\x00", 1)[0].decode("ascii", errors="replace")
    lot_id = lot_id.split(b"\x00", 1)[0].decode("ascii", errors="replace")

    out.raw_fields["EquipmentID"] = eqp_id
    out.raw_fields["LotID"] = lot_id
    out.meta["version"] = version
    out.meta["flags"] = flags

    # Sensor table
    offset = _HEADER_SIZE
    (sensor_count,) = struct.unpack_from(">I", data, offset)
    offset += 4

    sensors: dict[int, str] = {}
    for _ in range(sensor_count):
        sid, name = struct.unpack_from(_SENSOR_ENTRY_FMT, data, offset)
        sname = name.split(b"\x00", 1)[0].decode("ascii", errors="replace")
        sensors[sid] = sname
        offset += _SENSOR_ENTRY_SIZE

    # Align up to 16-byte boundary for record section
    if offset % 16 != 0:
        offset += 16 - (offset % 16)

    # Data records
    seen_sensor: set[int] = set()
    records_read = 0
    while offset + _RECORD_SIZE <= len(data) and records_read < record_count:
        seq, ts_ms, sid, value, status = struct.unpack_from(_RECORD_FMT, data, offset)
        offset += _RECORD_SIZE
        records_read += 1

        sname = sensors.get(sid, f"SENSOR_{sid}")
        if sid not in seen_sensor:
            out.raw_fields[sname] = value
            seen_sensor.add(sid)

        iso_ts = _ms_to_iso(ts_ms)
        line_type = "ALARM" if status != 0 else "SENSOR_READ"
        out.events.append({
            "lineNumber": seq,
            "timestamp": iso_ts,
            "lineType": line_type,
            "extractedParams": {
                "sensor": sname,
                "sensorId": sid,
                "value": value,
                "status": status,
            },
        })

    out.meta["sensor_count"] = sensor_count
    out.meta["records_declared"] = record_count
    out.meta["records_read"] = records_read
    return out


def _ms_to_iso(ms: int) -> str:
    import datetime as _dt
    try:
        dt = _dt.datetime.fromtimestamp(ms / 1000.0, tz=_dt.timezone.utc)
        return dt.strftime("%Y-%m-%dT%H:%M:%S.") + f"{dt.microsecond:06d}Z"
    except (OverflowError, OSError, ValueError):
        return f"epoch-ms:{ms}"
