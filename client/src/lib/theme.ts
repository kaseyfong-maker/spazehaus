/*
 * SPAZEHAUS — theme (light / dark) control.
 * Deliberately ignores the OS/phone `prefers-color-scheme` — the theme is an
 * explicit in-app choice persisted to localStorage. `.dark` on <html> flips the
 * central tokens in index.css.
 */
import { useState, useEffect } from "react";

export type Theme = "light" | "dark";
const KEY = "spz:theme";

export function getStoredTheme(): Theme {
  try {
    return localStorage.getItem(KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

export function applyTheme(t: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", t === "dark");
}

/** Call once at boot (before/at render) so the stored theme is applied with no flash. */
export function initTheme() {
  applyTheme(getStoredTheme());
}

/** React hook: current theme + a toggle, kept in sync with localStorage + <html>. */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(getStoredTheme);

  useEffect(() => {
    applyTheme(theme);
    try { localStorage.setItem(KEY, theme); } catch { /* ignore */ }
  }, [theme]);

  return {
    theme,
    toggle: () => setThemeState((t) => (t === "dark" ? "light" : "dark")),
    setTheme: setThemeState,
  };
}
