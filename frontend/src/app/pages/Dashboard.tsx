import { FolderCard } from "../components/FolderCard";
import { UploadDialog } from "../components/UploadDialog";
import { mockFolders } from "../data/mockData";
import { useUploadedLogs } from "../context/UploadedLogsContext";

export function Dashboard() {
  const { totalUploaded } = useUploadedLogs();

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl mb-2">Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              View and manage equipment log parsing across your facility
            </p>
          </div>
          {totalUploaded > 0 && (
            <span className="text-xs font-mono px-2 py-1 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 whitespace-nowrap">
              {totalUploaded} log{totalUploaded === 1 ? "" : "s"} uploaded this session
            </span>
          )}
        </div>

        {/* Upload zone */}
        <div className="mb-8">
          <UploadDialog />
        </div>

        {/* Folder Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {mockFolders.map((folder) => (
            <FolderCard key={folder.id} folder={folder} />
          ))}
        </div>
      </div>
    </div>
  );
}