"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth/use-auth";
import type { PowerLog } from "@/lib/hooks/use-latest-log";
import type { Enums } from "@/lib/supabase/database.types";
import { LogButton } from "./log-button";
import { PowerSourceSelect } from "./power-source-select";
import { useMyLatestStatus } from "./use-my-latest-status";
import { useSubmitLog } from "./use-submit-log";

type PowerSource = Enums<"power_source">;
type PowerStatus = Enums<"power_status">;

type LogFlowProps = {
  areaId: string;
  lgaId: string;
  stateId: string;
  /** The area's most recent log (any contributor) — drives the button label. */
  latestLog: PowerLog | null;
  /** Called with the newly logged status once the insert succeeds. */
  onLogged: (status: PowerStatus) => void;
};

/**
 * The log button plus the optional power-source tag. Failed submits keep the
 * picked source and show CLAUDE.md's exact error copy rather than losing the
 * user's input — a full offline sync queue is out of scope for this pass
 * (see the M2 report).
 *
 * The duplicate guard checks this user's own last report (useMyLatestStatus),
 * not the area's latest log — a second person confirming the same status is
 * valid corroborating data, not a duplicate.
 */
export function LogFlow({ areaId, lgaId, stateId, latestLog, onLogged }: LogFlowProps) {
  const { user } = useAuth();
  const [powerSource, setPowerSource] = useState<PowerSource | null>(null);
  const [message, setMessage] = useState<{ text: string; isDuplicate: boolean } | null>(null);
  const { submit, isSubmitting } = useSubmitLog();
  const { status: myLatestStatus, markLogged } = useMyLatestStatus(areaId);

  const currentStatus = latestLog?.status ?? null;

  async function handleLog(status: PowerStatus) {
    if (!user) {
      setMessage({
        text: "Not signed in yet. Check your connection and try again.",
        isDuplicate: false,
      });
      return;
    }

    setMessage(null);
    const result = await submit({
      userId: user.id,
      areaId,
      lgaId,
      stateId,
      status,
      powerSource,
      latestStatus: myLatestStatus,
    });

    if (result.ok) {
      setPowerSource(null);
      markLogged(status);
      onLogged(status);
      return;
    }

    setMessage({ text: result.message, isDuplicate: result.reason === "duplicate" });
  }

  return (
    <div className="flex flex-col gap-4">
      <PowerSourceSelect value={powerSource} onChange={setPowerSource} />
      <LogButton currentStatus={currentStatus} isSubmitting={isSubmitting} onLog={handleLog} />
      {message && (
        <p
          role="status"
          className={`text-14 ${message.isDuplicate ? "text-text-muted" : "text-fault"}`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
