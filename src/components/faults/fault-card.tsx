import Link from "next/link";
import { Users } from "lucide-react";
import { formatRelativeTime } from "@/lib/time/relative-time";
import { FaultOutageFragment } from "./fault-outage-fragment";
import { FaultStatusPill } from "./fault-status-pill";
import { FaultTypeIcon } from "./fault-type-icon";
import { SeverityBadge } from "./severity-badge";
import { FAULT_TYPE_META } from "./fault-types";
import type { FaultWithPlace } from "./fault-data";

type FaultCardProps = {
  fault: FaultWithPlace;
  /** Drop the description and the ribbon fragment — for tight lists. */
  compact?: boolean;
  /** Suppress just the ribbon fragment (its own network fetch) — dev preview. */
  showRibbon?: boolean;
  /** Surface the card sits on, for the ribbon gap colour. */
  gapColor?: string;
};

/**
 * One fault in a feed. The whole card is a link to the detail page. Severity
 * and status never lean on colour alone — SeverityBadge carries a tick meter,
 * FaultStatusPill carries a dot and a word.
 */
export function FaultCard({
  fault,
  compact = false,
  showRibbon = true,
  gapColor,
}: FaultCardProps) {
  const meta = FAULT_TYPE_META[fault.fault_type];
  const place = fault.lgas?.name ?? "your area";

  return (
    <Link
      href={`/faults/${fault.id}`}
      className="flex flex-col gap-3 rounded border border-hairline bg-surface p-4 transition-colors hover:border-text-muted"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <FaultTypeIcon type={fault.fault_type} className="mt-0.5 shrink-0 text-text-muted" />
          <div className="flex flex-col gap-0.5">
            <h3 className="font-display text-16 font-medium text-text">{meta.label}</h3>
            <p className="text-12 text-text-muted">
              {place} · {formatRelativeTime(fault.reported_at)}
            </p>
          </div>
        </div>
        <SeverityBadge severity={fault.severity} className="shrink-0" />
      </div>

      {!compact && fault.description && (
        <p className="line-clamp-2 text-14 text-text-muted">{fault.description}</p>
      )}

      {!compact && showRibbon && (
        <FaultOutageFragment
          areaId={fault.area_id}
          from={fault.reported_at}
          to={fault.resolved_at}
          areaLabel={place}
          gapColor={gapColor}
        />
      )}

      <div className="flex items-center justify-between gap-3">
        <FaultStatusPill status={fault.status} />
        <span className="flex items-center gap-1.5 font-mono text-12 text-text-muted">
          <Users aria-hidden="true" size={14} strokeWidth={1.5} />
          {fault.confirm_count} {fault.confirm_count === 1 ? "confirmation" : "confirmations"}
        </span>
      </div>
    </Link>
  );
}
