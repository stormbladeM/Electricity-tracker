-- ============================================================================
-- Grid event inference — detect grid restorations and area-wide outages from
-- the synchronization of independent manual power_logs.
--
-- Numbering note: 0015 on disk, expected to record remotely as 0016 — every
-- file since 0003 sits one slot ahead there. See the migrations README.
--
-- CLAUDE.md decision 3 rules out inferring power state *from a device* — a
-- phone's charging status cannot tell grid from generator, solar or inverter.
-- This does something different: it reads the *timing* of manual logs. Backup
-- power is switched on household by household at scattered times; grid
-- restoration reaches every home on a feeder at once. So a tight cluster of
-- same-status logs from several distinct contributors is a signature only the
-- grid leaves, and that is all this migration looks for.
--
-- It never writes power_logs. Every log stays exactly as its author left it
-- (0001: logs are immutable to their author). The inference lives only in the
-- new grid_events table, which — like outage_intervals — is service-role
-- writable and world readable, and is display-only: derive_outage_intervals
-- (0003) is not touched and stays the single source of truth for durations.
--
-- Same shape as the 0003 derivation job and the 0008 detector: one
-- SECURITY DEFINER function, set-based with window functions, idempotent and
-- incremental via an upsert on a natural key plus a targeted prune, on a
-- 5-minute pg_cron schedule.
-- ============================================================================


-- ============================================================================
-- 1. ENUM TYPES
-- ============================================================================

do $$ begin
  create type public.grid_event_type as enum ('restoration', 'outage');
exception when duplicate_object then null; end $$;

-- How a grid event was inferred. Only 'log_sync' exists today. A future React
-- Native companion app reporting synchronized device charging ('charging_sync')
-- and external corroboration — satellite nightlights, TCN grid-collapse notices
-- ('external') — are the reason this column exists now rather than later: the
-- prune in section 3 is already scoped to 'log_sync' so those rows will survive
-- a rebuild.
do $$ begin
  create type public.grid_event_method as enum ('log_sync');
exception when duplicate_object then null; end $$;


-- ============================================================================
-- 2. GRID EVENTS TABLE
--
-- One row per detected event. occurred_at is the earliest contributing log —
-- for a restoration, roughly when power came back; for an outage, when it went.
-- The evidence columns (distinct_contributors, window_seconds, agreement,
-- baseline_rate) are stored raw so the confidence grade can be computed in
-- TypeScript, the same split anomaly.ts uses: SQL decides whether a row exists,
-- the client decides how loudly to say so, and the two never drift.
--
-- Writable only by the service role: no INSERT/UPDATE/DELETE policy is granted
-- below, exactly as outage_intervals (0001) does it.
-- ============================================================================

create table if not exists public.grid_events (
  id                     uuid primary key default gen_random_uuid(),
  area_id                uuid not null references public.areas (id) on delete cascade,
  lga_id                 uuid not null references public.lgas (id) on delete restrict,
  state_id               uuid not null references public.states (id) on delete restrict,
  event_type             public.grid_event_type not null,
  method                 public.grid_event_method not null default 'log_sync',
  occurred_at            timestamptz not null,
  detected_at            timestamptz not null default now(),
  window_seconds         integer not null,
  distinct_contributors  integer not null,
  contributing_logs      integer not null,
  agreement              numeric not null,
  baseline_rate          numeric,
  computed_at            timestamptz not null default now(),
  created_at             timestamptz not null default now(),
  constraint grid_events_area_type_occurred_key unique (area_id, event_type, occurred_at),
  constraint grid_events_window_non_negative check (window_seconds >= 0),
  constraint grid_events_contributors_floor check (distinct_contributors >= 1),
  constraint grid_events_logs_cover_contributors check (contributing_logs >= distinct_contributors),
  constraint grid_events_agreement_range check (agreement between 0 and 1)
);

comment on table public.grid_events is
  'Grid restorations and area-wide outages inferred from synchronized power_logs by detect_grid_events(). Service-role writable only (like outage_intervals); display-only — derive_outage_intervals stays the source of truth for durations.';

-- Read paths: "recent events for this area" (area dashboard, public area page)
-- and the LGA roll-up.
create index if not exists grid_events_area_occurred_at_idx
  on public.grid_events (area_id, occurred_at desc);
create index if not exists grid_events_lga_occurred_at_idx
  on public.grid_events (lga_id, occurred_at desc);


-- ============================================================================
-- 3. THE DETECTOR
--
-- Per area, over unflagged logs from the last 48 hours:
--   * Sessionize by gap — a run of logs each within c_cluster_gap of the last
--     is one cluster (classic islands-and-gaps). A quarter-hour of silence
--     starts a new one.
--   * Score each cluster: distinct contributors, total logs, the spread from
--     first to last log, and the share that agree on the dominant status.
--   * Keep a cluster as an event only when it clears every gate:
--       - at least c_min_contributors distinct people;
--       - at least c_min_agreement on one status (an area can genuinely be
--         split street to street, so a divided cluster says nothing);
--       - spread no wider than c_max_window (past that it is not a synchronized
--         moment, whatever the counts);
--       - and it beats the area's own ordinary reporting rate for a window that
--         size by c_swing times. This last gate is the Poisson-ish one: at this
--         data volume baseline_rate is a fraction of a log per hour so it
--         resolves to the plain c_min_contributors floor, but it keeps a busy
--         area from raising an event every evening once volume grows. It is the
--         same "the rate itself swung" guard anomaly.ts applies.
--   * A cluster whose dominant status is 'on' is a restoration; 'off' an
--     area-wide outage.
--
-- Idempotent and incremental like derive_outage_intervals: the upsert keys on
-- (area_id, event_type, occurred_at), so a cluster that gains a late log
-- refreshes its row in place. The prune is scoped to method 'log_sync' AND to
-- the 48-hour window the detector actually reconsiders — without the window
-- clause every historical event would be deleted on every run, since `events`
-- only ever holds recent clusters. (derive_outage_intervals needs no such
-- clause because it reprocesses all of history each run; this one does not.)
--
-- Known, accepted quirk (0003 documents its own equivalent): if a log with an
-- earlier timestamp is added to an existing cluster, occurred_at shifts and the
-- upsert writes a second row rather than moving the first. Append-only logging
-- makes this rare; a later reconciliation pass can dedupe.
--
-- SECURITY DEFINER because grid_events has no write policy at all (section 4);
-- search_path pinned to '' so every reference is schema-qualified.
-- ============================================================================

create or replace function public.detect_grid_events()
returns integer
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_written integer;
  v_pruned  integer;
  -- Tunables in one place, the way anomaly.ts keeps its thresholds together.
  c_lookback         interval := interval '48 hours';
  c_cluster_gap      interval := interval '10 minutes';
  c_max_window       interval := interval '30 minutes';
  c_min_contributors integer  := 3;
  c_min_agreement    numeric  := 0.70;
  c_baseline_days    integer  := 30;
  c_swing            numeric  := 3;
begin
  with baseline as (
    -- The area's ordinary chatter, as logs per hour over the last 30 days.
    select
      pl.area_id,
      count(*)::numeric / (c_baseline_days * 24)::numeric as logs_per_hour
    from public.power_logs pl
    where not pl.is_flagged
      and pl.logged_at >= now() - make_interval(days => c_baseline_days)
    group by pl.area_id
  ),
  recent as (
    select
      pl.area_id, pl.lga_id, pl.state_id, pl.user_id, pl.status, pl.logged_at
    from public.power_logs pl
    where not pl.is_flagged
      and pl.logged_at >= now() - c_lookback
  ),
  gapped as (
    -- 1 where this log opens a new cluster (more than c_cluster_gap since the
    -- previous log in the area), 0 otherwise. Separate CTE because a window
    -- function (sum) cannot wrap another (lag) in one expression.
    select
      r.area_id, r.lga_id, r.state_id, r.user_id, r.status, r.logged_at,
      case
        when r.logged_at - lag(r.logged_at) over w > c_cluster_gap then 1
        else 0
      end as opens_cluster
    from recent r
    window w as (partition by r.area_id order by r.logged_at, r.user_id)
  ),
  marked as (
    -- Running sum of the flag = a stable cluster id within each area.
    select
      g.area_id, g.lga_id, g.state_id, g.user_id, g.status, g.logged_at,
      sum(g.opens_cluster) over (
        partition by g.area_id order by g.logged_at, g.user_id
      ) as cluster_id
    from gapped g
  ),
  clusters as (
    select
      m.area_id,
      m.lga_id,     -- constant per area (denormalized); grouped, not aggregated
      m.state_id,
      m.cluster_id,
      min(m.logged_at) as occurred_at,
      round(extract(epoch from (max(m.logged_at) - min(m.logged_at))))::integer as window_seconds,
      count(*)::integer as contributing_logs,
      count(distinct m.user_id)::integer as distinct_contributors,
      count(*) filter (where m.status = 'on')::numeric / count(*)::numeric as on_share
    from marked m
    group by m.area_id, m.lga_id, m.state_id, m.cluster_id
  ),
  scored as (
    select
      c.area_id, c.lga_id, c.state_id, c.occurred_at, c.window_seconds,
      c.contributing_logs, c.distinct_contributors,
      (case when c.on_share >= 0.5 then 'restoration' else 'outage' end)::public.grid_event_type as event_type,
      greatest(c.on_share, 1 - c.on_share) as agreement,
      coalesce(b.logs_per_hour, 0) as baseline_rate
    from clusters c
    left join baseline b on b.area_id = c.area_id
  ),
  events as (
    select
      s.area_id, s.lga_id, s.state_id, s.event_type, s.occurred_at,
      s.window_seconds, s.contributing_logs, s.distinct_contributors,
      s.agreement, s.baseline_rate
    from scored s
    where s.distinct_contributors >= c_min_contributors
      and s.agreement >= c_min_agreement
      and s.window_seconds <= extract(epoch from c_max_window)
      and s.distinct_contributors >= greatest(
            c_min_contributors,
            ceil(s.baseline_rate * (s.window_seconds / 3600.0) * c_swing)
          )
  ),
  written as (
    insert into public.grid_events (
      area_id, lga_id, state_id, event_type, method,
      occurred_at, window_seconds, distinct_contributors,
      contributing_logs, agreement, baseline_rate
    )
    select
      e.area_id, e.lga_id, e.state_id, e.event_type, 'log_sync',
      e.occurred_at, e.window_seconds, e.distinct_contributors,
      e.contributing_logs, e.agreement, e.baseline_rate
    from events e
    on conflict (area_id, event_type, occurred_at) do update
      set window_seconds        = excluded.window_seconds,
          distinct_contributors = excluded.distinct_contributors,
          contributing_logs     = excluded.contributing_logs,
          agreement             = excluded.agreement,
          baseline_rate         = excluded.baseline_rate,
          computed_at           = now()
    returning 1
  ),
  pruned as (
    delete from public.grid_events ge
    where ge.method = 'log_sync'
      and ge.occurred_at >= now() - c_lookback
      and not exists (
        select 1 from events e
        where e.area_id = ge.area_id
          and e.event_type = ge.event_type
          and e.occurred_at = ge.occurred_at
      )
    returning 1
  )
  select
    (select count(*) from written)::integer,
    (select count(*) from pruned)::integer
  into v_written, v_pruned;

  if v_pruned > 0 then
    raise notice 'detect_grid_events: % event(s) written, % pruned', v_written, v_pruned;
  end if;

  return v_written;
end;
$fn$;

comment on function public.detect_grid_events() is
  'Infers grid_events from synchronized power_logs: a gap-bounded cluster of >=3 contributors, >=70% agreeing, inside 30 minutes and beating the area baseline rate, becomes a restoration (dominant status on) or an area-wide outage (off). Idempotent and incremental — upserts on (area_id, event_type, occurred_at) and prunes log_sync events in the 48h window that no longer derive. Run by the detect-grid-events pg_cron job every 5 minutes.';


-- ============================================================================
-- 4. ROW LEVEL SECURITY + GRANTS
--
-- Public read (the shareable area pages show these with no login); no write
-- policy anywhere, so only the service role — i.e. the scheduled job — writes.
-- Same stance as outage_intervals in 0001.
-- ============================================================================

alter table public.grid_events enable row level security;

drop policy if exists "grid events are publicly readable" on public.grid_events;
create policy "grid events are publicly readable"
  on public.grid_events for select
  to anon, authenticated
  using (true);

grant select on public.grid_events to anon, authenticated;


-- ============================================================================
-- 5. EXECUTE PRIVILEGES
-- Supabase grants EXECUTE on new public functions to anon/authenticated by
-- name, not only via PUBLIC, so both revokes are needed (same finding as 0002,
-- 0003 and 0013). This one is SECURITY DEFINER and writes a table nobody else
-- can, so exposing it on /rpc/ would hand every client a write lever.
-- ============================================================================

revoke all on function public.detect_grid_events() from public;
revoke all on function public.detect_grid_events() from anon, authenticated;
grant execute on function public.detect_grid_events() to service_role;


-- ============================================================================
-- 6. SCHEDULE
-- Every 5 minutes, alongside derive-outage-intervals. Unschedule-then-schedule
-- so re-running this file cannot stack duplicate jobs.
-- ============================================================================

create extension if not exists pg_cron;

do $sched$
begin
  if exists (select 1 from cron.job where jobname = 'detect-grid-events') then
    perform cron.unschedule('detect-grid-events');
  end if;

  perform cron.schedule(
    'detect-grid-events',
    '*/5 * * * *',
    $job$select public.detect_grid_events();$job$
  );
end;
$sched$;
