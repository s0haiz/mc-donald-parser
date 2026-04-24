# LogIQ — Smart Tool Log Parser

End-to-end submission for the **Micron @ AISG National AI Student Challenge 2026**
(NAISC · Problem Statement 3).

LogIQ is a full-stack prototype that ingests raw semiconductor tool logs in **seven
different formats** (JSON, XML, CSV, Parquet, syslog, plain-text, custom binary
"MCRN"), normalizes every field through a deterministic **3-tier mapping cascade**
(alias → fuzzy → optional LLM fallback), and renders the result in an interactive
dashboard with confidence pills, mapping-method badges, a per-file events view,
and an "honest unknown" review queue for anything the parser couldn't confidently
map.

Nothing is silently dropped.  Everything has a confidence score and a source field
name attached to it.

---

## Repository layout

```
mc-donald-parser/                      # git root, kept as "mc-donald-parser" for
│                                      # continuity — branded LogIQ in docs/UI
├── README.md                          # you are here
├── .gitignore                         # Python + Node + editor junk
├── .env.example                       # Vite + FastAPI env template
│
├── frontend/                          # Vite + React + TypeScript SPA
│   ├── src/
│   │   ├── main.tsx                   # React entry point
│   │   ├── app/
│   │   │   ├── App.tsx                # Router shell + providers
│   │   │   ├── routes.tsx             # Route table
│   │   │   ├── pages/                 # Dashboard / FolderPage / ToolPage / ToolSettings
│   │   │   ├── components/            # UploadDialog, EnrichedLogViewer,
│   │   │   │                          # ConnectionIndicator, LogRow, ui/ (shadcn)
│   │   │   ├── context/               # UploadedLogsContext (ephemeral session store)
│   │   │   └── data/mockData.ts       # Canonical types + mock inventory
│   │   ├── lib/api.ts                 # Typed client for the parser backend
│   │   ├── styles/                    # Tailwind + theme
│   │   └── vite-env.d.ts
│   ├── index.html
│   ├── package.json                   # pnpm-managed
│   ├── vite.config.ts
│   └── postcss.config.mjs
│
├── backend/                           # Python parser + FastAPI wrapper
│   ├── main.py                        # FastAPI app — POST /parse-and-normalize
│   ├── parser/                        # Core parser package
│   │   ├── adapters/                  #   7 format adapters
│   │   ├── canonical.py               #   Canonical schema + 3-tier mapper fixtures
│   │   ├── formats.py                 #   Format detection (magic-byte + ext-based)
│   │   ├── mapper.py                  #   3-tier cascade: alias → fuzzy → LLM
│   │   ├── normalize.py               #   Units / timestamp normalization
│   │   ├── orchestrator.py            #   Entry point: parse_and_normalize()
│   │   └── cli.py                     #   Optional CLI for batch parsing
│   ├── requirements.txt
│   └── README.md                      # backend-local quickstart
│
├── data/
│   └── synthetic_data_sample/         # 8 input fixtures (one per format · tool family)
│
├── samples/
│   └── outputs/                       # 8 pre-computed canonical envelopes
│                                      #   (judge-reviewable without running code)
│
├── docs/
│   ├── ARCHITECTURE.md                # System design + data-flow deep dive
│   ├── TEXT_DESCRIPTION.md            # NAISC deliverable #3
│   ├── PARSER_README.md               # Parser-package-only guide
│   └── DEMO.html                      # Static offline demo (no backend required)
│
└── scripts/                           # One-click launchers (sh + ps1)
    ├── dev-backend.sh / .ps1
    └── dev-frontend.sh / .ps1
```

> **Why `mc-donald-parser` as the folder name?**  Legacy — it's the original
> team handle from the NAISC registration.  The product is branded LogIQ in
> the UI, slides, and text description.

---

## Quick start

You'll need two terminals.

### 1) Parser backend (Python 3.10+)

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

Interactive API console: http://localhost:8000/docs

### 2) Frontend (Node 18+, pnpm preferred)

```bash
cd frontend
pnpm install
pnpm dev
```

App: http://localhost:5173

The sidebar shows a green dot when the backend is reachable.

### One-click launchers

From the repo root:

```bash
# macOS / Linux
./scripts/dev-backend.sh
./scripts/dev-frontend.sh

# Windows PowerShell
.\scripts\dev-backend.ps1
.\scripts\dev-frontend.ps1
```

---

## Demo flow

1. **Open the app** → sidebar shows "backend online" (green dot).
2. **Drag any sample log** from `data/synthetic_data_sample/` onto the upload
   zone on the Dashboard.  Supported: `.json`, `.xml`, `.csv`, `.parquet`,
   `.txt`, `.log`, `.bin`.
3. **Pick a tool** in the dialog to attach the log to — the dropdown is grouped
   by folder (Dry Etch, EUV Scanners, CMP Tools, …) and passes the family as a
   mapping hint to the parser.
4. **Wait < 1 second** — the parser normalizes the log and the dashboard
   navigates to the tool page with four tabs:
   - **Normalized** — canonical fields with confidence pills
     (green ≥ 95%, amber 70–94%, red < 70%), unit chips, source field names,
     and mapping-method badges (alias / fuzzy / llm).
   - **Events** — extracted events with line-type chips
     (ALARM, WARNING, SENSOR_READ, PROCESS_STEP, INFO) and timestamps.
   - **Review** — raw fields the parser couldn't confidently map — the
     system's "honest unknown" queue, seeded for operator confirmation.
   - **Raw** — the full envelope for debugging / inspection.

---

## Architecture in one sentence

Format-agnostic adapters produce a uniform `ParsedLog`; a deterministic 3-tier
mapper (alias → fuzzy → optional LLM fallback) normalizes every field against a
canonical schema with per-tool-type scoping; the orchestrator assembles an API
envelope that the FastAPI layer returns verbatim to the frontend.  Unmapped
fields flow into a review queue rather than being silently dropped — **so the
system is honest about uncertainty by design.**

For the full story see [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).
For the NAISC-submission write-up see
[`docs/TEXT_DESCRIPTION.md`](docs/TEXT_DESCRIPTION.md).

---

## Sample inputs → sample outputs

| Input (`data/synthetic_data_sample/`) | Output (`samples/outputs/`) | Format | Normalized / Events / Review |
|----------------------------------------|------------------------------|--------|------------------------------|
| `dry_etch_vendorA.json`                | `dry_etch_vendorA.json`      | JSON   | 3 / 11 / 3                   |
| `dry_etch_vendorB.json`                | `dry_etch_vendorB.json`      | JSON   | 0 / 24 / 8                   |
| `dry_etch_vendorC.parquet`             | `dry_etch_vendorC.json`      | Parquet| 4 / 100 / 7                  |
| `sensor_trace.csv`                     | `sensor_trace.json`          | CSV    | 5 / 22 / 0                   |
| `euv_scanner_dose_recipe.xml`          | `euv_scanner_dose_recipe.json`| XML   | 6 / 0 / 17                   |
| `euv_event_log.txt`                    | `euv_event_log.json`         | TXT    | 4 / 12 / 0                   |
| `cmp_syslog_kvp.log`                   | `cmp_syslog_kvp.json`        | Syslog | 9 / 18 / 13                  |
| `highspeed_diag.bin`                   | `highspeed_diag.json`        | Binary | 3 / 15 / 0                   |

All eight validate through the `/parse-and-normalize` endpoint with
`validationPassed=True`.

---

## License / submission

Prepared as a solo submission for the **Micron @ AISG NAISC 2026**
(Problem Statement 3 — Smart Tool Log Parser).

See [`docs/TEXT_DESCRIPTION.md`](docs/TEXT_DESCRIPTION.md) for the full
submission deliverable.
