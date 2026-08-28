-- ============================================================================
-- Derive outage_intervals from power_logs, on a schedule.
--
-- CLAUDE.md decision 1: store events, not durations. power_logs holds discrete
-- on/off timestamps; every duration in the product is derived. This migration
-- is that derivation — the M2 "interval derivation job".
--
-- Numbering note: this is 0003 on disk, but it is recorded in the remote
-- migration history as 0004_outage_interval_derivation. The remote already
-- carried a 0003_revoke_trigger_function_execute_direct entry — a follow-up
-- fix that was folded back into the 0002 file here rather than kept as its
-- own file — so applying this as 0003 would have put two different migrations
-- under that label. Filename order is what governs a replay from scratch.
--
-- What it derives, per area, over logs ordered by logged_at:
--   * A run of consecutive same-status logs collapses to its FIRST log. Three
--     'off' reports in a row are three people reporting one outage, so the
--     interval starts at the first of them, not the last.
--   * Each collapsed 'off' opens an interval; the next collapsed 'on' closes
--     it, with duration_minutes = the gap in minutes, rounded to the nearest
--     minute.
--   * An 'off' with no later 'on' stays open: ended_at and duration_minutes
--     are null. That is the "power is off right now" case the status card
--     reads, so at most one open interval per area is expected.
--   * Flagged logs are skipped entirely. is_flagged is moderator-only (0001),
--     and a log a moderator has marked as suspect must not skew a public
--     uptime figure.
--
-- Why it is re-runnable and incremental: the upsert keys on the existing
-- (area_id, started_at) unique constraint, so a rerun refreshes an interval in
-- place — most usefully closing an open one once the 'on' log arrives — rather
-- than duplicating it. Nothing is truncated, so untouched history is not
-- rewritten every five minutes. The one delete is a targeted prune of rows
-- whose starting 'off' log no longer derives an interval (the log was deleted,
-- or moderation flagged it); it cannot touch rows the same statement upserted,
-- since a data-modifying CTE sees the pre-statement snapshot and the two row
-- sets are disjoint by construction.
--
-- Set-based on purpose: window functions over the whole table, not a per-row
-- cursor. Volume is small (Phase 1 per CLAUDE.md) and correctness reads more
-- clearly this way.
--
-- Writes here are only possible because the function is SECURITY DEFINER:
-- 0001 gives outage_intervals a public SELECT policy and no write policy at
-- all, so anon/authenticated can never write it directly.
-- ============================================================================


-- ============================================================================
-- 1. THE DERIVATION FUNCTION
-- ============================================================================

create or replace function public.derive_outage_intervals()
returns integer
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_written integer;
  v_pruned  integer;
begin
  with ordered as (
    -- Deterministic order within an area: id breaks ties on identical
    -- timestamps so repeated runs collapse runs the same way every time.
    select
      pl.area_id,
      pl.status,
      pl.logged_at,
      lag(pl.status) over (
        partition by pl.area_id
        order by pl.logged_at, pl.id
      ) as prev_status
    from public.power_logs pl
    where not pl.is_flagged
  ),
  transitions as (
    -- One row per status change: the first log of each same-status run.
    -- `is distinct from` keeps each area's very first log, where prev is null.
    select area_id, status, logged_at
    from ordered
    where prev_status is distinct from status
  ),
  paired as (
    -- Statuses now alternate, so the row after an 'off' is always the 'on'
    -- that ends it (or nothing at all, for an outage still in progress).
    select
      area_id,
      status,
      logged_at as started_at,
      lead(logged_at) over (
        partition by area_id
        order by logged_at
      ) as ended_at
    from transitions
  ),
  derived as (
    select distinct on (area_id, started_at)
      area_id,
      started_at,
      ended_at,
      case
        when ended_at is null then null
        else round(extract(epoch from (ended_at - started_at)) / 60.0)::integer
      end as duration_minutes
    from paired
    where status = 'off'::public.power_status
      -- outage_intervals_ends_after_start forbids ended_at <= started_at, so a
      -- zero-length pair (an 'off' and an 'on' logged at the same instant) is
      -- unrepresentable and dropped rather than stored wrong.
      and (ended_at is null or ended_at > started_at)
    order by area_id, started_at, ended_at nulls last
  ),
  written as (
    insert into public.outage_intervals (area_id, started_at, ended_at, duration_minutes)
    select d.area_id, d.started_at, d.ended_at, d.duration_minutes
    from derived d
    on conflict (area_id, started_at) do update
      set ended_at         = excluded.ended_at,
          duration_minutes = excluded.duration_minutes,
          computed_at      = now()
    returning 1
  ),
  pruned as (
    delete from public.outage_intervals oi
    where not exists (
      select 1
      from derived d
      where d.area_id = oi.area_id
        and d.started_at = oi.started_at
    )
    returning 1
  )
  select
    (select count(*) from written)::integer,
    (select count(*) from pruned)::integer
  into v_written, v_pruned;

  if v_pruned > 0 then
    raise notice 'derive_outage_intervals: % interval(s) written, % pruned', v_written, v_pruned;
  end if;

  return v_written;
end;
$fn$;

comment on function public.derive_outage_intervals() is
  'Rebuilds outage_intervals from power_logs: each run of off logs opens an interval, the next on log closes it. Idempotent and incremental — upserts on (area_id, started_at) and prunes intervals no longer derivable. Run by the derive-outage-intervals pg_cron job every 5 minutes.';


-- ============================================================================
-- 2. EXECUTE PRIVILEGES
-- ============================================================================
-- Supabase's default privileges grant EXECUTE on new public-schema functions
-- directly to anon/authenticated, not merely via PUBLIC membership, so both
-- revokes are needed (same finding the security linter raised in 0002). This
-- one matters more than the trigger functions did: it is SECURITY DEFINER and
-- writes a table users cannot write, so exposing it on /rpc/ would hand every
-- client a lever on derived public data.

revoke all on function public.derive_outage_intervals() from public;
revoke all on function public.derive_outage_intervals() from anon, authenticated;
grant execute on function public.derive_outage_intervals() to service_role;


-- ============================================================================
-- 3. SCHEDULE
-- ============================================================================
-- Every 5 minutes: fresh enough that a status card stops showing an outage as
-- open shortly after the restoring 'on' log lands, cheap enough to ignore.
-- Unschedule-then-schedule keeps re-running this migration from stacking up
-- duplicate jobs under the same name.

create extension if not exists pg_cron;

do $sched$
begin
  if exists (select 1 from cron.job where jobname = 'derive-outage-intervals') then
    perform cron.unschedule('derive-outage-intervals');
  end if;

  perform cron.schedule(
    'derive-outage-intervals',
    '*/5 * * * *',
    $job$select public.derive_outage_intervals();$job$
  );
end;
$sched$;
