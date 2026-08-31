import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Where Google sends the user back to, for both halves of the account story:
 * linking an identity onto an existing anonymous user, and signing back into
 * an already-linked account on a new device. Both arrive here as a PKCE
 * authorization code, and both are completed by the same exchange.
 *
 * This route is excluded from the proxy matcher (src/proxy.ts) so nothing else
 * writes auth cookies while the exchange is in flight.
 *
 * On failure it redirects to /account with a reason rather than rendering a
 * dead end — the account screen already knows how to explain the states, and
 * a bare error page here would strand someone mid-sign-in.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");

  // The provider reports its own failures here too (e.g. the user cancelled).
  const providerError = searchParams.get("error_description") ?? searchParams.get("error");
  if (providerError) {
    return NextResponse.redirect(
      `${origin}/account?error=${encodeURIComponent(providerError)}`,
    );
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/account?error=missing_code`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      `${origin}/account?error=${encodeURIComponent(error.message)}`,
    );
  }

  // Only same-origin relative paths are honoured, so a crafted link can't turn
  // the callback into an open redirect.
  const next = searchParams.get("next");
  const destination = next && next.startsWith("/") && !next.startsWith("//") ? next : "/account";

  return NextResponse.redirect(`${origin}${destination}`);
}
