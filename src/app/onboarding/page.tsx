"use client";

import { useRouter } from "next/navigation";
import { LocationPicker } from "@/components/location-picker/location-picker";

export default function OnboardingPage() {
  const router = useRouter();

  return (
    <main className="flex-1 flex flex-col justify-center gap-8 bg-base px-6 py-12">
      <div className="mx-auto w-full max-w-sm">
        <h1 className="font-display text-24 font-medium text-text">Where are you?</h1>
        <p className="mt-2 text-14 text-text-muted">
          Pick your state and LGA so we can show you the right power status.
        </p>
        <div className="mt-6">
          <LocationPicker onComplete={() => router.push("/")} />
        </div>
      </div>
    </main>
  );
}
