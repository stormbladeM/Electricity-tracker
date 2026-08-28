---
name: run-app
description: Launch the Nigeria Electricity Tracker dev server and drive it in headless Chromium to see a change working — including the anonymous-auth onboarding dance the signed-in screens need. Use when asked to run the app, screenshot a screen, or confirm a change renders for real.
---

# Running this app

Next.js App Router + Supabase. `npm run dev` on port 3000. Everything
interesting is a **client island** that fetches from a live Supabase
project, so a rendered shell proves nothing on its own — you have to
wait for the data.

There is no local Supabase stack. The dev server talks to the real
project (`zqkdsbbrhbcyftzmcxlk`) using the keys in `.env.local`. Reads
are free; treat writes as production writes.

## Start and stop

```bash
npm run dev > /tmp/dev.log 2>&1 &
timeout 90 bash -c 'until curl -sf http://localhost:3000 >/dev/null 2>&1; do sleep 1; done' \
  && echo "DEV UP" || tail -20 /tmp/dev.log
```

Stopping needs PowerShell — this is Windows, there is no `lsof`, and
`$!` is only the npm wrapper:

```powershell
Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue |
  ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

Do this before relaunching or the next `npm run dev` silently picks
port 3001 and every hard-coded URL below misses.

## Driving it

`chromium-cli` is **not** available here and Playwright is not a project
dependency (don't add it — it is a verification tool, not a build one).
Install it into the scratchpad instead:

```bash
SP="$SCRATCHPAD"          # the session scratchpad dir
cd "$SP" && npm init -y >/dev/null && npm i playwright --no-audit --no-fund
npx playwright install chromium     # once per machine
```

Then run [driver.mjs](driver.mjs) from that directory, so `playwright`
resolves:

```bash
D="$PWD_OF_REPO/.claude/skills/run-app/driver.mjs"
cd "$SP" && node "$D" public
cd "$SP" && node "$D" onboard "Oyo/Ibadan North"   # writes state.json
cd "$SP" && node "$D" area
cd "$SP" && node "$D" admin
cd "$SP" && node "$D" page faults                  # any route
```

**Pass routes without a leading slash.** Git Bash rewrites a bare
`/faults` argument into `C:/Program Files/Git/faults` before node sees
it. The driver refuses the mangled form with an explanation rather than
navigating somewhere absurd.

Screenshots land in `$SP/shots/`. **Look at them** — read the PNG back.
The driver prints `CONSOLE-ERRORS: n` at the end; check it before
declaring success, because these pages will render their whole shell
while a Supabase fetch fails.

## Auth: the part that isn't obvious

Anonymous sign-in happens on its own, but a fresh account has **no
area**, and every signed-in screen (`/`, `/area`, `/dashboard`) shows
"Set your area" until one is chosen. So you must run `onboard` first.

The session lives in **cookies, not localStorage** (`@supabase/ssr`), so
reading a user id out of `localStorage` returns null. Persist the whole
context instead — `driver.mjs` writes `state.json` after onboarding and
reuses it.

The picker is two plain `<select>`s with no accessible names. Select by
label, and wait for each to populate — the LGA list only loads after a
state is chosen:

```js
await page.waitForFunction(() => document.querySelectorAll("select")[0]?.options.length > 5);
await page.locator("select").first().selectOption({ label: "Lagos" });
await page.waitForFunction(() => document.querySelectorAll("select")[1]?.options.length > 5);
await page.locator("select").nth(1).selectOption({ label: "Ikeja" });
await page.getByRole("button", { name: /Continue/ }).click();
```

Re-running `onboard` on an existing session **changes** that account's
area, which is how you point it at a different LGA without touching the
database.

Each `onboard` run leaves a real anonymous account behind in the
project. They have no logs, so no aggregate moves, but they do nudge
"new accounts" on the admin overview. Mention them in your report.

## The admin panel needs a role you cannot grant

`/admin` is moderator/admin only; a fresh anonymous account gets the
"for moderators and admins" refusal, which is the correct behaviour and
worth screenshotting on its own. Seeing the panel itself requires
`update public.profiles set role = 'admin'` — a production privilege
escalation that the permission classifier blocks, and rightly. Ask the
user to approve it rather than looking for a way around.

## Gotchas that actually bit

- **Never `waitUntil: "networkidle"`.** Wait for the heading of the
  section you care about, then a couple of seconds for its fetch. First
  compile of a route can take 30s+.
- **Ribbons are SVG, not DOM text.** Assert on `svg[aria-label=...]` —
  every ribbon carries a full sentence there (`Forecast power in …`,
  `Average power in …`, `Daily power availability in …`). That is also
  the cheapest way to check the accessible summaries are right.
- **Screenshot the element, not the page,** for anything ribbon-shaped.
  Full-page shots of `/area` are ~4000px tall and detail is unreadable.
  Use `deviceScaleFactor: 3` plus `locator.screenshot()` when you need
  to judge a fill colour.
- **Forecast vs measured** is `--series-1` cyan vs `--on` green. If a
  forecast row renders green, `mode="forecast"` did not reach the
  ribbon.
- The anomaly banner renders **nothing** when an LGA has not shifted
  (Ikeja is steady; Ibadan North is a "watch"). Absence is a pass, not a
  failure — pick a flagged LGA if you need to see it.
- **A same-page `<Link>` inside a component that reads
  `useSearchParams()` for that very param can silently drop the click.**
  Hit this building a URL-driven toggle: `preventDefault()` fired every
  time (confirmed via a native `dispatchEvent`), but the follow-up
  `router.push()` navigation only completed ~50–60% of clicks — no
  console error, no failed request, just nothing. Reproduced 8/8 clean
  against an **existing, already-shipped** URL-driven toggle
  (`PeriodSelector` on `/dashboard`) to rule out a Playwright/Turbopack
  artefact before concluding it was real. If a URL-driven toggle you're
  testing seems to work "about half the time," don't chase test flakiness
  — click a known-good toggle elsewhere in the app with the identical
  script first. If the control is 100% reliable and your new one isn't,
  it's the component, not the harness. **Every test account created
  during this investigation still counts as a real signup** (the proxy
  signs in every visitor automatically, even on public pages) — a
  debugging session that opens two dozen fresh browser contexts leaves
  two dozen accounts in the project. Check `auth.users` counts before and
  after a debugging spree, not just after a deliberate `onboard` run.
