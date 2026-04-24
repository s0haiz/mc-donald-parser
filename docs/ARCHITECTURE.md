# LogIQ — Architecture

This document is the deep-dive companion to [`README.md`](../README.md) and
[`TEXT_DESCRIPTION.md`](TEXT_DESCRIPTION.md).  It covers the **why** behind
each design decision, the **data contract** between the backend and the
frontend, and the **extension points** that were explicitly built in so that
adding a new tool family or a new log format does not require touching the
dashboard.

---

## System at a glance

```
┌────────────────────────────────────────────────────────────────────────────┐
│                          Browser (Vite + React)                            │
│                                                                            │
│   Dashboard ──drag─▶  UploadDialog ──POST──▶  /parse-and-normalize         │
│        │                    ▲                         │                    │
│        │              ConnectionIndicator             ▼                    │
│        ▼                    ▲              ┌──────────────────┐            │
│   ToolPage                  │              │   FastAPI        │            │
│   ├ Normalized   ◀──────────┴──────────────│   wrapper        │            │
│   ├ Events                                 │   (main.py)      │            │
│   ├ Review                                 └────────┬─────────┘            │
│   └ Raw                                             │                      │
│                                                     ▼                      │
│                                           ┌───────────────────┐            │
│                                           │ parse_and_        │            │
│                                           │ normalize()       │            │
│                                           │ (orchestrator)    │            │
│                                           └────────┬──────────┘            │
│                                                    │                       │
│               ┌────────────────────────────────────┼──────┐                │
│               ▼                                    ▼      ▼                │
│        format detect                        adapter    mapper              │
│        (magic + ext)                        (7 kinds) (3-tier)             │
└────────────────────────────────────────────────────────────────────────────┘
```

Everything flows **one direction** per request — browser → FastAPI →
orchestrator → (adapter → mapper → normalize) → envelope → browser.  There
is no server-side database, no background queue, no cache.  Each upload is a
stateless round-trip, which makes the system trivially testable and
trivially reproducible (the 8 pre-computed envelopes in `samples/outputs/`
are byte-identical to what a fresh run produces).

---

## Data contract — the canonical envelope

Every successful `/parse-and-normalize` call returns one `ParsedEnvelope`
(TypeScript type in `frontend/src/app/data/mockData.ts`, Python dataclass in
`backend/parser/canonical.py`).  Both sides are kept in lockstep; the
TypeScript type is the frontend-facing specification.

```ts
interface ParsedEnvelope {
  fileId:            string            // stable hash of the input
  fileName:          string
  format:            "json" | "xml" | "csv" | "parquet"
                   | "syslog" | "txt" | "binary"
  toolType:          string | null     // "dry_etch" | "euv_scanner" | "cmp" | …
  vendor:            string | null
  timestamp:         string | null     // ISO 8601, log-wide earliest seen
  normalizedFields:  Record<string, NormalizedField>
  rawFields:         Record<string, unknown>  // verbatim, for debugging
  events:            ParsedEvent[]
  reviewQueue:       ReviewQueueItem[]
  mappingMetadata:   { totalFields, mapped, unmapped, methodCounts }
  validationPassed:  boolean
  parserMeta:        { adapterVersion, parseDurationMs, … }
}
```

The three sub-types matter more than the envelope itself:

### `NormalizedField`

```ts
interface NormalizedField {
  value:        unknown      // already unit-converted and typed
  unit:         string | null
  method:       "alias" | "fuzzy" | "llm"
  confidence:   number       // 0.0 – 1.0
  sourceField:  string       // the raw key we read this out of
}
```

**Why the `sourceField` round-trip matters.**  Without it, a reviewer looking
at the "chamber_pressure_torr" row in the normalized table has no way to
audit where that number came from.  Keeping the source name lets every
display row be clickable-back to the raw payload — a hard requirement for
operator trust.

### `ReviewQueueItem`

```ts
interface ReviewQueueItem {
  rawField:             string
  suggestedCanonical:   string | null  // best fuzzy guess, if any
  confidence:           number         // always below the accept threshold
  sampleValue?:         unknown        // first non-null value seen
}
```

The review queue is the **explicit anti-dropping guarantee**.  Any raw field
that didn't clear the 0.70 confidence bar ends up here with its best-guess
canonical target, for a human to accept/reject.  It is the single most
important UX feature of the system — the parser says "I looked at this,
here's my guess, I'm not sure" rather than silently throwing it away.

### `ParsedEvent`

```ts
interface ParsedEvent {
  lineNumber:       number
  timestamp:        string | null
  lineType:         "ALARM" | "WARNING" | "SENSOR_READ"
                  | "PROCESS_STEP" | "INFO"
  extractedParams:  Record<string, unknown>
}
```

Events are deliberately **separate** from fields.  Fields are per-log
aggregates (e.g. "this recipe's target temperature"); events are per-line
transcript entries (e.g. "at line 412 an alarm fired").  Conflating them
into a single stream was an early design we rejected — the display needs
are too different.

---

## The 3-tier mapping cascade

This is the core parsing idea.  Given a raw field name like
`ch_pres_torr_mean`, how do we know it means `chamber_pressure_torr`?

### Tier 1 — Alias match  (confidence = 1.0)

A hand-curated dictionary in `backend/parser/canonical.py` lists all known
vendor spellings for each canonical field, scoped by tool type:

```python
ALIASES["dry_etch"]["chamber_pressure_torr"] = [
    "chamberPressure", "chamber_pres", "chPresTorr",
    "ch_pres_torr_mean", "CHAMBER_PRESSURE",
]
```

Case-insensitive, underscore/camel-case normalized.  If the raw field
matches, we're done — confidence 1.0, method "alias".

### Tier 2 — Fuzzy match  (confidence 0.70 – 0.99)

If no alias hits, we run a `rapidfuzz.ratio` against every canonical field
name in the tool-type's schema.  The best match above the **0.70 threshold**
wins; confidence is the fuzz ratio divided by 100.

Why 0.70?  Empirically, ratios below 0.70 start matching unrelated tokens
(`pressure` vs `presence`).  The bar is deliberately conservative — we'd
rather push a borderline field into the review queue than auto-map it wrong.

### Tier 3 — LLM fallback  (optional, confidence fixed 0.75)

If an OpenAI API key is configured (`OPENAI_API_KEY` env var), fields that
fell through tiers 1 and 2 get one more shot via a deterministic prompt:
"Given these canonical names, which does `<raw>` map to?  Respond with one
name or NONE."  Results are confidence 0.75 / method "llm".  If no key is
configured, Tier 3 is skipped entirely and these fields go straight to the
review queue — the parser is **fully functional without any LLM access**.

### What doesn't clear any tier

Gets a `ReviewQueueItem` with `suggestedCanonical` set to the best fuzzy
match (even below threshold, for context) and its raw sample value.

---

## Format detection

`backend/parser/formats.py` does a two-pass check:

1. **Magic bytes** — first 16 bytes of the file, matched against a small
   table (`PAR1` for Parquet, `MCRN` for our custom binary, `<` for XML,
   `{` or `[` for JSON, …).
2. **Extension + heuristic** — if magic is ambiguous, fall back on the
   filename extension, then on structural hints (e.g. RFC-3164 prefix →
   syslog, key=value lines → KVP-text).

Detection is **orthogonal** from tool-type.  The frontend passes a
`toolType` hint along with the file (derived from the tool the user picked
in the dropdown) — that hint scopes the mapper's alias dictionary, but does
not affect format detection.

---

## Adapters — `ParsedLog` as the internal contract

Every adapter (one per format) produces the same internal structure:

```python
@dataclass
class ParsedLog:
    rawFields:  dict[str, Any]
    events:     list[RawEvent]
    detectedFormat: str
    detectedTimestamp: str | None
```

The orchestrator never sees format-specific code.  To add a ninth format,
you write a new adapter, register it in `parser/adapters/__init__.py`,
and **that's it** — no mapper change, no frontend change, no envelope
change.

---

## The frontend as a thin viewer

The React SPA does almost nothing beyond rendering the envelope.  The only
real state it holds is the **UploadedLogsContext** — a session-only
React Context that maps `toolId → LogFile[]` for logs uploaded during the
current browser session.  On refresh, uploaded logs disappear; mock logs
remain (they're hard-coded in `mockData.ts`).  This was a deliberate
simplification for the demo — persisting uploads would have required a
backend database we didn't need.

Key components:

- **`UploadDialog.tsx`** — two-step flow: drag/pick file → tool selector
  dialog → POST to backend.  Uses `toolTypeForFolder()` to map the selected
  tool's folder ID to a `tool_type` hint the parser understands.
- **`EnrichedLogViewer.tsx`** — the 4-tab viewer
  (Normalized / Events / Review / Raw).  Falls back to a plain JSON viewer
  for mock logs that don't have a parsed envelope attached.
- **`ConnectionIndicator.tsx`** — pings `/health` every 15 s and shows a
  red/green dot.  Kept deliberately understated — it's a debugging aid,
  not a feature.

---

## What's deliberately *not* here

- **Persistence**.  No database, no file storage.  Uploaded logs live in
  React state for the current session only.
- **Auth**.  No login, no user model.  The demo is local-only.
- **Trend analytics across multiple logs**.  The display is per-log.
  Multi-log analytics would require a database layer we haven't built.
- **Write-back / operator actions on the review queue**.  The queue is
  read-only in this version — it shows what a human *would* need to
  confirm, but the confirmation UI is out of scope for the demo.

These cutoffs are noted in `docs/TEXT_DESCRIPTION.md` under "future work".

---

## Extending the system

### Add a new tool family

1. Add an entry to `backend/parser/canonical.py` under `TOOL_TYPES` with
   the family's canonical fields + aliases.
2. Add folder + mock tool entries to `frontend/src/app/data/mockData.ts`.
3. Extend `toolTypeForFolder()` in `UploadDialog.tsx` to map the new
   folder ID to the new tool-type string.
4. (Optional) Drop a sample log into `data/synthetic_data_sample/`.

### Add a new log format

1. Write an adapter class under `backend/parser/adapters/` implementing
   the `Adapter` protocol (`parse(bytes) -> ParsedLog`).
2. Register it in `parser/adapters/__init__.py`.
3. Add a magic-byte rule to `parser/formats.py`.
4. Extend the `LogFile["format"]` union in `mockData.ts` and the icon map
   in `LogRow.tsx` (one entry each).

No mapper change, no envelope change, no dashboard re-wire required —
this is the extension point the architecture was designed around.
