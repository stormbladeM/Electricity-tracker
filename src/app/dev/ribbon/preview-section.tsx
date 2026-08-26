import type { ReactNode } from "react";

/** Card wrapper for one ribbon variant on the preview page. */
export function PreviewSection({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded border border-hairline bg-surface p-4">
      <h2 className="font-display text-18 font-medium text-text">{title}</h2>
      {note && <p className="mt-1 mb-4 max-w-prose text-14 text-text-muted">{note}</p>}
      <div className={note ? "" : "mt-4"}>{children}</div>
    </section>
  );
}
