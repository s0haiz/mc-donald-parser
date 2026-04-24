import { LogFile } from "../data/mockData";
import { format } from "date-fns";
import {
  FileJson,
  FileCode,
  FileSpreadsheet,
  FileText,
  FileBox,
  FileDigit,
  ScrollText,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

interface LogRowProps {
  log: LogFile;
  isSelected: boolean;
  onClick: () => void;
}

export function LogRow({ log, isSelected, onClick }: LogRowProps) {
  const formatIcons: Record<LogFile["format"], typeof FileJson> = {
    JSON: FileJson,
    XML: FileCode,
    CSV: FileSpreadsheet,
    TXT: FileText,
    PARQUET: FileBox,
    SYSLOG: ScrollText,
    BINARY: FileDigit,
  };

  const FormatIcon = formatIcons[log.format] ?? FileText;
  const isUploaded = Boolean(log.envelope);

  return (
    <button
      onClick={onClick}
      className={`w-full px-4 py-3 flex items-center gap-3 border-b border-border hover:bg-accent/50 transition-colors text-left ${
        isSelected ? "bg-accent" : ""
      }`}
    >
      <FormatIcon className="w-4 h-4 text-muted-foreground shrink-0" />
      
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate font-mono">{log.filename}</p>
        <p className="text-xs text-muted-foreground">
          {format(log.timestamp, "MMM d, yyyy HH:mm:ss")}
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {isUploaded && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-mono uppercase tracking-wide">
            new
          </span>
        )}
        <span className="text-xs px-2 py-0.5 rounded bg-secondary text-secondary-foreground font-mono">
          {log.format}
        </span>
        {log.parsed ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
        ) : (
          <AlertCircle className="w-4 h-4 text-amber-500" />
        )}
      </div>
    </button>
  );
}
