"use client";

import Link from "next/link";
import { Download } from "lucide-react";
import { AdminPageHeader } from "../ui/admin-page-header";
import {
  AdminEmpty,
  AdminTable,
  AdminTableSkeleton,
  Td,
  Th,
  Tr,
} from "../ui/admin-table";
import { TabNav } from "../ui/tab-nav";
import { WindowSelector } from "../ui/window-selector";
import { accountLabel, formatExactStamp, formatStamp, shortId } from "../ui/admin-format";
import { datedFilename, downloadCsv, toCsv } from "../ui/export-csv";
import { adminWindowPhrase, type AdminWindow } from "../ui/admin-window";
import {
  AUDIT_FILTERS,
  AUDIT_FILTER_LABEL,
  actionLabel,
  targetHref,
  type AuditFilter,
} from "./audit-actions";
import { useAuditFeed, type AuditEntry } from "./use-audit-feed";

const CSV_COLUMNS = [
  "timestamp",
  "admin",
  "admin_role",
  "action",
  "target_type",
  "target_id",
  "notes",
] as const;

/**
 * Every admin and moderator action, newest first.
 *
 * The table is append-only in the database — 0001 grants no update or delete
 * policy on admin_audit_log to anybody, admins included — so this screen is
 * strictly a reader. There is no "clear log" button and there is not meant to
 * be one; the immutability is the feature.
 */
export function AuditView({ days, filter }: { days: AdminWindow; filter: AuditFilter }) {
  const { entries, isLoading, error } = useAuditFeed(days, filter);

  function exportCsv() {
    if (!entries) return;

    const csv = toCsv(
      CSV_COLUMNS,
      entries.map((entry) => [
        entry.created_at,
        accountLabel(entry.admin_name, entry.admin_id ?? ""),
        entry.admin_role,
        entry.action,
        entry.target_type,
        entry.target_id,
        entry.notes,
      ]),
    );

    downloadCsv(datedFilename("audit-log"), csv);
  }

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Audit log"
        blurb={`Every moderator and admin action in ${adminWindowPhrase(days)}. Append-only.`}
      >
        <WindowSelector days={days} />
      </AdminPageHeader>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <TabNav
          label="Audit filters"
          tabs={AUDIT_FILTERS.map((option) => ({
            href: `/admin/audit?filter=${option}&days=${days}`,
            label: AUDIT_FILTER_LABEL[option],
            isActive: option === filter,
          }))}
        />

        <button
          type="button"
          onClick={exportCsv}
          disabled={!entries || entries.length === 0}
          className="flex items-center gap-2 rounded border border-hairline px-3 py-1.5 text-14 text-text hover:border-text-muted disabled:opacity-50"
        >
          <Download aria-hidden="true" size={16} strokeWidth={1.5} />
          Export CSV
        </button>
      </div>

      {error ? (
        <p className="text-14 text-fault">{error}</p>
      ) : isLoading || !entries ? (
        <AdminTableSkeleton rows={10} />
      ) : entries.length === 0 ? (
        <AdminEmpty
          message={`No admin actions in ${adminWindowPhrase(days)}.`}
          hint="Moderation decisions, fault triage and location edits all appear here as they happen."
        />
      ) : (
        <AdminTable
          caption="Admin and moderator actions, newest first"
          head={
            <>
              <Th>When</Th>
              <Th>Who</Th>
              <Th>Action</Th>
              <Th>Target</Th>
              <Th>Notes</Th>
            </>
          }
        >
          {entries.map((entry) => (
            <AuditRow key={entry.id} entry={entry} />
          ))}
        </AdminTable>
      )}
    </div>
  );
}

function AuditRow({ entry }: { entry: AuditEntry }) {
  const href = targetHref(entry.target_type, entry.target_id);

  return (
    <Tr>
      <Td className="whitespace-nowrap font-mono text-12 text-text-muted">
        <span title={formatExactStamp(entry.created_at)}>
          {formatStamp(entry.created_at)}
        </span>
      </Td>
      <Td className="whitespace-nowrap">
        <span className="font-mono text-12">
          {entry.admin_id ? accountLabel(entry.admin_name, entry.admin_id) : "deleted account"}
        </span>
        {entry.admin_role && (
          <span className="block text-12 text-text-muted">{entry.admin_role}</span>
        )}
      </Td>
      <Td className="text-14">{actionLabel(entry.action)}</Td>
      <Td className="whitespace-nowrap font-mono text-12 text-text-muted">
        {entry.target_id ? (
          href ? (
            <Link href={href} className="text-primary-text hover:underline">
              {shortId(entry.target_id)}
            </Link>
          ) : (
            shortId(entry.target_id)
          )
        ) : (
          "—"
        )}
        {entry.target_type && (
          <span className="block">{entry.target_type.replace("_", " ")}</span>
        )}
      </Td>
      <Td className="min-w-64 text-14 text-text-muted">{entry.notes ?? "—"}</Td>
    </Tr>
  );
}
