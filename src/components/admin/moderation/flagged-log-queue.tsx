"use client";

import { useState } from "react";
import {
  AdminEmpty,
  AdminTable,
  AdminTableSkeleton,
  Td,
  Th,
  Tr,
} from "../ui/admin-table";
import { accountLabel, formatExactStamp, formatStamp } from "../ui/admin-format";
import { ExportButton } from "../ui/export-button";
import { useModerationActions } from "./use-moderation-actions";
import { useFlaggedLogs, type FlaggedLog } from "./use-moderation-data";

const LOG_COLUMNS = [
  "logged_at",
  "status",
  "power_source",
  "lga",
  "state",
  "flag_reason",
  "contributor",
  "trust_score",
  "contributor_flagged_logs",
  "contributor_total_logs",
] as const;

/**
 * The queue: every flagged log nobody has decided on yet.
 *
 * Two decisions, and only two. **Keep** clears the flag and the log counts
 * towards uptime again. **Reject** leaves it flagged, which is what actually
 * withdraws it from every public figure — derive_outage_intervals and
 * lga_uptime_ranking both skip flagged rows. Neither deletes anything: the row
 * stays as evidence of what was reported and what was decided.
 *
 * Both mark the log reviewed, which is what stops the detector raising it
 * again fifteen minutes later.
 *
 * Note on colour: rejecting a log is not a fault, so nothing here is red.
 * `--fault` stays reserved (docs/design-system.md section 2) — the weight of
 * the decision is carried by the confirmation copy, not by an alarm colour.
 */
export function FlaggedLogQueue() {
  const { rows, isLoading, error, refetch } = useFlaggedLogs();
  const { reviewLogs, isSaving, error: saveError } = useModerationActions();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [note, setNote] = useState("");

  async function decide(ids: string[], keep: boolean) {
    const saved = await reviewLogs(ids, keep, note);
    if (!saved) return;

    setSelected(new Set());
    setNote("");
    refetch();
  }

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((current) =>
      current.size === (rows?.length ?? 0) ? new Set() : new Set(rows?.map((row) => row.id)),
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-start gap-3 rounded border border-hairline bg-surface p-4">
        <p className="text-14 text-fault">{error}</p>
        <button
          type="button"
          onClick={refetch}
          className="rounded border border-hairline px-3 py-2 text-14 text-text hover:border-text-muted"
        >
          Try again
        </button>
      </div>
    );
  }

  if (isLoading || !rows) return <AdminTableSkeleton />;

  if (rows.length === 0) {
    return (
      <AdminEmpty
        message="No logs are waiting for review."
        hint="The detector runs every 15 minutes and raises rapid toggling, impossible timestamps, hourly bursts and logs that contradict everyone else in the area."
      />
    );
  }

  const allSelected = selected.size === rows.length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <ExportButton
          stem="flagged-logs"
          columns={LOG_COLUMNS}
          rows={() =>
            rows.map((row) => [
              row.logged_at,
              row.status,
              row.power_source,
              row.lga_name,
              row.state_name,
              row.flag_reason,
              accountLabel(row.display_name, row.user_id),
              row.trust_score,
              row.user_flagged_count,
              row.user_log_count,
            ])
          }
        />
      </div>

      <BulkBar
        count={selected.size}
        note={note}
        onNoteChange={setNote}
        isSaving={isSaving}
        onKeep={() => decide([...selected], true)}
        onReject={() => decide([...selected], false)}
      />

      {saveError && <p className="text-14 text-fault">{saveError}</p>}

      <AdminTable
        caption="Flagged power logs waiting for a moderation decision"
        head={
          <>
            <Th className="w-8">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                aria-label={allSelected ? "Clear selection" : "Select every log in the queue"}
                className="accent-primary"
              />
            </Th>
            <Th>Logged</Th>
            <Th>Status</Th>
            <Th>Place</Th>
            <Th>Why it was flagged</Th>
            <Th>Contributor</Th>
            <Th className="text-right">Decision</Th>
          </>
        }
      >
        {rows.map((row) => (
          <QueueRow
            key={row.id}
            row={row}
            isSelected={selected.has(row.id)}
            isSaving={isSaving}
            onToggle={() => toggle(row.id)}
            onDecide={(keep) => decide([row.id], keep)}
          />
        ))}
      </AdminTable>
    </div>
  );
}

function QueueRow({
  row,
  isSelected,
  isSaving,
  onToggle,
  onDecide,
}: {
  row: FlaggedLog;
  isSelected: boolean;
  isSaving: boolean;
  onToggle: () => void;
  onDecide: (keep: boolean) => void;
}) {
  const who = accountLabel(row.display_name, row.user_id);

  return (
    <Tr isSelected={isSelected}>
      <Td>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggle}
          aria-label={`Select the log from ${who} at ${formatStamp(row.logged_at)}`}
          className="accent-primary"
        />
      </Td>
      <Td className="font-mono whitespace-nowrap text-12">
        <span title={formatExactStamp(row.logged_at)}>{formatStamp(row.logged_at)}</span>
      </Td>
      <Td>
        <PowerStatus status={row.status} source={row.power_source} />
      </Td>
      <Td className="whitespace-nowrap">
        <span className="text-14">{row.lga_name}</span>
        <span className="block text-12 text-text-muted">{row.state_name}</span>
      </Td>
      <Td className="min-w-56 text-14 text-text-muted">{row.flag_reason}</Td>
      <Td className="whitespace-nowrap">
        <span className="font-mono text-12">{who}</span>
        <span className="block text-12 text-text-muted">
          {row.user_flagged_count} of {row.user_log_count} logs flagged · trust{" "}
          {row.trust_score}
          {row.is_banned ? " · banned" : ""}
        </span>
      </Td>
      <Td>
        <div className="flex justify-end gap-2">
          <DecisionButton onClick={() => onDecide(true)} disabled={isSaving}>
            Keep
          </DecisionButton>
          <DecisionButton onClick={() => onDecide(false)} disabled={isSaving}>
            Reject
          </DecisionButton>
        </div>
      </Td>
    </Tr>
  );
}

/**
 * ON is the one place `--on` belongs. OFF is `--off` with a hairline ring so
 * it stays visible on the surface, and both carry their word — never colour
 * alone.
 */
function PowerStatus({
  status,
  source,
}: {
  status: FlaggedLog["status"];
  source: FlaggedLog["power_source"];
}) {
  return (
    <span className="whitespace-nowrap">
      <span className="flex items-center gap-1.5 text-14">
        <span
          aria-hidden="true"
          className={`h-2 w-2 rounded-full ${
            status === "on" ? "bg-on" : "bg-off ring-1 ring-hairline"
          }`}
        />
        {status === "on" ? "On" : "Off"}
      </span>
      {source && <span className="block text-12 text-text-muted">{source}</span>}
    </span>
  );
}

function DecisionButton({
  children,
  onClick,
  disabled,
}: {
  children: string;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded border border-hairline px-2.5 py-1 text-14 text-text hover:border-text-muted disabled:opacity-50"
    >
      {children}
    </button>
  );
}

/**
 * The bulk bar keeps its place whether or not anything is selected — a control
 * strip that appears and shifts the table down under the pointer is how you
 * click the wrong row.
 */
function BulkBar({
  count,
  note,
  onNoteChange,
  isSaving,
  onKeep,
  onReject,
}: {
  count: number;
  note: string;
  onNoteChange: (value: string) => void;
  isSaving: boolean;
  onKeep: () => void;
  onReject: () => void;
}) {
  const idle = count === 0;

  return (
    <div className="flex flex-col gap-2 rounded border border-hairline bg-surface p-3 sm:flex-row sm:items-center">
      <p className="text-14 text-text-muted sm:w-40">
        {idle ? "Nothing selected" : `${count} selected`}
      </p>

      <label className="flex-1">
        <span className="sr-only">Note recorded with this decision</span>
        <input
          type="text"
          value={note}
          onChange={(event) => onNoteChange(event.target.value)}
          disabled={idle}
          placeholder="Note for the audit trail (optional)"
          className="w-full rounded border border-hairline bg-base px-3 py-1.5 text-14 text-text placeholder:text-text-muted disabled:opacity-50"
        />
      </label>

      <div className="flex gap-2">
        <DecisionButton onClick={onKeep} disabled={idle || isSaving}>
          Keep selected
        </DecisionButton>
        <DecisionButton onClick={onReject} disabled={idle || isSaving}>
          Reject selected
        </DecisionButton>
      </div>
    </div>
  );
}
