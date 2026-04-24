import { Outlet, Link, useLocation } from "react-router";
import { LayoutDashboard, Settings, User } from "lucide-react";
import { ConnectionIndicator } from "./ConnectionIndicator";

export function RootLayout() {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-border">
          <h1 className="text-xl tracking-tight">LogIQ</h1>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          <Link
            to="/"
            className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
              isActive("/") && location.pathname === "/"
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span className="text-sm">Dashboard</span>
          </Link>

          <Link
            to="/settings"
            className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
              isActive("/settings")
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
            }`}
          >
            <Settings className="w-4 h-4" />
            <span className="text-sm">Settings</span>
          </Link>
        </nav>

        {/* Connection indicator */}
        <div className="px-4 pb-2">
          <ConnectionIndicator />
        </div>

        {/* User Profile */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 px-3 py-2 text-muted-foreground">
            <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate">Engineer</p>
              <p className="text-xs text-muted-foreground truncate">engineer@fab.com</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}