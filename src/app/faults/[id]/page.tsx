import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FAULT_SELECT, type FaultWithPlace } from "@/components/faults/fault-data";
import { FaultDetail } from "@/components/faults/fault-detail";
import { FAULT_TYPE_META } from "@/components/faults/fault-types";

/**
 * The fault detail page. Server-rendered for the first paint and for
 * generateMetadata, so a shared link previews properly — the same reasoning as
 * the public area pages. The confirm button and the live confirm_count are a
 * client component (FaultDetail) hydrated over this.
 */
async function getFault(id: string): Promise<FaultWithPlace | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("fault_reports")
    .select(FAULT_SELECT)
    .eq("id", id)
    .maybeSingle();
  return (data as unknown as FaultWithPlace) ?? null;
}

export async function generateMetadata({
  params,
}: PageProps<"/faults/[id]">): Promise<Metadata> {
  const { id } = await params;
  const fault = await getFault(id);
  if (!fault) return { title: "Fault not found — Nigeria Electricity Tracker" };

  const where = [fault.lgas?.name, fault.states?.name].filter(Boolean).join(", ");
  const label = FAULT_TYPE_META[fault.fault_type].label;
  const title = `${label} in ${where}`;
  const description =
    fault.description ?? `A ${label.toLowerCase()} fault reported by a contributor in ${where}.`;

  return {
    title: `${title} — Nigeria Electricity Tracker`,
    description,
    openGraph: { title, description, type: "article" },
  };
}

export default async function FaultPage({
  params,
  searchParams,
}: PageProps<"/faults/[id]">) {
  const { id } = await params;
  const { reported } = await searchParams;
  const fault = await getFault(id);
  if (!fault) notFound();

  return <FaultDetail id={id} initialFault={fault} justReported={reported === "1"} />;
}
