-- ============================================================================
-- Fault triage — the M6 write paths and metrics for fault_reports.
--
-- 0001 said every status transition past 'reported' is moderator/admin work
-- and gave moderators an UPDATE policy on fault_reports. That policy is enough
-- to change a status but not enough to make it *accountable*: a client-side
-- update leaves no trail, can clear a resolution note by accident, and can set
-- resolved_at on a report that was never resolved. This migration turns those
-- updates into two deliberate operations, each of which writes its own audit
-- row in the same transaction.
--
-- Numbering note: 0009 on disk, expected to record remotely as 0010 — every
-- file since 0003 sits one slot ahead there. See the migrations README.
--
--   1. set_fault_status()      — move a report along its lifecycle.
--   2. merge_fault_reports()   — close a duplicate into the report it repeats,
--                                carrying its confirmations across.
--   3. admin_fault_metrics()   — time-to-resolution by DisCo and by state.
--
-- The triage *queue* needs nothing new: fault_reports already carries foreign
-- keys to lgas, states and discos, so the M5 feed's select embeds straight
-- through and the admin table reuses it.
-- ============================================================================


-- ============================================================================
-- 1. STATUS TRANSITIONS
--
-- resolved_at is set only by 'resolved', never by 'rejected'. A rejected
-- report is one that should not have been filed — a duplicate, or not a real
-- fault — and it was never fixed, so counting it in "time to resolution" would
-- flatter the numbers with reports nobody ever went out to. Moving a report
-- back to an open status clears resolved_at again, so the metric can never
-- read a resolution date for something currently open.
--
-- A null note leaves the existing resolution_note alone: re-opening a report
-- should not silently erase what the last moderator wrote about it.
-- ============================================================================

create or replace function public.set_fault_status(
  p_fault_id uuid,
  p_status   public.fault_status,
  p_note     text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_admin  uuid := (select auth.uid());
  v_before public.fault_reports;
begin
  if not public.is_moderator_or_admin() then
    raise exception 'Only a moderator or admin can triage a fault'
      using errcode = 'insufficient_privilege';
  end if;

  select * into v_before from public.fault_reports fr where fr.id = p_fault_id;
  if not found then
    raise exception 'No such fault report' using errcode = 'no_data_found';
  end if;

  update public.fault_reports fr
  set status          = p_status,
      resolution_note = coalesce(p_note, fr.resolution_note),
      resolved_at     = case
        when p_status = 'resolved' then coalesce(fr.resolved_at, now())
        else null
      end
  where fr.id = p_fault_id;

  if p_status is distinct from v_before.status or p_note is not null then
    insert into public.admin_audit_log (admin_id, action, target_type, target_id, notes)
    values (
      v_admin,
      'fault.status',
      'fault_report',
      p_fault_id,
      concat_ws(
        ' - ',
        v_before.status::text || ' -> ' || p_status::text,
        p_note
      )
    );
  end if;
end;
$fn$;

comment on function public.set_fault_status(uuid, public.fault_status, text) is
  'Moves a fault report to a new status, setting resolved_at only for resolved and clearing it when reopened, and writes an admin_audit_log row in the same transaction. A null note leaves the existing resolution note in place.';


-- ============================================================================
-- 2. MERGING DUPLICATES
--
-- Three people reporting the same blown transformer is the system working;
-- three reports of it is the queue not working. A merge closes the duplicate
-- as 'rejected' with a note naming the report it repeats, and carries its
-- confirmations onto that one — the count belongs to the fault, not to
-- whichever report happened to be filed first.
--
-- The confirmations move rather than copy, so nobody is counted twice and the
-- 0005 trigger recomputes confirm_count on both reports as they land. The
-- unique (fault_id, user_id) constraint takes care of a confirmer who had
-- already confirmed both.
--
-- Deliberately not reciprocal: the surviving report is not edited beyond the
-- confirmations it gains. Merging is a statement about the duplicate.
-- ============================================================================

create or replace function public.merge_fault_reports(
  p_duplicate_id uuid,
  p_primary_id   uuid,
  p_note         text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_admin uuid := (select auth.uid());
begin
  if not public.is_moderator_or_admin() then
    raise exception 'Only a moderator or admin can merge fault reports'
      using errcode = 'insufficient_privilege';
  end if;

  if p_duplicate_id = p_primary_id then
    raise exception 'A report cannot be a duplicate of itself'
      using errcode = 'check_violation';
  end if;

  if not exists (select 1 from public.fault_reports fr where fr.id = p_duplicate_id)
     or not exists (select 1 from public.fault_reports fr where fr.id = p_primary_id) then
    raise exception 'No such fault report' using errcode = 'no_data_found';
  end if;

  insert into public.fault_confirmations (fault_id, user_id)
  select p_primary_id, fc.user_id
  from public.fault_confirmations fc
  where fc.fault_id = p_duplicate_id
    and fc.user_id <> (select fr.user_id from public.fault_reports fr where fr.id = p_primary_id)
  on conflict (fault_id, user_id) do nothing;

  delete from public.fault_confirmations fc where fc.fault_id = p_duplicate_id;

  update public.fault_reports fr
  set status          = 'rejected',
      resolved_at     = null,
      resolution_note = concat_ws(
        ' ',
        'Duplicate of report ' || left(p_primary_id::text, 8) || '.',
        p_note
      )
  where fr.id = p_duplicate_id;

  insert into public.admin_audit_log (admin_id, action, target_type, target_id, notes)
  values (
    v_admin,
    'fault.merge',
    'fault_report',
    p_duplicate_id,
    concat_ws(' - ', 'merged into ' || p_primary_id::text, p_note)
  );
end;
$fn$;

comment on function public.merge_fault_reports(uuid, uuid, text) is
  'Closes p_duplicate_id as rejected with a note naming p_primary_id, moving its confirmations onto the surviving report (the 0005 trigger recomputes both counts). Writes an admin_audit_log row. Moderator/admin only.';


-- ============================================================================
-- 3. RESOLUTION METRICS
--
-- "How long does a fault take to fix, and does it depend who serves you" — the
-- one question the fault data can answer that a single report cannot. Grouped
-- two ways in one call, tagged by `dimension`, because the screen shows both
-- tables side by side and two round trips for one answer is silly.
--
-- Median as well as mean, and both only over reports actually resolved in the
-- window: one transformer that took three weeks drags a mean badly at this
-- volume, and the gap between the two numbers is itself worth seeing.
-- open_count is current, not windowed — an open fault is open today whenever
-- it was filed.
-- ============================================================================

create or replace function public.admin_fault_metrics(p_days integer default 90)
returns table (
  dimension      text,
  label          text,
  open_count     bigint,
  resolved_count bigint,
  median_hours   numeric,
  avg_hours      numeric
)
language plpgsql
stable
security definer
set search_path = ''
as $fn$
declare
  v_days  integer     := least(greatest(coalesce(p_days, 90), 1), 365);
  v_start timestamptz := now() - make_interval(days => v_days);
begin
  if not public.is_moderator_or_admin() then
    raise exception 'Fault metrics are restricted to moderators and admins'
      using errcode = 'insufficient_privilege';
  end if;

  return query
  with scoped as (
    select
      fr.id,
      fr.status,
      fr.disco_id,
      fr.state_id,
      case
        when fr.resolved_at is not null and fr.resolved_at >= v_start
        then extract(epoch from (fr.resolved_at - fr.reported_at)) / 3600.0
      end as resolution_hours
    from public.fault_reports fr
  ),
  by_disco as (
    select
      'disco'::text                          as dimension,
      coalesce(d.short_name, d.name)         as label,
      count(*) filter (
        where s.status in ('reported', 'confirmed', 'acknowledged', 'in_progress')
      )::bigint                              as open_count,
      count(s.resolution_hours)::bigint      as resolved_count,
      round((percentile_cont(0.5) within group (
        order by s.resolution_hours
      ))::numeric, 1)                        as median_hours,
      round(avg(s.resolution_hours)::numeric, 1) as avg_hours
    from scoped s
    join public.discos d on d.id = s.disco_id
    group by 1, 2
  ),
  by_state as (
    select
      'state'::text                     as dimension,
      st.name                           as label,
      count(*) filter (
        where s.status in ('reported', 'confirmed', 'acknowledged', 'in_progress')
      )::bigint                         as open_count,
      count(s.resolution_hours)::bigint as resolved_count,
      round((percentile_cont(0.5) within group (
        order by s.resolution_hours
      ))::numeric, 1)                   as median_hours,
      round(avg(s.resolution_hours)::numeric, 1) as avg_hours
    from scoped s
    join public.states st on st.id = s.state_id
    group by 1, 2
  ),
  combined as (
    select * from by_disco
    union all
    select * from by_state
  )
  select c.dimension, c.label, c.open_count, c.resolved_count, c.median_hours, c.avg_hours
  from combined c
  where c.open_count > 0 or c.resolved_count > 0
  order by c.dimension, c.open_count desc, c.resolved_count desc, c.label;
end;
$fn$;

comment on function public.admin_fault_metrics(integer) is
  'Fault load and time-to-resolution grouped by DisCo and by state in one call, tagged by dimension. Median and mean over reports resolved in the last p_days days; open_count is current. Moderator/admin only.';


-- ============================================================================
-- 4. EXECUTE PRIVILEGES
-- ============================================================================

revoke all on function public.set_fault_status(uuid, public.fault_status, text) from public;
revoke all on function public.merge_fault_reports(uuid, uuid, text) from public;
revoke all on function public.admin_fault_metrics(integer) from public;

grant execute on function public.set_fault_status(uuid, public.fault_status, text) to authenticated;
grant execute on function public.merge_fault_reports(uuid, uuid, text) to authenticated;
grant execute on function public.admin_fault_metrics(integer) to authenticated;
