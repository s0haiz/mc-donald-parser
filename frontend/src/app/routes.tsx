import { createBrowserRouter } from "react-router";
import { RootLayout } from "./components/RootLayout";
import { Dashboard } from "./pages/Dashboard";
import { FolderPage } from "./pages/FolderPage";
import { ToolPage } from "./pages/ToolPage";
import { ToolSettings } from "./pages/ToolSettings";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: RootLayout,
    children: [
      { index: true, Component: Dashboard },
      { path: "folder/:folderId", Component: FolderPage },
      { path: "folder/:folderId/tool/:toolId", Component: ToolPage },
      { path: "folder/:folderId/tool/:toolId/settings", Component: ToolSettings },
    ],
  },
]);