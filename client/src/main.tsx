import { createRoot } from "react-dom/client";
import "./index.css";
import { initSentry } from "./lib/sentry";
import { initAnalytics } from "./lib/analytics";
import { initTheme } from "./lib/theme";

// Apply the persisted light/dark theme before the app renders (no flash).
initTheme();

// Initialise error tracking before React mounts so we catch boot-time crashes
// too. No-op when VITE_SENTRY_DSN is unset (local dev / CI).
initSentry();

// Load analytics only when configured. No-op when VITE_ANALYTICS_ENDPOINT /
// VITE_ANALYTICS_WEBSITE_ID are unset (local dev / previews / CI).
initAnalytics();

const rootEl = document.getElementById("root")!;

// App is imported DYNAMICALLY so a boot-time throw in the import chain — most
// importantly lib/supabase.ts throwing on missing/invalid VITE_SUPABASE_* env
// vars — is catchable here. With a static import the throw fires before any of
// our code runs, React never mounts, and the user sees a blank white page (the
// ErrorBoundary can't catch it because nothing mounted). This renders a plain,
// dependency-free message instead so a misconfigured deploy is diagnosable.
import("./App")
  .then(({ default: App }) => {
    createRoot(rootEl).render(<App />);
  })
  .catch((err) => {
    console.error("[boot] Failed to start the app:", err);
    rootEl.innerHTML = `
      <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;
                  font-family:system-ui,sans-serif;background:#1a1a1a;color:#e5e5e5;padding:24px;">
        <div style="max-width:420px;text-align:center;">
          <h1 style="font-size:18px;margin:0 0 12px;">Spazehaus couldn't start</h1>
          <p style="font-size:14px;line-height:1.5;color:#a3a3a3;margin:0;">
            The app is misconfigured (likely missing environment variables).
            Please contact your administrator. Technical detail is in the browser console.
          </p>
        </div>
      </div>`;
  });
