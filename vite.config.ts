import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { defineConfig, type Plugin, type ViteDevServer } from "vite";
import { vitePluginManusRuntime } from "vite-plugin-manus-runtime";

// The Manus runtime + debug collector are useful in the Manus dev sandbox but
// inline ~100kb into index.html and have no role in production. Off by default
// in production builds; on for local dev unless explicitly disabled.
//
//   Production build:  MANUS_RUNTIME=1 to opt back in (default: off)
//   Local dev:         MANUS_RUNTIME=0 to opt out  (default: on)
const isProd = process.env.NODE_ENV === "production";
const MANUS_RUNTIME_ENABLED = isProd
  ? process.env.MANUS_RUNTIME === "1"
  : process.env.MANUS_RUNTIME !== "0";

// =============================================================================
// Manus Debug Collector - Vite Plugin
// Writes browser logs directly to files, trimmed when exceeding size limit
// =============================================================================

const PROJECT_ROOT = import.meta.dirname;
const LOG_DIR = path.join(PROJECT_ROOT, ".manus-logs");
const MAX_LOG_SIZE_BYTES = 1 * 1024 * 1024; // 1MB per log file
const TRIM_TARGET_BYTES = Math.floor(MAX_LOG_SIZE_BYTES * 0.6); // Trim to 60% to avoid constant re-trimming

type LogSource = "browserConsole" | "networkRequests" | "sessionReplay";

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function trimLogFile(logPath: string, maxSize: number) {
  try {
    if (!fs.existsSync(logPath) || fs.statSync(logPath).size <= maxSize) {
      return;
    }

    const lines = fs.readFileSync(logPath, "utf-8").split("\n");
    const keptLines: string[] = [];
    let keptBytes = 0;

    // Keep newest lines (from end) that fit within 60% of maxSize
    const targetSize = TRIM_TARGET_BYTES;
    for (let i = lines.length - 1; i >= 0; i--) {
      const lineBytes = Buffer.byteLength(`${lines[i]}\n`, "utf-8");
      if (keptBytes + lineBytes > targetSize) break;
      keptLines.unshift(lines[i]);
      keptBytes += lineBytes;
    }

    fs.writeFileSync(logPath, keptLines.join("\n"), "utf-8");
  } catch {
    /* ignore trim errors */
  }
}

function writeToLogFile(source: LogSource, entries: unknown[]) {
  if (entries.length === 0) return;

  ensureLogDir();
  const logPath = path.join(LOG_DIR, `${source}.log`);

  // Format entries with timestamps
  const lines = entries.map((entry) => {
    const ts = new Date().toISOString();
    return `[${ts}] ${JSON.stringify(entry)}`;
  });

  // Append to log file
  fs.appendFileSync(logPath, `${lines.join("\n")}\n`, "utf-8");

  // Trim if exceeds max size
  trimLogFile(logPath, MAX_LOG_SIZE_BYTES);
}

/**
 * Vite plugin to collect browser debug logs
 * - POST /__manus__/logs: Browser sends logs, written directly to files
 * - Files: browserConsole.log, networkRequests.log, sessionReplay.log
 * - Auto-trimmed when exceeding 1MB (keeps newest entries)
 */
function vitePluginManusDebugCollector(): Plugin {
  return {
    name: "manus-debug-collector",

    transformIndexHtml(html) {
      if (process.env.NODE_ENV === "production") {
        return html;
      }
      return {
        html,
        tags: [
          {
            tag: "script",
            attrs: {
              src: "/__manus__/debug-collector.js",
              defer: true,
            },
            injectTo: "head",
          },
        ],
      };
    },

    configureServer(server: ViteDevServer) {
      // POST /__manus__/logs: Browser sends logs (written directly to files)
      server.middlewares.use("/__manus__/logs", (req, res, next) => {
        if (req.method !== "POST") {
          return next();
        }

        const handlePayload = (payload: any) => {
          // Write logs directly to files
          if (payload.consoleLogs?.length > 0) {
            writeToLogFile("browserConsole", payload.consoleLogs);
          }
          if (payload.networkRequests?.length > 0) {
            writeToLogFile("networkRequests", payload.networkRequests);
          }
          if (payload.sessionEvents?.length > 0) {
            writeToLogFile("sessionReplay", payload.sessionEvents);
          }

          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: true }));
        };

        const reqBody = (req as { body?: unknown }).body;
        if (reqBody && typeof reqBody === "object") {
          try {
            handlePayload(reqBody);
          } catch (e) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, error: String(e) }));
          }
          return;
        }

        let body = "";
        req.on("data", (chunk) => {
          body += chunk.toString();
        });

        req.on("end", () => {
          try {
            const payload = JSON.parse(body);
            handlePayload(payload);
          } catch (e) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, error: String(e) }));
          }
        });
      });
    },
  };
}

// =============================================================================
// Sentry — source-map upload
// =============================================================================
//
// When SENTRY_AUTH_TOKEN + SENTRY_ORG + SENTRY_PROJECT are set, the
// @sentry/vite-plugin uploads sourcemaps to Sentry under a release tag so
// production stack traces show real symbols instead of minified names. The
// same release tag is injected into the runtime via VITE_SENTRY_RELEASE so
// @sentry/react reports events against the matching release.
//
// Release name resolution (highest priority first):
//   1. process.env.SENTRY_RELEASE       (explicit override)
//   2. process.env.VERCEL_GIT_COMMIT_SHA (auto-injected by Vercel)
//   3. `git rev-parse --short HEAD`     (local + most CI)
//   4. fallback "spazehaus@<NODE_ENV>"
//
// Without all three secrets present, the plugin is omitted entirely and
// production builds emit no sourcemaps (so they can't leak via dist/).
const SENTRY_AUTH_TOKEN = process.env.SENTRY_AUTH_TOKEN;
const SENTRY_ORG = process.env.SENTRY_ORG;
const SENTRY_PROJECT = process.env.SENTRY_PROJECT;
const SENTRY_UPLOAD_ENABLED =
  isProd && !!SENTRY_AUTH_TOKEN && !!SENTRY_ORG && !!SENTRY_PROJECT;

function resolveSentryRelease(): string {
  if (process.env.SENTRY_RELEASE) return process.env.SENTRY_RELEASE;
  const sha =
    process.env.VERCEL_GIT_COMMIT_SHA ??
    (() => {
      try {
        return execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] })
          .toString()
          .trim();
      } catch {
        return null;
      }
    })();
  if (sha) return `spazehaus@${sha.slice(0, 12)}`;
  return `spazehaus@${process.env.NODE_ENV || "dev"}`;
}
const SENTRY_RELEASE = resolveSentryRelease();
// Expose to the client bundle through the Vite env layer so
// `client/src/lib/sentry.ts` reports events tagged with the SAME release
// the plugin just uploaded source maps under.
process.env.VITE_SENTRY_RELEASE ??= SENTRY_RELEASE;

const plugins = [
  react(),
  tailwindcss(),
  jsxLocPlugin(),
  ...(MANUS_RUNTIME_ENABLED ? [vitePluginManusRuntime(), vitePluginManusDebugCollector()] : []),
  ...(SENTRY_UPLOAD_ENABLED
    ? [
        sentryVitePlugin({
          org: SENTRY_ORG,
          project: SENTRY_PROJECT,
          authToken: SENTRY_AUTH_TOKEN,
          release: { name: SENTRY_RELEASE },
          sourcemaps: {
            // dist/public is set by `build.outDir` below; the assets are the
            // emitted JS + their adjacent .map files.
            assets: ["./dist/public/**/*.js", "./dist/public/**/*.map"],
            // Delete .map files after upload so they never reach the CDN.
            filesToDeleteAfterUpload: ["./dist/public/**/*.map"],
          },
          telemetry: false,
          // A failed source-map upload (bad token, network blip, Sentry
          // outage) should NOT block a Vercel deploy — production stack
          // traces are a nice-to-have, not a hard dependency. Log loudly so
          // it's obvious in the build output, then swallow the error.
          errorHandler: (err) => {
            console.warn(
              `[sentry-vite-plugin] sourcemap upload failed — production stack ` +
                `traces will be minified for release ${SENTRY_RELEASE}. ` +
                `Build continues. Error: ${err.message}`,
            );
          },
        }),
      ]
    : []),
];

export default defineConfig({
  plugins,
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    // Produce source maps only when we'll upload + delete them. Without the
    // upload step, maps in dist/public would be served publicly — and
    // production stack traces with real symbols aren't worth that trade.
    // `"hidden"` emits .map files but omits the sourceMappingURL comment,
    // so browsers won't fetch them even if they leak.
    sourcemap: SENTRY_UPLOAD_ENABLED ? ("hidden" as const) : false,
  },
  server: {
    port: 3000,
    strictPort: false, // Will find next available port if 3000 is busy
    host: true,
    allowedHosts: [
      ".manuspre.computer",
      ".manus.computer",
      ".manus-asia.computer",
      ".manuscomputer.ai",
      ".manusvm.computer",
      "localhost",
      "127.0.0.1",
    ],
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
