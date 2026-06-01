/*
 * SPAZEHAUS — Umami analytics loader
 *
 * Injects the Umami tracking script only when both env vars are present.
 * Previously this lived as a static <script> in index.html using Vite's
 * `%VITE_ANALYTICS_ENDPOINT%` HTML substitution — but when the vars were unset,
 * the literal placeholder was requested (`/%VITE_ANALYTICS_ENDPOINT%/umami`),
 * producing a console ERR_HTTP2_PROTOCOL_ERROR on every page load.
 *
 * Loading it from JS lets us no-op cleanly when analytics isn't configured
 * (local dev / previews / CI), matching the initSentry() convention.
 */

export function initAnalytics(): void {
  const endpoint = import.meta.env.VITE_ANALYTICS_ENDPOINT?.trim();
  const websiteId = import.meta.env.VITE_ANALYTICS_WEBSITE_ID?.trim();

  // No-op unless fully configured — avoids requesting a broken script URL.
  if (!endpoint || !websiteId) return;

  const script = document.createElement("script");
  script.defer = true;
  script.src = `${endpoint.replace(/\/$/, "")}/umami`;
  script.setAttribute("data-website-id", websiteId);
  document.head.appendChild(script);
}
