"""
FastAPI wrapper around the NAISC Smart Tool Log Parser.

Exposes one endpoint consumed by the LogIQ Dashboard frontend:

    POST /parse-and-normalize
        multipart/form-data
          file:       the raw log file (required)
          tool_type:  dry_etch | euv_scanner | cmp (optional — inferred if absent)
          vendor:     free-text vendor hint (optional)

    -> the canonical envelope produced by parser.parse_and_normalize

Run locally:
    pip install -r requirements.txt
    uvicorn main:app --reload --port 8000
"""
from __future__ import annotations

import shutil
import tempfile
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from parser import parse_and_normalize

app = FastAPI(
    title="NAISC Smart Tool Log Parser",
    version="0.1.0",
    description="Normalizes raw semiconductor tool logs into a canonical envelope.",
)

# Permissive CORS for local dev — tighten before deploy
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",   # Vite default
        "http://127.0.0.1:5173",
        "http://localhost:5174",   # Vite fallback when 5173 is taken
        "http://127.0.0.1:5174",
        "http://localhost:3000",
        "http://localhost:4173",   # vite preview
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {
        "service": "naisc-smart-log-parser",
        "status": "ok",
        "endpoints": ["/parse-and-normalize", "/health"],
    }


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/parse-and-normalize")
async def parse_and_normalize_endpoint(
    file: UploadFile = File(...),
    tool_type: Optional[str] = Form(None),
    vendor: Optional[str] = Form(None),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="Missing filename")

    # Write the upload to a temp file so every adapter (incl. binary / parquet)
    # can use a real Path. The parser does not stream — it opens by path.
    suffix = Path(file.filename).suffix
    tmp_path: Optional[Path] = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            shutil.copyfileobj(file.file, tmp)
            tmp_path = Path(tmp.name)

        envelope = parse_and_normalize(
            tmp_path,
            tool_type=(tool_type or None),
            vendor=(vendor or None),
        )

        # Preserve the client's original filename in the envelope — the parser
        # sees only the temp name.
        envelope["fileName"] = file.filename
        return envelope

    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Parser error: {exc}") from exc
    finally:
        if tmp_path and tmp_path.exists():
            try:
                tmp_path.unlink()
            except OSError:
                pass
