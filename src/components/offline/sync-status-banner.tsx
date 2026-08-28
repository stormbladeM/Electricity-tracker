"use client";

import { useEffect, useRef, useState } from "react";
import { Check, CloudOff, RefreshCw } from "lucide-react";
import { useLogQueue } from "@/lib/offline/log-queue";
import { useOnline } from "@/lib/offline/use-online";

/**
 * A quiet strip pinned to the bottom of every screen, shown only when there's
 * something to say: the connection is down, or queued logs are syncing. It
 * carries CLAUDE.md's exact offline copy. No neon — this is status, not signal.
 */
export function SyncStatusBanner() {
  const online = useOnline();
  const { pending } = useLogQueue();
  const [justSynced, setJustSynced] = useState(false);
  const prevCount = useRef(0);

  // Confirm briefly when the queue drains after having had logs in it.
  useEffect(() => {
    if (prevCount.current > 0 && pending.length === 0 && online) {
      setJustSynced(true);
      const timer = setTimeout(() => setJustSynced(false), 4000);
      prevCount.current = 0;
      return () => clearTimeout(timer);
    }
    prevCount.current = pending.length;
  }, [pending.length, online]);

  let content: { icon: typeof CloudOff; text: string } | null = null;
  if (!online) {
    content = {
      icon: CloudOff,
      text:
        pending.length > 0
          ? `You're offline. ${pending.length} ${pending.length === 1 ? "log" : "logs"} will sync when you reconnect.`
          : "You're offline. Logs will sync when you reconnect.",
    };
  } else if (pending.length > 0) {
    content = {
      icon: RefreshCw,
      text: `Syncing ${pending.length} ${pending.length === 1 ? "log" : "logs"}…`,
    };
  } else if (justSynced) {
    content = { icon: Check, text: "Logs synced." };
  }

  if (!content) return null;

  const Icon = content.icon;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 z-50 flex justify-center px-4"
      style={{ bottom: "max(1rem, env(safe-area-inset-bottom))" }}
    >
      <p className="flex items-center gap-2 rounded border border-hairline bg-surface px-4 py-2 text-14 text-text-muted shadow-none">
        <Icon aria-hidden="true" size={16} strokeWidth={1.5} className="shrink-0" />
        {content.text}
      </p>
    </div>
  );
}
