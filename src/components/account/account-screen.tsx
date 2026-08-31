"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/auth/use-auth";
import { useProfile } from "@/lib/auth/use-profile";
import { useAccountActions } from "./use-account-actions";

/**
 * The account screen: whether this account survives losing the browser, and
 * how to make it so.
 *
 * Everyone here is already signed in — anonymous auth (CLAUDE.md decision 2)
 * means there is no signed-out state to design for. So the question the screen
 * answers is not "are you logged in" but "does this account exist anywhere
 * other than this device", which is the one that actually has consequences.
 *
 * No colour coding. An unsaved account is not a fault and not degraded data,
 * so it reads on the ordinary surface like the anomaly banner does; the
 * wording carries the weight.
 */
export function AccountScreen() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { profile, isLoading: isProfileLoading, refetch } = useProfile();
  const { link, signIn, signOut, claimStaffRole, isBusy } = useAccountActions();
  const [message, setMessage] = useState<string | null>(null);

  // The OAuth callback redirects here with ?error=… when a round trip fails.
  const callbackError = useSearchParams().get("error");

  if (isAuthLoading || isProfileLoading) {
    return (
      <AccountShell>
        <div className="flex flex-col gap-3" aria-busy="true">
          <div className="h-8 w-2/3 animate-pulse rounded bg-surface" />
          <div className="h-20 w-full animate-pulse rounded bg-surface" />
        </div>
      </AccountShell>
    );
  }

  const isSaved = user !== null && user.is_anonymous !== true;
  const email = user?.email ?? null;
  const role = profile?.role ?? "user";

  async function handleLink() {
    setMessage(null);
    const result = await link();
    if (!result.ok) setMessage(result.message);
  }

  async function handleSignIn() {
    setMessage(null);
    const result = await signIn();
    if (!result.ok) setMessage(result.message);
  }

  async function handleSignOut() {
    setMessage(null);
    const result = await signOut();
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    // A hard navigation, not router.push, and deliberately so. Signing out
    // clears the auth cookies; the fresh anonymous account only exists once the
    // proxy has run and written new ones. A client-side push would leave this
    // React tree holding a null user while those cookies land underneath it,
    // and the next write would go out unauthenticated. A full document load
    // reads the new session once, in order.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/");
  }

  async function handleClaim() {
    setMessage(null);
    const result = await claimStaffRole(profile?.role ?? null);
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    if (result.changed) {
      await refetch();
      setMessage(`Admin access restored. You now have the ${result.role} role.`);
    } else {
      setMessage("This account isn't on the staff list.");
    }
  }

  return (
    <AccountShell>
      <header className="flex flex-col gap-2">
        <Link
          href="/"
          className="flex w-fit items-center gap-1.5 rounded text-14 text-text-muted hover:text-text"
        >
          <ArrowLeft aria-hidden="true" size={16} strokeWidth={1.5} />
          Home
        </Link>
        <h1 className="font-display text-32 font-medium text-text">Your account</h1>
      </header>

      <section
        aria-label="Account status"
        className="flex flex-col gap-4 rounded border border-hairline bg-surface p-4"
      >
        {isSaved ? (
          <>
            <div className="flex flex-col gap-1">
              <p className="text-12 uppercase tracking-wide text-text-muted">Saved</p>
              <p className="text-16 text-text">
                {email ? `Signed in as ${email}.` : "Signed in with Google."}
              </p>
              <p className="text-14 text-text-muted">
                Your logs follow this account. Sign in with Google on another device to pick
                up where you left off.
              </p>
            </div>

            <button
              type="button"
              onClick={handleSignOut}
              disabled={isBusy}
              className="w-fit rounded border border-hairline px-4 py-3 text-16 font-medium text-text disabled:opacity-50"
            >
              {isBusy ? "Signing out…" : "Sign out"}
            </button>
            <p className="text-12 text-text-muted">
              Signing out starts a fresh account on this device. Your history stays with your
              Google account.
            </p>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-1">
              <p className="text-12 uppercase tracking-wide text-text-muted">
                This device only
              </p>
              <p className="text-16 text-text">
                This account only exists in this browser.
              </p>
              <p className="text-14 text-text-muted">
                Clearing your browser data or switching phone would lose your logging
                history. Saving it with Google keeps the same history and adds a way back in.
              </p>
            </div>

            <button
              type="button"
              onClick={handleLink}
              disabled={isBusy}
              className="w-fit rounded bg-primary px-4 py-3 text-16 font-medium text-text disabled:opacity-50"
            >
              {isBusy ? "Opening Google…" : "Save account with Google"}
            </button>

            <div className="border-t border-hairline pt-4">
              <p className="text-14 text-text-muted">
                Already saved an account before?
              </p>
              <button
                type="button"
                onClick={handleSignIn}
                disabled={isBusy}
                className="mt-2 w-fit rounded text-14 text-primary-text underline underline-offset-4 disabled:opacity-50"
              >
                Sign in with Google instead
              </button>
              <p className="mt-2 text-12 text-text-muted">
                This replaces the empty account on this device. Anything logged here since
                you arrived stays with it.
              </p>
            </div>
          </>
        )}
      </section>

      <section
        aria-label="Staff access"
        className="flex flex-col gap-3 rounded border border-hairline bg-surface p-4"
      >
        <p className="flex items-center gap-1.5 text-12 uppercase tracking-wide text-text-muted">
          <ShieldCheck aria-hidden="true" size={14} strokeWidth={1.5} />
          Staff access
        </p>

        {role === "user" ? (
          <>
            <p className="text-14 text-text-muted">
              {isSaved
                ? "If this account is on the staff list, you can take your role back here — on any device, any time."
                : "Save your account with Google first. Staff access follows a verified email address, not this browser."}
            </p>
            <button
              type="button"
              onClick={handleClaim}
              disabled={isBusy || !isSaved}
              className="w-fit rounded border border-hairline px-4 py-3 text-16 font-medium text-text disabled:opacity-50"
            >
              {isBusy ? "Checking…" : "Check for staff access"}
            </button>
          </>
        ) : (
          <>
            <p className="text-16 text-text">
              You have {role} access.
            </p>
            <Link
              href="/admin"
              className="w-fit rounded text-14 text-primary-text underline underline-offset-4"
            >
              Open the admin panel
            </Link>
          </>
        )}
      </section>

      {(message || callbackError) && (
        <p role="status" className="text-14 text-text-muted">
          {message ?? "Google sign-in didn't finish. Try again."}
        </p>
      )}
    </AccountShell>
  );
}

/** Same single narrow column the other user screens use. */
function AccountShell({ children }: { children: ReactNode }) {
  return (
    <main className="flex-1 bg-base px-6 py-12">
      <div className="mx-auto flex w-full max-w-sm flex-col gap-8">{children}</div>
    </main>
  );
}
