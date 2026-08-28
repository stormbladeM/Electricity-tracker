import Link from "next/link";

/**
 * The sub-navigation inside one admin screen — moderation's logs/contributors
 * split, and the triage queue's statuses.
 *
 * Links, not buttons, because the tab lives in the URL like every other bit of
 * screen state in this product. The active tab is marked by weight, a
 * `--primary` underline and `aria-current`, matching the user app's toggles.
 * A count sits beside the label so a moderator can see where the work is
 * without opening both tabs.
 */
export type TabItem = {
  href: string;
  label: string;
  isActive: boolean;
  count?: number;
};

export function TabNav({ label, tabs }: { label: string; tabs: TabItem[] }) {
  return (
    <nav aria-label={label} className="flex gap-1 border-b border-hairline">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          replace
          scroll={false}
          aria-current={tab.isActive ? "page" : undefined}
          className={`-mb-px flex items-center gap-2 border-b-2 px-3 py-2 text-14 ${
            tab.isActive
              ? "border-primary font-medium text-text"
              : "border-transparent text-text-muted hover:text-text"
          }`}
        >
          {tab.label}
          {tab.count != null && (
            <span className="font-mono text-12 text-text-muted">{tab.count}</span>
          )}
        </Link>
      ))}
    </nav>
  );
}
