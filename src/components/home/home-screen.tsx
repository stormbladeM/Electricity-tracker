"use client";

import Link from "next/link";
import { useState } from "react";
import { ChartColumn } from "lucide-react";
import { useAuth } from "@/lib/auth/use-auth";
import { useProfile } from "@/lib/auth/use-profile";
import { useLatestLog } from "@/lib/hooks/use-latest-log";
import { useLga } from "@/lib/hooks/use-lga";
import { LogFlow } from "@/components/log-flow/log-flow";
import { StatusCard } from "@/components/status-card/status-card";
import { TodayRibbon } from "./today-ribbon";

/**
 * The one real screen wired to live Supabase data: current status, the log
 * flow, and today's ribbon for the signed-in user's saved area. Redirects to
 * onboarding rather than crashing when the user hasn't picked an area yet.
 */
export function HomeScreen() {
  const { isLoading: isAuthLoading } = useAuth();
  const { profile, isLoading: isProfileLoading } = useProfile();
  const { lga } = useLga(profile?.lga_id);
  const { latestLog, isLoading: isLogLoading, refetch: refetchLatestLog } = useLatestLog(
    profile?.area_id,
  );
  const [refreshToken, setRefreshToken] = useState(0);

  const isLoading = isAuthLoading || isProfileLoading;

  if (isLoading) {
    return (
      <main className="flex-1 flex flex-col gap-8 bg-base px-6 py-12">
        <div className="mx-auto flex w-full max-w-sm flex-col gap-3" aria-busy="true">
          <div className="h-8 w-2/3 animate-pulse rounded bg-surface" />
          <div className="h-6 w-24 animate-pulse rounded bg-surface" />
        </div>
      </main>
    );
  }

  if (!profile?.area_id || !profile.lga_id || !profile.state_id) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center gap-4 bg-base px-6 text-center">
        <p className="text-16 text-text">Set your area to see local power status.</p>
        <Link
          href="/onboarding"
          className="rounded bg-primary px-4 py-3 text-16 font-medium text-text"
        >
          Choose your area
        </Link>
      </main>
    );
  }

  function handleLogged() {
    refetchLatestLog();
    setRefreshToken((token) => token + 1);
  }

  return (
    <main className="flex-1 flex flex-col gap-8 bg-base px-6 py-12">
      <div className="mx-auto flex w-full max-w-sm flex-col gap-8">
        <StatusCard latestLog={latestLog} lgaName={lga?.name ?? null} isLoading={isLogLoading} />

        <TodayRibbon
          areaId={profile.area_id}
          lgaName={lga?.name ?? null}
          refreshToken={refreshToken}
        />

        <LogFlow
          areaId={profile.area_id}
          lgaId={profile.lga_id}
          stateId={profile.state_id}
          latestLog={latestLog}
          onLogged={handleLogged}
        />

        {/* Lucide, unthemed: a chart icon stays a chart icon. */}
        <Link
          href="/dashboard"
          className="flex w-fit items-center gap-2 rounded text-14 text-primary-text"
        >
          <ChartColumn aria-hidden="true" size={16} strokeWidth={1.5} />
          Your dashboard
        </Link>
      </div>
    </main>
  );
}
