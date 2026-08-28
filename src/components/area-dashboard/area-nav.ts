import type { AreaPeriod } from "./area-period";
import type { Scope } from "./scope";

/** The canonical /area URL for a scope + period pair. Both params always
 *  present so every toggle link is a complete, shareable address. */
export function areaHref(scope: Scope, period: AreaPeriod): string {
  return `/area?scope=${scope}&period=${period}`;
}
