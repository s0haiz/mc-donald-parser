#!/usr/bin/env bash
# Boot the LogIQ parser backend on port 8000.
set -e
cd "$(dirname "$0")"
uvicorn main:app --reload --port 8000
