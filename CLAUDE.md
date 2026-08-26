# Nigeria Electricity Tracker

Crowdsourced platform tracking electricity availability across Nigerian states and LGAs. Users log when power goes on/off; the app turns that into dashboards, statistics, fault reports and forecasts.

Built as a portfolio flagship. Quality of the dashboard and admin tooling matters more than feature count.

---

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS
- Supabase — Postgres, Auth (anonymous sign-in), Storage, RLS, Realtime
- Recharts for charts; raw SVG for the supply ribbon
- Leaflet + OpenStreetMap for maps
- Vercel for deployment

---

## Decisions already made — do not revisit

1. **Store events, not durations.** `power_logs` holds discrete on/off timestamps. Durations are derived into `outage_intervals` by a scheduled job. Never store a duration directly.
2. **Anonymous auth.** Supabase anonymous sign-in — no email, no password, no SMTP. Every device gets a real `user_id` so RLS and moderation work. Upgradeable to a full account later without losing history.
3. **No auto-detection of power state.** Phone charging status cannot distinguish grid from generator, solar, inverter or power bank. Manual logging only.
4. **Optional `power_source` tag** on logs: grid / generator / solar / inverter. Enables grid-only filtering and the "% on generator during outages" stat.
5. **DisCo is added in M4**, not day one.
6. **Seed heavily in M1.** Realistic generated logs for 8–10 LGAs. Empty dashboards look broken.
7. **Forecasting is phased.** Phase 1 is statistical pattern detection (hour-of-day histograms, rolling averages). No ML until there's real data volume.
8. **Web-first, mobile-first layout.** React Native companion is a later option, not now.

---

## Design tokens

### Surfaces
```
--base        #0A0C10   page background
--surface     #151A21   cards, panels
--off         #1A2029   power OFF segments
--hairline    #2C3542   borders, dividers
--text        #E4E9F0   primary text
--text-muted  #7C8899   secondary text, axis labels
```

### Signal colors — each has exactly one job
```
--on          #3DFF6E   power is on. nothing else.
--primary     #1B6DFF   buttons, nav, links, active states
--series-1    #00D9F5   first chart series, forecasts
--series-2    #B14BFF   second chart series, comparisons
--warn        #FFE81F   low confidence, degraded data, sparse coverage
--fault       #FF3B4E   faults only
```

### Rules
- Power off is `--off`, never red. Outages are normal; red belongs to faults alone.
- Neon on marks and small indicators only. Never as a large fill.
- No `box-shadow` glows on the neons. Ever.
- Never encode meaning in color alone — pair with position, dash pattern, or hatch.
- Dark-native. Light mode is optional and low priority.
- `--primary` fails contrast as body text on dark; use `#5B93FF` when it must carry text.

### Typography
- Display: Archivo (condensed weights) — headings, area names
- Body: IBM Plex Sans — all interface copy
- Data: IBM Plex Mono — timestamps, counts, IDs
- Meter readout: DSEG7 Classic — **only** the live uptime % and the status duration counter. Nowhere else.
- Scale: 32 / 24 / 18 / 16 / 14 / 12. Two weights: 400 and 500.

---

## The supply ribbon

The signature component. Build it first, in isolation, with fake data.

A horizontal 24-segment strip. One segment = one hour. Lit (`--on`) = power. Dark (`--off`) = no power.

- Render as SVG rects, not divs — it needs to draw hundreds of segments in the month grid.
- Sub-hour precision via partial fills, not rounding.
- Future/unknown hours render dimmed or hatched — visually distinct from "off". An unlit hour at 8pm tomorrow means "unknown", not "no power".
- No-data hours use a diagonal hatch in `--hairline`.
- Hover/tap a segment shows the exact interval and log count.

It scales through the whole product: one ribbon = today; 7 stacked = a week; 30 stacked = a month barcode; one per LGA = the comparison view; a fragment = an outage window on a fault card.

---

## Icons

Lucide as the base set. **Do not theme non-electrical icons** — a gear is a gear, a calendar is a calendar. Turning navigation into lightning bolts is what makes an app look amateur.

Draw 3–4 custom icons for what Lucide lacks: meter, transformer, utility pole, cable snap. Match Lucide's 1.5px stroke exactly.

---

## Motion

One orchestrated moment: **power restoration**. When status flips to ON, the ribbon segment surges — 400ms ease, overshooting past `--on` toward near-white for ~80ms, then settling. Reads as a circuit energizing.

Everything else stays quiet. Chart entry 200ms fade, page transitions 150ms cross-fade, skeleton ribbons instead of spinners. Respect `prefers-reduced-motion`.

---

## Copy

Plain, calm, specific. Sentence case. Active voice. An action keeps its name through the whole flow.

- Status: "Power is on in Akure South."
- Duration: "Off for 4 hours 17 minutes."
- Log button: labels the state that will be true after tapping — shows "Power is back on" when currently off.
- Empty: "No logs yet in Akure South. Be the first to report."
- Low confidence: "Based on 18 logs from 3 contributors. More reports will sharpen this."
- Error: "Couldn't save that log. Check your connection and try again."
- Offline: "You're offline. Logs will sync when you reconnect."

No "up NEPA" in the interface. Save the personality for the README and launch copy.

---

## Quality floor — non-negotiable

- Responsive to 320px
- Visible keyboard focus rings on every interactive element
- `prefers-reduced-motion` respected
- All neons checked for AA contrast against `--base`
- Skeleton states on every async surface
- **Offline-tolerant logging with a sync queue.** People log during outages, and outages often mean bad connectivity. This is a correctness requirement, not a nicety.

---

## Milestones

| | Scope |
|---|---|
| M1 | Repo, Supabase schema + RLS, seed all 36 states + FCT and LGAs, anonymous auth, location picker, ribbon component in isolation |
| M2 | Log flow with duplicate prevention, current status card, interval derivation job, restoration animation |
| M3 | Personal dashboard — daily/weekly/monthly charts, uptime %, longest outage, outage count |
| M4 | **Area dashboard (flagship)** — aggregate uptime by LGA/state, month ribbon grid, hour-of-day heatmap, LGA comparison, national ranking, confidence badges, public shareable area pages. DisCo added here. Custom icons drawn here. |
| M5 | Fault reporting — form with photo upload, feed, confirmations, map view |
| M6 | Admin panel — overview, moderation queue, fault triage, coverage dashboard, location management, audit log. Desktop-first, denser and quieter than the user app. |
| M7 | Forecasting phases 1 and 2 — pattern detection, baseline forecasts, anomaly alerts |
| M8 | Polish — empty states, errors, loading, accessibility audit, README with architecture diagram, deploy |

---

## Screen inventory

**User (6):** onboarding + area picker · home · area dashboard · fault report form · fault detail · month/year history
**Admin (4):** overview · moderation queue · fault triage · coverage map
**Shared (1):** public area profile page — SEO-friendly, no login required

---

## Working notes

- Home screen is built and specified. Start M1 with schema, then the ribbon component.
- The two design decisions still open: whether `--on` should be cyan rather than green (green carries a generic "success" connotation), and whether the display typeface should stay quiet Archivo or take more risk.
- Full planning docs live alongside this file: the project plan and the design system.
