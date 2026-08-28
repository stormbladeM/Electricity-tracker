"use client";

import Link from "next/link";
import { type ReactNode } from "react";
import { ArrowLeft, Plus } from "lucide-react";
import { useAuth } from "@/lib/auth/use-auth";
import { useProfile } from "@/lib/auth/use-profile";
import { useLga } from "@/lib/hooks/use-lga";
import { useStates } from "@/components/location-picker/use-states";
import { FaultCard } from "./fault-card";
import { FaultMapPanel } from "./fault-map-panel";
import { FaultsSkeleton } from "./faults-skeleton";
import { FaultsToggle } from "./faults-toggle";
import { useFaults } from "./use-faults";
import type { FaultScope, FaultViewMode } from "./fault-view";

/**
 * The /faults screen: open faults for the user's LGA (or their whole state),
 * as a list or on a map. Scope and view come from the URL. Redirects to
 * onboarding when no area is set, matching the home screen.
 */
export function FaultsView({ scope, view }: { scope: FaultScope; view: FaultViewMode }) {
  const { isLoading: isAuthLoading } = useAuth();
  const { profile, isLoading: isProfileLoading } = useProfile();
  const { lga } = useLga(profile?.lga_id);
  const { states } = useStates();
  const stateName = states.find((s) => s.id === profile?.state_id)?.name ?? "your state";

  const column = scope === "lga" ? "lga_id" : "state_id";
  const value = scope === "lga" ? profile?.lga_id : profile?.state_id;
  const { faults, isLoading, error, refetch } = useFaults({ column, value });

  if (isAuthLoading || isProfileLoading) {
    return (
      <Shell>
        <div className="h-8 w-2/3 animate-pulse rounded bg-surface" />
        <FaultsSkeleton />
      </Shell>
    );
  }

  if (!profile?.area_id || !profile.lga_id || !profile.state_id) {
    return (
      <Shell>
        <p className="text-16 text-text">Set your area to see local faults.</p>
        <Link
          href="/onboarding"
          className="self-start rounded bg-primary px-4 py-3 text-16 font-medium text-text"
        >
          Choose your area
        </Link>
      </Shell>
    );
  }

  const place = scope === "lga" ? (lga?.name ?? "your area") : stateName;

  return (
    <Shell>
      <header className="flex flex-col gap-2">
        <Link
          href="/"
          className="flex w-fit items-center gap-1.5 rounded text-14 text-text-muted hover:text-text"
        >
          <ArrowLeft aria-hidden="true" size={16} strokeWidth={1.5} />
          Home
        </Link>
        <h1 className="font-display text-32 font-medium text-text">Faults in {place}</h1>
        <p className="text-14 text-text-muted">
          Reported by contributors. Confirm any that affect you too.
        </p>
      </header>

      <Link
        href="/faults/new"
        className="flex items-center justify-center gap-2 rounded bg-primary px-4 py-3 text-16 font-medium text-text"
      >
        <Plus aria-hidden="true" size={16} strokeWidth={1.5} />
        Report a fault
      </Link>

      <FaultsToggle
        scope={scope}
        view={view}
        lgaName={lga?.name ?? "Your LGA"}
        stateName={stateName}
      />

      {error ? (
        <div className="flex flex-col items-start gap-3 rounded border border-hairline bg-surface p-4">
          <p className="text-14 text-fault">{error}</p>
          <button
            type="button"
            onClick={refetch}
            className="rounded border border-hairline px-3 py-2 text-14 text-text hover:border-text-muted"
          >
            Try again
          </button>
        </div>
      ) : isLoading || !faults ? (
        <FaultsSkeleton />
      ) : faults.length === 0 ? (
        <div className="rounded border border-hairline bg-surface p-4">
          <p className="text-16 text-text">No open faults in {place}.</p>
          <p className="mt-1 text-14 text-text-muted">
            {"If something's wrong, be the first to report it."}
          </p>
        </div>
      ) : view === "map" ? (
        <FaultMapPanel faults={faults} />
      ) : (
        <div className="flex flex-col gap-3">
          {faults.map((fault) => (
            <FaultCard key={fault.id} fault={fault} />
          ))}
        </div>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <main className="flex-1 bg-base px-4 py-10 sm:px-6">
      <div className="mx-auto flex w-full max-w-lg flex-col gap-6">{children}</div>
    </main>
  );
}
