"""
NAISC Smart Tool Log Parser
===========================
Public API:
    parse_and_normalize(file_path, tool_type=None, vendor=None) -> dict

Ingests raw semiconductor tool logs in any format (JSON, XML, CSV, Parquet,
Syslog/KVP, plain text, binary) and emits a normalized record matching the
API contract in NAISC_Master_Context.md.
"""
from .orchestrator import parse_and_normalize  # noqa: F401

__all__ = ["parse_and_normalize"]
__version__ = "0.1.0"
