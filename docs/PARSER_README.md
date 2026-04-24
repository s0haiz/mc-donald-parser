# NAISC Smart Tool Log Parser

End-to-end prototype for the Micron @ AISG National AI Student Challenge 2026.
Ingests raw semiconductor tool logs in any format, normalizes field names
through a deterministic 3-tier mapping cascade, and emits a canonical JSON
envelope that matches the project's API contract.

## Layout

```
outputs/
├── parser/                  Python package — the parser itself
│   ├── canonical.py         Canonical keys + alias dictionary
│   ├── formats.py           Format detection (extension + content sniff)
│   ├── mapper.py            3-tier cascade (alias → fuzzy → LLM)
│   ├── normalize.py         Unit/value canonicalization
│   ├── orchestrator.py      Public entrypoint `parse_and_normalize`
│   ├── cli.py               CLI: python -m parser.cli <file>
│   └── adapters/            One file per input format
│       ├── json_adapter.py
│       ├── xml_adapter.py
│       ├── csv_adapter.py
│       ├── parquet_adapter.py
│       ├── syslog_adapter.py
│       ├── text_adapter.py
│       └── binary_adapter.py
├── demo/index.html          Single-file dashboard showing parser output
├── sample_outputs/          Pre-computed envelopes, one per sample log
└── docs/TEXT_DESCRIPTION.md Submission deliverable #3 (dev tools, APIs, assets)
```

## Quick start

```bash
# Install only dependency needed for Parquet sample
pip install pyarrow --break-system-packages

# Run on any uploaded sample
python -m parser.cli path/to/dry_etch_vendorA.json --pretty

# Or write to a file
python -m parser.cli path/to/sensor_trace.csv --out out.json --pretty

# With tool-type / vendor hints (otherwise inferred)
python -m parser.cli euv_event_log.txt --tool-type euv_scanner --vendor ASML
```

## Output shape

Matches the API contract in `NAISC_Master_Context.md`:

```json
{
  "fileId": "…",
  "format": "json | xml | csv | parquet | syslog | text | binary",
  "toolType": "dry_etch | euv_scanner | cmp",
  "vendor": "…",
  "timestamp": "…",
  "normalizedFields": {
    "pressure_pa": {
      "value": 1.199901,
      "unit": "pascal",
      "method": "alias_match",
      "confidence": 1.0,
      "sourceField": "pressure_mTorr"
    }
  },
  "rawFields": { … },
  "events": [ … ],
  "reviewQueue": [ … ],
  "mappingMetadata": { … },
  "validationPassed": true
}
```

## LLM fallback

Tier 3 calls OpenAI GPT-4o-mini only when `OPENAI_API_KEY` is set.
Without it, unmapped fields land in `reviewQueue` — the demo stays
deterministic and offline-runnable.

## Tested sample coverage

Running the CLI over the seven provided samples:

| File                            | Format   | Normalized | Events | Review |
|---------------------------------|----------|-----------:|-------:|-------:|
| dry_etch_vendorA.json           | json     |          3 |     11 |      3 |
| dry_etch_vendorB.json           | json     |          0 |     24 |      8 |
| dry_etch_vendorC.parquet        | parquet  |          4 |    100 |      7 |
| sensor_trace.csv                | csv      |          5 |     22 |      0 |
| euv_scanner_dose_recipe.xml     | xml      |          6 |      0 |     17 |
| euv_event_log.txt               | text     |          4 |     12 |      0 |
| cmp_syslog_kvp.log              | syslog   |          9 |     18 |     13 |
| highspeed_diag.bin              | binary   |          3 |     15 |      0 |

Unit conversions verified (9.0 mTorr → 1.2 Pa, 6.2 psi → 42,747 Pa).
