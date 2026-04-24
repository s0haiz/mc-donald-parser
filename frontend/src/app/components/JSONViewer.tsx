import { useState } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";

interface JSONViewerProps {
  data: Record<string, unknown> | string;
  isRaw?: boolean;
  customKeys?: string[];
}

export function JSONViewer({ data, isRaw = false, customKeys = [] }: JSONViewerProps) {
  if (isRaw && typeof data === "string") {
    return (
      <pre className="font-mono text-sm text-foreground whitespace-pre-wrap p-4">
        {data}
      </pre>
    );
  }

  if (typeof data === "object" && data !== null) {
    return (
      <div className="p-4 space-y-1 font-mono text-sm">
        <JSONObject data={data} customKeys={customKeys} />
      </div>
    );
  }

  return null;
}

interface JSONObjectProps {
  data: Record<string, unknown>;
  customKeys: string[];
  depth?: number;
}

function JSONObject({ data, customKeys, depth = 0 }: JSONObjectProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggleExpanded = (key: string) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className={depth > 0 ? "ml-4" : ""}>
      {depth === 0 && <div className="text-muted-foreground">{"{"}</div>}
      {Object.entries(data).map(([key, value], index) => {
        const isCustomKey = customKeys.includes(key);
        const isExpandable = typeof value === "object" && value !== null;
        const isExpanded = expanded[key] ?? true;

        return (
          <div key={key}>
            <div className="flex items-start gap-2 py-0.5 group">
              {isExpandable ? (
                <button
                  onClick={() => toggleExpanded(key)}
                  className="shrink-0 mt-0.5 hover:bg-accent rounded p-0.5"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-3 h-3 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="w-3 h-3 text-muted-foreground" />
                  )}
                </button>
              ) : (
                <span className="w-4 shrink-0" />
              )}
              
              <span className="text-cyan-400">"{key}"</span>
              <span className="text-muted-foreground">:</span>
              
              {isCustomKey && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30">
                  custom
                </span>
              )}
              
              {!isExpandable && (
                <span className={getValueColor(value)}>
                  {formatValue(value)}
                </span>
              )}
            </div>
            
            {isExpandable && isExpanded && (
              <div className="ml-4">
                {Array.isArray(value) ? (
                  <JSONArray data={value} customKeys={customKeys} />
                ) : (
                  <JSONObject data={value as Record<string, unknown>} customKeys={customKeys} depth={depth + 1} />
                )}
              </div>
            )}
          </div>
        );
      })}
      {depth === 0 && <div className="text-muted-foreground">{"}"}</div>}
    </div>
  );
}

function JSONArray({ data, customKeys }: { data: unknown[]; customKeys: string[] }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 hover:bg-accent rounded px-1"
      >
        {expanded ? (
          <ChevronDown className="w-3 h-3 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-3 h-3 text-muted-foreground" />
        )}
        <span className="text-muted-foreground">[{data.length}]</span>
      </button>
      
      {expanded && (
        <div className="ml-4">
          {data.map((item, index) => (
            <div key={index} className="py-0.5">
              {typeof item === "object" && item !== null ? (
                <JSONObject data={item as Record<string, unknown>} customKeys={customKeys} depth={1} />
              ) : (
                <span className={getValueColor(item)}>{formatValue(item)}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function getValueColor(value: unknown): string {
  if (value === null) return "text-purple-400";
  if (typeof value === "string") return "text-green-400";
  if (typeof value === "number") return "text-orange-400";
  if (typeof value === "boolean") return "text-blue-400";
  return "text-foreground";
}

function formatValue(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string") return `"${value}"`;
  return String(value);
}
