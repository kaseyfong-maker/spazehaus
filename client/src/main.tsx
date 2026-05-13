import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initSentry } from "./lib/sentry";

// Initialise error tracking before React mounts so we catch boot-time crashes
// too. No-op when VITE_SENTRY_DSN is unset (local dev / CI).
initSentry();

createRoot(document.getElementById("root")!).render(<App />);
