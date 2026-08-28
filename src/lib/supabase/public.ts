import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * A cookie-free anonymous client for public, cacheable server reads — the
 * `/state/<slug>/lga/<slug>` pages.
 *
 * The cookie-aware server client (`server.ts`) reads `cookies()`, which opts
 * a route into dynamic rendering. These pages have no per-user content and
 * want ISR, so they read through this instead: plain anon key, no session,
 * every row it can see is public anyway.
 */
export function createPublicClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
