/**
 * UploadedLogsContext
 *
 * Holds in-memory logs produced by user uploads through the parser
 * backend. Merged with `mockLogs` at read time so the rest of the UI
 * sees a single list per tool.
 *
 * Intentionally ephemeral — refreshing the browser wipes uploads.
 * Persistence across sessions is out of scope for the demo.
 */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { mockLogs, type LogFile } from "../data/mockData";

interface UploadedLogsContextValue {
  /** All uploaded logs keyed by toolId. */
  uploadedByTool: Record<string, LogFile[]>;
  /** Merged (uploaded + mock) log list for a tool. Uploaded first, newest first. */
  getLogsForTool: (toolId: string) => LogFile[];
  /** Total uploaded log count across all tools — for the Dashboard badge. */
  totalUploaded: number;
  /** Attach a freshly parsed log to a tool. */
  addLog: (toolId: string, log: LogFile) => void;
  /** Remove a previously uploaded log (not mock data). */
  removeLog: (toolId: string, logId: string) => void;
}

const UploadedLogsContext = createContext<UploadedLogsContextValue | null>(null);

export function UploadedLogsProvider({ children }: { children: ReactNode }) {
  const [uploadedByTool, setUploadedByTool] = useState<Record<string, LogFile[]>>({});

  const addLog = useCallback((toolId: string, log: LogFile) => {
    setUploadedByTool((prev) => {
      const existing = prev[toolId] ?? [];
      return { ...prev, [toolId]: [log, ...existing] };
    });
  }, []);

  const removeLog = useCallback((toolId: string, logId: string) => {
    setUploadedByTool((prev) => {
      const existing = prev[toolId] ?? [];
      return { ...prev, [toolId]: existing.filter((l) => l.id !== logId) };
    });
  }, []);

  const getLogsForTool = useCallback(
    (toolId: string): LogFile[] => {
      const uploaded = uploadedByTool[toolId] ?? [];
      const mocks = mockLogs[toolId] ?? [];
      // Uploaded first (newest first already, prepended as they come in),
      // then mock logs sorted by timestamp desc.
      const sortedMocks = [...mocks].sort(
        (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
      );
      return [...uploaded, ...sortedMocks];
    },
    [uploadedByTool],
  );

  const totalUploaded = useMemo(
    () =>
      Object.values(uploadedByTool).reduce((sum, arr) => sum + arr.length, 0),
    [uploadedByTool],
  );

  const value: UploadedLogsContextValue = useMemo(
    () => ({ uploadedByTool, getLogsForTool, totalUploaded, addLog, removeLog }),
    [uploadedByTool, getLogsForTool, totalUploaded, addLog, removeLog],
  );

  return (
    <UploadedLogsContext.Provider value={value}>
      {children}
    </UploadedLogsContext.Provider>
  );
}

export function useUploadedLogs(): UploadedLogsContextValue {
  const ctx = useContext(UploadedLogsContext);
  if (!ctx) {
    throw new Error(
      "useUploadedLogs must be used within an UploadedLogsProvider",
    );
  }
  return ctx;
}
