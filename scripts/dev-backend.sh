#!/usr/bin/env bash
# Start the LogIQ parser backend (FastAPI on port 8000).
set -e
cd "$(dirname "$0")/../backend"
source .venv/Scripts/activate 2>/dev/null || source .venv/bin/activate 2>/dev/null || true
uvicorn main:app --reload --port 8000
