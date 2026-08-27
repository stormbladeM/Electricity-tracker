"use client";

import { useState } from "react";
import Link from "next/link";
import type { FaultWithPlace } from "@/components/faults/fault-data";
import { FAULT_TYPE_META, type FaultStatus } from "@/components/faults/fault-types";
import { formatStamp } from "../ui/admin-format";
import { NEXT_STATUSES, noteIsExpected } from "./status-transitions";
import { useMergeCandidates } from "./use-triage-data";

/**
 * The row that opens under a fault in the queue: what was reported, where it
 * can go next, and whether it is a duplicate.
 *
 * The note field is shared by both halves deliberately — whatever a moderator
 * types is the reason for whichever button they then press, and it lands in
 * the audit trail either way. Resolving and rejecting are the two moves where
 * the note becomes the report's public resolution note, so those are the two
 * that ask for one.
 */
export function TriagePanel({
  fault,
  isSaving,
  onStatus,
  onMerge,
}: {
  fault: FaultWithPlace;
  isSaving: boolean;
  onStatus: (status: FaultStatus, note: string) => void;
  onMerge: (primaryId: string, note: string) => void;
}) {
  const [note, setNote] = useState("");
  const [duplicateOf, setDuplicateOf] = useState("");
  const candidates = useMergeCandidates(fault.id, fault.lga_id);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <p className="text-14 text-text">
          {fault.description?.trim() || "No description was given."}
        </p>
        <p className="text-12 text-text-muted">
          {FAULT_TYPE_META[fault.fault_type].label} · reported{" "}
          {formatStamp(fault.reported_at)}
          {fault.resolved_at && ` · resolved ${formatStamp(fault.resolved_at)}`}
          {fault.latitude != null && " · has a map pin"}
          {fault.photo_url && " · has a photo"}
          {" · "}
          <Link href={`/faults/${fault.id}`} className="text-primary-text hover:underline">
            open the public page
          </Link>
        </p>
        {fault.resolution_note && (
          <p className="text-12 text-text-muted">
            Current note: {fault.resolution_note}
          </p>
        )}
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-12 uppercase tracking-wide text-text-muted">Note</span>
        <input
          type="text"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder={
            noteIsExpected(fault.status)
              ? "What happened — shown on the public fault page"
              : "Optional. Resolving or rejecting publishes this on the fault page."
          }
          className="w-full rounded border border-hairline bg-base px-3 py-1.5 text-14 text-text placeholder:text-text-muted"
        />
      </label>

      <div className="flex flex-wrap gap-2">
        {NEXT_STATUSES[fault.status].map((move) => (
          <button
            key={move.label}
            type="button"
            disabled={isSaving}
            onClick={() => onStatus(move.status, note)}
            className="rounded border border-hairline px-3 py-1.5 text-14 text-text hover:border-text-muted disabled:opacity-50"
          >
            {move.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2 border-t border-hairline pt-3">
        <p className="text-12 uppercase tracking-wide text-text-muted">Duplicate</p>

        {candidates == null ? (
          <p className="text-12 text-text-muted">Looking for other open reports here…</p>
        ) : candidates.length === 0 ? (
          <p className="text-12 text-text-muted">
            No other open reports in {fault.lgas?.name ?? "this LGA"} to merge into.
          </p>
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="flex-1">
              <span className="sr-only">The report this one duplicates</span>
              <select
                value={duplicateOf}
                onChange={(event) => setDuplicateOf(event.target.value)}
                className="w-full rounded border border-hairline bg-base px-3 py-1.5 text-14 text-text"
              >
                <option value="">Not a duplicate</option>
                {candidates.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {FAULT_TYPE_META[candidate.fault_type].label} ·{" "}
                    {formatStamp(candidate.reported_at)} · {candidate.confirm_count}{" "}
                    confirmed
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              disabled={!duplicateOf || isSaving}
              onClick={() => onMerge(duplicateOf, note)}
              className="rounded border border-hairline px-3 py-1.5 text-14 text-text hover:border-text-muted disabled:opacity-50"
            >
              Merge into it
            </button>
          </div>
        )}

        <p className="text-12 text-text-muted">
          Merging closes this report and moves its confirmations onto the one it
          repeats, so the count follows the fault rather than whichever report was
          filed first.
        </p>
      </div>
    </div>
  );
}
