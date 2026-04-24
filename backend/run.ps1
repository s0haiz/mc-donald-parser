# Boot the LogIQ parser backend on port 8000.
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot
uvicorn main:app --reload --port 8000
