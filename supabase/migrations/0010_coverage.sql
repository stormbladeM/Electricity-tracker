-- ============================================================================
-- Coverage — the M6 admin coverage dashboard's one read.
--
-- Numbering note: 0010 on disk, expected to record remotely as 0011 — every
-- file since 0003 sits one slot ahead there. See the migrations README.
--
-- lga_uptime_ranking (0004) answers "how reliable is each LGA that reports",
-- and deliberately returns only LGAs with evidence in the window. The coverage
-- screen asks the opposite question — *which LGAs are silent* — so it has to
-- start from all 774 and left join the activity onto them. An LGA missing from
-- the ranking is exactly the row this dashboard exists to show.
--
-- One call returns every LGA in the country; the screen folds them into states
-- and grades in the browser, reusing the same confidence thresholds the public
-- area dashboard shows contributors. A 774-row payload is smaller than a
-- second round trip, and grading in one place keeps the admin's idea of "well
-- covered" identical to the badge a contributor sees.
--
-- last_log_at is deliberately not windowed: "nobody has reported here in four
-- months" is the useful fact, and a window would render it as a null
-- indistinguishable from "nobody ever has".
-- ============================================================================

create or replace function public.admin_lga_coverage(p_days integer default 30)
returns table (
  lga_id            uuid,
  lga_name          text,
  lga_slug          text,
  state_id          uuid,
  state_name        text,
  log_count         bigint,
  contributor_count bigint,
  fault_count       bigint,
  last_log_at       timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $fn$
declare
  v_days  integer     := least(greatest(coalesce(p_days, 30), 1), 365);
  v_start timestamptz := now() - make_interval(days => v_days);
begin
  if not public.is_moderator_or_admin() then
    raise exception 'Coverage is restricted to moderators and admins'
      using errcode = 'insufficient_privilege';
  end if;

  return query
  with windowed as (
    -- Flagged logs are excluded here for the same reason every other
    -- aggregate excludes them: a suspect log is not coverage.
    select
      pl.lga_id,
      count(*)::bigint                   as log_count,
      count(distinct pl.user_id)::bigint as contributor_count
    from public.power_logs pl
    where pl.logged_at >= v_start
      and not pl.is_flagged
    group by pl.lga_id
  ),
  ever as (
    select pl.lga_id, max(pl.logged_at) as last_log_at
    from public.power_logs pl
    where not pl.is_flagged
    group by pl.lga_id
  ),
  faults as (
    select fr.lga_id, count(*)::bigint as fault_count
    from public.fault_reports fr
    where fr.reported_at >= v_start
    group by fr.lga_id
  )
  select
    l.id, l.name, l.slug,
    s.id, s.name,
    coalesce(w.log_count, 0),
    coalesce(w.contributor_count, 0),
    coalesce(f.fault_count, 0),
    e.last_log_at
  from public.lgas l
  join public.states s on s.id = l.state_id
  left join windowed w on w.lga_id = l.id
  left join ever     e on e.lga_id = l.id
  left join faults   f on f.lga_id = l.id
  order by s.name, l.name;
end;
$fn$;

comment on function public.admin_lga_coverage(integer) is
  'Every LGA in the country with its log, contributor and fault counts over the last p_days days, plus the last time anyone reported there (all time). Unlike lga_uptime_ranking, silent LGAs are returned — they are the point. Moderator/admin only.';

revoke all on function public.admin_lga_coverage(integer) from public;
grant execute on function public.admin_lga_coverage(integer) to authenticated;
