-- ============================================================================
-- Nigeria Electricity Tracker — initial schema, RLS and auth wiring
--
-- Design reference: docs/project-plan.md section 3 (data model) and section 4
-- (features that read/write it). Locked-in decisions live in CLAUDE.md.
--
-- Locked decisions this file encodes:
--   * Store events, not durations. power_logs holds discrete on/off timestamps.
--     outage_intervals is derived from them by a scheduled job (not here).
--   * Anonymous Supabase auth: every row's user_id is a real auth.users id, so
--     RLS and moderation work without email/password.
--   * RLS everywhere: read aggregates broadly, write only your own rows,
--     moderators/admins get elevated policies.
--
-- Ordering note: the SECURITY DEFINER helpers in section 4 are what every
-- policy calls, so they are defined right after the profiles table they read
-- (section 3) and long before section 11 uses them. They cannot come before
-- profiles exists: Postgres validates table references inside a `language
-- sql` function body at CREATE FUNCTION time, unlike plpgsql.
--
-- Written to be re-runnable: types, tables, indexes, functions, triggers and
-- policies are all guarded or replaced rather than blindly created.
--
-- gen_random_uuid() is core Postgres 13+ (and pgcrypto is present on Supabase),
-- so no extension is created here.
-- ============================================================================


-- ============================================================================
-- 1. ENUM TYPES
-- ============================================================================

do $$ begin
  create type public.user_role as enum ('user', 'moderator', 'admin');
exception when duplicate_object then null; end $$;

-- The domain of a power state change. Deliberately an enum, not free text.
do $$ begin
  create type public.power_status as enum ('on', 'off');
exception when duplicate_object then null; end $$;

-- Optional tag on a log: which supply the user is reporting on.
-- Enables grid-only filtering and the "% on generator during outages" stat.
do $$ begin
  create type public.power_source as enum ('grid', 'generator', 'solar', 'inverter');
exception when duplicate_object then null; end $$;

-- How a log entered the system. 'auto' is reserved; CLAUDE.md decision 3 rules
-- out auto-detection for now, but seeded/imported rows need a non-manual value.
do $$ begin
  create type public.log_source as enum ('manual', 'auto');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.fault_type as enum (
    'transformer', 'pole_down', 'cable_snap', 'meter_issue',
    'low_voltage', 'vandalism', 'billing', 'other'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.fault_severity as enum ('low', 'medium', 'high', 'critical');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.fault_status as enum (
    'reported', 'confirmed', 'acknowledged', 'in_progress', 'resolved', 'rejected'
  );
exception when duplicate_object then null; end $$;


-- ============================================================================
-- 2. LOCATION REFERENCE TABLES
--
-- states → lgas → areas is the geographic hierarchy every stat rolls up
-- through. Reference data: publicly readable (public area pages need it
-- without login), admin-only writable via the location management screen.
-- ============================================================================

-- The 36 states + FCT. `code` is the short official code (e.g. 'ON' for Ondo).
create table if not exists public.states (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  code        text not null,
  slug        text,
  created_at  timestamptz not null default now(),
  constraint states_name_key unique (name),
  constraint states_code_key unique (code),
  constraint states_slug_key unique (slug),
  constraint states_name_not_blank check (char_length(btrim(name)) > 0)
);

comment on table public.states is
  'Nigerian states + FCT. Reference data; slug backs the /state/<slug> public pages.';

create table if not exists public.lgas (
  id          uuid primary key default gen_random_uuid(),
  state_id    uuid not null references public.states (id) on delete cascade,
  name        text not null,
  slug        text,
  created_at  timestamptz not null default now(),
  constraint lgas_state_name_key unique (state_id, name),
  constraint lgas_name_not_blank check (char_length(btrim(name)) > 0)
);

comment on table public.lgas is
  'Local government areas. Deleting a state cascades its LGAs — reference data only, no user rows hang off a state directly.';

create index if not exists lgas_state_id_idx on public.lgas (state_id);
create unique index if not exists lgas_state_slug_key on public.lgas (state_id, slug) where slug is not null;

create table if not exists public.discos (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  short_name  text,
  created_at  timestamptz not null default now(),
  constraint discos_name_key unique (name),
  constraint discos_short_name_key unique (short_name)
);

comment on table public.discos is
  'Distribution companies (Ikeja Electric, EKEDC, AEDC, ...). Populated in M4; nothing requires a disco before then.';

-- The optional community/estate level under an LGA. A row with name IS NULL is
-- the LGA's default area — the bucket logs land in when a user only picks down
-- to LGA level. The partial unique index below allows exactly one per LGA.
create table if not exists public.areas (
  id          uuid primary key default gen_random_uuid(),
  lga_id      uuid not null references public.lgas (id) on delete cascade,
  disco_id    uuid references public.discos (id) on delete set null,
  name        text,
  slug        text,
  created_at  timestamptz not null default now(),
  constraint areas_name_not_blank check (name is null or char_length(btrim(name)) > 0)
);

comment on table public.areas is
  'Community/estate level under an LGA. name IS NULL marks the LGA default area (one per LGA, enforced by a partial unique index).';

create index if not exists areas_lga_id_idx on public.areas (lga_id);
create index if not exists areas_disco_id_idx on public.areas (disco_id) where disco_id is not null;
create unique index if not exists areas_lga_name_key on public.areas (lga_id, name) where name is not null;
create unique index if not exists areas_lga_default_key on public.areas (lga_id) where name is null;
create unique index if not exists areas_lga_slug_key on public.areas (lga_id, slug) where slug is not null;


-- ============================================================================
-- 3. PROFILES
--
-- One row per auth user, created by the on-signup trigger in section 4 — never
-- by the client. RLS and moderation both dereference this table, so it must
-- exist for every signed-in user, including anonymous ones.
-- ============================================================================

create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  display_name  text,
  state_id      uuid references public.states (id) on delete set null,
  lga_id        uuid references public.lgas (id) on delete set null,
  area_id       uuid references public.areas (id) on delete set null,
  role          public.user_role not null default 'user',
  is_banned     boolean not null default false,
  trust_score   integer not null default 50,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint profiles_trust_score_range check (trust_score between 0 and 100),
  constraint profiles_display_name_len check (display_name is null or char_length(display_name) <= 60)
);

comment on table public.profiles is
  'Per-user record backing RLS, moderation and the location picker. Rows are created by the auth.users trigger, never by clients.';

create index if not exists profiles_role_idx on public.profiles (role) where role <> 'user';
create index if not exists profiles_lga_id_idx on public.profiles (lga_id);
create index if not exists profiles_area_id_idx on public.profiles (area_id);
create index if not exists profiles_is_banned_idx on public.profiles (is_banned) where is_banned;


-- ============================================================================
-- 4. HELPER FUNCTIONS (SECURITY DEFINER) AND AUTH WIRING
--
-- Policies must never sub-select into public.profiles to look up the caller's
-- own role — a policy on profiles that reads profiles recurses infinitely.
-- These run as the function owner, bypassing RLS, and are the only sanctioned
-- way for a policy to ask "who is the caller and what may they do".
-- search_path is pinned to '' so every reference below is fully qualified.
-- ============================================================================

create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select p.role
  from public.profiles p
  where p.id = (select auth.uid());
$$;

comment on function public.current_user_role() is
  'Role of the calling user, RLS-bypassing. Returns null for anon/unauthenticated.';

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.current_user_role() = 'admin', false);
$$;

create or replace function public.is_moderator_or_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.current_user_role() in ('moderator', 'admin'), false);
$$;

-- Banned users keep read access (their own history stays visible) but are
-- blocked from every write path via the INSERT policies below.
create or replace function public.is_current_user_banned()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select p.is_banned from public.profiles p where p.id = (select auth.uid())),
    false
  );
$$;

-- Generic updated_at maintenance.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Auto-provision a profile for every new auth user (anonymous sign-in included).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill for any users that already exist (e.g. created before this ran).
insert into public.profiles (id)
select u.id from auth.users u
on conflict (id) do nothing;

-- RLS can only inspect the NEW row, so it cannot tell "user edited their
-- display name" from "user granted themselves admin". This trigger guards the
-- privileged columns; the self-update policy in section 11 stays simple
-- because of it.
create or replace function public.enforce_profile_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- auth.uid() is null under the service role / scheduled jobs: let those pass.
  if (select auth.uid()) is null or public.is_admin() then
    return new;
  end if;

  if new.role is distinct from old.role
     or new.is_banned is distinct from old.is_banned
     or new.trust_score is distinct from old.trust_score
     or new.id is distinct from old.id then
    raise exception 'Only an admin can change role, ban status or trust score'
      using errcode = 'insufficient_privilege';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_guard_privileged_columns on public.profiles;
create trigger profiles_guard_privileged_columns
  before update on public.profiles
  for each row execute function public.enforce_profile_privileged_columns();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();


-- ============================================================================
-- 5. POWER LOGS
--
-- Discrete state-change events. Never a duration — see CLAUDE.md decision 1.
-- Immutable once written: no UPDATE/DELETE policy for regular users, so history
-- cannot be quietly rewritten. Only moderators/admins touch is_flagged.
--
-- NOTE: preventing duplicate consecutive same-status logs (an 'off' right after
-- another 'off' for the same user+area) needs "what was this user's most recent
-- log here" logic, which a SQL unique constraint cannot express. It is enforced
-- in the application layer as part of the M2 log flow.
--
-- state_id/lga_id are denormalized alongside area_id so state- and LGA-level
-- aggregations never have to join up the hierarchy. The write path is
-- responsible for keeping the three consistent.
-- ============================================================================

create table if not exists public.power_logs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  area_id       uuid not null references public.areas (id) on delete restrict,
  lga_id        uuid not null references public.lgas (id) on delete restrict,
  state_id      uuid not null references public.states (id) on delete restrict,
  status        public.power_status not null,
  power_source  public.power_source,
  logged_at     timestamptz not null default now(),
  source        public.log_source not null default 'manual',
  is_flagged    boolean not null default false,
  flag_reason   text,
  created_at    timestamptz not null default now(),
  constraint power_logs_flag_reason_requires_flag
    check (flag_reason is null or is_flagged)
);

comment on table public.power_logs is
  'Discrete on/off events. Immutable to their author; durations are derived into outage_intervals by a scheduled job.';

-- Area dashboard + ribbon: "all logs for this area over this window".
create index if not exists power_logs_area_logged_at_idx
  on public.power_logs (area_id, logged_at desc);
-- Personal dashboard: "my logs over this window".
create index if not exists power_logs_user_logged_at_idx
  on public.power_logs (user_id, logged_at desc);
-- LGA comparison and national ranking roll-ups.
create index if not exists power_logs_lga_logged_at_idx
  on public.power_logs (lga_id, logged_at desc);
create index if not exists power_logs_state_logged_at_idx
  on public.power_logs (state_id, logged_at desc);
-- Moderation queue.
create index if not exists power_logs_flagged_idx
  on public.power_logs (created_at desc) where is_flagged;


-- ============================================================================
-- 6. OUTAGE INTERVALS
--
-- Derived table, rebuilt from power_logs by a scheduled job. Charts read this,
-- not the raw logs. No trigger computes it yet — that job lands in M2, and it
-- owns duration_minutes; nothing in this migration writes the column.
-- Writable only by the service role: no policy below grants write to anon or
-- authenticated, which is the whole access control story for this table.
-- ended_at IS NULL means the outage is still open.
-- ============================================================================

create table if not exists public.outage_intervals (
  id                uuid primary key default gen_random_uuid(),
  area_id           uuid not null references public.areas (id) on delete cascade,
  started_at        timestamptz not null,
  ended_at          timestamptz,
  duration_minutes  integer,
  computed_at       timestamptz not null default now(),
  created_at        timestamptz not null default now(),
  constraint outage_intervals_area_started_key unique (area_id, started_at),
  constraint outage_intervals_ends_after_start check (ended_at is null or ended_at > started_at),
  constraint outage_intervals_duration_non_negative check (duration_minutes is null or duration_minutes >= 0),
  constraint outage_intervals_open_has_no_duration check (ended_at is not null or duration_minutes is null)
);

comment on table public.outage_intervals is
  'Derived outage windows rebuilt from power_logs by a scheduled job. Service-role writable only; ended_at IS NULL means still ongoing.';

create index if not exists outage_intervals_area_started_at_idx
  on public.outage_intervals (area_id, started_at desc);
create index if not exists outage_intervals_open_idx
  on public.outage_intervals (area_id, started_at desc) where ended_at is null;


-- ============================================================================
-- 7. FAULT REPORTS
--
-- Public feed + map, so SELECT is open to anon. The author may fix their own
-- report only while it is untouched (status still 'reported' and no resolution
-- recorded); every status transition after that is moderator/admin work.
-- confirm_count is a cached counter maintained by the M5 confirmation flow.
-- ============================================================================

create table if not exists public.fault_reports (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  area_id          uuid not null references public.areas (id) on delete restrict,
  lga_id           uuid not null references public.lgas (id) on delete restrict,
  state_id         uuid not null references public.states (id) on delete restrict,
  disco_id         uuid references public.discos (id) on delete set null,
  fault_type       public.fault_type not null,
  description      text,
  photo_url        text,
  latitude         double precision,
  longitude        double precision,
  severity         public.fault_severity not null default 'medium',
  status           public.fault_status not null default 'reported',
  confirm_count    integer not null default 0,
  reported_at      timestamptz not null default now(),
  resolved_at      timestamptz,
  resolution_note  text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint fault_reports_latitude_range check (latitude is null or latitude between -90 and 90),
  constraint fault_reports_longitude_range check (longitude is null or longitude between -180 and 180),
  constraint fault_reports_coords_paired check ((latitude is null) = (longitude is null)),
  constraint fault_reports_confirm_count_non_negative check (confirm_count >= 0),
  constraint fault_reports_description_len check (description is null or char_length(description) <= 2000)
);

comment on table public.fault_reports is
  'User-reported physical/service faults. Public feed and map read this without login; status transitions are moderator/admin only.';

-- Fault feed for an area, and the "open faults here" map query.
create index if not exists fault_reports_area_status_idx
  on public.fault_reports (area_id, status);
-- Admin triage queue: severity + confirm_count within a status.
create index if not exists fault_reports_status_severity_idx
  on public.fault_reports (status, severity, confirm_count desc);
create index if not exists fault_reports_lga_status_idx
  on public.fault_reports (lga_id, status);
create index if not exists fault_reports_state_status_idx
  on public.fault_reports (state_id, status);
create index if not exists fault_reports_user_reported_at_idx
  on public.fault_reports (user_id, reported_at desc);
create index if not exists fault_reports_reported_at_idx
  on public.fault_reports (reported_at desc);
create index if not exists fault_reports_disco_status_idx
  on public.fault_reports (disco_id, status) where disco_id is not null;

drop trigger if exists fault_reports_set_updated_at on public.fault_reports;
create trigger fault_reports_set_updated_at
  before update on public.fault_reports
  for each row execute function public.set_updated_at();


-- ============================================================================
-- 8. FAULT CONFIRMATIONS
--
-- "I'm affected too". One per user per fault, enforced here rather than in app
-- code so a double-tap or a retried offline sync cannot inflate confirm_count.
-- ============================================================================

create table if not exists public.fault_confirmations (
  id          uuid primary key default gen_random_uuid(),
  fault_id    uuid not null references public.fault_reports (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now(),
  constraint fault_confirmations_fault_user_key unique (fault_id, user_id)
);

comment on table public.fault_confirmations is
  'One confirmation per user per fault (unique constraint, not app logic). fault_reports.confirm_count is maintained by the M5 flow.';

create index if not exists fault_confirmations_fault_id_idx
  on public.fault_confirmations (fault_id);
create index if not exists fault_confirmations_user_id_idx
  on public.fault_confirmations (user_id);


-- ============================================================================
-- 9. ADMIN AUDIT LOG
--
-- Append-only record of every admin/moderator action. No UPDATE or DELETE
-- policy exists for anyone, including admins — that immutability is the point.
-- admin_id is SET NULL rather than CASCADE so deleting an admin account cannot
-- erase the trail of what they did.
-- ============================================================================

create table if not exists public.admin_audit_log (
  id           uuid primary key default gen_random_uuid(),
  admin_id     uuid references auth.users (id) on delete set null,
  action       text not null,
  target_type  text,
  target_id    uuid,
  notes        text,
  created_at   timestamptz not null default now(),
  constraint admin_audit_log_action_not_blank check (char_length(btrim(action)) > 0)
);

comment on table public.admin_audit_log is
  'Append-only audit trail. Immutable by RLS: no update or delete policy is granted to any role.';

create index if not exists admin_audit_log_created_at_idx
  on public.admin_audit_log (created_at desc);
create index if not exists admin_audit_log_admin_created_at_idx
  on public.admin_audit_log (admin_id, created_at desc);
create index if not exists admin_audit_log_target_idx
  on public.admin_audit_log (target_type, target_id);


-- ============================================================================
-- 10. ROW LEVEL SECURITY — enable on every table
-- ============================================================================

alter table public.states              enable row level security;
alter table public.lgas                enable row level security;
alter table public.discos              enable row level security;
alter table public.areas               enable row level security;
alter table public.profiles            enable row level security;
alter table public.power_logs          enable row level security;
alter table public.outage_intervals    enable row level security;
alter table public.fault_reports       enable row level security;
alter table public.fault_confirmations enable row level security;
alter table public.admin_audit_log     enable row level security;


-- ============================================================================
-- 11. POLICIES
-- Policies are dropped first so this file can be re-applied cleanly.
-- ============================================================================

-- ---------------------------------------------------------------- states ----
drop policy if exists "states are publicly readable" on public.states;
create policy "states are publicly readable"
  on public.states for select
  to anon, authenticated
  using (true);

drop policy if exists "admins insert states" on public.states;
create policy "admins insert states"
  on public.states for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "admins update states" on public.states;
create policy "admins update states"
  on public.states for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "admins delete states" on public.states;
create policy "admins delete states"
  on public.states for delete
  to authenticated
  using (public.is_admin());

-- ------------------------------------------------------------------ lgas ----
drop policy if exists "lgas are publicly readable" on public.lgas;
create policy "lgas are publicly readable"
  on public.lgas for select
  to anon, authenticated
  using (true);

drop policy if exists "admins insert lgas" on public.lgas;
create policy "admins insert lgas"
  on public.lgas for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "admins update lgas" on public.lgas;
create policy "admins update lgas"
  on public.lgas for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "admins delete lgas" on public.lgas;
create policy "admins delete lgas"
  on public.lgas for delete
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------- discos ----
drop policy if exists "discos are publicly readable" on public.discos;
create policy "discos are publicly readable"
  on public.discos for select
  to anon, authenticated
  using (true);

drop policy if exists "admins insert discos" on public.discos;
create policy "admins insert discos"
  on public.discos for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "admins update discos" on public.discos;
create policy "admins update discos"
  on public.discos for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "admins delete discos" on public.discos;
create policy "admins delete discos"
  on public.discos for delete
  to authenticated
  using (public.is_admin());

-- ----------------------------------------------------------------- areas ----
drop policy if exists "areas are publicly readable" on public.areas;
create policy "areas are publicly readable"
  on public.areas for select
  to anon, authenticated
  using (true);

drop policy if exists "admins insert areas" on public.areas;
create policy "admins insert areas"
  on public.areas for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "admins update areas" on public.areas;
create policy "admins update areas"
  on public.areas for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "admins delete areas" on public.areas;
create policy "admins delete areas"
  on public.areas for delete
  to authenticated
  using (public.is_admin());

-- -------------------------------------------------------------- profiles ----
-- No INSERT policy: rows come from the on_auth_user_created trigger only.
-- No DELETE policy: profiles die with their auth user, via the FK cascade.
drop policy if exists "users read own profile" on public.profiles;
create policy "users read own profile"
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()));

drop policy if exists "moderators read all profiles" on public.profiles;
create policy "moderators read all profiles"
  on public.profiles for select
  to authenticated
  using (public.is_moderator_or_admin());

-- Privileged columns (role, is_banned, trust_score) are guarded by the
-- profiles_guard_privileged_columns trigger, which RLS cannot express.
drop policy if exists "users update own profile" on public.profiles;
create policy "users update own profile"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

drop policy if exists "admins update any profile" on public.profiles;
create policy "admins update any profile"
  on public.profiles for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ------------------------------------------------------------ power_logs ----
-- Public read: the shareable area profile pages compute uptime with no login.
drop policy if exists "power logs are publicly readable" on public.power_logs;
create policy "power logs are publicly readable"
  on public.power_logs for select
  to anon, authenticated
  using (true);

drop policy if exists "users insert own power logs" on public.power_logs;
create policy "users insert own power logs"
  on public.power_logs for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and not public.is_current_user_banned()
  );

-- Logs are immutable events; only moderation may amend is_flagged/flag_reason.
drop policy if exists "moderators update power logs" on public.power_logs;
create policy "moderators update power logs"
  on public.power_logs for update
  to authenticated
  using (public.is_moderator_or_admin())
  with check (public.is_moderator_or_admin());

drop policy if exists "moderators delete power logs" on public.power_logs;
create policy "moderators delete power logs"
  on public.power_logs for delete
  to authenticated
  using (public.is_moderator_or_admin());

-- ------------------------------------------------------- outage_intervals ---
-- Read-only to the world. Intentionally no insert/update/delete policy: only
-- the service role (which bypasses RLS) may write, i.e. the scheduled job.
drop policy if exists "outage intervals are publicly readable" on public.outage_intervals;
create policy "outage intervals are publicly readable"
  on public.outage_intervals for select
  to anon, authenticated
  using (true);

-- --------------------------------------------------------- fault_reports ----
drop policy if exists "fault reports are publicly readable" on public.fault_reports;
create policy "fault reports are publicly readable"
  on public.fault_reports for select
  to anon, authenticated
  using (true);

drop policy if exists "users insert own fault reports" on public.fault_reports;
create policy "users insert own fault reports"
  on public.fault_reports for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and not public.is_current_user_banned()
    and status = 'reported'
    and resolved_at is null
    and resolution_note is null
  );

-- The author may correct their own report only while it is still untriaged.
-- Repeating the predicate in WITH CHECK is what stops them from promoting the
-- status or writing a resolution note themselves.
drop policy if exists "users update own untriaged fault reports" on public.fault_reports;
create policy "users update own untriaged fault reports"
  on public.fault_reports for update
  to authenticated
  using (
    user_id = (select auth.uid())
    and status = 'reported'
    and resolved_at is null
    and resolution_note is null
  )
  with check (
    user_id = (select auth.uid())
    and status = 'reported'
    and resolved_at is null
    and resolution_note is null
  );

drop policy if exists "moderators update fault reports" on public.fault_reports;
create policy "moderators update fault reports"
  on public.fault_reports for update
  to authenticated
  using (public.is_moderator_or_admin())
  with check (public.is_moderator_or_admin());

drop policy if exists "moderators delete fault reports" on public.fault_reports;
create policy "moderators delete fault reports"
  on public.fault_reports for delete
  to authenticated
  using (public.is_moderator_or_admin());

-- ---------------------------------------------------- fault_confirmations ---
drop policy if exists "fault confirmations are publicly readable" on public.fault_confirmations;
create policy "fault confirmations are publicly readable"
  on public.fault_confirmations for select
  to anon, authenticated
  using (true);

drop policy if exists "users insert own fault confirmations" on public.fault_confirmations;
create policy "users insert own fault confirmations"
  on public.fault_confirmations for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and not public.is_current_user_banned()
  );

-- No UPDATE policy: a confirmation has nothing to edit. Un-confirming is a
-- delete by the owner; admins can delete to clean up brigading.
drop policy if exists "owners or admins delete fault confirmations" on public.fault_confirmations;
create policy "owners or admins delete fault confirmations"
  on public.fault_confirmations for delete
  to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());

-- ------------------------------------------------------- admin_audit_log ----
-- No UPDATE or DELETE policy anywhere: the trail is append-only.
drop policy if exists "moderators read audit log" on public.admin_audit_log;
create policy "moderators read audit log"
  on public.admin_audit_log for select
  to authenticated
  using (public.is_moderator_or_admin());

drop policy if exists "moderators insert audit log" on public.admin_audit_log;
create policy "moderators insert audit log"
  on public.admin_audit_log for insert
  to authenticated
  with check (
    public.is_moderator_or_admin()
    and admin_id = (select auth.uid())
  );


-- ============================================================================
-- 12. GRANTS
--
-- RLS filters rows; table privileges decide whether a role may attempt the
-- statement at all. Supabase's default privileges usually cover this, but the
-- grants are spelled out so the migration does not depend on them. Every write
-- path still has to satisfy the policies above.
-- ============================================================================

grant usage on schema public to anon, authenticated;

grant select on public.states, public.lgas, public.discos, public.areas,
               public.power_logs, public.outage_intervals,
               public.fault_reports, public.fault_confirmations
  to anon, authenticated;

grant select on public.profiles, public.admin_audit_log to authenticated;

grant insert, update, delete on
  public.states, public.lgas, public.discos, public.areas
  to authenticated;

grant update on public.profiles to authenticated;
grant insert, update, delete on public.power_logs to authenticated;
grant insert, update, delete on public.fault_reports to authenticated;
grant insert, delete on public.fault_confirmations to authenticated;
grant insert on public.admin_audit_log to authenticated;

-- outage_intervals: read only for anon/authenticated. Writes are service-role.

grant execute on function public.current_user_role() to anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.is_moderator_or_admin() to anon, authenticated;
grant execute on function public.is_current_user_banned() to anon, authenticated;
