import type { Metadata } from "next";
import { Suspense } from "react";
import { AccountScreen } from "@/components/account/account-screen";

export const metadata: Metadata = {
  title: "Your account — Nigeria Electricity Tracker",
  description: "Save your logging history to a Google account, or sign back in.",
  robots: { index: false, follow: false },
};

/**
 * The screen reads `?error=` from the OAuth callback via useSearchParams, which
 * needs a Suspense boundary above it or the whole route opts out of static
 * rendering with a build-time warning.
 */
export default function AccountPage() {
  return (
    <Suspense fallback={<div className="flex-1 bg-base" aria-busy="true" />}>
      <AccountScreen />
    </Suspense>
  );
}
