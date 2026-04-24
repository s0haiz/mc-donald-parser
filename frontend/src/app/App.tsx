import { RouterProvider } from "react-router";
import { router } from "./routes";
import { UploadedLogsProvider } from "./context/UploadedLogsContext";
import { Toaster } from "./components/ui/sonner";

export default function App() {
  return (
    <UploadedLogsProvider>
      <RouterProvider router={router} />
      <Toaster position="bottom-right" />
    </UploadedLogsProvider>
  );
}