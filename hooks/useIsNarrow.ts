import { useSyncExternalStore } from "react";

/** Phone-sized screens: below Tailwind's `md` breakpoint. */
export const NARROW_QUERY = "(max-width: 767px)";

const subscribe = (onChange: () => void) => {
  const query = window.matchMedia(NARROW_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};

/**
 * True on phone-sized screens. Prefer CSS breakpoints; use this only where
 * the layout needs different numbers, not just different classes.
 * Renders as wide on the server and during hydration.
 */
export function useIsNarrow(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(NARROW_QUERY).matches,
    () => false
  );
}
