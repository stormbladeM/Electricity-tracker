# Seed data

Reference and demo data for the live Supabase project (`zqkdsbbrhbcyftzmcxlk`),
per CLAUDE.md decision 6 ("Seed heavily in M1. Realistic generated logs for
8–10 LGAs. Empty dashboards look broken.").

**This is data, not schema.** Apply these files with `execute_sql` (or the
Supabase SQL editor), never with `apply_migration` — that tool is reserved for
DDL under `supabase/migrations/`. Nothing here creates or alters a table,
type, index, function, trigger or policy; it only inserts rows into tables
`0001_init.sql` already created.

Every file is guarded (`ON CONFLICT` / `WHERE NOT EXISTS`) against the unique
constraints already on these tables, so re-running a file is safe and won't
duplicate rows. Apply in order: `001` → `002` → `003` → `004`.

## Files

### `001_states_and_lgas.sql`
All 36 Nigerian states + FCT (37 rows in `public.states`) and all 774 LGAs
nationally (`public.lgas`), joined to their state by name. `code` is a
self-picked 2-letter short code per state (FCT keeps its universally-used
3-letter abbreviation instead); `slug` is kebab-case and backs the
`/state/<slug>` and `/state/<slug>/lga/<slug>` public pages. Guarded by
`ON CONFLICT (name) DO NOTHING` (states) and
`ON CONFLICT (state_id, name) DO NOTHING` (lgas), matching the unique
constraints `states_name_key` / `lgas_state_name_key` from `0001_init.sql`.

Verified against the live project after applying: exactly 37 states and 774
LGAs total, with every individual state's LGA count cross-checked against
known reality (Lagos = 20, Kano = 44, etc.) before and after insert.

### `002_default_areas.sql`
One "default area" per LGA — `lga_id` set, `name IS NULL` — per the comment
on `public.areas` in `0001_init.sql`: this is the bucket `power_logs` and
`fault_reports` land in when a user only picks down to LGA level (no
estate/community chosen). `disco_id` is left null everywhere; `public.discos`
stays empty until M4. Guarded by `ON CONFLICT (lga_id) WHERE name IS NULL DO
NOTHING`, the same partial unique index (`areas_lga_default_key`) the schema
uses to enforce exactly one default area per LGA.

Verified: `count(areas) == count(lgas) == 774` after applying.

### `003_demo_users_and_logs.sql`
Realistic demo `power_logs` for 10 LGAs spread across different regions —
Lagos/Ikeja, Lagos/Alimosho, FCT/Abuja Municipal, Kano/Kano Municipal,
Rivers/Port Harcourt, Oyo/Ibadan North, Enugu/Enugu North, Kaduna/Kaduna
North, Akwa Ibom/Uyo, Borno/Maiduguri — so the area dashboard, ribbon and LGA
comparison views have real texture instead of reading empty.

Three parts, applied together:

- **003a** — 42 synthetic `auth.users` rows (4–5 per LGA), inserted directly
  via SQL since `power_logs.user_id` is a NOT NULL FK to `auth.users` and
  cannot point at a fake UUID. Each row matches what Supabase's own anonymous
  sign-in writes (`is_anonymous = true`, `aud`/`role = 'authenticated'`, no
  email/password, `raw_app_meta_data` tagging the anonymous provider). This
  fires the `on_auth_user_created` trigger from `0001_init.sql`, which
  auto-creates an empty `public.profiles` row per user.
- **003b** — backfills `display_name`, `state_id`, `lga_id`, `area_id` on
  those profile rows (the trigger only sets `id`), matching each synthetic
  contributor to the LGA they're "from".
- **003c** — the actual `power_logs`: each user gets an alternating on/off
  event sequence — never two consecutive same-status logs for the same
  user+area, per CLAUDE.md decision 1 (events, not durations) — spread over a
  random 14–26 day window per user, with irregular multi-hour gaps (jittered,
  never periodic) biased per LGA by a rough "uptime" texture knob so the ten
  areas don't all read identically. ~15–25% of `on` logs carry a
  `power_source` tag (generator/inverter/solar), exercising CLAUDE.md
  decision 4's grid-only filtering; `off` logs are left untagged since
  nothing is "on" to attribute a source to. `source` is always `'manual'`.

  Does **not** touch `outage_intervals` (that's the M2 scheduled job's job)
  or `fault_reports` / `fault_confirmations` / `discos` / `admin_audit_log`
  (out of scope for this seed pass).

Re-runnability: 003a/003b use `ON CONFLICT (id) DO NOTHING` against the
primary keys of `auth.users` / `public.profiles`. `power_logs` has no unique
constraint in `0001_init.sql` — consecutive-duplicate prevention is
deliberately an app-layer concern there, not a DB one — so 003c instead
guards with `WHERE NOT EXISTS (... user_id = ... AND logged_at = ...)`, a
natural dedup key for this deterministic, pre-generated dataset.

Verified against the live project after applying: 434 logs across 42 users
(10 LGAs), 0 consecutive same-status logs for any user+area pair, 0 logs
timestamped in the future, and every synthetic user's `profiles` row has
`state_id`/`lga_id` set to match the LGA they contribute logs for.

### `004_discos.sql`
Fills `public.discos` with the eleven successor DisCos from the 2013 PHCN
privatisation, then sets `areas.disco_id` for every area by the state its LGA
sits in (CLAUDE.md decision 5: DisCo is added in M4). Two DisCos split Lagos
by LGA in reality; every Lagos LGA is mapped to Ikeja Electric here as a
documented simplification until areas carry a per-area override. `004a` is
`ON CONFLICT (name) DO NOTHING`; `004b` only writes areas whose `disco_id`
would actually change.

Verified after applying: 11 discos, all 774 areas assigned.

## Regenerating

`003`'s logs were generated by a small deterministic Python script (seeded
RNG) rather than hand-written, to get realistic volume and irregularity
without hand-authoring hundreds of timestamps. It isn't checked in — the
output SQL in `003_demo_users_and_logs.sql` is the artifact that matters and
is safe to re-run as-is. If you want materially different demo data (more
LGAs, a different date range, different contributor counts), regenerate that
section from scratch rather than hand-editing the generated INSERT values.
