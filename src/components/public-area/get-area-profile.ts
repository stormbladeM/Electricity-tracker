import { cache } from "react";
import { createPublicClient } from "@/lib/supabase/public";
import type { LgaRankRow } from "@/components/area-dashboard/ranking";
import type { ResolvedDisco } from "@/components/area-dashboard/use-area-scope";

export type AreaProfile = {
  state: { id: string; name: string; slug: string | null };
  lga: { id: string; name: string; slug: string | null };
  /** Areas under this LGA — the default area today, more once estates land. */
  areaIds: string[];
  disco: ResolvedDisco | null;
  /** This LGA's row from the 30-day ranking, or null if nobody has logged. */
  stats: LgaRankRow | null;
};

type DiscoEmbed = { name: string; short_name: string | null } | null;

function singleDisco(rows: { disco: DiscoEmbed }[]): ResolvedDisco | null {
  const seen = new Map<string, ResolvedDisco>();
  for (const row of rows) {
    if (row.disco) {
      seen.set(row.disco.name, { name: row.disco.name, shortName: row.disco.short_name });
    }
  }
  return seen.size === 1 ? [...seen.values()][0] : null;
}

/**
 * Everything the public page at /state/<slug>/lga/<slug> needs, in one place.
 *
 * `cache` scopes the work to a single request, so `generateMetadata` and the
 * page component share one set of queries rather than each running its own.
 * Returns null when either slug doesn't resolve — the page turns that into a
 * 404.
 *
 * Every read here is against a publicly-selectable table or the public
 * `lga_uptime_ranking` function, so it works for a logged-out visitor.
 */
export const getAreaProfile = cache(
  async (stateSlug: string, lgaSlug: string): Promise<AreaProfile | null> => {
    const supabase = createPublicClient();

    const { data: state } = await supabase
      .from("states")
      .select("id, name, slug")
      .eq("slug", stateSlug)
      .maybeSingle();
    if (!state) return null;

    const { data: lga } = await supabase
      .from("lgas")
      .select("id, name, slug")
      .eq("state_id", state.id)
      .eq("slug", lgaSlug)
      .maybeSingle();
    if (!lga) return null;

    const { data: areas } = await supabase
      .from("areas")
      .select("id, disco:discos(name, short_name)")
      .eq("lga_id", lga.id);
    const areaRows = (areas ?? []) as { id: string; disco: DiscoEmbed }[];

    const { data: ranking } = await supabase.rpc("lga_uptime_ranking", { p_days: 30 });
    const stats =
      (ranking ?? []).find((row) => row.lga_id === lga.id) ?? null;

    return {
      state,
      lga,
      areaIds: areaRows.map((row) => row.id),
      disco: singleDisco(areaRows),
      stats: stats
        ? {
            ...stats,
            uptime_percent: Number(stats.uptime_percent),
            off_minutes: Number(stats.off_minutes),
            outage_count: Number(stats.outage_count),
            log_count: Number(stats.log_count),
            contributor_count: Number(stats.contributor_count),
            area_count: Number(stats.area_count),
          }
        : null,
    };
  },
);
