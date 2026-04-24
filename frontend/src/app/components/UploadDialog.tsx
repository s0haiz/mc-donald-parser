/**
 * UploadDialog
 *
 * Drop a file (or click to pick one) — the parser backend auto-detects the
 * format and infers the tool type. No manual selection required.
 *
 * After a successful parse the log is attached to the first tool that matches
 * the inferred toolType and the user is navigated there automatically.
 */
import { useCallback, useRef, useState, type DragEvent as ReactDragEvent } from "react";
import { useNavigate } from "react-router";
import { Upload, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

import { mockTools } from "../data/mockData";
import type { Tool } from "../data/mockData";
import { useUploadedLogs } from "../context/UploadedLogsContext";
import { parseLogToLogFile, ParserApiError } from "../../lib/api";
import { Button } from "./ui/button";

// Map backend toolType strings to folder IDs so we can navigate there.
const TOOL_TYPE_TO_FOLDER: Record<string, string> = {
  dry_etch: "dry-etch",
  euv_scanner: "euv-scanners",
  cmp: "cmp-tools",
};

function findBestTool(toolType: string | null | undefined): Tool | undefined {
  if (toolType) {
    const folderId = TOOL_TYPE_TO_FOLDER[toolType];
    if (folderId) {
      const match = mockTools.find((t) => t.folderId === folderId);
      if (match) return match;
    }
  }
  // Fallback: first tool in the list
  return mockTools[0];
}

export function UploadDialog() {
  const navigate = useNavigate();
  const { addLog } = useUploadedLogs();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [dragActive, setDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const openPicker = () => fileInputRef.current?.click();

  const handleFile = useCallback(
    async (file: File) => {
      if (isUploading) return;
      setIsUploading(true);
      const toastId = toast.loading(`Parsing ${file.name}…`);

      try {
        // Backend auto-detects format and infers toolType — no hints needed.
        const logFile = await parseLogToLogFile(file, {});

        const tool = findBestTool(logFile.envelope?.toolType);

        if (tool) {
          addLog(tool.id, logFile);
        }

        const normalizedCount = logFile.envelope
          ? Object.keys(logFile.envelope.normalizedFields).length
          : 0;
        const reviewCount = logFile.envelope?.reviewQueue.length ?? 0;
        const fmt = logFile.envelope?.format ?? "unknown";

        toast.success(`Parsed ${file.name}`, {
          id: toastId,
          description: `format: ${fmt} · ${normalizedCount} normalized · ${reviewCount} for review`,
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
        });

        if (tool) {
          navigate(`/folder/${tool.folderId}/tool/${tool.id}`);
        }
      } catch (err) {
        const message =
          err instanceof ParserApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Unknown error";

        toast.error("Upload failed", {
          id: toastId,
          description: message,
          icon: <AlertCircle className="w-4 h-4 text-red-500" />,
        });
      } finally {
        setIsUploading(false);
      }
    },
    [isUploading, addLog, navigate],
  );

  const onDragOver = (e: ReactDragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };
  const onDragLeave = (e: ReactDragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };
  const onDrop = (e: ReactDragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  };

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`rounded-lg border-2 border-dashed p-6 transition-colors ${
        dragActive
          ? "border-accent-foreground bg-accent/40"
          : "border-border hover:border-accent-foreground/40 bg-card"
      }`}
    >
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-lg bg-accent/40 flex items-center justify-center shrink-0">
          {isUploading ? (
            <Loader2 className="w-5 h-5 text-accent-foreground animate-spin" />
          ) : (
            <Upload className="w-5 h-5 text-accent-foreground" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">
            {isUploading ? "Parsing…" : "Upload a raw tool log"}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            JSON · XML · CSV · Parquet · Syslog · TXT · Binary — format and
            tool type are detected automatically.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={openPicker}
          disabled={isUploading}
          className="shrink-0"
        >
          Choose file
        </Button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".json,.xml,.csv,.txt,.log,.parquet,.bin,application/octet-stream"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
