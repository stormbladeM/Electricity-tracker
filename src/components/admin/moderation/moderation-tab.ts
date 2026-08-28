/**
 * The moderation screen's two halves, held in the URL.
 *
 * Flagged logs and the accounts behind them are one job — you look at a
 * cluster of suspect logs, then at whoever wrote them — so they are two tabs
 * of one screen rather than two entries in the sidebar.
 */
export const MODERATION_TABS = ["logs", "contributors"] as const;
export type ModerationTab = (typeof MODERATION_TABS)[number];
export const DEFAULT_MODERATION_TAB: ModerationTab = "logs";

export const MODERATION_TAB_LABEL: Record<ModerationTab, string> = {
  logs: "Flagged logs",
  contributors: "Contributors",
};

export function parseModerationTab(value: string | string[] | undefined): ModerationTab {
  const candidate = Array.isArray(value) ? value[0] : value;
  return MODERATION_TABS.find((tab) => tab === candidate) ?? DEFAULT_MODERATION_TAB;
}

/** "1" / "true" both count as on, so a hand-typed URL behaves. */
export function parseFlaggedOnly(value: string | string[] | undefined): boolean {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate === "1" || candidate === "true";
}

export function moderationHref(tab: ModerationTab, flaggedOnly = false): string {
  const params = new URLSearchParams({ tab });
  if (flaggedOnly) params.set("flagged", "1");
  return `/admin/moderation?${params.toString()}`;
}
