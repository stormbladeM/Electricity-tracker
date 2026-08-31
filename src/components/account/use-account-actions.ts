"use client";

import { useCallback, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Enums } from "@/lib/supabase/database.types";

type ActionResult =
  | { ok: true }
  | { ok: false; message: string };

type ClaimResult =
  | { ok: true; role: Enums<"user_role">; changed: boolean }
  | { ok: false; message: string };

/**
 * The three things the account screen can do. Each returns a plain result
 * object rather than throwing, the shape useSubmitLog established.
 *
 * `link` and `signIn` are deliberately separate calls even though both end at
 * the same callback. linkIdentity attaches Google to the *current* anonymous
 * user, keeping its id and therefore its whole logging history —
 * signInWithOAuth would abandon that session and start a different one.
 */
export function useAccountActions() {
  const [isBusy, setIsBusy] = useState(false);

  /** Attach Google to the signed-in (anonymous) user, keeping their history. */
  const link = useCallback(async (): Promise<ActionResult> => {
    setIsBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.linkIdentity({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });

    // On success the browser is already navigating to Google; leaving isBusy
    // set keeps the button from being pressed twice on the way out.
    if (error) {
      setIsBusy(false);
      return { ok: false, message: describeAuthError(error.message) };
    }
    return { ok: true };
  }, []);

  /** Sign in to an account that already has Google attached. */
  const signIn = useCallback(async (): Promise<ActionResult> => {
    setIsBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });

    if (error) {
      setIsBusy(false);
      return { ok: false, message: describeAuthError(error.message) };
    }
    return { ok: true };
  }, []);

  const signOut = useCallback(async (): Promise<ActionResult> => {
    setIsBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    setIsBusy(false);

    if (error) {
      return { ok: false, message: "Couldn't sign out. Check your connection and try again." };
    }
    return { ok: true };
  }, []);

  /**
   * Ask the server whether this account's verified email is on the staff
   * allowlist, and take the role if so. The answer is the server's alone —
   * migration 0016 reads the address from auth.users and ignores anything the
   * client says.
   */
  const claimStaffRole = useCallback(
    async (currentRole: Enums<"user_role"> | null): Promise<ClaimResult> => {
      setIsBusy(true);
      const supabase = createClient();
      const { data, error } = await supabase.rpc("claim_staff_role");
      setIsBusy(false);

      if (error) {
        return { ok: false, message: describeClaimError(error.message) };
      }

      const role = (data ?? "user") as Enums<"user_role">;
      return { ok: true, role, changed: role !== currentRole };
    },
    [],
  );

  return { link, signIn, signOut, claimStaffRole, isBusy };
}

/**
 * Supabase reports both "you didn't turn the provider on" and "you didn't turn
 * manual linking on" as raw API strings. Both are setup problems rather than
 * anything the person pressing the button did wrong, so say that plainly
 * instead of forwarding the internals.
 */
function describeAuthError(message: string): string {
  const text = message.toLowerCase();

  if (text.includes("manual linking") || text.includes("linking is disabled")) {
    return "Account linking isn't switched on for this project yet.";
  }
  if (text.includes("provider") && (text.includes("not enabled") || text.includes("disabled"))) {
    return "Google sign-in isn't switched on for this project yet.";
  }
  if (text.includes("already") && text.includes("identity")) {
    return "That Google account is already attached to a different account here.";
  }
  return "Couldn't reach Google. Check your connection and try again.";
}

function describeClaimError(message: string): string {
  const text = message.toLowerCase();

  if (text.includes("save your account")) {
    return "Save your account with Google first.";
  }
  if (text.includes("sign in")) {
    return "Sign in first.";
  }
  return "Couldn't check your access. Check your connection and try again.";
}
