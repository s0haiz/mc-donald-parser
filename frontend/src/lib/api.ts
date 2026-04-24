/**
 * API client for the NAISC Smart Tool Log Parser backend.
 *
 * The backend lives in `../backend/` (FastAPI, port 8000 by default).
 * Override with VITE_API_URL in .env.local.
 */
import {
  envelopeToFlatNormalised,
  formatFromEnvelope,
  type LogFile,
  type ParsedEnvelope,
} from "../app/data/mockData";

const API_URL: string =
  (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:8000";

export interface ParseLogOptions {
  toolType?: string | null;
  vendor?: string | null;
  /** Override AbortSignal — useful for cancelling uploads from a UI. */
  signal?: AbortSignal;
}

export class ParserApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly detail?: unknown,
  ) {
    super(message);
    this.name = "ParserApiError";
  }
}

/**
 * POST a file to /parse-and-normalize. Returns the raw envelope verbatim.
 * Throws ParserApiError on HTTP failure.
 */
export async function parseLog(
  file: File,
  opts: ParseLogOptions = {},
): Promise<ParsedEnvelope> {
  const form = new FormData();
  form.append("file", file, file.name);
  if (opts.toolType) form.append("tool_type", opts.toolType);
  if (opts.vendor) form.append("vendor", opts.vendor);

  let res: Response;
  try {
    res = await fetch(`${API_URL}/parse-and-normalize`, {
      method: "POST",
      body: form,
      signal: opts.signal,
    });
  } catch (err) {
    throw new ParserApiError(
      `Could not reach parser backend at ${API_URL}. Is it running?`,
      undefined,
      err,
    );
  }

  if (!res.ok) {
    let detail: unknown;
    try {
      detail = await res.json();
    } catch {
      detail = await res.text().catch(() => undefined);
    }
    throw new ParserApiError(
      `Parser returned ${res.status}`,
      res.status,
      detail,
    );
  }

  return (await res.json()) as ParsedEnvelope;
}

/**
 * Convenience wrapper: parse a file and build a ready-to-use LogFile that
 * slots into the existing `mockLogs` shape. The original raw text is read
 * on the client so the UI can show both raw and normalized views.
 */
export async function parseLogToLogFile(
  file: File,
  opts: ParseLogOptions = {},
): Promise<LogFile> {
  // Kick off parse + raw read concurrently.
  const [envelope, rawContent] = await Promise.all([
    parseLog(file, opts),
    readFileAsText(file),
  ]);

  const ts = envelope.timestamp ? new Date(envelope.timestamp) : new Date();

  return {
    id: envelope.fileId,
    filename: envelope.fileName || file.name,
    timestamp: Number.isNaN(ts.getTime()) ? new Date() : ts,
    format: formatFromEnvelope(envelope.format),
    parsed: envelope.validationPassed,
    rawContent,
    normalisedContent: envelopeToFlatNormalised(envelope),
    envelope,
  };
}

/**
 * Health check. Useful for a connection indicator in the UI.
 */
export async function pingBackend(signal?: AbortSignal): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/health`, { signal });
    return res.ok;
  } catch {
    return false;
  }
}

// ─────────────────────────── internals ───────────────────────────

function readFileAsText(file: File): Promise<string> {
  // Binary files should be shown as hex, not UTF-8 gibberish. The backend
  // tells us via envelope.format but we read concurrently, so we do a
  // best-effort readAsText here. Callers can replace rawContent with a
  // hex dump after inspecting the envelope if they want.
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

export { API_URL };
