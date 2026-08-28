/**
 * The area dashboard reports at one of two levels: the signed-in user's LGA,
 * or their whole state. Both are read from the URL so a view is linkable and
 * the back button steps through what someone looked at.
 *
 * The state level is a roll-up of every tracked LGA in the state — see
 * `aggregate-area-stats.ts` for how the numbers combine.
 */
export const SCOPES = ["lga", "state"] as const;

export type Scope = (typeof SCOPES)[number];

export const DEFAULT_SCOPE: Scope = "lga";

export function parseScope(value: string | string[] | undefined): Scope {
  const candidate = Array.isArray(value) ? value[0] : value;
  return SCOPES.find((scope) => scope === candidate) ?? DEFAULT_SCOPE;
}
