"use client";

import { useState } from "react";
import type { FaultWithPlace } from "@/components/faults/fault-data";
import { FAULT_TYPE_META, type FaultStatus } from "@/components/faults/fault-types";
import { FaultStatusPill } from "@/components/faults/fault-status-pill";
import { FaultTypeIcon } from "@/components/faults/fault-type-icon";
import { SeverityBadge } from "@/components/faults/severity-badge";
import {
  AdminEmpty,
  AdminTable,
  AdminTableSkeleton,
  Td,
  Th,
  Tr,
} from "../ui/admin-table";
import { formatExactStamp, formatStamp } from "../ui/admin-format";
import { TriagePanel } from "./triage-panel";
import { useTriageActions } from "./use-triage-actions";
import { useTriageQueue } from "./use-triage-data";

/**
 * The triage queue: faults in one lifecycle group, worst first — severity,
 * then how many people confirmed it, then age.
 *
 * That ordering is the whole point of the screen. The public feed is
 * newest-first because a neighbour wants to know what just happened; a
 * moderator wants the live wire across the road before the billing complaint,
 * however long ago either was filed.
 *
 * One row opens at a time. Triage is a decision per fault, and a screen full of
 * open panels is a screen where the wrong one gets pressed.
 */
export function TriageTable({
  statuses,
  emptyMessage,
}: {
  statuses: FaultStatus[];
  emptyMessage: string;
}) {
  const { faults, isLoading, error, refetch } = useTriageQueue(statuses);
  const { setStatus, mergeInto, isSaving, error: saveError } = useTriageActions();
  const [openId, setOpenId] = useState<string | null>(null);

  async function applyStatus(faultId: string, status: FaultStatus, note: string) {
    const saved = await setStatus(faultId, status, note);
    if (!saved) return;
    setOpenId(null);
    refetch();
  }

  async function applyMerge(faultId: string, primaryId: string, note: string) {
    const saved = await mergeInto(faultId, primaryId, note);
    if (!saved) return;
    setOpenId(null);
    refetch();
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

  if (isLoading || !faults) return <AdminTableSkeleton />;
  if (faults.length === 0) return <AdminEmpty message={emptyMessage} />;

  return (
    <div className="flex flex-col gap-3">
      {saveError && <p className="text-14 text-fault">{saveError}</p>}

      <AdminTable
        caption="Fault reports waiting for triage"
        head={
          <>
            <Th>Fault</Th>
            <Th>Severity</Th>
            <Th>Place</Th>
            <Th className="text-right">Confirmed</Th>
            <Th>Status</Th>
            <Th>Reported</Th>
            <Th className="text-right">Triage</Th>
          </>
        }
      >
        {faults.map((fault) => (
          <TriageRows
            key={fault.id}
            fault={fault}
            isOpen={openId === fault.id}
            isSaving={isSaving}
            onToggle={() =>
              setOpenId((current) => (current === fault.id ? null : fault.id))
            }
            onStatus={(status, note) => applyStatus(fault.id, status, note)}
            onMerge={(primaryId, note) => applyMerge(fault.id, primaryId, note)}
          />
        ))}
      </AdminTable>
    </div>
  );
}

function TriageRows({
  fault,
  isOpen,
  isSaving,
  onToggle,
  onStatus,
  onMerge,
}: {
  fault: FaultWithPlace;
  isOpen: boolean;
  isSaving: boolean;
  onToggle: () => void;
  onStatus: (status: FaultStatus, note: string) => void;
  onMerge: (primaryId: string, note: string) => void;
}) {
  return (
    <>
      <Tr isSelected={isOpen}>
        <Td>
          <span className="flex items-center gap-2 whitespace-nowrap">
            <FaultTypeIcon type={fault.fault_type} size={16} className="text-text-muted" />
            {FAULT_TYPE_META[fault.fault_type].label}
          </span>
        </Td>
        <Td>
          <SeverityBadge severity={fault.severity} />
        </Td>
        <Td className="whitespace-nowrap">
          {fault.lgas?.name ?? "—"}
          <span className="block text-12 text-text-muted">
            {fault.states?.name}
            {fault.discos?.short_name && ` · ${fault.discos.short_name}`}
          </span>
        </Td>
        <Td className="text-right font-mono text-14">{fault.confirm_count}</Td>
        <Td>
          <FaultStatusPill status={fault.status} />
        </Td>
        <Td className="whitespace-nowrap font-mono text-12 text-text-muted">
          <span title={formatExactStamp(fault.reported_at)}>
            {formatStamp(fault.reported_at)}
          </span>
        </Td>
        <Td className="text-right">
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={isOpen}
            className="rounded border border-hairline px-2.5 py-1 text-14 text-text hover:border-text-muted"
          >
            {isOpen ? "Close" : "Triage"}
          </button>
        </Td>
      </Tr>

      {isOpen && (
        <tr>
          <td colSpan={7} className="border-b border-hairline bg-surface px-3 py-3">
            <TriagePanel
              fault={fault}
              isSaving={isSaving}
              onStatus={onStatus}
              onMerge={onMerge}
            />
          </td>
        </tr>
      )}
    </>
  );
}
