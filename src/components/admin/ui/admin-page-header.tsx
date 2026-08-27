import type { ReactNode } from "react";

/**
 * Title, one line of context, and whatever control the screen puts on the
 * right (usually the window selector).
 *
 * Quieter than the user app's headers on purpose: 24px display rather than 32,
 * no decoration. The admin panel is somewhere you work, not somewhere you land.
 */
export function AdminPageHeader({
  title,
  blurb,
  children,
}: {
  title: string;
  blurb: string;
  children?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-3 border-b border-hairline pb-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-24 font-medium text-text">{title}</h1>
        <p className="text-14 text-text-muted">{blurb}</p>
      </div>
      {children}
    </header>
  );
}
