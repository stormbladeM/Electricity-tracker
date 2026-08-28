import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MeterReadout } from "@/components/area-dashboard/meter-readout";
import { ConfidenceBadge } from "@/components/area-dashboard/confidence-badge";
import type { AreaCoverage } from "@/components/area-dashboard/area-confidence";
import {
  formatCompactDuration,
  formatSpokenDuration,
  formatUptime,
} from "@/components/personal-dashboard/format-stats";
import { StatTile } from "@/components/personal-dashboard/stat-tile";
import { TransformerIcon } from "@/components/icons";
import { createPublicClient } from "@/lib/supabase/public";
import { getAreaProfile } from "@/components/public-area/get-area-profile";
import { PublicAreaCharts } from "@/components/public-area/public-area-charts";

// Public, SEO-facing pages: rebuilt hourly rather than per request, so a
// crawler and a shared link both get a fast cached response.
export const revalidate = 3600;

// Prebuild the LGAs that actually have data; every other LGA still resolves,
// rendered once on first request and then cached like the rest.
export const dynamicParams = true;

export async function generateStaticParams() {
  const { data: ranking } = await createPublicClient().rpc("lga_uptime_ranking", {
    p_days: 30,
  });

  return (ranking ?? [])
    .filter((row) => row.state_slug && row.lga_slug)
    .map((row) => ({ state: row.state_slug as string, lga: row.lga_slug as string }));
}

function coverageOf(profile: NonNullable<Awaited<ReturnType<typeof getAreaProfile>>>): AreaCoverage {
  return {
    logCount: profile.stats?.log_count ?? 0,
    contributorCount: profile.stats?.contributor_count ?? 0,
    areaCount: profile.stats?.area_count ?? 0,
    dayCount: 30,
    hasAnyKnowledge: profile.stats !== null,
  };
}

export async function generateMetadata({
  params,
}: PageProps<"/state/[state]/lga/[lga]">): Promise<Metadata> {
  const { state, lga } = await params;
  const profile = await getAreaProfile(state, lga);
  if (!profile) return { title: "Area not found — Nigeria Electricity Tracker" };

  const where = `${profile.lga.name}, ${profile.state.name}`;
  const title = `Power supply in ${where}`;
  const description = profile.stats
    ? `${profile.lga.name} had ${formatUptime(profile.stats.uptime_percent)}% power uptime over the last 30 days, from ${profile.stats.log_count} logs by ${profile.stats.contributor_count} contributors.`
    : `Track electricity availability in ${where}. Be the first to report.`;

  return {
    title: `${title} — Nigeria Electricity Tracker`,
    description,
    openGraph: { title, description, type: "website" },
  };
}

export default async function PublicAreaPage({
  params,
}: PageProps<"/state/[state]/lga/[lga]">) {
  const { state, lga } = await params;
  const profile = await getAreaProfile(state, lga);
  if (!profile) notFound();

  const { stats } = profile;
  const coverage = coverageOf(profile);
  const discoLabel = profile.disco
    ? profile.disco.shortName
      ? `${profile.disco.name} (${profile.disco.shortName})`
      : profile.disco.name
    : null;

  return (
    <main className="flex-1 bg-base px-4 py-10 sm:px-6">
      <div className="mx-auto flex w-full max-w-lg flex-col gap-8">
        <header className="flex flex-col gap-2">
          <Link
            href="/"
            className="w-fit rounded text-14 text-text-muted hover:text-text"
          >
            Nigeria Electricity Tracker
          </Link>
          <h1 className="font-display text-32 font-medium text-text">
            {profile.lga.name}
          </h1>
          <p className="text-14 text-text-muted">{profile.state.name}</p>
          {discoLabel && (
            <p className="flex items-center gap-1.5 text-14 text-text-muted">
              <TransformerIcon size={16} className="shrink-0" />
              {discoLabel}
            </p>
          )}
        </header>

        <section className="flex flex-col gap-4 rounded border border-hairline bg-surface p-4">
          <div className="flex flex-col gap-1">
            <p className="text-12 text-text-muted">Uptime over the last 30 days</p>
            <MeterReadout percent={stats ? stats.uptime_percent : null} />
          </div>
          <ConfidenceBadge coverage={coverage} />
        </section>

        {stats && coverage.hasAnyKnowledge && (
          <section className="grid grid-cols-2 gap-3">
            <h2 className="sr-only">Outages over the last 30 days</h2>
            <StatTile
              label="Time off"
              value={formatCompactDuration(stats.off_minutes)}
              spoken={formatSpokenDuration(stats.off_minutes)}
              hint="Averaged per area."
            />
            <StatTile label="Outages" value={String(stats.outage_count)} />
          </section>
        )}

        <PublicAreaCharts areaIds={profile.areaIds} areaName={profile.lga.name} />

        <section className="flex flex-col items-start gap-3 rounded border border-hairline bg-surface p-4">
          <p className="text-16 text-text">
            {stats
              ? `Is this your area? Log outages as they happen and sharpen the picture.`
              : `No logs yet in ${profile.lga.name}. Be the first to report.`}
          </p>
          <Link
            href="/"
            className="rounded bg-primary px-4 py-3 text-16 font-medium text-text"
          >
            Open the tracker
          </Link>
        </section>

        <p className="text-12 text-text-muted">
          Crowdsourced from contributors in {profile.lga.name}. Outage history
          rebuilds a few minutes after each log.
        </p>
      </div>
    </main>
  );
}
