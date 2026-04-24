export interface Tool {
  id: string;
  name: string;
  equipmentType: string;
  vendor: string;
  status: "Active" | "Idle" | "Fault";
  lastLogReceived: Date;
  totalLogCount: number;
  folderId: string; // Added to associate tools with folders
}

export interface ToolFolder {
  id: string;
  name: string;
  toolCount: number;
  activeCount: number;
  idleCount: number;
  faultCount: number;
  lastActivity: Date;
  icon: string;
}

// ────────────────────────────────────────────────────────────────────
// Parser envelope types — match backend/main.py /parse-and-normalize
// response exactly. The backend is the source of truth; keep these in
// sync with parser/orchestrator.py output.
// ────────────────────────────────────────────────────────────────────

export type MappingMethod =
  | "alias_match"
  | "fuzzy_match"
  | "llm_fallback"
  | string;

export interface NormalizedField {
  value: unknown;
  unit: string | null;
  method: MappingMethod;
  confidence: number;
  sourceField: string;
}

export type EventLineType =
  | "ALARM"
  | "WARNING"
  | "PROCESS_STEP"
  | "SENSOR_READ"
  | "INFO"
  | string;

export interface ParsedEvent {
  lineNumber: number;
  timestamp?: string | null;
  lineType: EventLineType;
  extractedParams: Record<string, unknown>;
}

export interface ReviewQueueItem {
  rawField: string;
  suggestedCanonical: string | null;
  confidence: number;
  sampleValue?: unknown;
}

export interface MappingMetaEntry {
  sourceField: string;
  canonical: string | null;
  method: MappingMethod;
  confidence: number;
}

export interface ParsedEnvelope {
  fileId: string;
  fileName: string;
  format: string; // json | xml | csv | parquet | syslog | text | binary
  toolType: string | null;
  vendor: string | null;
  timestamp: string | null;
  normalizedFields: Record<string, NormalizedField>;
  rawFields: Record<string, unknown>;
  events: ParsedEvent[];
  reviewQueue: ReviewQueueItem[];
  mappingMetadata: Record<string, MappingMetaEntry>;
  validationPassed: boolean;
  parserMeta?: Record<string, unknown>;
}

export interface LogFile {
  id: string;
  filename: string;
  timestamp: Date;
  format: "JSON" | "XML" | "CSV" | "TXT" | "PARQUET" | "SYSLOG" | "BINARY";
  parsed: boolean;
  rawContent: string;
  /**
   * Flat view of the normalized fields (canonical_name → value). Always
   * present for back-compat with the existing JSONViewer. When the log
   * came from the parser backend this is derived from envelope.normalizedFields.
   */
  normalisedContent: Record<string, unknown>;
  /**
   * Full parser envelope — present for logs produced by the backend.
   * Undefined for legacy mock logs that pre-date the parser integration.
   */
  envelope?: ParsedEnvelope;
}

/**
 * Collapse the rich normalizedFields map into the flat shape the legacy
 * JSONViewer expects: { canonical_name: value, ... }.
 */
export function envelopeToFlatNormalised(
  envelope: ParsedEnvelope,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, field] of Object.entries(envelope.normalizedFields)) {
    out[key] = field.value;
  }
  return out;
}

/**
 * Map the parser's lowercase format string to the enum the UI uses.
 * Unknown formats default to TXT so the UI can still render.
 */
export function formatFromEnvelope(fmt: string): LogFile["format"] {
  const map: Record<string, LogFile["format"]> = {
    json: "JSON",
    xml: "XML",
    csv: "CSV",
    text: "TXT",
    parquet: "PARQUET",
    syslog: "SYSLOG",
    binary: "BINARY",
  };
  return map[fmt?.toLowerCase()] ?? "TXT";
}

export interface CanonicalKey {
  id: string;
  name: string;
  description: string;
  visible: boolean;
}

export interface CustomKey {
  id: string;
  name: string;
  description: string;
}

// Mock tool folders
export const mockFolders: ToolFolder[] = [
  {
    id: "dry-etch",
    name: "Dry Etch Tools",
    toolCount: 2,
    activeCount: 1,
    idleCount: 1,
    faultCount: 0,
    lastActivity: new Date("2026-03-31T14:23:00"),
    icon: "📁",
  },
  {
    id: "euv-scanners",
    name: "EUV Scanners",
    toolCount: 1,
    activeCount: 1,
    idleCount: 0,
    faultCount: 0,
    lastActivity: new Date("2026-03-31T14:20:00"),
    icon: "📁",
  },
  {
    id: "cvd-tools",
    name: "CVD Tools",
    toolCount: 1,
    activeCount: 0,
    idleCount: 1,
    faultCount: 0,
    lastActivity: new Date("2026-03-31T12:15:00"),
    icon: "📁",
  },
  {
    id: "cmp-tools",
    name: "CMP Tools",
    toolCount: 1,
    activeCount: 0,
    idleCount: 0,
    faultCount: 1,
    lastActivity: new Date("2026-03-31T11:45:00"),
    icon: "📁",
  },
  {
    id: "metrology-tools",
    name: "Metrology Tools",
    toolCount: 0,
    activeCount: 0,
    idleCount: 0,
    faultCount: 0,
    lastActivity: new Date("2026-03-31T10:00:00"),
    icon: "📁",
  },
];

// Mock tools data
export const mockTools: Tool[] = [
  {
    id: "1",
    name: "Dry Etch Tool A",
    equipmentType: "Plasma Etcher",
    vendor: "Lam Research",
    status: "Active",
    lastLogReceived: new Date("2026-03-31T14:23:00"),
    totalLogCount: 1247,
    folderId: "dry-etch",
  },
  {
    id: "2",
    name: "EUV Scanner MCH-001",
    equipmentType: "Lithography",
    vendor: "ASML",
    status: "Active",
    lastLogReceived: new Date("2026-03-31T14:20:00"),
    totalLogCount: 892,
    folderId: "euv-scanners",
  },
  {
    id: "3",
    name: "CVD Chamber B3",
    equipmentType: "Deposition",
    vendor: "Applied Materials",
    status: "Idle",
    lastLogReceived: new Date("2026-03-31T12:15:00"),
    totalLogCount: 2341,
    folderId: "cvd-tools",
  },
  {
    id: "4",
    name: "CMP Polisher 7",
    equipmentType: "Chemical Mechanical Planarization",
    vendor: "Ebara",
    status: "Fault",
    lastLogReceived: new Date("2026-03-31T11:45:00"),
    totalLogCount: 567,
    folderId: "cmp-tools",
  },
  {
    id: "5",
    name: "Dry Etch Tool B",
    equipmentType: "Plasma Etcher",
    vendor: "Tokyo Electron",
    status: "Idle",
    lastLogReceived: new Date("2026-03-31T13:15:00"),
    totalLogCount: 934,
    folderId: "dry-etch",
  },
];

// No mock logs — pages start empty until real files are uploaded and parsed.
export const mockLogs: Record<string, LogFile[]> = {};

// Canonical keys
export const defaultCanonicalKeys: CanonicalKey[] = [
  { id: "ck-1", name: "timestamp", description: "The timestamp of the log entry.", visible: true },
  { id: "ck-2", name: "machine_id", description: "The unique identifier for the machine.", visible: true },
  { id: "ck-3", name: "temperature_celsius", description: "The temperature in Celsius.", visible: true },
  { id: "ck-4", name: "pressure_torr", description: "The pressure in torr.", visible: true },
  { id: "ck-5", name: "alarm_code", description: "The alarm code, if any.", visible: true },
  { id: "ck-6", name: "process_step", description: "The current process step.", visible: false },
  { id: "ck-7", name: "wafer_id", description: "The unique identifier for the wafer.", visible: false },
  { id: "ck-8", name: "recipe_name", description: "The name of the recipe being used.", visible: false },
  { id: "ck-9", name: "chamber_id", description: "The unique identifier for the chamber.", visible: true },
  { id: "ck-10", name: "gas_flow_rate", description: "The gas flow rate.", visible: false },
  { id: "ck-11", name: "voltage", description: "The voltage.", visible: false },
  { id: "ck-12", name: "current", description: "The current.", visible: false },
];

// Custom keys
export const defaultCustomKeys: CustomKey[] = [
  {
    id: "custom-1",
    name: "rf_power_watts",
    description: "The RF power output of the chamber in watts. Look for fields named rf_power, RFPower, or similar.",
  },
];