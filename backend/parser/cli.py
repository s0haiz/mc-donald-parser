"""
CLI wrapper for NAISC Smart Tool Log Parser.

Usage:
    python -m parser.cli <file> [--tool-type TYPE] [--vendor VENDOR] [--output OUTPUT]

Examples:
    python -m parser.cli logs/etch_run.json
    python -m parser.cli logs/cmp.log --tool-type cmp
    python -m parser.cli data/scan.xml --vendor ASML --output result.json
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from . import parse_and_normalize


def _build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="parser.cli",
        description="Parse and normalize a semiconductor tool log file.",
    )
    p.add_argument("file", help="Path to the log file to parse")
    p.add_argument(
        "--tool-type",
        default=None,
        metavar="TYPE",
        help="Override auto-detected tool type (e.g. dry_etch, cmp, euv_scanner)",
    )
    p.add_argument(
        "--vendor",
        default=None,
        metavar="VENDOR",
        help="Hint for vendor-specific field aliases (e.g. ASML, Lam, Applied)",
    )
    p.add_argument(
        "--output",
        "-o",
        default=None,
        metavar="FILE",
        help="Write JSON output to FILE instead of stdout",
    )
    p.add_argument(
        "--indent",
        type=int,
        default=2,
        metavar="N",
        help="JSON indentation level (default: 2; use 0 for compact)",
    )
    return p


def main(argv: list[str] | None = None) -> int:
    args = _build_parser().parse_args(argv)

    file_path = Path(args.file)
    if not file_path.exists():
        print(f"error: file not found: {file_path}", file=sys.stderr)
        return 1

    try:
        result = parse_and_normalize(
            file_path,
            tool_type=args.tool_type,
            vendor=args.vendor,
        )
    except Exception as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1

    indent = args.indent if args.indent > 0 else None
    output_json = json.dumps(result, indent=indent, default=str)

    if args.output:
        Path(args.output).write_text(output_json, encoding="utf-8")
        print(f"wrote {args.output}")
    else:
        print(output_json)

    return 0


if __name__ == "__main__":
    sys.exit(main())
