-- ============================================================================
-- Admin overview metrics — the two aggregates behind the M6 admin overview.
--
-- The user-facing dashboards fetch rows and fold them in the browser: one
-- area's logs, one scope's intervals. The admin overview is the opposite
-- shape — it asks "how is the whole system doing", which touches every table
-- at once. Doing that client-side would mean shipping the entire log table to
-- a browser, so both roll-ups run in Postgres and return a handful of rows.
--
-- Numbering note: this is 0007 on disk and is expected to record remotely as
-- 0008. Every file since 0003 sits one slot ahead remotely — see the
-- migrations README for why. Filename order governs a replay from scratch.
--
-- Access: both functions are SECURITY DEFINER and open with an explicit
-- `is_moderator_or_admin()` check that raises `insufficient_privilege`.
-- Two reasons over leaning on RLS:
--   * profiles is only readable by its owner and by moderators (0001), so a
--     plain caller-RLS function would hand a regular user a *quietly wrong*
--     answer — 1 user, 0 banned — instead of a refusal. Metrics that silently
--     under-report are worse than metrics that fail.
--   * one explicit gate is easier to audit than "which of these six tables
--     happens to be publicly selectable".
-- EXECUTE is granted to `authenticated` only; `anon` never reaches the check.
--
-- Timezone: Nigeria is a single zone (Africa/Lagos, UTC+1, no DST), so the
-- growth series buckets by local calendar day rather than UTC. A log at 00:30
-- WAT belongs to that day for a Nigerian reader, not to the one before.
-- ============================================================================


-- ============================================================================
-- 1. admin_overview_stats — one row of headline numbers
--
-- Everything is scoped to the last p_days days except the all-time totals and
-- the open backlogs: a fault reported 90 days ago and still open is still open
-- today, and a backlog you can age out of is not a backlog.
--
-- National uptime reuses lga_uptime_ranking(p_days) rather than re-deriving
-- the window arithmetic, so the admin's headline number and the public ranking
-- cannot drift apart — which they would the moment two copies of that clipping
-- logic existed. It is log-count weighted for the same reason the ranking is:
-- an LGA with four logs should not move the national figure as much as one
-- with four hundred.
-- ============================================================================

create or replace function public.admin_overview_stats(p_days integer default 30)
returns table (
  window_days              integer,
  logs_total               bigint,
  logs_window              bigint,
  logs_prev_window         bigint,
  contributors_total       bigint,
  contributors_window      bigint,
  new_users_window         bigint,
  users_total              bigint,
  banned_users             bigint,
  flagged_logs_open        bigint,
  faults_open              bigint,
  faults_untriaged         bigint,
  faults_window            bigint,
  faults_resolved_window   bigint,
  median_resolution_hours  numeric,
  national_uptime_percent  numeric,
  lgas_tracked             bigint,
  lgas_total               bigint,
  audit_actions_window     bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_days       integer     := least(greatest(coalesce(p_days, 30), 1), 365);
  v_start      timestamptz := now() - make_interval(days => v_days);
  v_prev_start timestamptz := now() - make_interval(days => v_days * 2);
begin
  if not public.is_moderator_or_admin() then
    raise exception 'Admin metrics are restricted to moderators and admins'
      using errcode = 'insufficient_privilege';
  end if;

  return query
  with ranking as (
    select r.uptime_percent, r.log_count
    from public.lga_uptime_ranking(v_days) r
  ),
  national as (
    select
      round(
        sum(r.uptime_percent * greatest(r.log_count, 1))
        / nullif(sum(greatest(r.log_count, 1)), 0),
        1
      )                as uptime_percent,
      count(*)::bigint as lgas_tracked
    from ranking r
  ),
  log_stats as (
    select
      count(*)::bigint                                        as total,
      count(*) filter (where pl.logged_at >= v_start)::bigint as in_window,
      count(*) filter (
        where pl.logged_at >= v_prev_start and pl.logged_at < v_start
      )::bigint                                               as in_prev_window,
      count(distinct pl.user_id)::bigint                      as contributors_total,
      count(distinct pl.user_id) filter (
        where pl.logged_at >= v_start
      )::bigint                                               as contributors_window,
      count(*) filter (where pl.is_flagged)::bigint           as flagged_open
    from public.power_logs pl
  ),
  user_stats as (
    select
      count(*)::bigint                                       as total,
      count(*) filter (where p.created_at >= v_start)::bigint as new_in_window,
      count(*) filter (where p.is_banned)::bigint             as banned
    from public.profiles p
  ),
  fault_stats as (
    select
      count(*) filter (
        where fr.status in ('reported', 'confirmed', 'acknowledged', 'in_progress')
      )::bigint                                                 as open_count,
      count(*) filter (where fr.status = 'reported')::bigint    as untriaged,
      count(*) filter (where fr.reported_at >= v_start)::bigint as in_window,
      count(*) filter (
        where fr.status = 'resolved' and fr.resolved_at >= v_start
      )::bigint                                                 as resolved_in_window,
      round(
        (percentile_cont(0.5) within group (
          order by extract(epoch from (fr.resolved_at - fr.reported_at)) / 3600.0
        ) filter (where fr.resolved_at is not null and fr.resolved_at >= v_start))::numeric,
        1
      )                                                         as median_hours
    from public.fault_reports fr
  ),
  audit_stats as (
    select count(*) filter (where al.created_at >= v_start)::bigint as in_window
    from public.admin_audit_log al
  ),
  lga_stats as (
    select count(*)::bigint as total from public.lgas
  )
  select
    v_days,
    l.total,
    l.in_window,
    l.in_prev_window,
    l.contributors_total,
    l.contributors_window,
    u.new_in_window,
    u.total,
    u.banned,
    l.flagged_open,
    f.open_count,
    f.untriaged,
    f.in_window,
    f.resolved_in_window,
    f.median_hours,
    n.uptime_percent,
    n.lgas_tracked,
    g.total,
    a.in_window
  from log_stats l, user_stats u, fault_stats f, audit_stats a, lga_stats g, national n;
end;
$$;

comment on function public.admin_overview_stats(integer) is
  'Headline admin numbers over the last p_days days: log/contributor/user/fault volumes, open moderation and triage backlogs, median fault resolution time, and log-weighted national uptime (from lga_uptime_ranking). Moderator/admin only — raises insufficient_privilege otherwise.';


-- ============================================================================
-- 2. admin_growth_series — one row per local calendar day
--
-- The overview's growth chart: is the platform actually growing, and is fault
-- reporting tracking it. Quiet days come back as explicit zero rows (left join
-- off a generated calendar) so the chart draws the gap instead of closing it
-- up and implying activity that never happened.
-- ============================================================================

create or replace function public.admin_growth_series(p_days integer default 30)
returns table (
  day           date,
  logs          bigint,
  contributors  bigint,
  new_users     bigint,
  faults        bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_days  integer     := least(greatest(coalesce(p_days, 30), 1), 365);
  v_today date        := (timezone('Africa/Lagos', now()))::date;
  v_first date        := v_today - (v_days - 1);
  v_from  timestamptz := timezone('Africa/Lagos', v_first::timestamp);
begin
  if not public.is_moderator_or_admin() then
    raise exception 'Admin metrics are restricted to moderators and admins'
      using errcode = 'insufficient_privilege';
  end if;

  return query
  with calendar as (
    select generate_series(v_first::timestamp, v_today::timestamp, interval '1 day')::date as bucket
  ),
  log_days as (
    select
      (timezone('Africa/Lagos', pl.logged_at))::date as bucket,
      count(*)::bigint                               as n,
      count(distinct pl.user_id)::bigint             as contributors
    from public.power_logs pl
    where pl.logged_at >= v_from
    group by 1
  ),
  user_days as (
    select
      (timezone('Africa/Lagos', p.created_at))::date as bucket,
      count(*)::bigint                               as n
    from public.profiles p
    where p.created_at >= v_from
    group by 1
  ),
  fault_days as (
    select
      (timezone('Africa/Lagos', fr.reported_at))::date as bucket,
      count(*)::bigint                                 as n
    from public.fault_reports fr
    where fr.reported_at >= v_from
    group by 1
  )
  select
    c.bucket,
    coalesce(ld.n, 0),
    coalesce(ld.contributors, 0),
    coalesce(ud.n, 0),
    coalesce(fd.n, 0)
  from calendar c
  left join log_days   ld on ld.bucket = c.bucket
  left join user_days  ud on ud.bucket = c.bucket
  left join fault_days fd on fd.bucket = c.bucket
  order by c.bucket;
end;
$$;

comment on function public.admin_growth_series(integer) is
  'Per-day logs, distinct contributors, new users and new faults over the last p_days days, bucketed by Africa/Lagos calendar day, with zero rows for quiet days. Moderator/admin only.';


-- ============================================================================
-- 3. GRANTS
--
-- authenticated only: anon carries no session for the role check to read, and
-- neither aggregate belongs on a public page.
-- ============================================================================

revoke all on function public.admin_overview_stats(integer) from public;
revoke all on function public.admin_growth_series(integer) from public;

grant execute on function public.admin_overview_stats(integer) to authenticated;
grant execute on function public.admin_growth_series(integer) to authenticated;
