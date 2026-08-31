import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

// `auth` is excluded so the OAuth callback route owns the cookie write for the
// code exchange outright — the proxy refreshing (or creating) a session on the
// same request would race it.
export const config = {
  matcher: [
    "/((?!auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
