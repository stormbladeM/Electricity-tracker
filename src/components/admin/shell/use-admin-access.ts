"use client";

import { useAuth } from "@/lib/auth/use-auth";
import { useProfile } from "@/lib/auth/use-profile";
import type { Enums } from "@/lib/supabase/database.types";

export type UserRole = Enums<"user_role">;
export type StaffRole = Exclude<UserRole, "user">;

/**
 * Who is looking at the admin panel, and may they.
 *
 * This is a *rendering* decision, not a security boundary. Everyone on the
 * site is signed in (anonymous auth, CLAUDE.md decision 2), so the panel has
 * to decide what to draw for a contributor who types /admin — and the honest
 * answer is a plain "you don't have access", not a redirect that pretends the
 * page isn't there.
 *
 * The real enforcement lives in Postgres and cannot be reached from here:
 * every admin write is gated by an `is_moderator_or_admin()` / `is_admin()`
 * RLS policy (migration 0001), and the metric functions (0007) refuse
 * outright. Faking `role` in the browser changes what this hook returns and
 * nothing else — the queries behind it still come back empty or error.
 */
export function useAdminAccess() {
  const { isLoading: isAuthLoading } = useAuth();
  const { profile, isLoading: isProfileLoading } = useProfile();

  const role = profile?.role ?? null;
  const staffRole: StaffRole | null =
    role === "admin" || role === "moderator" ? role : null;

  return {
    isLoading: isAuthLoading || isProfileLoading,
    role,
    staffRole,
    /** Moderator or admin — may open the panel at all. */
    isStaff: staffRole !== null,
    /** Admin only — location management and role changes. */
    isAdmin: role === "admin",
  };
}
