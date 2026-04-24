import { useState } from "react";
import { useParams } from "react-router";
import { mockFolders, mockTools } from "../data/mockData";
import { Breadcrumb } from "../components/Breadcrumb";
import { ToolCard } from "../components/ToolCard";
import { Button } from "../components/ui/button";

export function FolderPage() {
  const { folderId } = useParams<{ folderId: string }>();
  const folder = mockFolders.find((f) => f.id === folderId);
  const tools = mockTools.filter((t) => t.folderId === folderId);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedTools, setSelectedTools] = useState<string[]>([]);

  if (!folder) {
    return (
      <div className="p-8">
        <p className="text-muted-foreground">Folder not found</p>
      </div>
    );
  }

  const handleStartCompareMode = () => {
    setCompareMode(true);
    setSelectedTools([]);
  };

  const handleCancelCompareMode = () => {
    setCompareMode(false);
    setSelectedTools([]);
  };

  const handleToggleToolSelection = (toolId: string) => {
    setSelectedTools((prev) => {
      if (prev.includes(toolId)) {
        return prev.filter((id) => id !== toolId);
      }
      if (prev.length < 2) {
        return [...prev, toolId];
      }
      return prev;
    });
  };

  const handleCompare = () => {
    if (selectedTools.length === 2) {
      alert(`Comparing tools: ${selectedTools.join(", ")}`);
    }
  };

  const canCompare = selectedTools.length === 2;

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Breadcrumb
            items={[
              { label: "Dashboard", href: "/" },
              { label: folder.name },
            ]}
          />
        </div>

        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-2xl mb-2">{folder.name}</h1>
            <p className="text-sm text-muted-foreground">
              {compareMode
                ? `${selectedTools.length} of 2 tools selected for comparison`
                : `${tools.length} ${tools.length === 1 ? "tool" : "tools"} in this category`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {compareMode && (
              <>
                <Button variant="outline" onClick={handleCancelCompareMode}>
                  Cancel
                </Button>
                <Button onClick={handleCompare} disabled={!canCompare}>
                  Compare ({selectedTools.length}/2)
                </Button>
              </>
            )}
            {!compareMode && (
              <Button
                variant="outline"
                onClick={handleStartCompareMode}
                disabled={tools.length < 2}
              >
                Compare Tools
              </Button>
            )}
          </div>
        </div>

        {/* Tools List */}
        {tools.length > 0 ? (
          <div className="border border-border rounded-lg overflow-hidden bg-card">
            {tools.map((tool) => (
              <ToolCard
                key={tool.id}
                tool={tool}
                selectionMode={compareMode}
                isSelected={selectedTools.includes(tool.id)}
                onToggleSelect={() => handleToggleToolSelection(tool.id)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <p>No tools in this category yet</p>
          </div>
        )}
      </div>
    </div>
  );
}