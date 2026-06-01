import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initSentry } from "./lib/sentry";
import { initAnalytics } from "./lib/analytics";

// Initialise error tracking before React mounts so we catch boot-time crashes
// too. No-op when VITE_SENTRY_DSN is unset (local dev / CI).
initSentry();

// Load analytics only when configured. No-op when VITE_ANALYTICS_ENDPOINT /
// VITE_ANALYTICS_WEBSITE_ID are unset (local dev / previews / CI).
initAnalytics();

createRoot(document.getElementById("root")!).render(<App />);
