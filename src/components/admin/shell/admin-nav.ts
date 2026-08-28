/**
 * The admin panel's sections, in the order the sidebar lists them.
 *
 * One list, read by the sidebar and by the page titles, so a renamed section
 * can't end up called two different things. Icons are plain Lucide and stay
 * unthemed — a gear is a gear (docs/design-system.md section 5); nothing in
 * here is about electricity, so nothing in here gets a lightning bolt.
 *
 * `adminOnly` marks sections a moderator cannot use. Moderators moderate
 * content; only admins edit the geographic reference data every log is
 * denormalized against.
 */
import {
  LayoutDashboard,
  Map,
  MapPinned,
  ScrollText,
  ShieldCheck,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";

export type AdminNavItem = {
  href: string;
  label: string;
  /** One line under the page title. */
  blurb: string;
  icon: LucideIcon;
  adminOnly?: boolean;
};

export const ADMIN_NAV: readonly AdminNavItem[] = [
  {
    href: "/admin",
    label: "Overview",
    blurb: "Platform health, growth and the current backlog.",
    icon: LayoutDashboard,
  },
  {
    href: "/admin/moderation",
    label: "Moderation",
    blurb: "Logs the detector flagged, and the contributors behind them.",
    icon: ShieldCheck,
  },
  {
    href: "/admin/faults",
    label: "Faults",
    blurb: "Triage queue, status changes and resolution metrics.",
    icon: TriangleAlert,
  },
  {
    href: "/admin/coverage",
    label: "Coverage",
    blurb: "Which LGAs have enough reporting to be trusted, and which are silent.",
    icon: Map,
  },
  {
    href: "/admin/locations",
    label: "Locations",
    blurb: "States, LGAs, areas and DisCos — the reference data everything is filed against.",
    icon: MapPinned,
    adminOnly: true,
  },
  {
    href: "/admin/audit",
    label: "Audit log",
    blurb: "Every moderator and admin action, append-only.",
    icon: ScrollText,
  },
];

/** The nav item whose route the current path sits in, if any. */
export function activeNavItem(pathname: string): AdminNavItem | null {
  const matches = ADMIN_NAV.filter(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );

  // Longest match wins, so /admin/faults doesn't resolve to /admin.
  return matches.sort((a, b) => b.href.length - a.href.length)[0] ?? null;
}

export function visibleNav(isAdmin: boolean): AdminNavItem[] {
  return ADMIN_NAV.filter((item) => isAdmin || !item.adminOnly);
}
