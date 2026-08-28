"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import type { Enums } from "@/lib/supabase/database.types";

type PowerStatus = Enums<"power_status">;
type PowerSource = Enums<"power_source">;

export type QueuedLog = {
  /** Client-generated, so a flush knows which entries it has cleared. */
  id: string;
  userId: string;
  areaId: string;
  lgaId: string;
  stateId: string;
  status: PowerStatus;
  powerSource: PowerSource | null;
  /**
   * The moment the user tapped, ISO. Sent as `logged_at` so a log that syncs
   * hours later still records the outage at the time it actually happened —
   * the insert policy only constrains `user_id`, so a client-set timestamp is
   * allowed.
   */
  loggedAt: string;
};

const STORAGE_KEY = "et:pending-power-logs";

function readQueue(): QueuedLog[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as QueuedLog[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(logs: QueuedLog[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
  } catch {
    // Storage full or blocked (private browsing). The in-memory queue still
    // carries this session; there's nothing else to fall back to.
  }
}

type LogQueueValue = {
  /** Logs waiting to reach the server, oldest first. */
  pending: QueuedLog[];
  enqueue: (log: Omit<QueuedLog, "id">) => void;
  /** Attempt every pending insert now. No-op when offline or already running. */
  flush: () => Promise<void>;
};

const LogQueueContext = createContext<LogQueueValue>({
  pending: [],
  enqueue: () => {},
  flush: async () => {},
});

/**
 * Holds power logs that couldn't reach Supabase — the offline sync queue the
 * quality floor calls a correctness requirement. People log during outages,
 * and outages often mean no connectivity, so a failed insert is kept in
 * `localStorage` and retried rather than lost.
 *
 * Only power logs go through here. Fault reports (which carry a photo blob)
 * keep their simpler "your input is preserved, try again" behaviour.
 */
export function LogQueueProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<QueuedLog[]>([]);
  const flushing = useRef(false);

  // localStorage isn't there during SSR; hydrate the queue after mount. The
  // microtask hop keeps the setState off the synchronous effect pass
  // (react-hooks/set-state-in-effect), matching the other hooks in the app.
  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) setPending(readQueue());
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const flush = useCallback(async () => {
    if (flushing.current) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) return;

    const queue = readQueue();
    if (queue.length === 0) return;

    flushing.current = true;
    const supabase = createClient();
    let remaining = [...queue];

    for (const log of queue) {
      const { error } = await supabase.from("power_logs").insert({
        user_id: log.userId,
        area_id: log.areaId,
        lga_id: log.lgaId,
        state_id: log.stateId,
        status: log.status,
        power_source: log.powerSource,
        logged_at: log.loggedAt,
      });

      // Stop on the first failure so the logs sync in the order they happened
      // — the interval derivation reads them by `logged_at`, but keeping the
      // queue ordered means a transient failure never reorders anything.
      if (error) break;

      remaining = remaining.filter((entry) => entry.id !== log.id);
      writeQueue(remaining);
      setPending(remaining);
    }

    flushing.current = false;
  }, []);

  const enqueue = useCallback((log: Omit<QueuedLog, "id">) => {
    const next = [...readQueue(), { ...log, id: crypto.randomUUID() }];
    writeQueue(next);
    setPending(next);
  }, []);

  // Drain on mount, and every time the connection comes back. The mount drain
  // is deferred a microtask so any state update lands outside the effect's
  // synchronous pass (react-hooks/set-state-in-effect).
  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) void flush();
    });
    const onOnline = () => void flush();
    window.addEventListener("online", onOnline);
    return () => {
      cancelled = true;
      window.removeEventListener("online", onOnline);
    };
  }, [flush]);

  return (
    <LogQueueContext.Provider value={{ pending, enqueue, flush }}>
      {children}
    </LogQueueContext.Provider>
  );
}

export function useLogQueue(): LogQueueValue {
  return useContext(LogQueueContext);
}
