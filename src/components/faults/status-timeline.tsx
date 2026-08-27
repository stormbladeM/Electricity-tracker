import { formatRelativeTime } from "@/lib/time/relative-time";
import { FAULT_STATUS_META, type FaultStatus } from "./fault-types";
import type { FaultWithPlace } from "./fault-data";

/**
 * The fault's progress, derived from the fields the schema actually carries —
 * reported_at, the current status, confirm_count, resolved_at/resolution_note.
 * There is no per-transition history table yet; that arrives with the admin
 * panel in M6, and this component grows a real event list then.
 */
export function StatusTimeline({ fault }: { fault: FaultWithPlace }) {
  const steps = buildSteps(fault);

  return (
    <ol className="flex flex-col gap-4">
      {steps.map((step, index) => (
        <li key={step.key} className="flex gap-3">
          <div className="flex flex-col items-center">
            <span
              className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                step.done ? "bg-primary-text" : "border border-hairline bg-transparent"
              }`}
            />
            {index < steps.length - 1 && <span className="w-px flex-1 bg-hairline" />}
          </div>
          <div className="flex flex-col gap-0.5 pb-1">
            <p className={`text-14 ${step.done ? "text-text" : "text-text-muted"}`}>{step.title}</p>
            {step.detail && <p className="text-12 text-text-muted">{step.detail}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}

type Step = { key: string; title: string; detail?: string; done: boolean };

const ORDER: FaultStatus[] = [
  "reported",
  "confirmed",
  "acknowledged",
  "in_progress",
  "resolved",
];

function buildSteps(fault: FaultWithPlace): Step[] {
  const rank = ORDER.indexOf(fault.status);

  if (fault.status === "rejected") {
    return [
      {
        key: "reported",
        title: "Reported",
        detail: formatRelativeTime(fault.reported_at),
        done: true,
      },
      {
        key: "rejected",
        title: "Rejected",
        detail: fault.resolution_note ?? FAULT_STATUS_META.rejected.blurb,
        done: true,
      },
    ];
  }

  return [
    {
      key: "reported",
      title: "Reported",
      detail: formatRelativeTime(fault.reported_at),
      done: true,
    },
    {
      key: "confirmed",
      title: "Confirmed by neighbours",
      detail:
        fault.confirm_count > 0
          ? `${fault.confirm_count} ${fault.confirm_count === 1 ? "confirmation" : "confirmations"}`
          : "No confirmations yet",
      done: rank >= ORDER.indexOf("confirmed"),
    },
    {
      key: "acknowledged",
      title: "Acknowledged by a moderator",
      done: rank >= ORDER.indexOf("acknowledged"),
    },
    {
      key: "in_progress",
      title: "Work in progress",
      done: rank >= ORDER.indexOf("in_progress"),
    },
    {
      key: "resolved",
      title: "Resolved",
      detail:
        fault.status === "resolved"
          ? [
              fault.resolved_at ? formatRelativeTime(fault.resolved_at) : null,
              fault.resolution_note,
            ]
              .filter(Boolean)
              .join(" · ") || undefined
          : undefined,
      done: fault.status === "resolved",
    },
  ];
}
