# NAISC Smart Tool Log Parser — Text Description

*Micron @ AISG National AI Student Challenge 2026*
*Team: Darren, Gerald, Kenny, Tai Rong, Zi Jun (submission lead)*

---

## 1. Features, functionalities, and constraints

### Features
The Smart Tool Log Parser ingests raw semiconductor tool logs in any of seven formats — structured JSON, XML, CSV, Parquet; semi-structured syslog with embedded key-value pairs; unstructured plain-text event logs; and a proprietary binary (MCRN) — and emits a single normalized JSON envelope that matches a canonical cross-vendor schema. The output pins every value to a canonical field name, a canonical unit (e.g. all pressures in Pascals regardless of whether the source used mTorr, Torr, or psi), a mapping method, and a confidence score. Unmapped fields are never silently dropped — they flow into a `reviewQueue` so a human can approve or correct the mapping and teach the system a new alias.

The mapping engine is a deterministic 3-tier cascade. Tier 1 is exact alias matching against a seeded dictionary (confidence 1.0). Tier 2 is fuzzy matching: lowercased, separator-stripped string similarity plus containment scoring (confidence 0.70 – 0.99). Tier 3 is an LLM semantic fallback that only fires when Tiers 1 and 2 fail; it receives the raw field name, a sample value, sibling field names, tool type, vendor, and the candidate canonical fields, and returns a JSON `{canonical, confidence}` decision. This ordering means the LLM is touched only when probabilistic reasoning is actually needed — keeping per-file parsing deterministic, cheap, and auditable.

### Functionalities
Each format has a dedicated adapter that produces a uniform intermediate `ParsedLog` (flat `raw_fields` sample + structured `events` list + adapter metadata). The orchestrator dispatches by format, runs the 3-tier mapper over every raw field, applies per-canonical-key unit conversion (mTorr → Pa, psi → Pa, numeric coercion), picks the highest-confidence hit per canonical field, and assembles the final envelope. Events keep their original line number / sequence number and are classified as `ALARM`, `WARNING`, `PROCESS_STEP`, `SENSOR_READ`, or `INFO`. Binary records are decoded via a fixed struct layout (big-endian u16/u64/f64) after the MCRN magic bytes, version, sensor table, and 16-byte-aligned record section are validated.

The parser is exposed three ways: as a Python package (`from parser import parse_and_normalize`), as a CLI (`python -m parser.cli <file>`), and as a webhook payload source for the existing n8n workflow (the response shape matches the Master Context API contract exactly, so n8n and the Supabase `normalised_logs` table drop in without change).

### Constraints
The parser is built for demo-grade reliability, not production scale. Heavy files are not streamed — everything is read into memory because our worst-case demo file is 100 Parquet rows or a 4 KB binary. The LLM fallback is optional: if `OPENAI_API_KEY` is unset, Tier 3 returns `None` and the raw field lands in the review queue. This keeps the demo offline-runnable on a judge's laptop while the production pipeline in n8n can route the same field to GPT-4o-mini transparently. No browser storage, cookies, or outbound calls are made from the UI. The canonical dictionary and alias tables are seeded at import time from `parser/canonical.py` to match the `canonical_keys` / `key_aliases` rows in Supabase — in production that data lives in Postgres; here it is in-memory for demo speed. Anonymous sensors (e.g. vendor B's `SENSOR_0001`) cannot be canonicalized without value-range reasoning and are surfaced in the review queue; this is by design — a silent guess on unlabeled sensor data is worse than a flagged unknown.

---

## 2. Development tools used

**Languages and runtimes.** Python 3.10 powers every adapter, the orchestrator, and the CLI. The choice rests on Python's mature stack for binary parsing (`struct`), structured data (`json`, `xml.etree.ElementTree`, `csv`), and first-class Parquet support through `pyarrow`. Node.js is not in the parser, but it hosts the n8n workflow engine that wraps this service in production.

**Standard-library modules.** The adapters lean on `struct` for the MCRN big-endian layout; `xml.etree.ElementTree` for the ADELdr EUV recipe XML; the built-in `csv` reader (because the CSV has a mid-file header repeat that a pandas loader hides but a Python reader makes trivial to skip); `shlex` to tokenize quoted `KEY="value with spaces"` key-value pairs in the CMP syslog; `difflib.SequenceMatcher` for the Tier-2 fuzzy score; `hashlib` for deterministic file IDs; `re` for the EUV text log's multi-line event extraction; and `datetime` for millisecond-epoch to ISO-8601 conversion in the binary adapter.

**Third-party packages.** `pyarrow` (24.x) is the only required third-party dependency — it reads the vendorC Parquet whose columns are string-encoded JSON fragments. `openai` is imported lazily inside the Tier-3 fallback so the parser does not require it unless the LLM path is actually used. Both install with `pip install pyarrow openai --break-system-packages` in the demo environment.

**Orchestration and hosting.** n8n is the orchestration backbone: a webhook receives the upload, detects format, routes to the correct parser branch, calls the normalization service, and stores the output to Supabase. FastAPI wraps this Python parser as the `/parse-and-normalize` endpoint consumed by n8n. Supabase (PostgreSQL) is the system of record for tools, canonical keys, aliases, logs, normalized logs, tool-key visibility, and the review queue. Next.js / V0 (or a single static HTML page, included here as `demo/index.html`) renders the dashboard. Vercel hosts the frontend; Railway or Docker hosts the n8n + FastAPI backend.

**Development workflow tools.** Git for version control, Figma for UI reference (`https://dog-cloudy-04490056.figma.site/`), VS Code / JetBrains for editing, and the team's shared n8n instance for iterating on the workflow JSON without redeploying code.

---

## 3. APIs used

**OpenAI Chat Completions API** is the sole external AI API touched at runtime, and only by Tier 3 of the mapper. The prompt is deterministic (temperature 0) and forces a JSON response via `response_format={"type": "json_object"}`. The default model is `gpt-4o-mini` because the task — classify one field name into one of ~25 candidates — is tiny, latency-sensitive, and easily within that model's headroom.

**Supabase REST / PostgREST API** is the persistence layer. From n8n the workflow writes to `logs`, `normalised_logs`, and `review_queue`, and reads from `canonical_keys`, `key_aliases`, `tools`, and `tool_key_visibility`. Supabase Auth isn't used by the parser itself — n8n holds the service key as a stored credential.

**Internal REST API contract.** `POST /parse-and-normalize` takes `multipart/form-data` with `file`, `tool_type`, and optional `vendor`, and returns the envelope defined in `NAISC_Master_Context.md` and produced verbatim by this parser: `fileId`, `format`, `toolType`, `vendor`, `timestamp`, `normalizedFields` (each with `value`, `unit`, `method`, `confidence`, `sourceField`), `rawFields`, `events[]`, `reviewQueue[]`, `mappingMetadata`, and `validationPassed`. This shape is the seam between every component — parser, n8n, Supabase writer, and frontend — so it is version-controlled in the master context.

**n8n webhook API.** The n8n workflow (`Smart Tool Log Parser.json`) exposes a POST webhook as the public entry point. Its internal nodes also call the Supabase REST API and the OpenAI API through stored credentials; our parser does not call n8n.

---

## 4. Assets used

**Synthetic log samples (team-generated).** Seven files cover the full input taxonomy Micron lists:

- `dry_etch_vendorA.json` — structured JSON, nested ControlJob → ProcessJobs → ModuleProcessReports with SensorID/SensorName as direct children and named sensors like `ChamberPressure_mTorr`, `RFPower_W`, `Temperature_C`.
- `dry_etch_vendorB.json` — structured JSON, same skeleton but sensors are identified only by SensorID (anonymous), with a module-level Alarms[] array carrying code, severity, parameter value, and lower limit.
- `dry_etch_vendorC.parquet` — structured Parquet, 100 rows, every column a JSON string requiring a secondary parse, one measurement per row in long form.
- `sensor_trace.csv` — structured CSV, flat tabular with a mid-file header repeat that the reader de-duplicates.
- `euv_scanner_dose_recipe.xml` — structured XML, ASML ADELdr v1.5 recipe with Header, ProcessParameters (ExposureDose, FocusOffset, ScanSpeed, WaferTemperature, PulseEnergy, NAValue, Sigma_outer/inner), SlitProfileList, WaferAlignmentSettings, AuditLog.
- `cmp_syslog_kvp.log` — semi-structured syslog + key-value pairs for a CMP tool, covering sensor reads, alarms, auto-adjust actions, endpoint detection, and wafer completion.
- `euv_event_log.txt` — unstructured plain-text multi-line event log from an EUV scanner, with date/machine/module/file header lines followed by free-text SYSTEM EVENT/WARNING/ALARM bodies.
- `highspeed_diag.bin` — non-human-readable custom binary (MCRN format) with a 52-byte header, sensor name table, and 32-byte big-endian records.

**Canonical schema seed data (team-curated).** The `canonical_keys` and `key_aliases` content lives in `parser/canonical.py` and covers dry_etch, euv_scanner, and cmp tool families with ~25 canonical fields and ~100 aliases drawn from the union of the samples' vocabularies.

**Reference design assets.** Figma prototype at `https://dog-cloudy-04490056.figma.site/` guided UI layout and information density. The project brief (`Micron @ AISG National AI Student Challenge (1).pdf`), the team ideation document (`NAISC.pdf`), and the Master Context (`NAISC_Master_Context.md`) provided the architecture, database schema, and API contract that every component conforms to. Two existing n8n workflows (`Smart Tool Log Parser.json`, `AI Tool Log Parser (Base).json`) define the orchestration layer this parser plugs into.

**No proprietary data is used.** All log content is synthetic and was generated by the team for this submission; no Micron production data was accessed.
