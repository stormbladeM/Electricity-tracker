"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void): () => void {
  const query = window.matchMedia(QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function getSnapshot(): boolean {
  return window.matchMedia(QUERY).matches;
}

/** The server can't know the preference; assume no motion until the client says. */
function getServerSnapshot(): boolean {
  return true;
}

/**
 * Whether the viewer asked for reduced motion.
 *
 * Callers should treat it as "may animate", never as "must animate" — the
 * reduced-motion path has to be the plain, instant one.
 */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
