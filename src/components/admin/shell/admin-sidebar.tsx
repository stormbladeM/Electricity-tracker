"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { visibleNav } from "./admin-nav";
import type { StaffRole } from "./use-admin-access";

/**
 * The panel's one navigation surface: a fixed left rail on desktop, a
 * horizontally scrollable strip above the content on narrow screens.
 *
 * The admin panel is desktop-first (docs/design-system.md section 7) — data
 * density beats thumb reach here — but "desktop-first" is not "desktop-only",
 * and the quality floor still says 320px. One `<nav>` renders both shapes so
 * the two can't drift apart.
 */
export function AdminSidebar({ role }: { role: StaffRole }) {
  const pathname = usePathname();
  const items = visibleNav(role === "admin");

  return (
    <nav
      aria-label="Admin sections"
      className="border-b border-hairline bg-surface lg:w-56 lg:shrink-0 lg:border-r lg:border-b-0"
    >
      <div className="hidden items-baseline gap-2 border-b border-hairline px-4 py-4 lg:flex">
        <span className="font-display text-18 font-medium text-text">Admin</span>
        <span className="font-mono text-12 uppercase tracking-wide text-text-muted">
          {role}
        </span>
      </div>

      <ul className="flex gap-1 overflow-x-auto px-2 py-2 lg:flex-col lg:gap-0.5 lg:p-2">
        {items.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <li key={item.href} className="shrink-0 lg:shrink">
              <Link
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`flex items-center gap-2 rounded px-3 py-2 text-14 whitespace-nowrap ${
                  isActive
                    ? "bg-base text-text"
                    : "text-text-muted hover:bg-base hover:text-text"
                }`}
              >
                <Icon aria-hidden="true" size={16} strokeWidth={1.5} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="border-t border-hairline px-2 py-2 lg:mt-2">
        <Link
          href="/"
          className="flex items-center gap-2 rounded px-3 py-2 text-14 text-text-muted hover:text-text"
        >
          <ArrowLeft aria-hidden="true" size={16} strokeWidth={1.5} />
          Back to the app
        </Link>
      </div>
    </nav>
  );
}
