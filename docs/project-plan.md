# Nigeria Electricity Tracker — Project Plan

**Owner:** Makanjuola Sodiq
**Type:** Portfolio flagship project (web-first)
**One-liner:** A crowdsourced platform that tracks electricity availability across Nigerian states and LGAs, reports faults, and turns it into dashboards, statistics and forecasts.

---

## 1. Why this project

The goal is a portfolio piece that demonstrates real engineering, not a CRUD tutorial. This project shows:

- **Data modeling** — time-series logs, geographic hierarchy, aggregation
- **Dashboard/data-viz skill** — charts, filters, comparisons
- **Systems thinking** — data quality, moderation, trust indicators
- **Admin tooling** — the part most junior portfolios skip entirely
- **Domain relevance** — a real Nigerian problem, not a to-do list clone

Web-first (Next.js) so it's a shareable live link. React Native companion app is a v3 option.

---

## 2. Core concepts

| Concept | Meaning |
|---|---|
| **Log** | A user reporting "power is ON" or "power is OFF" at a timestamp |
| **Uptime** | % of time power was on in an area over a period |
| **Area** | State → LGA (optionally → community/estate) |
| **DisCo** | Distribution company serving the area (Ikeja Electric, EKEDC, AEDC, BEDC, etc.) |
| **Fault** | A reported physical/service problem (blown transformer, snapped cable, etc.) |
| **Confidence** | How trustworthy a stat is, based on number of logs/contributors |

---

## 3. Data model (Supabase / Postgres)

### `states`
- `id`, `name`, `code`

### `lgas`
- `id`, `state_id` (FK), `name`

### `discos`
- `id`, `name`, `short_name`

### `areas`
- `id`, `lga_id` (FK), `disco_id` (FK), `name` (optional community/estate level)

### `profiles`
- `id` (auth user), `display_name`, `state_id`, `lga_id`, `area_id`, `role` (user | moderator | admin), `is_banned`, `trust_score`, `created_at`

### `power_logs`
- `id`, `user_id`, `area_id`, `lga_id`, `state_id`
- `status` (on | off)
- `logged_at` (timestamptz)
- `source` (manual | auto)
- `is_flagged`, `flag_reason`

> **Design note:** store discrete state-change events, not durations. Durations are derived at query time by pairing consecutive on/off events. This keeps writes simple and lets you fix history later.

### `outage_intervals` (materialized/derived)
- `id`, `area_id`, `started_at`, `ended_at`, `duration_minutes`
- Rebuilt from `power_logs` via a scheduled job — this is what the charts read from.

### `fault_reports`
- `id`, `user_id`, `area_id`, `lga_id`, `state_id`, `disco_id`
- `fault_type` (transformer | pole_down | cable_snap | meter_issue | low_voltage | vandalism | billing | other)
- `description`, `photo_url`, `latitude`, `longitude`
- `severity` (low | medium | high | critical)
- `status` (reported | confirmed | acknowledged | in_progress | resolved | rejected)
- `confirm_count` (other users confirming the same fault)
- `reported_at`, `resolved_at`, `resolution_note`

### `fault_confirmations`
- `id`, `fault_id`, `user_id`, `created_at` (unique on fault_id + user_id)

### `admin_audit_log`
- `id`, `admin_id`, `action`, `target_type`, `target_id`, `notes`, `created_at`

---

## 4. Feature breakdown

### 4.1 Public / user side

**Onboarding**
- Sign up / log in (Supabase auth)
- Select State → LGA → Area
- Optional: select DisCo

**Logging power**
- Big one-tap toggle: "Power is ON" / "Power is OFF"
- Prevents duplicate consecutive logs of the same status
- Shows current status of your area and how long it's been that way

**Personal dashboard**
- Today: hours of power so far
- This week: daily bar chart of hours
- This month: uptime %, longest outage, total outages
- This year: monthly trend line

**Area dashboard (the flagship screen)**
- Uptime % for the selected State/LGA
- Daily / weekly / monthly / yearly toggle
- Hour-of-day availability heatmap (when is power usually on?)
- Comparison chart: your LGA vs other LGAs in your state
- Ranking: best and worst served LGAs nationally
- Confidence badge: "Based on 340 logs from 12 contributors"

**Fault reporting**
- Report a fault: type, description, photo, optional GPS pin
- Feed of active faults in your area
- "I'm affected too" confirmation button (raises confirm_count)
- Status timeline on each fault
- Map view of open faults

**Public area profile pages**
- `/state/ondo/lga/akure-south` — shareable, SEO-friendly, no login required
- Great for portfolio traffic and for demoing the project in interviews

### 4.2 Admin side

**Overview**
- Total logs, active users, faults open/resolved, national average uptime
- Growth charts (users, logs, reports over time)

**Moderation & data quality**
- Queue of flagged logs (rapid toggling, impossible patterns, outliers vs. area consensus)
- Approve / reject / bulk actions
- User management: view, warn, adjust trust_score, ban

**Fault management**
- Triage queue sorted by severity + confirm_count
- Update status, add resolution notes
- Metrics: average time-to-resolution by DisCo and by state
- Reject duplicates / merge related reports

**Coverage dashboard**
- Map/table of which LGAs have enough contributors to be trustworthy
- Highlights "data deserts" — areas needing more users
- Directly informs where to push for signups

**Location management**
- Add/edit states, LGAs, areas, DisCos
- Merge duplicate area entries

**Forecasting & analytics** *(phased — see below)*

**Exports & audit**
- CSV export of logs, faults, and aggregates
- Full audit log of every admin action

---

## 5. Forecasting: do it in phases

Do **not** start with machine learning. Crowdsourced data is sparse early on, and a bad model is worse than no model for a portfolio.

**Phase 1 — Pattern detection (statistical, ship this first)**
- Hour-of-day availability histogram per area
- Day-of-week patterns
- Rolling 7/30-day averages
- Output: "In Akure South, power is most often available 6pm–11pm on weekdays."

**Phase 2 — Baseline forecasting**
- Simple moving average / seasonal naive forecast for next 7 days
- Anomaly detection: flag when uptime drops sharply vs. the area's own baseline
- Confidence intervals based on sample size

**Phase 3 — Predictive model (only with real data volume)**
- Time-series model (Prophet or a lightweight regression on hour/day/season features)
- Predicted probability of power at a given hour tomorrow
- Backtest and display accuracy honestly — showing the error rate is a *strength* in a portfolio

---

## 6. Tech stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js (App Router) + TypeScript | SSR for public pages, great for SEO |
| Styling | Tailwind CSS | Fast, consistent |
| Charts | Recharts | Good React ergonomics; swap in D3 for the heatmap if needed |
| Maps | Leaflet + OpenStreetMap | Free, no API key limits |
| Backend | Supabase (Postgres, Auth, Storage, RLS, Realtime) | Already your strength |
| Aggregation | Postgres views + scheduled Edge Functions | Keeps dashboards fast |
| Deploy | Vercel | Free tier, instant live link |
| Later | React Native companion app | Reuses the same Supabase backend |

**Key technical detail:** use Row Level Security in Supabase — users read all aggregates but only write their own logs; admins get elevated policies. Worth writing about in your project README; it's the kind of thing interviewers ask about.

---

## 7. Milestones

### M1 — Foundation (Week 1)
- Repo, Next.js + Tailwind + Supabase setup
- Schema + RLS policies
- Seed all 36 states + FCT and their LGAs
- Auth + location picker

### M2 — Logging (Week 2)
- ON/OFF logging flow with duplicate prevention
- Current area status display
- Interval derivation job (`power_logs` → `outage_intervals`)

### M3 — Personal dashboard (Week 3)
- Daily / weekly / monthly charts
- Uptime %, longest outage, outage count

### M4 — Area dashboard (Weeks 4–5) ← flagship
- Aggregate uptime by LGA/state
- Hour-of-day heatmap
- LGA comparison + national ranking
- Confidence badges
- Public shareable area pages

### M5 — Fault reporting (Week 6)
- Report form with photo upload
- Fault feed + confirmations
- Map view

### M6 — Admin panel (Weeks 7–8)
- Overview + growth analytics
- Moderation queue + user management
- Fault triage + resolution metrics
- Coverage dashboard
- Location management + audit log

### M7 — Forecasting Phase 1 & 2 (Week 9)
- Pattern detection + baseline forecasts
- Anomaly alerts

### M8 — Polish & launch (Week 10)
- Empty states, loading skeletons, error handling
- Mobile responsiveness
- README with architecture diagram + screenshots
- Deploy, then write the portfolio case study

---

## 8. Portfolio positioning

When you write this up, lead with the parts that are hard:

- Deriving durations from discrete event logs
- Handling sparse/untrustworthy crowdsourced data with confidence scoring
- Aggregating time-series across a geographic hierarchy performantly
- Building admin tooling and moderation, not just the happy path
- Being honest about forecast accuracy rather than overselling ML

Take screenshots of the **area dashboard** and the **admin coverage map** — those two screens carry the whole project.

---

## 9. Open questions to decide before M1

1. Do you want manual logging only, or eventually a background/auto-detection option (e.g. phone charging state as a proxy)?
2. Should logging be anonymous-friendly, or auth-required? (Auth-required = better data quality; anonymous = faster growth)
3. Do you want DisCo as a first-class dimension from day one, or add it in M4?
4. How far do you want to seed with fake/demo data so dashboards look alive during interviews?
