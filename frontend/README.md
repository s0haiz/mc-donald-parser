# LogIQ — NAISC Micron Smart Tool Log Parser

End-to-end submission for the Micron @ AISG National AI Student Challenge 2026.

A full-stack prototype that ingests raw semiconductor tool logs in seven
different formats (JSON, XML, CSV, Parquet, syslog, plain-text, custom
binary MCRN), normalizes every field through a deterministic 3-tier
mapping cascade, and renders the result in an interactive dashboard.

---

## Repository layout

```
LogIQ Dashboard Design/
├── src/                      Vite + React + TypeScript frontend
│   ├── app/
│   │   ├── pages/            Dashboard / FolderPage / ToolPage / ToolSettings
│   │   ├── components/       UploadDialog, EnrichedLogViewer, JSONViewer, …
│   │   ├── context/          UploadedLogsContext (React state store)
│   │   └── data/mockData.ts  Canonical envelope types + mock fixtures
│   └── lib/api.ts            Typed API client for the parser backend
├── backend/                  Python parser + FastAPI wrapper
│   ├── parser/               7 adapters, 3-tier mapper, canonical schema
│   ├── main.py               POST /parse-and-normalize
│   └── requirements.txt
├── submission/               Deliverables bundled for the judges
│   ├── docs/
│   │   ├── TEXT_DESCRIPTION.md    Deliverable #3 (features / APIs / assets)
│   │   └── PARSER_README.md       Parser package guide
│   ├── sample_outputs/       Pre-computed canonical envelopes (8 samples)
│   └── demo/index.html       Static offline demo page
└── .env.local                VITE_API_URL=http://localhost:8000
```

---

## Running locally

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
pnpm install
pnpm dev
```

App: http://localhost:5173

The sidebar shows a green dot when the backend is reachable.

---

## Demo flow

1. Open the app — sidebar shows "backend online".
2. On the Dashboard, drag any sample log from
   `submission/sample_outputs/`'s source files (or your own) onto the
   upload zone. Supported: `.json`, `.xml`, `.csv`, `.parquet`,
   `.txt`, `.log`, `.bin`.
3. In the dialog, pick a tool to attach the log to (dropdown is grouped
   by folder: Dry Etch, EUV Scanners, CMP Tools, …).
4. The parser normalizes it in < 1 second and the dashboard navigates
   to the tool page showing four tabs:
   - **Normalized** — canonical fields with confidence pills (green ≥ 95%, amber 70–94%, red < 70%), unit chips, source field names, and mapping method (alias / fuzzy / llm).
   - **Events** — extracted events with line-type chips (ALARM, WARNING, SENSOR_READ, PROCESS_STEP, INFO) and timestamps.
   - **Review** — raw fields that couldn't be confidently mapped — the system's "honest unknown" queue, seeded for operator confirmation.
   - **Raw** — the full envelope for debugging.

---

## Architecture in one sentence

Format-agnostic adapters produce a uniform `ParsedLog`; a deterministic
3-tier mapper (alias → fuzzy → optional LLM fallback) normalizes every
field against a canonical schema with per-tool-type scoping; the
orchestrator assembles an API envelope that the FastAPI layer returns
verbatim to the frontend. Unmapped fields flow into a review queue
rather than being silently dropped — so the system is honest about
uncertainty by design.

See `submission/docs/TEXT_DESCRIPTION.md` for the full deliverable.
