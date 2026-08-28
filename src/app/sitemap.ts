import type { MetadataRoute } from "next";
import { createPublicClient } from "@/lib/supabase/public";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// Rebuilt on the same cadence as the public area pages themselves.
export const revalidate = 3600;

/**
 * The static entry points plus every LGA that has enough data to rank — the
 * same source the public area page uses for `generateStaticParams`, so the
 * sitemap and the prebuilt pages stay in step.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, changeFrequency: "hourly", priority: 1 },
    { url: `${BASE}/faults`, changeFrequency: "hourly", priority: 0.6 },
    { url: `${BASE}/onboarding`, changeFrequency: "yearly", priority: 0.3 },
  ];

  const { data: ranking } = await createPublicClient().rpc("lga_uptime_ranking", {
    p_days: 30,
  });

  const areaRoutes: MetadataRoute.Sitemap = (ranking ?? [])
    .filter((row) => row.state_slug && row.lga_slug)
    .map((row) => ({
      url: `${BASE}/state/${row.state_slug}/lga/${row.lga_slug}`,
      changeFrequency: "daily" as const,
      priority: 0.7,
    }));

  return [...staticRoutes, ...areaRoutes];
}
