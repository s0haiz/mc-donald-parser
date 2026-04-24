/**
 * EnrichedLogViewer
 *
 * Renders the full parser envelope across four tabs:
 *   - Normalized  — canonical fields with confidence pills, unit chips, source-field name
 *   - Events      — event list with line-type chips and timestamps
 *   - Review      — unmapped raw fields that landed in the review queue
 *   - Raw JSON    — the full envelope for debugging
 *
 * Falls back to the plain JSONViewer for legacy logs that have no envelope
 * (i.e. the mock data).
 */
import { useState } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Activity,
  Info,
  CornerDownRight,
} from "lucide-react";

import { JSONViewer } from "./JSONViewer";
import type {
  EventLineType,
  LogFile,
  MappingMethod,
  NormalizedField,
  ParsedEnvelope,
  ParsedEvent,
  ReviewQueueItem,
} from "../data/mockData";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

interface EnrichedLogViewerProps {
  log: LogFile;
  customKeys?: string[];
}

export function EnrichedLogViewer({ log, customKeys = [] }: EnrichedLogViewerProps) {
  if (!log.envelope) {
    // Legacy mock logs: fall through to the original viewer.
    return log.parsed ? (
      <JSONViewer data={log.normalisedContent} customKeys={customKeys} />
    ) : (
      <div className="p-6 text-center text-muted-foreground text-sm">
        <p>This log has not been parsed yet</p>
      </div>
    );
  }

  const env = log.envelope;
  const normalizedCount = Object.keys(env.normalizedFields).length;
  const eventsCount = env.events.length;
  const reviewCount = env.reviewQueue.length;

  return (
    <div className="flex flex-col h-full">
      <EnvelopeHeader envelope={env} />

      <Tabs defaultValue="normalized" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="mx-6 mt-2 w-fit">
          <TabsTrigger value="normalized">
            Normalized <span className="ml-1.5 text-muted-foreground">{normalizedCount}</span>
          </TabsTrigger>
          <TabsTrigger value="events">
            Events <span className="ml-1.5 text-muted-foreground">{eventsCount}</span>
          </TabsTrigger>
          <TabsTrigger value="review">
            Review <span className="ml-1.5 text-muted-foreground">{reviewCount}</span>
          </TabsTrigger>
          <TabsTrigger value="raw">Raw</TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-auto">
          <TabsContent value="normalized" className="m-0 p-6 pt-4">
            <NormalizedFieldsTable fields={env.normalizedFields} />
          </TabsContent>
          <TabsContent value="events" className="m-0 p-6 pt-4">
            <EventsTable events={env.events} />
          </TabsContent>
          <TabsContent value="review" className="m-0 p-6 pt-4">
            <ReviewQueueTable items={env.reviewQueue} />
          </TabsContent>
          <TabsContent value="raw" className="m-0">
            <JSONViewer
              data={env as unknown as Record<string, unknown>}
              customKeys={customKeys}
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

// ──────────────────────────────────────────────────── header strip ─

function EnvelopeHeader({ envelope }: { envelope: ParsedEnvelope }) {
  const badges: Array<{ label: string; value: string | null | undefined }> = [
    { label: "format", value: envelope.format },
    { label: "tool", value: envelope.toolType },
    { label: "vendor", value: envelope.vendor },
  ];

  return (
    <div className="px-6 py-3 border-b border-border bg-card/40 flex items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {badges.map(
          (b) =>
            b.value && (
              <span key={b.label} className="flex items-center gap-1.5">
                <span className="text-muted-foreground">{b.label}:</span>
                <span className="font-mono px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground">
                  {b.value}
                </span>
              </span>
            ),
        )}
      </div>
      <div className="flex items-center gap-1.5 text-xs shrink-0">
        {envelope.validationPassed ? (
          <>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-emerald-500">validated</span>
          </>
        ) : (
          <>
            <AlertOctagon className="w-3.5 h-3.5 text-red-500" />
            <span className="text-red-500">validation failed</span>
          </>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────── normalized ─

function NormalizedFieldsTable({
  fields,
}: {
  fields: Record<string, NormalizedField>;
}) {
  const entries = Object.entries(fields);
  if (entries.length === 0) {
    return (
      <EmptyState
        title="No normalized fields"
        hint="Every raw field fell through to the review queue."
      />
    );
  }

  return (
    <div className="rounded-md border border-border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-secondary/60 text-muted-foreground text-xs">
          <tr>
            <th className="text-left px-3 py-2 font-medium">Canonical field</th>
            <th className="text-left px-3 py-2 font-medium">Value</th>
            <th className="text-left px-3 py-2 font-medium">Unit</th>
            <th className="text-left px-3 py-2 font-medium">Source</th>
            <th className="text-left px-3 py-2 font-medium">Method</th>
            <th className="text-right px-3 py-2 font-medium">Confidence</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([canonical, field]) => (
            <tr
              key={canonical}
              className="border-t border-border hover:bg-accent/30"
            >
              <td className="px-3 py-2 font-mono text-cyan-400">{canonical}</td>
              <td className="px-3 py-2 font-mono">{formatValue(field.value)}</td>
              <td className="px-3 py-2 text-muted-foreground">
                {field.unit ? (
                  <span className="px-1.5 py-0.5 rounded bg-secondary text-xs font-mono">
                    {field.unit}
                  </span>
                ) : (
                  <span className="text-muted-foreground/60">—</span>
                )}
              </td>
              <td className="px-3 py-2 font-mono text-muted-foreground text-xs">
                <span className="inline-flex items-center gap-1">
                  <CornerDownRight className="w-3 h-3 opacity-60" />
                  {field.sourceField}
                </span>
              </td>
              <td className="px-3 py-2">
                <MethodBadge method={field.method} />
              </td>
              <td className="px-3 py-2 text-right">
                <ConfidencePill confidence={field.confidence} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ConfidencePill({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  const tone =
    confidence >= 0.95
      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
      : confidence >= 0.7
        ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
        : "bg-red-500/15 text-red-400 border-red-500/30";

  return (
    <span
      className={`inline-block min-w-[3rem] text-center text-xs font-mono px-1.5 py-0.5 rounded border ${tone}`}
    >
      {pct}%
    </span>
  );
}

function MethodBadge({ method }: { method: MappingMethod }) {
  const labels: Record<string, { label: string; tone: string }> = {
    alias_match: {
      label: "alias",
      tone: "bg-sky-500/15 text-sky-400 border-sky-500/30",
    },
    fuzzy_match: {
      label: "fuzzy",
      tone: "bg-violet-500/15 text-violet-400 border-violet-500/30",
    },
    llm_fallback: {
      label: "llm",
      tone: "bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/30",
    },
  };
  const entry = labels[method] ?? {
    label: method,
    tone: "bg-secondary text-secondary-foreground border-border",
  };
  return (
    <span
      className={`inline-block text-xs font-mono px-1.5 py-0.5 rounded border ${entry.tone}`}
    >
      {entry.label}
    </span>
  );
}

// ──────────────────────────────────────────────────── events ─

function EventsTable({ events }: { events: ParsedEvent[] }) {
  if (events.length === 0) {
    return <EmptyState title="No events extracted" hint="The adapter produced a pure sensor snapshot with no timestamped entries." />;
  }

  return (
    <div className="rounded-md border border-border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-secondary/60 text-muted-foreground text-xs">
          <tr>
            <th className="text-left px-3 py-2 font-medium w-12">#</th>
            <th className="text-left px-3 py-2 font-medium">Type</th>
            <th className="text-left px-3 py-2 font-medium">Timestamp</th>
            <th className="text-left px-3 py-2 font-medium">Details</th>
          </tr>
        </thead>
        <tbody>
          {events.map((ev) => (
            <tr
              key={ev.lineNumber}
              className="border-t border-border hover:bg-accent/30 align-top"
            >
              <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                {ev.lineNumber}
              </td>
              <td className="px-3 py-2">
                <EventTypeChip type={ev.lineType} />
              </td>
              <td className="px-3 py-2 font-mono text-xs text-muted-foreground whitespace-nowrap">
                {ev.timestamp ?? "—"}
              </td>
              <td className="px-3 py-2">
                <EventDetails params={ev.extractedParams} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EventTypeChip({ type }: { type: EventLineType }) {
  const styles: Record<string, { tone: string; Icon: typeof AlertTriangle }> = {
    ALARM: {
      tone: "bg-red-500/15 text-red-400 border-red-500/30",
      Icon: AlertOctagon,
    },
    WARNING: {
      tone: "bg-amber-500/15 text-amber-400 border-amber-500/30",
      Icon: AlertTriangle,
    },
    SENSOR_READ: {
      tone: "bg-sky-500/15 text-sky-400 border-sky-500/30",
      Icon: Activity,
    },
    PROCESS_STEP: {
      tone: "bg-violet-500/15 text-violet-400 border-violet-500/30",
      Icon: CornerDownRight,
    },
    INFO: {
      tone: "bg-secondary text-muted-foreground border-border",
      Icon: Info,
    },
  };

  const entry = styles[type] ?? styles.INFO;
  const { Icon, tone } = entry;

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-mono px-1.5 py-0.5 rounded border whitespace-nowrap ${tone}`}
    >
      <Icon className="w-3 h-3" />
      {type}
    </span>
  );
}

function EventDetails({ params }: { params: Record<string, unknown> }) {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== null && v !== undefined && v !== "",
  );
  if (entries.length === 0) {
    return <span className="text-muted-foreground/60 text-xs">—</span>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {entries.map(([k, v]) => (
        <span
          key={k}
          className="text-xs font-mono px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground"
        >
          <span className="text-muted-foreground">{k}:</span> {formatValue(v)}
        </span>
      ))}
    </div>
  );
}

// ──────────────────────────────────────────────────── review queue ─

function ReviewQueueTable({ items }: { items: ReviewQueueItem[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        title="Review queue is empty"
        hint="Every raw field was confidently mapped to a canonical key."
      />
    );
  }
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        These raw fields could not be confidently mapped to a canonical key. A
        human operator confirms or corrects the mapping, and the decision is
        learned back into the alias table for next time.
      </p>
      <div className="rounded-md border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 text-muted-foreground text-xs">
            <tr>
              <th className="text-left px-3 py-2 font-medium">Raw field</th>
              <th className="text-left px-3 py-2 font-medium">Sample value</th>
              <th className="text-left px-3 py-2 font-medium">Suggested</th>
              <th className="text-right px-3 py-2 font-medium">Confidence</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                key={item.rawField}
                className="border-t border-border hover:bg-accent/30"
              >
                <td className="px-3 py-2 font-mono text-cyan-400">
                  {item.rawField}
                </td>
                <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                  {formatValue(item.sampleValue)}
                </td>
                <td className="px-3 py-2 font-mono text-xs">
                  {item.suggestedCanonical ? (
                    <span className="text-amber-400">
                      {item.suggestedCanonical}
                    </span>
                  ) : (
                    <span className="text-muted-foreground/60">— unknown —</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  <ConfidencePill confidence={item.confidence} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────── shared helpers ─

function EmptyState({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="py-10 text-center text-sm">
      <p className="text-foreground">{title}</p>
      <p className="text-muted-foreground text-xs mt-1">{hint}</p>
    </div>
  );
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value;
  if (typeof value === "number") {
    // Keep reasonable precision without scientific notation explosion
    if (Number.isInteger(value)) return String(value);
    const abs = Math.abs(value);
    if (abs < 0.001 || abs >= 1_000_000) return value.toExponential(3);
    return Number(value.toFixed(4)).toString();
  }
  if (typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
