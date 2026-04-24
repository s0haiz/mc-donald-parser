import { useState } from "react";
import { useParams, Link } from "react-router";
import { ArrowLeft, Search } from "lucide-react";
import { mockTools, defaultCanonicalKeys, CanonicalKey, mockFolders } from "../data/mockData";
import { Switch } from "../components/ui/switch";
import { Input } from "../components/ui/input";
import { Breadcrumb } from "../components/Breadcrumb";
import { Textarea } from "../components/ui/textarea";

export function ToolSettings() {
  const { toolId, folderId } = useParams<{ toolId: string; folderId: string }>();
  const tool = mockTools.find((t) => t.id === toolId);
  const folder = mockFolders.find((f) => f.id === folderId);

  const [canonicalKeys, setCanonicalKeys] = useState<CanonicalKey[]>(defaultCanonicalKeys);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingKeyId, setEditingKeyId] = useState<string | null>(null);

  if (!tool || !folder) {
    return (
      <div className="p-8">
        <p className="text-muted-foreground">Tool not found</p>
      </div>
    );
  }

  const filteredCanonicalKeys = canonicalKeys.filter((key) =>
    key.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleCanonicalKey = (id: string) => {
    setCanonicalKeys((prev) =>
      prev.map((key) =>
        key.id === id ? { ...key, visible: !key.visible } : key
      )
    );
  };

  const updateKeyDescription = (id: string, description: string) => {
    setCanonicalKeys((prev) =>
      prev.map((key) =>
        key.id === id ? { ...key, description } : key
      )
    );
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="border-b border-border bg-card px-6 py-4">
        <div className="mb-3">
          <Breadcrumb
            items={[
              { label: "Dashboard", href: "/" },
              { label: folder.name, href: `/folder/${folderId}` },
              { label: tool.name, href: `/folder/${folderId}/tool/${toolId}` },
              { label: "Settings" },
            ]}
          />
        </div>
        <div className="flex items-center gap-4">
          <Link
            to={`/folder/${folderId}/tool/${toolId}`}
            className="p-2 hover:bg-accent rounded-md transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl">Tool Settings</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{tool.name}</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-8">
          {/* Section A - Canonical Key Visibility */}
          <section>
            <div className="mb-6">
              <h2 className="text-lg mb-1">Canonical Key Visibility</h2>
              <p className="text-sm text-muted-foreground">
                Toggle which standard keys appear in the normalised output view and edit their descriptions
              </p>
            </div>

            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search keys..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Key List */}
            <div className="border border-border rounded-lg divide-y divide-border">
              {filteredCanonicalKeys.map((key) => (
                <div
                  key={key.id}
                  className="px-4 py-4 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex-1">
                      <code className="text-sm font-mono text-foreground">{key.name}</code>
                    </div>
                    <Switch
                      checked={key.visible}
                      onCheckedChange={() => toggleCanonicalKey(key.id)}
                    />
                  </div>
                  <Textarea
                    value={key.description}
                    onChange={(e) => updateKeyDescription(key.id, e.target.value)}
                    placeholder="Add a description for this key..."
                    className="text-sm min-h-[60px] resize-none"
                    onFocus={() => setEditingKeyId(key.id)}
                    onBlur={() => setEditingKeyId(null)}
                  />
                </div>
              ))}
              {filteredCanonicalKeys.length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No keys found matching "{searchQuery}"
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}