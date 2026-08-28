import type { ReactNode, ThHTMLAttributes, TdHTMLAttributes } from "react";

/**
 * The panel's table look, in one place.
 *
 * Every admin screen is a table of something, and they have to look like one
 * system: hairline rules, a mono column head, no zebra striping (it fights the
 * hairlines and adds a second grid the eye has to ignore). The wrapper scrolls
 * horizontally on its own so a wide table never makes the page scroll sideways.
 */
export function AdminTable({
  caption,
  head,
  children,
}: {
  /** Screen-reader description of what the table lists. */
  caption: string;
  head: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="overflow-x-auto rounded border border-hairline">
      <table className="w-full border-collapse text-14">
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-surface">
          <tr>{head}</tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function Th({
  children,
  className,
  ...props
}: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      scope="col"
      {...props}
      className={`border-b border-hairline px-3 py-2 text-left text-12 font-medium uppercase tracking-wide text-text-muted ${
        className ?? ""
      }`}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  className,
  ...props
}: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      {...props}
      className={`border-b border-hairline px-3 py-2 align-top text-text ${className ?? ""}`}
    >
      {children}
    </td>
  );
}

/** Rows share one hover treatment; selection is marked on the row itself. */
export function Tr({
  children,
  isSelected = false,
}: {
  children: ReactNode;
  isSelected?: boolean;
}) {
  return (
    <tr className={isSelected ? "bg-surface" : "hover:bg-surface"}>{children}</tr>
  );
}

/** Nothing to show, said plainly, with what would put something here. */
export function AdminEmpty({ message, hint }: { message: string; hint?: string }) {
  return (
    <div className="rounded border border-hairline bg-surface p-4">
      <p className="text-14 text-text">{message}</p>
      {hint && <p className="mt-1 text-12 text-text-muted">{hint}</p>}
    </div>
  );
}

/** The table's loading shape: the same rules, no content. */
export function AdminTableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="rounded border border-hairline" aria-busy="true">
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          className="flex items-center gap-3 border-b border-hairline px-3 py-3 last:border-b-0"
        >
          <div className="h-3 w-1/5 animate-pulse rounded bg-hairline" />
          <div className="h-3 w-1/4 animate-pulse rounded bg-hairline" />
          <div className="h-3 flex-1 animate-pulse rounded bg-hairline" />
        </div>
      ))}
    </div>
  );
}
