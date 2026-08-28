import Link from "next/link";

/**
 * What a contributor sees at /admin.
 *
 * Everyone is signed in here, so there is no "log in" to offer and nothing to
 * redirect to — the honest response is to say plainly that the panel is
 * staff-only and point back to the app. Same voice as the rest of the product:
 * state the fact, offer the next step, no scolding.
 */
export function AdminDenied() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 bg-base px-6 py-16 text-center">
      <h1 className="font-display text-24 font-medium text-text">
        The admin panel is for moderators and admins
      </h1>
      <p className="max-w-sm text-14 text-text-muted">
        Your account is a contributor account. Nothing here is available to it.
      </p>
      <Link
        href="/"
        className="rounded bg-primary px-4 py-3 text-16 font-medium text-text"
      >
        Back to the app
      </Link>
    </main>
  );
}
