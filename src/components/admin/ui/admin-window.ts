/**
 * The reporting window every admin screen is scoped by, held in the URL.
 *
 * Same approach as the area dashboard's period and the /faults scope: a
 * moderator can send "the last 7 days of this queue" to someone else, and the
 * back button steps through it. The values are days because that is what the
 * Postgres aggregates take (`p_days`), so nothing has to translate between a
 * label and a number on the way down.
 */
export const ADMIN_WINDOWS = [7, 30, 90] as const;
export type AdminWindow = (typeof ADMIN_WINDOWS)[number];
export const DEFAULT_ADMIN_WINDOW: AdminWindow = 30;

export function parseAdminWindow(value: string | string[] | undefined): AdminWindow {
  const candidate = Number(Array.isArray(value) ? value[0] : value);
  return ADMIN_WINDOWS.find((days) => days === candidate) ?? DEFAULT_ADMIN_WINDOW;
}

/** "30 days" — for the selector and for hints under a figure. */
export function adminWindowLabel(days: AdminWindow): string {
  return `${days} days`;
}

/** "the last 30 days" — for sentences. */
export function adminWindowPhrase(days: AdminWindow): string {
  return `the last ${days} days`;
}

/** The same path with the window swapped, keeping any other params. */
export function windowHref(
  pathname: string,
  params: URLSearchParams,
  days: AdminWindow,
): string {
  const next = new URLSearchParams(params);
  next.set("days", String(days));
  return `${pathname}?${next.toString()}`;
}
