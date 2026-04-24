# LogIQ — Handover TODO

Repo: https://github.com/s0haiz/mc-donald-parser  
Stack: Python 3.10 + FastAPI (backend) · Vite + React + TypeScript (frontend)

---

## Priority 1 — Must do before submission

### Generate sample outputs
Run the parser against all 8 input files and commit the results to `samples/outputs/`.
The judges expect pre-computed envelopes they can review without running code.

```bash
cd backend
.venv/Scripts/Activate.ps1          # Windows
source .venv/bin/activate           # Mac/Linux

python -m parser.cli ../data/synthetic_data_sample/dry_etch_vendorA.json    -o ../samples/outputs/dry_etch_vendorA.json
python -m parser.cli ../data/synthetic_data_sample/dry_etch_vendorB.json    -o ../samples/outputs/dry_etch_vendorB.json
python -m parser.cli ../data/synthetic_data_sample/dry_etch_vendorC.parquet -o ../samples/outputs/dry_etch_vendorC.json
python -m parser.cli ../data/synthetic_data_sample/sensor_trace.csv         -o ../samples/outputs/sensor_trace.json
python -m parser.cli ../data/synthetic_data_sample/euv_scanner_dose_recipe.xml -o ../samples/outputs/euv_scanner_dose_recipe.json
python -m parser.cli ../data/synthetic_data_sample/euv_event_log.txt        -o ../samples/outputs/euv_event_log.json
python -m parser.cli ../data/synthetic_data_sample/cmp_syslog_kvp.log       -o ../samples/outputs/cmp_syslog_kvp.json
python -m parser.cli ../data/synthetic_data_sample/highspeed_diag.bin       -o ../samples/outputs/highspeed_diag.json
```

Then `git add samples/ && git commit -m "Add pre-computed sample outputs"`.

---

### Commit missing submission artifacts
These files are referenced in `docs/TEXT_DESCRIPTION.md` but are not in the repo:

- [ ] `Smart Tool Log Parser.json` — n8n workflow file
- [ ] `AI Tool Log Parser (Base).json` — n8n base workflow file
- [ ] `NAISC_Master_Context.md` — master API contract document

Add them to the repo root or a `submission/` folder and commit.

---

### Enable the LLM fallback (Tier 3)
The parser currently runs on Tier 1 (alias) + Tier 2 (fuzzy) only.
To activate Tier 3 (GPT-4o-mini for unmapped fields):

1. Get an OpenAI API key from https://platform.openai.com/api-keys
2. Create `backend/.env`:
   ```
   OPENAI_API_KEY=sk-...
   ```
3. Restart the backend — no code changes needed.

---

## Priority 2 — n8n integration

### Set up n8n locally
```bash
docker run -it --rm -p 5678:5678 -v ~/.n8n:/home/node/.n8n n8nio/n8n
```
Open http://localhost:5678

### Import and configure the workflow
1. Settings → Import → load `Smart Tool Log Parser.json`
2. Add credentials:
   - **OpenAI** — API key from platform.openai.com
   - **Supabase** — project URL + service role key (Supabase dashboard → Settings → API)
3. Set the FastAPI URL node to `http://localhost:8000/parse-and-normalize`
4. Activate the workflow — n8n provides a public webhook URL

### Set up Supabase
The workflow writes to these tables (schema defined in `NAISC_Master_Context.md`):
- `logs` — raw file metadata
- `normalised_logs` — canonical envelopes from the parser
- `review_queue` — fields that couldn't be auto-mapped
- `canonical_keys` / `key_aliases` — mapping dictionary (read-only at runtime)
- `tools` / `tool_key_visibility` — tool registry

---

## Priority 3 — Deployment (if required)

### Backend
Deploy the FastAPI app to Railway, Render, or Docker:
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```
Set `OPENAI_API_KEY` as an environment variable on the host.

### Frontend
```bash
cd frontend
VITE_API_URL=https://your-backend-url npm run build
# deploy the dist/ folder to Vercel, Netlify, or any static host
```

---

## Running locally (quick reference)

```bash
# Terminal 1 — backend
cd backend
.venv/Scripts/Activate.ps1
uvicorn main:app --reload --port 8000

# Terminal 2 — frontend
cd frontend
npm run dev
```

- Backend API: http://localhost:8000/docs
- Frontend: http://localhost:5173
- Sidebar green dot = backend is reachable
