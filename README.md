# NAISC-micron
AI-powered semiconductor tool log parser — Micron @ AISG National AI Student Challenge

## Overview
Semiconductor equipment from different vendors produces logs in completely different
formats — JSON, XML, CSV, plain text, binary. This tool acts as a unified intelligence
layer, automatically detecting each log's format and converting it into clean,
structured, queryable data using a 3-prompt Claude API pipeline.

## Features
- Multi-format ingestion: JSON, XML, CSV, plain text, Syslog, key-value pairs, binary/hex
- Vendor-agnostic format detection — no hard-coded rules per vendor
- 3-prompt Claude API chain: detect → extract → validate
- Unified normalisation: ISO 8601 timestamps, SI units, canonical field names
- Quality flagging: out-of-range values, missing fields, unparseable timestamps
- Streamlit UI: file upload, structured results table, flagged entries panel
- Plotly analytics: sensor trend charts, alarm timelines
- Natural language queries: plain English → SQL via Claude
- CSV / JSON export for downstream ML pipelines

## Project structure
```
smart-tool-log-parser/
├── src/
│   ├── ingestion/        # File router and format pre-processors
│   ├── parser/           # 3-prompt Claude API parsing pipeline
│   ├── normalisation/    # Schema mapping, unit and timestamp normalisation
│   └── ui/               # Streamlit app, Plotly charts, export
├── tests/
│   ├── ingestion/
│   ├── parser/
│   ├── normalisation/
│   └── ui/
├── synthetic_logs/
│   ├── json/
│   ├── xml/
│   ├── csv/
│   ├── plaintext/
│   └── binary/
├── docs/
├── slides/
├── .env.example
├── requirements.txt
└── pyproject.toml
```

## Team
| Component | Folder | Owner |
|-----------|--------|-------|
| Ingestion & file router | `src/ingestion/` | |
| AI parsing pipeline | `src/parser/` | |
| Normalisation & storage | `src/normalisation/` | |
| Streamlit UI & analytics | `src/ui/` | |
| Synthetic logs, tests & slides | `synthetic_logs/`, `tests/`, `slides/` | |

## Setup

### Prerequisites
- Python 3.11
- [uv](https://github.com/astral-sh/uv) — install once globally with `pip install uv`
- An [Anthropic API key](https://console.anthropic.com/)

### Installation
```bash
# 1. Clone the repo
git clone https://github.com/YOUR_USERNAME/smart-tool-log-parser.git
cd smart-tool-log-parser

# 2. Create and activate virtual environment
uv venv --python 3.11
.venv\Scripts\activate        # Windows
source .venv/bin/activate     # Mac / Linux

# 3. Install dependencies
uv pip install -r requirements.txt

# 4. Set up environment variables
copy .env.example .env        # Windows
cp .env.example .env          # Mac / Linux
# Then open .env and add your Anthropic API key
```

## Running the app
```bash
streamlit run src/ui/app.py
```

## Running tests
```bash
pytest
```

## Environment variables
Copy `.env.example` to `.env` and fill in your values. Never commit `.env`.

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | Your Anthropic API key from console.anthropic.com |
| `DATABASE_URL` | SQLite DB path — default is `sqlite:///data/logs.db` |
| `LOG_CHUNK_SIZE` | Lines per LLM chunk — default is `200` |
| `CONFIDENCE_THRESHOLD` | Minimum parse confidence before flagging — default is `0.7` |

## Branching strategy
We use GitHub Flow. All work happens on feature branches — nothing goes directly to `main`.

Branch naming: `component/short-description`
```
ingestion/file-router
parser/format-detection
normalisation/schema-mapper
ui/upload-page
data/synthetic-json-logs
```

Create a PR when your branch is ready, assign a teammate to review, merge when approved.

## Commit message format
```
feat(parser):      add format detection prompt
fix(ingestion):    handle empty file edge case
chore(setup):      update requirements.txt
docs(readme):      add setup instructions
test(parser):      add unit tests for JSON extraction
refactor(norm):    extract unit converter to helper module
```

## Tech stack
| Layer | Tool |
|-------|------|
| UI | Streamlit |
| AI / LLM | Google Gemini API — Gemini 1.5 Flash |
| Parsing | Gemini SDK, json, xml.etree, csv, pandas, binascii |
| Storage | SQLite + SQLAlchemy |
| Analytics | Plotly |
| Testing | pytest |
| Environment | uv + python-dotenv |
