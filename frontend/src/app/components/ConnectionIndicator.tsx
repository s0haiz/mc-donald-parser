/**
 * ConnectionIndicator
 *
 * Lightweight green/red dot in the sidebar that pings the parser
 * backend on mount and every 15 s thereafter. Mostly cosmetic — but
 * the moment a judge sees "backend connected" they know the demo is
 * wired to something real, not mock JSON.
 */
import { useEffect, useState } from "react";
import { pingBackend, API_URL } from "../../lib/api";

type Status = "unknown" | "online" | "offline";

export function ConnectionIndicator() {
  const [status, setStatus] = useState<Status>("unknown");

  useEffect(() => {
    let alive = true;
    const check = async () => {
      const ok = await pingBackend();
      if (alive) setStatus(ok ? "online" : "offline");
    };
    check();
    const timer = window.setInterval(check, 15_000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, []);

  const styles: Record<Status, { dot: string; label: string }> = {
    unknown: { dot: "bg-muted-foreground animate-pulse", label: "checking…" },
    online: { dot: "bg-emerald-500", label: "backend online" },
    offline: { dot: "bg-red-500", label: "backend offline" },
  };
  const entry = styles[status];

  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-accent/30 text-xs"
      title={`${entry.label} — ${API_URL}`}
    >
      <span
        className={`inline-block w-1.5 h-1.5 rounded-full ${entry.dot}`}
        aria-hidden
      />
      <span className="text-muted-foreground truncate">{entry.label}</span>
    </div>
  );
}
