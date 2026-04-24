import { Link } from "react-router";
import { Tool } from "../data/mockData";
import { formatDistanceToNow } from "date-fns";
import { Checkbox } from "./ui/checkbox";

interface ToolCardProps {
  tool: Tool;
  selectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
}

export function ToolCard({ tool, selectionMode = false, isSelected = false, onToggleSelect }: ToolCardProps) {
  const statusColors = {
    Active: "bg-emerald-500",
    Idle: "bg-amber-500",
    Fault: "bg-red-500",
  };

  const content = (
    <div className="flex items-center justify-between gap-6">
      {/* Left - Tool Info */}
      <div className="flex-1 min-w-0 flex items-center gap-3">
        {selectionMode && (
          <Checkbox
            checked={isSelected}
            onCheckedChange={onToggleSelect}
            onClick={(e) => e.stopPropagation()}
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h3 className="font-medium group-hover:text-accent-foreground transition-colors">
              {tool.name}
            </h3>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${statusColors[tool.status]}`} />
              <span className="text-xs text-muted-foreground">{tool.status}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>{tool.equipmentType}</span>
            <span>•</span>
            <span>{tool.vendor}</span>
          </div>
        </div>
      </div>

      {/* Right - Stats */}
      <div className="flex items-center gap-8 text-sm">
        <div className="text-right">
          <div className="text-muted-foreground text-xs mb-0.5">Last log</div>
          <div className="font-mono text-foreground">
            {formatDistanceToNow(tool.lastLogReceived, { addSuffix: true })}
          </div>
        </div>
        <div className="text-right">
          <div className="text-muted-foreground text-xs mb-0.5">Total logs</div>
          <div className="font-mono text-foreground">{tool.totalLogCount.toLocaleString()}</div>
        </div>
      </div>
    </div>
  );

  if (selectionMode) {
    return (
      <div
        onClick={onToggleSelect}
        className={`block px-6 py-4 border-b border-border bg-card hover:bg-accent/50 transition-colors group cursor-pointer ${
          isSelected ? "bg-accent/30" : ""
        }`}
      >
        {content}
      </div>
    );
  }

  return (
    <Link
      to={`/folder/${tool.folderId}/tool/${tool.id}`}
      className="block px-6 py-4 border-b border-border bg-card hover:bg-accent/50 transition-colors group"
    >
      {content}
    </Link>
  );
}