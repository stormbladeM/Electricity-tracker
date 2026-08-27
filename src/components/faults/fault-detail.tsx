"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { formatRelativeTime } from "@/lib/time/relative-time";
import { ConfirmButton } from "./confirm-button";
import { FaultMapPanel } from "./fault-map-panel";
import { FaultOutageFragment } from "./fault-outage-fragment";
import { FaultStatusPill } from "./fault-status-pill";
import { FaultTypeIcon } from "./fault-type-icon";
import { SeverityBadge } from "./severity-badge";
import { StatusTimeline } from "./status-timeline";
import { FAULT_TYPE_META } from "./fault-types";
import { useFault } from "./use-fault";
import type { FaultWithPlace } from "./fault-data";

type FaultDetailProps = {
  id: string;
  initialFault: FaultWithPlace;
  /** Arrived here straight from the report form. */
  justReported?: boolean;
};

export function FaultDetail({ id, initialFault, justReported = false }: FaultDetailProps) {
  const { fault, isOwner, hasConfirmed, error, refetch } = useFault(id, initialFault);
  const current = fault ?? initialFault;

  const meta = FAULT_TYPE_META[current.fault_type];
  const place = current.lgas?.name ?? "your area";
  const discoLabel = current.discos
    ? current.discos.short_name
      ? `${current.discos.name} (${current.discos.short_name})`
      : current.discos.name
    : null;

  return (
    <main className="flex-1 bg-base px-4 py-10 sm:px-6">
      <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
        <Link
          href="/faults"
          className="flex w-fit items-center gap-1.5 rounded text-14 text-text-muted hover:text-text"
        >
          <ArrowLeft aria-hidden="true" size={16} strokeWidth={1.5} />
          Faults
        </Link>

        {justReported && (
          <p
            role="status"
            className="rounded border border-hairline bg-surface px-4 py-3 text-14 text-text"
          >
            Fault reported. Neighbours can now confirm it.
          </p>
        )}

        <header className="flex flex-col gap-3">
          <div className="flex items-start gap-2.5">
            <FaultTypeIcon
              type={current.fault_type}
              size={24}
              className="mt-1 shrink-0 text-text-muted"
            />
            <div className="flex flex-col gap-1">
              <h1 className="font-display text-32 font-medium text-text">{meta.label}</h1>
              <p className="text-14 text-text-muted">
                {place} · reported {formatRelativeTime(current.reported_at)}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <SeverityBadge severity={current.severity} />
            <FaultStatusPill status={current.status} />
          </div>
          {discoLabel && <p className="text-14 text-text-muted">{discoLabel}</p>}
        </header>

        {current.photo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={current.photo_url}
            alt={`Reported ${meta.label.toLowerCase()} fault in ${place}`}
            loading="lazy"
            className="w-full rounded border border-hairline"
          />
        )}

        {current.description && (
          <p className="text-16 text-text whitespace-pre-line">{current.description}</p>
        )}

        <section className="flex flex-col gap-2 rounded border border-hairline bg-surface p-4">
          <h2 className="text-12 text-text-muted">Power in {place} during this fault</h2>
          <FaultOutageFragment
            areaId={current.area_id}
            from={current.reported_at}
            to={current.resolved_at}
            areaLabel={place}
          />
        </section>

        <ConfirmButton
          faultId={current.id}
          hasConfirmed={hasConfirmed}
          isOwner={isOwner}
          confirmCount={current.confirm_count}
          onChange={refetch}
        />

        {error && (
          <p role="status" className="text-14 text-fault">
            {error}
          </p>
        )}

        {current.latitude !== null && current.longitude !== null && (
          <section className="flex flex-col gap-2">
            <h2 className="text-12 text-text-muted">Location</h2>
            <FaultMapPanel faults={[current]} />
          </section>
        )}

        <section className="flex flex-col gap-3">
          <h2 className="font-display text-18 font-medium text-text">Progress</h2>
          <StatusTimeline fault={current} />
        </section>

        <p className="text-12 text-text-muted">
          Status changes past “confirmed” are made by moderators.
        </p>
      </div>
    </main>
  );
}
