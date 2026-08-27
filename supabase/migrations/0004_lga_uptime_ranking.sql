-- ============================================================================
-- LGA uptime ranking — the aggregate behind the M4 comparison chart and the
-- national ranking.
--
-- The personal and area dashboards compute uptime in the browser from a
-- fetch of one area's (or one scope's) intervals. That does not scale to
-- "every LGA in the country, ranked" — that is 774 rows and cannot be 774
-- round trips. This function does the roll-up in Postgres in one call.
--
-- Numbering note: this is 0004 on disk but records remotely as 0005. The
-- remote history already carries its own 0003 (a follow-up to 0002 that was
-- folded back into the 0002 file here) and 0004 (the interval derivation job,
-- 0003 on disk). Filename order governs a replay from scratch; see the
-- migrations README.
--
-- What it computes, over the last p_days days:
--   * per area — logs in window (flagged excluded), and off-minutes summed
--     from outage_intervals clipped to the window, plus the count of
--     intervals touching the window;
--   * per area — uptime% = (window minutes − off minutes) / window minutes,
--     clamped to 0–100;
--   * per LGA — a log-count-weighted mean of its areas' uptime (one area per
--     LGA today, so usually just that area), summed outage and log counts, a
--     distinct contributor count recomputed at LGA level, and the number of
--     contributing areas.
-- Only LGAs with at least one log or interval in the window are returned.
--
-- Not SECURITY DEFINER: it reads only tables that are already publicly
-- selectable (power_logs, outage_intervals, areas, lgas, states), so it runs
-- fine under the caller's RLS and needs no elevation. search_path is pinned.
-- ============================================================================

create or replace function public.lga_uptime_ranking(p_days integer default 30)
returns table (
  lga_id            uuid,
  lga_name          text,
  lga_slug          text,
  state_id          uuid,
  state_name        text,
  state_slug        text,
  uptime_percent    numeric,
  off_minutes       numeric,
  outage_count      bigint,
  log_count         bigint,
  contributor_count bigint,
  area_count        bigint
)
language sql
stable
set search_path = ''
as $$
  with bounds as (
    select
      now() as ends_at,
      now() - make_interval(days => greatest(coalesce(p_days, 30), 1)) as starts_at
  ),
  win as (
    select extract(epoch from (ends_at - starts_at)) / 60.0 as minutes from bounds
  ),
  area_logs as (
    select pl.area_id, count(*) as log_count
    from public.power_logs pl, bounds b
    where not pl.is_flagged
      and pl.logged_at >= b.starts_at
      and pl.logged_at <  b.ends_at
    group by pl.area_id
  ),
  area_off as (
    select
      oi.area_id,
      count(*) as outage_count,
      coalesce(sum(
        greatest(0, extract(epoch from (
          least(coalesce(oi.ended_at, b.ends_at), b.ends_at)
          - greatest(oi.started_at, b.starts_at)
        )) / 60.0)
      ), 0) as off_minutes
    from public.outage_intervals oi, bounds b
    where oi.started_at < b.ends_at
      and (oi.ended_at is null or oi.ended_at > b.starts_at)
    group by oi.area_id
  ),
  area_stats as (
    select
      a.id     as area_id,
      a.lga_id as lga_id,
      coalesce(al.log_count, 0)    as log_count,
      coalesce(ao.off_minutes, 0)  as off_minutes,
      coalesce(ao.outage_count, 0) as outage_count
    from public.areas a
    left join area_logs al on al.area_id = a.id
    left join area_off  ao on ao.area_id = a.id
    where al.area_id is not null or ao.area_id is not null
  ),
  area_uptime as (
    select
      s.lga_id,
      s.log_count,
      s.off_minutes,
      s.outage_count,
      least(100, greatest(0, (w.minutes - s.off_minutes) / w.minutes * 100)) as uptime_percent,
      greatest(s.log_count, 1) as weight
    from area_stats s, win w
  ),
  lga_contributors as (
    select pl.lga_id, count(distinct pl.user_id) as contributor_count
    from public.power_logs pl, bounds b
    where not pl.is_flagged
      and pl.logged_at >= b.starts_at
      and pl.logged_at <  b.ends_at
    group by pl.lga_id
  )
  select
    l.id, l.name, l.slug,
    s.id, s.name, s.slug,
    round(sum(au.uptime_percent * au.weight) / nullif(sum(au.weight), 0), 1) as uptime_percent,
    round(avg(au.off_minutes), 1)             as off_minutes,
    sum(au.outage_count)::bigint              as outage_count,
    sum(au.log_count)::bigint                 as log_count,
    coalesce(lc.contributor_count, 0)::bigint as contributor_count,
    count(*)::bigint                          as area_count
  from area_uptime au
  join public.lgas   l on l.id = au.lga_id
  join public.states s on s.id = l.state_id
  left join lga_contributors lc on lc.lga_id = l.id
  group by l.id, l.name, l.slug, s.id, s.name, s.slug, lc.contributor_count
  order by uptime_percent desc nulls last, log_count desc;
$$;

comment on function public.lga_uptime_ranking(integer) is
  'Uptime % per LGA over the last p_days days, from outage_intervals and power_logs. Log-count-weighted mean of area uptime within each LGA; only LGAs with evidence in the window are returned. Backs the M4 comparison chart and national ranking.';

-- Public read: the ranking and the comparison chart show on pages that do not
-- require a login. The function only exposes already-public aggregates.
revoke all on function public.lga_uptime_ranking(integer) from public;
grant execute on function public.lga_uptime_ranking(integer) to anon, authenticated;
