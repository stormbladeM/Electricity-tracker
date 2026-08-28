import type { Metadata } from "next";
import { ReportForm } from "@/components/faults/report-form";

export const metadata: Metadata = {
  title: "Report a fault — Nigeria Electricity Tracker",
  description: "Report an electricity fault so neighbours can confirm it and the DisCo can act.",
};

export default function NewFaultPage() {
  return (
    <main className="flex-1 bg-base px-4 py-10 sm:px-6">
      <div className="mx-auto w-full max-w-lg">
        <ReportForm />
      </div>
    </main>
  );
}
