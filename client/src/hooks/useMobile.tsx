import * as React from "react";

const MOBILE_BREAKPOINT = 768;
// Matches Tailwind's `lg` breakpoint — the point where the app switches from
// the mobile bottom-nav layout to the desktop left-sidebar layout.
const DESKTOP_BREAKPOINT = 1024;

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(
    undefined
  );

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}

/**
 * True at Tailwind's `lg` breakpoint and up (≥1024px) — i.e. the desktop
 * layout where the left sidebar is shown and overlays should render as
 * centered modals rather than bottom sheets.
 *
 * Returns `false` during the first render (SSR-safe default) so the mobile
 * presentation is the fallback until the media query resolves on mount.
 */
export function useIsDesktop() {
  const [isDesktop, setIsDesktop] = React.useState(false);

  React.useEffect(() => {
    const mql = window.matchMedia(`(min-width: ${DESKTOP_BREAKPOINT}px)`);
    const onChange = () => setIsDesktop(mql.matches);
    mql.addEventListener("change", onChange);
    onChange();
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isDesktop;
}
