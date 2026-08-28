-- ============================================================================
-- Uptime shift — the aggregate behind M7's anomaly alerts.
--
-- Numbering note: 0014 on disk, expected to record remotely as 0015 — every
-- file since 0003 sits one slot ahead there. See the migrations README.
--
-- lga_uptime_ranking (0004) answers "how reliable is each LGA right now".
-- That is a level, and a level cannot raise an alert: 41% uptime is terrible
-- in Ikeja and unremarkable in Maiduguri. An anomaly is a *change* — an area
-- doing materially worse than it has been doing itself — so this returns each
-- LGA's uptime over a recent window beside its own uptime over the baseline
-- window immediately before it, and the difference between them.
--
-- Two windows, back to back and non-overlapping:
--   baseline — the p_baseline_days days ending where the recent window opens
--   recent   — the last p_recent_days days
-- Overlapping them would fold the drop being measured back into the number it
-- is measured against, which flattens exactly the events worth catching.
--
-- The join to the baseline is an INNER join on purpose. An LGA with no
-- baseline evidence is not an anomaly, it is a new reporter — the coverage
-- dashboard's subject, not this one's.
--
-- On the denominator, and why it differs from lga_uptime_ranking's. That
-- function divides off-minutes by the whole window, which treats time before
-- an area ever reported as time the power was on. For a level that is a mild,
-- uniform optimism. For a *difference* it is not: an LGA that started
-- reporting three weeks ago has a baseline window that is one third silence,
-- silence reads as 100% uptime, and the area appears to collapse the moment
-- its coverage becomes complete. That is a reporting artefact wearing the
-- costume of an outage, and it would be the most common alert this function
-- ever raised.
--
-- So each area's window is clipped to the span it could actually speak to:
-- from its first ever log (before which nothing is known) to the window's end.
-- An area contributes nothing to a window it predates entirely. This matches
-- what the ribbon draws — status carries forward from the last log, and
-- hatches before the first — and it is why the two functions are allowed to
-- disagree by a point or two on the same LGA.
--
-- Deciding which differences *matter* deliberately does not happen here. A
-- 20-point drop on four logs is noise and a 9-point drop on four hundred is
-- real, and that judgement is shared between the contributor's banner and the
-- admin's panel, so it lives in one TypeScript module
-- (src/components/forecast/anomaly.ts) rather than being hard-coded into a
-- threshold parameter here. This function reports; the caller classifies.
--
-- Not SECURITY DEFINER, same as lga_uptime_ranking: it reads only publicly
-- selectable tables, so it runs under the caller's RLS. search_path is pinned.
-- ============================================================================

create or replace function public.lga_uptime_shift(
  p_recent_days   integer default 7,
  p_baseline_days integer default 28
)
returns table (
  lga_id                    uuid,
  lga_name                  text,
  lga_slug                  text,
  state_id                  uuid,
  state_name                text,
  state_slug                text,
  recent_uptime_percent     numeric,
  baseline_uptime_percent   numeric,
  delta_percent             numeric,
  recent_log_count          bigint,
  baseline_log_count        bigint,
  recent_contributor_count  bigint,
  baseline_contributor_count bigint,
  recent_outage_count       bigint
)
language sql
stable
set search_path = ''
as $$
  with bounds as (
    select
      now() as ends_at,
      now() - make_interval(days => greatest(coalesce(p_recent_days, 7), 1))
        as recent_starts_at,
      now() - make_interval(
        days => greatest(coalesce(p_recent_days, 7), 1)
              + greatest(coalesce(p_baseline_days, 28), 1)
      ) as baseline_starts_at
  ),
  -- Both windows as rows, so every aggregate below is written once and
  -- grouped by span rather than duplicated per window.
  spans as (
    select 'recent'::text as span, recent_starts_at as starts_at, ends_at from bounds
    union all
    select 'baseline'::text, baseline_starts_at, recent_starts_at from bounds
  ),
  area_logs as (
    select sp.span, pl.area_id, count(*) as log_count
    from spans sp
    join public.power_logs pl
      on pl.logged_at >= sp.starts_at
     and pl.logged_at <  sp.ends_at
    where not pl.is_flagged
    group by sp.span, pl.area_id
  ),
  -- When each area first became knowable. Everything before this is silence,
  -- not supply, and must stay out of the denominator.
  area_first as (
    select pl.area_id, min(pl.logged_at) as first_log_at
    from public.power_logs pl
    where not pl.is_flagged
    group by pl.area_id
  ),
  area_off as (
    select
      sp.span,
      oi.area_id,
      count(*) as outage_count,
      coalesce(sum(
        greatest(0, extract(epoch from (
          least(coalesce(oi.ended_at, sp.ends_at), sp.ends_at)
          - greatest(oi.started_at, sp.starts_at)
        )) / 60.0)
      ), 0) as off_minutes
    from spans sp
    join public.outage_intervals oi
      on oi.started_at < sp.ends_at
     and (oi.ended_at is null or oi.ended_at > sp.starts_at)
    group by sp.span, oi.area_id
  ),
  area_stats as (
    select
      sp.span,
      a.lga_id,
      coalesce(al.log_count, 0)    as log_count,
      coalesce(ao.off_minutes, 0)  as off_minutes,
      coalesce(ao.outage_count, 0) as outage_count,
      greatest(0, extract(epoch from (
        sp.ends_at - greatest(sp.starts_at, af.first_log_at)
      )) / 60.0) as covered_minutes
    from spans sp
    cross join public.areas a
    join area_first af on af.area_id = a.id
    left join area_logs al on al.span = sp.span and al.area_id = a.id
    left join area_off  ao on ao.span = sp.span and ao.area_id = a.id
    where al.area_id is not null or ao.area_id is not null
  ),
  -- The same log-count-weighted mean of area uptime lga_uptime_ranking takes,
  -- over each area's covered span rather than the whole window.
  area_uptime as (
    select
      st.span,
      st.lga_id,
      st.log_count,
      st.outage_count,
      least(100, greatest(0,
        (st.covered_minutes - st.off_minutes) / st.covered_minutes * 100
      )) as uptime_percent,
      greatest(st.log_count, 1) as weight
    from area_stats st
    where st.covered_minutes > 0
  ),
  lga_span as (
    select
      span,
      lga_id,
      round(sum(uptime_percent * weight) / nullif(sum(weight), 0), 1) as uptime_percent,
      sum(log_count)::bigint    as log_count,
      sum(outage_count)::bigint as outage_count
    from area_uptime
    group by span, lga_id
  ),
  lga_contributors as (
    select sp.span, pl.lga_id, count(distinct pl.user_id) as contributor_count
    from spans sp
    join public.power_logs pl
      on pl.logged_at >= sp.starts_at
     and pl.logged_at <  sp.ends_at
    where not pl.is_flagged
    group by sp.span, pl.lga_id
  )
  select
    l.id, l.name, l.slug,
    s.id, s.name, s.slug,
    r.uptime_percent,
    b.uptime_percent,
    round(r.uptime_percent - b.uptime_percent, 1),
    r.log_count,
    b.log_count,
    coalesce(rc.contributor_count, 0)::bigint,
    coalesce(bc.contributor_count, 0)::bigint,
    r.outage_count
  from lga_span r
  join lga_span b on b.lga_id = r.lga_id and b.span = 'baseline'
  join public.lgas   l on l.id = r.lga_id
  join public.states s on s.id = l.state_id
  left join lga_contributors rc on rc.span = 'recent'   and rc.lga_id = l.id
  left join lga_contributors bc on bc.span = 'baseline' and bc.lga_id = l.id
  where r.span = 'recent'
  order by (r.uptime_percent - b.uptime_percent) asc nulls last, r.log_count desc;
$$;

comment on function public.lga_uptime_shift(integer, integer) is
  'Each LGA''s uptime over the last p_recent_days days beside its own uptime over the p_baseline_days days before that, and the difference. Backs the M7 anomaly alerts. LGAs without baseline evidence are excluded — a new reporter is not an anomaly. Significance is classified by the caller, not here.';

-- Public read, like lga_uptime_ranking: the contributor-facing banner shows on
-- pages that need no login, and the function exposes only aggregates that are
-- already publicly selectable.
revoke all on function public.lga_uptime_shift(integer, integer) from public;
grant execute on function public.lga_uptime_shift(integer, integer) to anon, authenticated;
