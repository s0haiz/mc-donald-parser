import { useState } from "react";
import { useParams, Link } from "react-router";
import { Settings, ArrowLeft } from "lucide-react";
import { mockTools, defaultCustomKeys, mockFolders } from "../data/mockData";
import { LogRow } from "../components/LogRow";
import { EnrichedLogViewer } from "../components/EnrichedLogViewer";
import { Breadcrumb } from "../components/Breadcrumb";
import { useUploadedLogs } from "../context/UploadedLogsContext";

export function ToolPage() {
  const { toolId, folderId } = useParams<{ toolId: string; folderId: string }>();
  const tool = mockTools.find((t) => t.id === toolId);
  const folder = mockFolders.find((f) => f.id === folderId);
  const { getLogsForTool } = useUploadedLogs();
  const logs = getLogsForTool(toolId || "");
  
  const [selectedLogId, setSelectedLogId] = useState<string | null>(
    logs.length > 0 ? logs[0].id : null
  );

  const selectedLog = logs.find((log) => log.id === selectedLogId);

  if (!tool || !folder) {
    return (
      <div className="p-8">
        <p className="text-muted-foreground">Tool not found</p>
      </div>
    );
  }

  const statusColors = {
    Active: "bg-emerald-500",
    Idle: "bg-amber-500",
    Fault: "bg-red-500",
  };

  const customKeyNames = defaultCustomKeys.map((k) => k.name);

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="border-b border-border bg-card px-6 py-4">
        <div className="mb-3">
          <Breadcrumb
            items={[
              { label: "Dashboard", href: "/" },
              { label: folder.name, href: `/folder/${folderId}` },
              { label: tool.name },
            ]}
          />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to={`/folder/${folderId}`}
              className="p-2 hover:bg-accent rounded-md transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-xl">{tool.name}</h1>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-sm text-muted-foreground">{tool.vendor}</span>
                <div className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${statusColors[tool.status]}`} />
                  <span className="text-xs text-muted-foreground">{tool.status}</span>
                </div>
              </div>
            </div>
          </div>

          <Link
            to={`/folder/${folderId}/tool/${toolId}/settings`}
            className="flex items-center gap-2 px-4 py-2 rounded-md border border-border hover:bg-accent transition-colors"
          >
            <Settings className="w-4 h-4" />
            <span className="text-sm">Settings</span>
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Log List */}
        <div className="w-[40%] border-r border-border bg-card overflow-auto">
          <div className="sticky top-0 bg-card border-b border-border px-4 py-3 z-10">
            <h2 className="text-sm font-medium">Log Files</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {logs.length} total logs
            </p>
          </div>
          
          <div>
            {logs.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                No logs available
              </div>
            ) : (
              logs.map((log) => (
                <LogRow
                  key={log.id}
                  log={log}
                  isSelected={selectedLogId === log.id}
                  onClick={() => setSelectedLogId(log.id)}
                />
              ))
            )}
          </div>
        </div>

        {/* Right Panel - JSON Viewer */}
        <div className="flex-1 bg-background overflow-auto">
          {selectedLog ? (
            <div className="h-full flex flex-col">
              {/* Viewer Header */}
              <div className="sticky top-0 bg-background border-b border-border px-6 py-3 z-10">
                <h2 className="text-sm font-medium font-mono">{selectedLog.filename}</h2>
              </div>

              {/* Viewer Content */}
              <div className="flex-1 overflow-auto">
                <EnrichedLogViewer log={selectedLog} customKeys={customKeyNames} />
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <p className="text-sm">Select a log to view its contents</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}