import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./database.types";

/**
 * Routes that need a signed-in user, and so may mint an anonymous one.
 *
 * Everything else — the public `/state/<slug>/lga/<slug>` pages, robots.txt,
 * sitemap.xml — is readable without a session and must not create an account
 * just for being looked at. It used to: the proxy signed in every visitor on
 * every matched path, so each crawler pass over a public page left a real
 * `auth.users` row behind. Over half the user table was accounts that had
 * never logged anything.
 *
 * Session *refresh* still happens on every request below; only the initial
 * creation is gated. `/auth` is absent on purpose — the OAuth callback must
 * exchange its code against whatever session already exists, not race a new
 * anonymous one into place.
 */
const SESSION_ROUTES = [
  "/",
  "/onboarding",
  "/dashboard",
  "/area",
  "/faults",
  "/admin",
  "/account",
];

function needsSession(pathname: string): boolean {
  return SESSION_ROUTES.some((route) =>
    route === "/" ? pathname === "/" : pathname === route || pathname.startsWith(`${route}/`),
  );
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && needsSession(request.nextUrl.pathname)) {
    await supabase.auth.signInAnonymously();
  }

  return supabaseResponse;
}
