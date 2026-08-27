"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AdminEmpty,
  AdminTable,
  AdminTableSkeleton,
  Td,
  Th,
  Tr,
} from "../ui/admin-table";
import { accountLabel, formatStamp } from "../ui/admin-format";
import { moderationHref } from "./moderation-tab";
import { useModerationActions } from "./use-moderation-actions";
import { useContributors, type Contributor } from "./use-moderation-data";

/**
 * Every account with a footprint — logs, faults, a ban, or a staff role —
 * worst first, where "worst" means unreviewed flags, then flags overall, then
 * volume.
 *
 * Account actions are admin-only, and not by UI convention: 0001's
 * profiles_guard_privileged_columns trigger refuses role, ban and trust edits
 * from anyone else, so a moderator pressing these would only meet an error.
 * Moderators moderate content; admins act on accounts. The row controls simply
 * aren't rendered for a moderator, with a line above the table saying why.
 */
export function ContributorTable({
  flaggedOnly,
  isAdmin,
  currentUserId,
}: {
  flaggedOnly: boolean;
  isAdmin: boolean;
  currentUserId: string | null;
}) {
  const { rows, isLoading, error, refetch } = useContributors(flaggedOnly);
  const { moderateAccount, isSaving, error: saveError } = useModerationActions();
  const [openId, setOpenId] = useState<string | null>(null);

  async function save(userId: string, change: Parameters<typeof moderateAccount>[1]) {
    const saved = await moderateAccount(userId, change);
    if (!saved) return;

    setOpenId(null);
    refetch();
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-12 text-text-muted">
          {isAdmin
            ? "Banning and trust scores are recorded in the audit log."
            : "Account actions are admin-only. You can review flagged logs on the other tab."}
        </p>
        <Link
          href={moderationHref("contributors", !flaggedOnly)}
          replace
          scroll={false}
          className="rounded border border-hairline px-3 py-1.5 text-14 text-text-muted hover:text-text"
        >
          {flaggedOnly ? "Show everyone" : "Only those with flags"}
        </Link>
      </div>

      {saveError && <p className="text-14 text-fault">{saveError}</p>}

      {error ? (
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
      ) : isLoading || !rows ? (
        <AdminTableSkeleton />
      ) : rows.length === 0 ? (
        <AdminEmpty
          message={
            flaggedOnly
              ? "No contributor has a flagged log."
              : "No contributors yet."
          }
        />
      ) : (
        <AdminTable
          caption="Contributors with their log and flag tallies"
          head={
            <>
              <Th>Contributor</Th>
              <Th>Place</Th>
              <Th className="text-right">Logs</Th>
              <Th className="text-right">Flagged</Th>
              <Th className="text-right">Faults</Th>
              <Th className="text-right">Trust</Th>
              <Th>Last logged</Th>
              {isAdmin && <Th className="text-right">Account</Th>}
            </>
          }
        >
          {rows.map((row) => (
            <ContributorRows
              key={row.user_id}
              row={row}
              isAdmin={isAdmin}
              isSelf={row.user_id === currentUserId}
              isOpen={openId === row.user_id}
              isSaving={isSaving}
              onToggle={() =>
                setOpenId((current) => (current === row.user_id ? null : row.user_id))
              }
              onSave={(change) => save(row.user_id, change)}
            />
          ))}
        </AdminTable>
      )}
    </div>
  );
}

type ChangeHandler = (change: {
  isBanned?: boolean;
  trustScore?: number;
  note?: string;
}) => void;

function ContributorRows({
  row,
  isAdmin,
  isSelf,
  isOpen,
  isSaving,
  onToggle,
  onSave,
}: {
  row: Contributor;
  isAdmin: boolean;
  isSelf: boolean;
  isOpen: boolean;
  isSaving: boolean;
  onToggle: () => void;
  onSave: ChangeHandler;
}) {
  const who = accountLabel(row.display_name, row.user_id);
  const columnCount = isAdmin ? 8 : 7;

  return (
    <>
      <Tr isSelected={isOpen}>
        <Td className="whitespace-nowrap">
          <span className="font-mono text-14">{who}</span>
          <span className="block text-12 text-text-muted">
            {row.role !== "user" && `${row.role} · `}
            {row.is_banned ? "banned" : "active"}
            {isSelf && " · you"}
          </span>
        </Td>
        <Td className="whitespace-nowrap text-14">
          {row.lga_name ?? "—"}
          <span className="block text-12 text-text-muted">{row.state_name ?? ""}</span>
        </Td>
        <Td className="text-right font-mono text-14">{row.log_count}</Td>
        <Td className="text-right font-mono text-14">
          {row.flagged_count}
          {row.pending_flag_count > 0 && (
            <span className="block text-12 text-warn">{row.pending_flag_count} pending</span>
          )}
        </Td>
        <Td className="text-right font-mono text-14">{row.fault_count}</Td>
        <Td className="text-right font-mono text-14">{row.trust_score}</Td>
        <Td className="whitespace-nowrap font-mono text-12 text-text-muted">
          {row.last_logged_at ? formatStamp(row.last_logged_at) : "—"}
        </Td>
        {isAdmin && (
          <Td className="text-right">
            {isSelf ? (
              <span className="text-12 text-text-muted">Your account</span>
            ) : (
              <button
                type="button"
                onClick={onToggle}
                aria-expanded={isOpen}
                className="rounded border border-hairline px-2.5 py-1 text-14 text-text hover:border-text-muted"
              >
                {isOpen ? "Close" : "Manage"}
              </button>
            )}
          </Td>
        )}
      </Tr>

      {isOpen && isAdmin && !isSelf && (
        <tr>
          <td colSpan={columnCount} className="border-b border-hairline bg-surface px-3 py-3">
            <ManagePanel row={row} isSaving={isSaving} onSave={onSave} who={who} />
          </td>
        </tr>
      )}
    </>
  );
}

/**
 * Trust score, a note, and the ban switch.
 *
 * "Warn" is deliberately absent: accounts here are anonymous (CLAUDE.md
 * decision 2) and there is no channel to deliver a warning down, so an action
 * named "warn" would put something in the audit trail that never happened to
 * anybody. A note is the honest version of it.
 */
function ManagePanel({
  row,
  who,
  isSaving,
  onSave,
}: {
  row: Contributor;
  who: string;
  isSaving: boolean;
  onSave: ChangeHandler;
}) {
  const [trustScore, setTrustScore] = useState(String(row.trust_score));
  const [note, setNote] = useState("");

  const parsedTrust = Number(trustScore);
  const trustIsValid =
    trustScore.trim() !== "" && Number.isInteger(parsedTrust) && parsedTrust >= 0 && parsedTrust <= 100;
  const trustChanged = trustIsValid && parsedTrust !== row.trust_score;
  const canSave = trustChanged || note.trim().length > 0;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-12 text-text-muted">
        Managing {who}. Every change below is written to the audit log.
      </p>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex flex-col gap-1">
          <span className="text-12 uppercase tracking-wide text-text-muted">
            Trust score
          </span>
          <input
            type="number"
            min={0}
            max={100}
            value={trustScore}
            onChange={(event) => setTrustScore(event.target.value)}
            className="w-24 rounded border border-hairline bg-base px-3 py-1.5 font-mono text-14 text-text"
          />
        </label>

        <label className="flex flex-1 flex-col gap-1">
          <span className="text-12 uppercase tracking-wide text-text-muted">Note</span>
          <input
            type="text"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Why, for the audit trail"
            className="w-full rounded border border-hairline bg-base px-3 py-1.5 text-14 text-text placeholder:text-text-muted"
          />
        </label>

        <div className="flex gap-2">
          <button
            type="button"
            disabled={!canSave || isSaving || !trustIsValid}
            onClick={() =>
              onSave({
                trustScore: trustChanged ? parsedTrust : undefined,
                note: note.trim() || undefined,
              })
            }
            className="rounded border border-hairline px-3 py-1.5 text-14 text-text hover:border-text-muted disabled:opacity-50"
          >
            Save
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={() =>
              onSave({ isBanned: !row.is_banned, note: note.trim() || undefined })
            }
            className="rounded border border-hairline px-3 py-1.5 text-14 text-text hover:border-text-muted disabled:opacity-50"
          >
            {row.is_banned ? "Lift ban" : "Ban account"}
          </button>
        </div>
      </div>

      <p className="text-12 text-text-muted">
        {row.is_banned
          ? "This account can still read the app and see its own history; it cannot write new logs, faults or confirmations."
          : "Banning blocks new logs, faults and confirmations. Existing history stays and keeps counting."}
        {!trustIsValid && " Trust score must be a whole number between 0 and 100."}
      </p>
    </div>
  );
}
