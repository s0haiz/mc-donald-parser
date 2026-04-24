# LogIQ Parser Backend

FastAPI wrapper around the NAISC Smart Tool Log Parser. Consumed by the
LogIQ Dashboard frontend.

## Run locally

```bash
cd backend
python -m venv .venv
# Windows PowerShell
.venv\Scripts\Activate.ps1
# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Open http://localhost:8000/docs for the interactive API console.

## Endpoint

`POST /parse-and-normalize` — `multipart/form-data`

| Field      | Type  | Required | Notes                                          |
|------------|-------|----------|------------------------------------------------|
| file       | File  | yes      | The raw log (JSON, XML, CSV, Parquet, TXT, …)  |
| tool_type  | text  | no       | `dry_etch` / `euv_scanner` / `cmp` — inferred  |
| vendor     | text  | no       | Free-text vendor hint                          |

Returns the canonical envelope:

```jsonc
{
  "fileId": "…",
  "fileName": "etch_cycle_…",
  "format": "json | xml | csv | parquet | syslog | text | binary",
  "toolType": "dry_etch",
  "vendor": "Lam Research",
  "timestamp": "2026-03-31T14:23:00Z",
  "normalizedFields": {
    "pressure_pa": {
      "value": 1.199901,
      "unit": "pascal",
      "method": "alias_match",
      "confidence": 1.0,
      "sourceField": "pressure_mTorr"
    }
  },
  "rawFields": { "…": "…" },
  "events": [{ "lineNumber": 1, "timestamp": "…", "lineType": "ALARM", "extractedParams": {} }],
  "reviewQueue": [{ "rawField": "…", "suggestedCanonical": null, "confidence": 0.0 }],
  "mappingMetadata": { "…": { "canonical": "…", "method": "…", "confidence": 0.0 } },
  "validationPassed": true,
  "parserMeta": { "format": "json" }
}
```

## Tier 3 LLM fallback (optional)

Set `OPENAI_API_KEY` before launching to enable semantic mapping for
fields that neither alias nor fuzzy tiers resolve. Without it, unmapped
fields land in `reviewQueue` — the demo stays fully offline.
