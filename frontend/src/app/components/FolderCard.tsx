import { Link } from "react-router";
import { ToolFolder } from "../data/mockData";
import { formatDistanceToNow } from "date-fns";

interface FolderCardProps {
  folder: ToolFolder;
}

export function FolderCard({ folder }: FolderCardProps) {
  const statusParts = [];
  if (folder.activeCount > 0) statusParts.push(`${folder.activeCount} Active`);
  if (folder.idleCount > 0) statusParts.push(`${folder.idleCount} Idle`);
  if (folder.faultCount > 0) statusParts.push(`${folder.faultCount} Fault`);

  return (
    <Link
      to={`/folder/${folder.id}`}
      className="block p-6 rounded-lg border border-border bg-card hover:border-accent-foreground/20 transition-colors group"
    >
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          <span className="text-2xl">{folder.icon}</span>
          <div className="flex-1">
            <h3 className="text-base font-medium group-hover:text-accent-foreground transition-colors">
              {folder.name}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {folder.toolCount} {folder.toolCount === 1 ? "tool" : "tools"}
            </p>
          </div>
        </div>

        {/* Status Summary */}
        {statusParts.length > 0 && (
          <div className="text-xs text-muted-foreground">
            {statusParts.join(" · ")}
          </div>
        )}

        {/* Last Activity */}
        <div className="pt-4 border-t border-border">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Last activity</span>
            <span className="text-foreground font-mono">
              {formatDistanceToNow(folder.lastActivity, { addSuffix: true })}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
