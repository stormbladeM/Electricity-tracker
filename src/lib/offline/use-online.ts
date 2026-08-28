"use client";

import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void): () => void {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

function getSnapshot(): boolean {
  return navigator.onLine;
}

/** The server can't know; assume online until the client says otherwise. */
function getServerSnapshot(): boolean {
  return true;
}

/**
 * Whether the browser currently has a network connection.
 *
 * `navigator.onLine` is a hint, not a guarantee — it goes false reliably, but
 * can read true on a dead connection. Treat it as "probably online"; the log
 * queue still handles an insert that fails while this says true.
 */
export function useOnline(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
