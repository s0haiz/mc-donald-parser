@echo off
REM Start the LogIQ parser backend (FastAPI on port 8000).
cd /d "%~dp0..\backend"
call .venv\Scripts\activate.bat
uvicorn main:app --reload --port 8000
