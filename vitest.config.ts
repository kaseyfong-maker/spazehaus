/// <reference types="vitest/config" />
import { defineConfig } from "vitest/config";
import path from "node:path";

// Dedicated unit-test config — kept separate from vite.config.ts so the heavy
// dev plugins (tailwind, sentry, manus runtime, react) don't load for fast,
// node-only unit tests. Vitest prefers this file over vite.config.ts.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  test: {
    environment: "node",
    // Unit tests live in the top-level test/ folder (outside client/), importing
    // app modules via the @ alias above.
    include: ["test/**/*.test.ts"],
    // Provide dummy Supabase env so any module that transitively imports
    // client/src/lib/supabase.ts (which throws on missing env) loads cleanly,
    // independent of .env files (important for CI).
    env: {
      VITE_SUPABASE_URL: "http://127.0.0.1:54321",
      VITE_SUPABASE_ANON_KEY: "test-anon-key",
    },
  },
});
