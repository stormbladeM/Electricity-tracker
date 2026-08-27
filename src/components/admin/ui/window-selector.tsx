"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ADMIN_WINDOWS, adminWindowLabel, windowHref, type AdminWindow } from "./admin-window";

/**
 * The 7 / 30 / 90-day switch that sits beside an admin page title.
 *
 * Links rather than buttons because the window lives in the URL. The active
 * option is marked by weight, a raised surface, a `--primary` underline and
 * `aria-current` — the same treatment as the user app's toggles, and never a
 * solid neon fill.
 */
export function WindowSelector({ days }: { days: AdminWindow }) {
  const pathname = usePathname();
  const params = useSearchParams();

  return (
    <nav
      aria-label="Reporting window"
      className="flex shrink-0 rounded border border-hairline p-1"
    >
      {ADMIN_WINDOWS.map((option) => (
        <Link
          key={option}
          href={windowHref(pathname, params, option)}
          replace
          scroll={false}
          aria-current={option === days ? "true" : undefined}
          className={`rounded border-b-2 px-3 py-1.5 text-14 ${
            option === days
              ? "border-primary bg-surface font-medium text-text"
              : "border-transparent text-text-muted hover:text-text"
          }`}
        >
          {adminWindowLabel(option)}
        </Link>
      ))}
    </nav>
  );
}
