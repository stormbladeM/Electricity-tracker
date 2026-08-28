import type { Metadata } from "next";
import { FaultsView } from "@/components/faults/faults-view";
import { parseFaultScope, parseFaultView } from "@/components/faults/fault-view";

export const metadata: Metadata = {
  title: "Faults — Nigeria Electricity Tracker",
  description: "Open electricity faults reported by contributors in your area.",
};

/**
 * Scope (LGA / state) and view (list / map) are read from the URL and passed
 * down, so `/faults?scope=state&view=map` is a link somebody can send, bookmark
 * or reload into. Unrecognised values fall back to the defaults.
 */
export default async function FaultsPage({ searchParams }: PageProps<"/faults">) {
  const { scope, view } = await searchParams;

  return <FaultsView scope={parseFaultScope(scope)} view={parseFaultView(view)} />;
}
