/**
 * The locations screen's two halves, held in the URL.
 *
 * Kept out of `locations-view.tsx` because that file is a client module and the
 * server page has to call `parseLocationTab` while rendering — a client
 * function cannot be invoked from the server, only rendered as a component.
 * This is the same split `moderation-tab.ts` and `triage-tab.ts` already make.
 */
export const LOCATION_TABS = ["places", "discos"] as const;
export type LocationTab = (typeof LOCATION_TABS)[number];
export const DEFAULT_LOCATION_TAB: LocationTab = "places";

export const LOCATION_TAB_LABEL: Record<LocationTab, string> = {
  places: "States, LGAs and areas",
  discos: "DisCos",
};

export function parseLocationTab(value: string | string[] | undefined): LocationTab {
  const candidate = Array.isArray(value) ? value[0] : value;
  return LOCATION_TABS.find((tab) => tab === candidate) ?? DEFAULT_LOCATION_TAB;
}
