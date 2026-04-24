# Start the LogIQ parser backend (FastAPI on port 8000).
$ErrorActionPreference = "Stop"
Set-Location "$PSScriptRoot/../backend"
& .venv/Scripts/uvicorn main:app --reload --port 8000
