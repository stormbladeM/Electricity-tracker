# Nigeria Electricity Tracker — UI/UX design system

**Design thesis:** dark, high-voltage, instrument-like. The interface sits in near-black; energy comes from saturated neon used only where it carries meaning. The reference is a live control panel, not a social app.

---

## 1. Decisions locked in from planning

| Question | Decision |
|---|---|
| Auto-detection | **Dropped.** Phone charging state can't distinguish grid from generator, solar, inverter or power bank. No honest signal exists. |
| Power source | **New field.** Optional tag on manual logs: grid / generator / solar / inverter. Enables grid-only filtering and a headline stat: "% of contributors on generator during outages." |
| Auth | **Supabase anonymous sign-in.** No email, no password, no SMTP, no infrastructure. Real `user_id` per device, so RLS and moderation still work. Upgradeable to a full account later without losing history. |
| DisCo | Added in M4, not day one. |
| Seed data | Yes — heavy. Generate realistic logs for 8–10 LGAs during M1 so dashboards are never empty. |

---

## 2. Color

Dark base, neon accents. **Every color has exactly one job.** A color used decoratively — because it looks electric — breaks the system, because the moment a reader can't tell whether green means "on" or just means "green," the dashboard stops communicating.

### Surfaces

| Token | Hex | Role |
|---|---|---|
| `--base` | `#0A0C10` | Page background |
| `--surface` | `#151A21` | Cards, panels, raised surfaces |
| `--off` | `#1A2029` | Power OFF segments — visible against base |
| `--hairline` | `#2C3542` | Borders, dividers |
| `--text` | `#E4E9F0` | Primary text |
| `--text-muted` | `#7C8899` | Secondary text, axis labels, hints |

### Signal colors

| Token | Hex | The one job it does |
|---|---|---|
| `--on` | `#3DFF6E` | Power is on. Nothing else. |
| `--primary` | `#1B6DFF` | Buttons, nav, links, active states |
| `--series-1` | `#00D9F5` | First chart series, forecasts |
| `--series-2` | `#B14BFF` | Second chart series, comparisons |
| `--warn` | `#FFE81F` | Low confidence, degraded data, sparse coverage |
| `--fault` | `#FF3B4E` | Faults only |

**Rules that matter:**

- **Power off is `--off`, not red.** An outage is normal in Nigeria, not an error. Red belongs exclusively to faults — that reservation is what makes a fault report actually cut through.
- **Neon for marks, dark for structure.** Full-saturation neon on ribbon segments, chart lines, badges and small indicators. Never as a large fill — a full-width neon button is exhausting. Structural surfaces stay `--base` and `--surface`.
- **Green is tamed on purpose.** Pure `#39FF14` on pure black causes halation — visible glow-bleed and eye strain, especially with astigmatism. `#3DFF6E` on `#0A0C10` keeps the energy and stays readable for long sessions.
- **Never color alone.** ON/OFF differ in color *and* segment position; chart series differ in color *and* dash pattern. Roughly 1 in 12 Nigerian men has some color vision deficiency, and green/red is the most common axis of confusion — which is another reason "off" is dark rather than red.

**Light mode is optional and low priority.** The app is dark-native — people open it during outages, often at night. If you build a light mode later, the surfaces invert but the neons stay exactly as they are; light sources don't invert.

---

## 3. Typography

| Role | Face | Use |
|---|---|---|
| Display | **Archivo** (condensed weights) | Headings, area names, section labels. Utilitarian and signage-like — matches infrastructure. |
| Body | **IBM Plex Sans** | All interface copy. Designed for an engineering company; technical without being trendy. |
| Data | **IBM Plex Mono** | Timestamps, log counts, coordinates, IDs. |
| Meter readout | **DSEG7 Classic** (seven-segment) | The one signature type moment — see below. |

### The meter readout

Use the seven-segment face for **exactly two things**: the live uptime percentage on the area dashboard, and the current-status duration counter ("power has been off for `04:17`").

Render it the way a real meter does — the unlit segments faintly visible in `--hairline` behind the lit ones. That detail is what sells it.

That's it. Used once or twice, it reads as a deliberate reference to the prepaid meter on the wall. Used on every number, it looks like a novelty font. Restraint is what makes it land.

Type scale: 32 / 24 / 18 / 16 / 14 / 12. Two weights only — 400 and 500.

---

## 4. The signature element: the supply ribbon

A horizontal 24-segment strip. Each segment is one hour. Lit (`--on`) = power. Dark (`--off`) = no power.

**It scales through the entire product:**

| Context | Form |
|---|---|
| Home screen | One ribbon — today so far |
| Week view | 7 stacked ribbons |
| Month view | 30 stacked ribbons — reads as a barcode/punch card |
| LGA comparison | One ribbon per LGA, stacked and labeled |
| Year view | 12 rows, each a compressed monthly average |
| Fault card | A ribbon fragment showing the outage window |

One visual device carries the whole app. This is what makes the project memorable in a portfolio — a reviewer sees the month grid once and remembers it.

**Implementation notes:**
- Render as SVG rects, not divs — cheap to draw hundreds of segments.
- Sub-hour precision: partial fills within a segment, not rounding.
- Hover/tap a segment → tooltip with the exact interval and log count.
- No-data hours render as a diagonal hatch in `--hairline`, clearly distinct from a solid "off" segment.

---

## 5. Iconography

**Principle: only theme the icons that are literally about electricity.** A gear is a gear. A calendar is a calendar. Turning navigation icons into lightning bolts is the thing that makes an app look like a student project.

**Use Lucide** as the base set (consistent 1.5px stroke, huge coverage), then draw **3–4 custom icons** for the domain-specific concepts it doesn't have — this is what stops it looking stock.

| Concept | Icon |
|---|---|
| Power on | `zap` (Lucide) |
| Power off | `zap-off` (Lucide) |
| Meter | **custom** — segmented display in a rounded case |
| Transformer | **custom** — pole-mounted drum silhouette |
| Utility pole | **custom** — pole with crossarm and insulators |
| Cable snap | **custom** — broken conductor line |
| Low voltage | `activity` (Lucide) |
| Fault report | `triangle-alert` (Lucide) |
| Generator | `fuel` (Lucide) |
| Solar | `sun` (Lucide) |
| Inverter/battery | `battery-charging` (Lucide) |
| Area/location | `map-pin` (Lucide) |
| Everything else | Lucide default, unthemed |

Keep every icon at the same stroke weight and optical size. Mixed stroke weights are the most common giveaway of an inconsistent icon set.

---

## 6. Motion

**One orchestrated moment, not scattered effects.**

The moment is **power restoration**. When status flips to ON, the ribbon segment doesn't just turn green — it *surges*: 400ms ease, overshooting past `--on` into near-white for ~80ms, then settling. It reads as a circuit energizing. Half a second, and it's the thing people remember.

Everything else stays quiet:
- Chart entry: 200ms fade + subtle rise, no bounce
- Page transitions: 150ms cross-fade
- Loading: skeleton ribbons in `--surface`, not spinners
- Respect `prefers-reduced-motion` — swap the surge for an instant fill

**No glows.** Resist adding `box-shadow` bloom to the neons. It's the single fastest way to make a neon-on-dark interface look like a template, and it wrecks text legibility.

---

## 7. Layout

**Mobile-first**, even though it's a web app. Most Nigerian users will open it on a phone during an outage.

**Home screen (single column):**
1. Current status — big, unmissable. Area name, ON/OFF, duration in seven-segment.
2. The log button — full-width, thumb-reachable, the largest tap target on screen.
3. Today's ribbon.
4. This month: uptime %, longest outage, outage count.
5. Active faults nearby (if any).

**Area dashboard:**
1. Uptime % (seven-segment) + confidence badge
2. Month ribbon grid — the hero
3. Hour-of-day availability chart
4. LGA comparison
5. Filters pinned to the top on scroll

**Admin panel** is desktop-first — data density beats thumb reach. Sidebar nav, dense tables, bulk actions.

---

## 8. Voice and copy

Plain, calm, specific. The app is an instrument; instruments don't joke.

| Situation | Copy |
|---|---|
| Status | "Power is on in Akure South." |
| Duration | "Off for 4 hours 17 minutes." |
| Empty area | "No logs yet in Akure South. Be the first to report." |
| Low confidence | "Based on 18 logs from 3 contributors. More reports will sharpen this." |
| Log button | "Power is on" / "Power is off" — states the fact, not "Submit" |
| Confirmation toast | "Logged." |
| Fault submitted | "Fault reported. Neighbours can now confirm it." |
| Error | "Couldn't save that log. Check your connection and try again." |
| Offline | "You're offline. Logs will sync when you reconnect." |

**On "up NEPA":** it's tempting, and it will get a laugh in a demo. Leave it out of the interface. It ages badly, it doesn't translate to a portfolio reviewer outside Nigeria, and it undercuts the instrument feeling the rest of the design is building. Put the personality in the launch copy and the README instead, where it costs nothing.

Rules: sentence case everywhere, active voice, an action keeps its name through the whole flow, errors say what happened and what to do.

---

## 9. Quality floor

Non-negotiable before you call it done:

- Responsive to 320px
- Visible keyboard focus rings on every interactive element
- `prefers-reduced-motion` respected
- Color contrast: check every neon against `--base` for AA. `--primary` (`#1B6DFF`) is the risky one — it fails as body text on dark, so use it for fills and borders, and switch to `#5B93FF` when it must carry text
- Never encode meaning in color alone — ON/OFF differ in color and position, chart series in color and dash pattern, no-data in hatch
- Skeleton states for every async surface
- Offline-tolerant logging with a sync queue — people log during outages, and outages often mean poor connectivity

---

## 10. Build order for the design work

1. **M1** — tokens (color, type, spacing) in Tailwind config; load the four faces; build the ribbon component in isolation with fake data
2. **M2** — log button + current status card; the filament warm-up animation
3. **M3** — chart styling pass; personal dashboard layout
4. **M4** — month ribbon grid, comparison view, confidence badges; custom icons drawn here
5. **M5** — fault cards, severity treatment, map pin styling
6. **M6** — admin design language (denser, quieter, desktop-first)
7. **M8** — full polish pass: empty states, errors, loading, dark mode, accessibility audit
