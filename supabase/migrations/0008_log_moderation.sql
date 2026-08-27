-- ============================================================================
-- Log moderation — the M6 moderation queue, end to end.
--
-- 0001 created power_logs.is_flagged/flag_reason and said moderation owns
-- them. Nothing has ever set them, so the queue would open empty. This
-- migration is the missing half: something that finds suspect logs, somewhere
-- to record that a human has looked, and the two write paths a moderator uses.
--
-- Numbering note: 0008 on disk, expected to record remotely as 0009 — every
-- file since 0003 sits one slot ahead there. See the migrations README.
--
-- The pieces:
--   1. power_logs.reviewed_at / reviewed_by — a decision, not a state. Without
--      it the detector and the moderator fight: a moderator clears a flag, the
--      job re-raises it fifteen minutes later, and moderating is pointless.
--   2. flag_suspect_power_logs() — the detector, on a schedule.
--   3. review_power_logs() — keep or reject, in one transaction with the audit
--      rows, so an action cannot land unrecorded.
--   4. set_user_moderation() — ban / unban / trust score / note, admin only.
--   5. admin_flagged_logs() / admin_contributors() — the two queue reads.
--
-- Why flagged logs matter beyond the queue: derive_outage_intervals (0003) and
-- lga_uptime_ranking (0004) both skip `is_flagged` rows, so a flag quietly
-- removes a log from every public figure. That is the point — and the reason
-- rejecting a log never needs to delete it. Evidence stays; influence goes.
-- ============================================================================


-- ============================================================================
-- 1. REVIEW COLUMNS
--
-- reviewed_at is set by review_power_logs and by nothing else. A log with
-- reviewed_at set is out of the queue for good, whichever way it was decided:
--   * kept    → is_flagged false, flag_reason null, counts in public figures
--   * rejected → is_flagged true, reason preserved, excluded from them
-- ============================================================================

alter table public.power_logs
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid references auth.users (id) on delete set null;

do $$ begin
  alter table public.power_logs
    add constraint power_logs_reviewer_requires_review
      check (reviewed_by is null or reviewed_at is not null);
exception when duplicate_object then null; end $$;

comment on column public.power_logs.reviewed_at is
  'When a moderator decided on this log. Non-null keeps it out of the queue permanently and stops the detector re-flagging it.';

-- The queue itself: flagged, undecided, newest first.
create index if not exists power_logs_review_queue_idx
  on public.power_logs (logged_at desc)
  where is_flagged and reviewed_at is null;


-- ============================================================================
-- 2. THE DETECTOR
--
-- Four rules, in priority order — a log takes the reason of the lowest-numbered
-- rule it trips, so "impossible" always beats "suspicious":
--
--   1 future        — logged_at more than 5 minutes ahead of now. A clock
--                     problem or a forged timestamp; either way not evidence.
--   2 rapid toggle  — the same user's consecutive logs in the same area less
--                     than 3 minutes apart. The app already blocks two 'off's
--                     in a row (CLAUDE.md decision 1 / the M2 log flow), so
--                     this is genuine on/off/on flapping, which no supply does.
--   3 burst         — more than 10 logs from one user in a single hour. Not
--                     impossible, but not a person watching their lights.
--   4 consensus     — a log that contradicts what everyone else nearby said:
--                     three or more other contributors logged the opposite
--                     status in the same area within half an hour, and nobody
--                     else agreed with it.
--
-- Rule 4 is the interesting one and the one to be careful with: an area can
-- genuinely be split (one street back, the next still dark), so it needs three
-- dissenters and zero supporters before it will speak, and it only ever flags
-- for review — it never deletes and never decides.
--
-- Scope: rules 2–4 look at the last 14 days only. Older logs have already been
-- through the queue or been left alone deliberately, and re-scanning all of
-- history every quarter hour buys nothing. Rule 1 is unbounded because a
-- future timestamp is wrong however old the row is.
--
-- Nothing here touches a reviewed log, and a log already carrying the same
-- reason is left alone so re-running is genuinely idempotent.
-- ============================================================================

create or replace function public.flag_suspect_power_logs()
returns integer
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_flagged integer;
  v_since   timestamptz := now() - interval '14 days';
begin
  with recent as (
    select
      pl.id, pl.user_id, pl.area_id, pl.status, pl.logged_at,
      lag(pl.logged_at) over w  as prev_at,
      lead(pl.logged_at) over w as next_at
    from public.power_logs pl
    where pl.logged_at >= v_since
      and pl.reviewed_at is null
    window w as (partition by pl.user_id, pl.area_id order by pl.logged_at)
  ),
  candidate as (
    select
      pl.id,
      1 as priority,
      'Timestamped in the future.' as reason
    from public.power_logs pl
    where pl.reviewed_at is null
      and pl.logged_at > now() + interval '5 minutes'

    union all

    select
      r.id,
      2,
      'Logged within 3 minutes of this contributor''s previous log here.'
    from recent r
    where (r.prev_at is not null and r.logged_at - r.prev_at < interval '3 minutes')
       or (r.next_at is not null and r.next_at - r.logged_at < interval '3 minutes')

    union all

    select
      r.id,
      3,
      'One of more than 10 logs from this contributor within an hour.'
    from recent r
    where (
      select count(*)
      from public.power_logs b
      where b.user_id = r.user_id
        and b.logged_at >= r.logged_at - interval '30 minutes'
        and b.logged_at <= r.logged_at + interval '30 minutes'
    ) > 10

    union all

    select
      r.id,
      4,
      'Contradicts three or more other contributors in this area at the time.'
    from recent r
    where (
      select count(distinct o.user_id)
      from public.power_logs o
      where o.area_id = r.area_id
        and o.user_id <> r.user_id
        and not o.is_flagged
        and o.status <> r.status
        and o.logged_at between r.logged_at - interval '30 minutes'
                            and r.logged_at + interval '30 minutes'
    ) >= 3
    and (
      select count(distinct o.user_id)
      from public.power_logs o
      where o.area_id = r.area_id
        and o.user_id <> r.user_id
        and not o.is_flagged
        and o.status = r.status
        and o.logged_at between r.logged_at - interval '30 minutes'
                            and r.logged_at + interval '30 minutes'
    ) = 0
  ),
  ranked as (
    select distinct on (c.id) c.id, c.reason
    from candidate c
    order by c.id, c.priority
  ),
  updated as (
    update public.power_logs pl
    set is_flagged  = true,
        flag_reason = r.reason
    from ranked r
    where pl.id = r.id
      and pl.reviewed_at is null
      and (not pl.is_flagged or pl.flag_reason is distinct from r.reason)
    returning 1
  )
  select count(*)::integer into v_flagged from updated;

  return v_flagged;
end;
$fn$;

comment on function public.flag_suspect_power_logs() is
  'Raises is_flagged/flag_reason on logs matching one of four heuristics (future timestamp, rapid toggling, hourly burst, area-consensus outlier). Skips reviewed logs so a moderator decision sticks. Idempotent; run by the flag-suspect-power-logs pg_cron job every 15 minutes.';


-- ============================================================================
-- 3. THE MODERATOR'S TWO ACTIONS ON A LOG
--
-- One function for both because keep and reject differ only in what they leave
-- behind: both mark the log reviewed, and both write the audit trail. Doing
-- the update and the audit rows in a single statement pair inside one function
-- is the whole point — an admin action that fails halfway cannot end up
-- applied but unrecorded.
--
-- One audit row per log, not one per batch: "cleared 14 logs" is not an audit
-- trail, it is a summary. Bulk actions are a UI convenience; the record stays
-- per-object.
-- ============================================================================

create or replace function public.review_power_logs(
  p_log_ids uuid[],
  p_keep    boolean,
  p_note    text default null
)
returns integer
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_admin uuid := (select auth.uid());
  v_count integer;
begin
  if not public.is_moderator_or_admin() then
    raise exception 'Only a moderator or admin can review logs'
      using errcode = 'insufficient_privilege';
  end if;

  if p_log_ids is null or array_length(p_log_ids, 1) is null then
    return 0;
  end if;

  with reviewed as (
    update public.power_logs pl
    set is_flagged  = not p_keep,
        flag_reason = case
          when p_keep then null
          else coalesce(pl.flag_reason, 'Rejected in review.')
        end,
        reviewed_at = now(),
        reviewed_by = v_admin
    where pl.id = any(p_log_ids)
    returning pl.id
  ),
  logged as (
    insert into public.admin_audit_log (admin_id, action, target_type, target_id, notes)
    select
      v_admin,
      case when p_keep then 'log.keep' else 'log.reject' end,
      'power_log',
      r.id,
      p_note
    from reviewed r
    returning 1
  )
  select count(*)::integer into v_count from logged;

  return v_count;
end;
$fn$;

comment on function public.review_power_logs(uuid[], boolean, text) is
  'Moderator decision on flagged logs: p_keep true clears the flag and counts the log again, false leaves it flagged and out of every public figure. Marks them reviewed so the detector cannot re-raise them, and writes one admin_audit_log row per log in the same transaction.';


-- ============================================================================
-- 4. ACCOUNT ACTIONS
--
-- Admin only, deliberately. 0001's profiles_guard_privileged_columns trigger
-- already refuses role/is_banned/trust_score edits from anyone but an admin,
-- and a SECURITY DEFINER function does not get to route around a trigger — so
-- letting moderators call this would only produce a confusing failure. The
-- split it encodes is a sound one anyway: moderators moderate content, admins
-- act on accounts.
--
-- Null means "leave alone" for both fields, so one call can ban without
-- touching trust, or adjust trust without touching the ban.
--
-- p_note with no field change is a legitimate call: it records a note about an
-- account in the audit trail. It is *not* a warning — nothing in the product
-- can deliver a message to an anonymous account, and an action named "warn"
-- that nobody receives would be a lie in the trail.
-- ============================================================================

create or replace function public.set_user_moderation(
  p_user_id     uuid,
  p_is_banned   boolean default null,
  p_trust_score integer default null,
  p_note        text    default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_admin uuid := (select auth.uid());
  v_before public.profiles;
begin
  if not public.is_admin() then
    raise exception 'Only an admin can act on an account'
      using errcode = 'insufficient_privilege';
  end if;

  if p_user_id = v_admin then
    raise exception 'An admin cannot moderate their own account'
      using errcode = 'check_violation';
  end if;

  select * into v_before from public.profiles p where p.id = p_user_id;
  if not found then
    raise exception 'No such account' using errcode = 'no_data_found';
  end if;

  if p_trust_score is not null and (p_trust_score < 0 or p_trust_score > 100) then
    raise exception 'Trust score must be between 0 and 100' using errcode = 'check_violation';
  end if;

  update public.profiles p
  set is_banned   = coalesce(p_is_banned, p.is_banned),
      trust_score = coalesce(p_trust_score, p.trust_score)
  where p.id = p_user_id;

  if p_is_banned is not null and p_is_banned is distinct from v_before.is_banned then
    insert into public.admin_audit_log (admin_id, action, target_type, target_id, notes)
    values (
      v_admin,
      case when p_is_banned then 'user.ban' else 'user.unban' end,
      'profile', p_user_id, p_note
    );
  end if;

  if p_trust_score is not null and p_trust_score is distinct from v_before.trust_score then
    insert into public.admin_audit_log (admin_id, action, target_type, target_id, notes)
    values (
      v_admin,
      'user.trust_score',
      'profile',
      p_user_id,
      concat_ws(' ', v_before.trust_score || ' -> ' || p_trust_score, p_note)
    );
  end if;

  -- A note on its own is still an action worth recording.
  if p_note is not null
     and (p_is_banned is null or p_is_banned is not distinct from v_before.is_banned)
     and (p_trust_score is null or p_trust_score is not distinct from v_before.trust_score) then
    insert into public.admin_audit_log (admin_id, action, target_type, target_id, notes)
    values (v_admin, 'user.note', 'profile', p_user_id, p_note);
  end if;
end;
$fn$;

comment on function public.set_user_moderation(uuid, boolean, integer, text) is
  'Admin-only account action: ban/unban, set trust score, or record a note, writing an admin_audit_log row per change. Null fields are left alone; an admin cannot act on their own account.';


-- ============================================================================
-- 5. THE TWO QUEUE READS
--
-- Both are functions rather than PostgREST selects for the same reason: they
-- join power_logs to profiles, and power_logs.user_id references auth.users,
-- not profiles — so there is no foreign key for PostgREST to embed through.
-- The alternative is one query for logs and a second for the contributors
-- behind them, stitched in the browser, which is two round trips and a join
-- written in TypeScript.
-- ============================================================================

create or replace function public.admin_flagged_logs(p_limit integer default 200)
returns table (
  id                 uuid,
  user_id            uuid,
  logged_at          timestamptz,
  status             public.power_status,
  power_source       public.power_source,
  flag_reason        text,
  lga_name           text,
  state_name         text,
  display_name       text,
  trust_score        integer,
  is_banned          boolean,
  user_log_count     bigint,
  user_flagged_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $fn$
declare
  v_limit integer := least(greatest(coalesce(p_limit, 200), 1), 500);
begin
  if not public.is_moderator_or_admin() then
    raise exception 'The moderation queue is restricted to moderators and admins'
      using errcode = 'insufficient_privilege';
  end if;

  return query
  with queue as (
    select pl.*
    from public.power_logs pl
    where pl.is_flagged and pl.reviewed_at is null
    order by pl.logged_at desc
    limit v_limit
  ),
  tallies as (
    select
      pl.user_id,
      count(*)::bigint                              as log_count,
      count(*) filter (where pl.is_flagged)::bigint as flagged_count
    from public.power_logs pl
    where pl.user_id in (select q.user_id from queue q)
    group by pl.user_id
  )
  select
    q.id, q.user_id, q.logged_at, q.status, q.power_source, q.flag_reason,
    l.name, s.name,
    p.display_name, p.trust_score, p.is_banned,
    coalesce(t.log_count, 0), coalesce(t.flagged_count, 0)
  from queue q
  join public.lgas   l on l.id = q.lga_id
  join public.states s on s.id = q.state_id
  left join public.profiles p on p.id = q.user_id
  left join tallies t on t.user_id = q.user_id
  order by q.logged_at desc;
end;
$fn$;

comment on function public.admin_flagged_logs(integer) is
  'The moderation queue: flagged, unreviewed logs newest first, with their place names and the contributor behind them (trust score, ban state, and how much of their history is flagged). Moderator/admin only.';


-- Contributors, worst first. "Worst" is unreviewed flags, then flags overall,
-- then volume — the order a moderator would sort by hand.
create or replace function public.admin_contributors(
  p_limit         integer default 50,
  p_flagged_only  boolean default false
)
returns table (
  user_id            uuid,
  display_name       text,
  role               public.user_role,
  is_banned          boolean,
  trust_score        integer,
  lga_name           text,
  state_name         text,
  log_count          bigint,
  flagged_count      bigint,
  pending_flag_count bigint,
  fault_count        bigint,
  first_logged_at    timestamptz,
  last_logged_at     timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $fn$
declare
  v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 500);
begin
  if not public.is_moderator_or_admin() then
    raise exception 'Contributor management is restricted to moderators and admins'
      using errcode = 'insufficient_privilege';
  end if;

  return query
  with log_tallies as (
    select
      pl.user_id,
      count(*)::bigint                              as log_count,
      count(*) filter (where pl.is_flagged)::bigint as flagged_count,
      count(*) filter (
        where pl.is_flagged and pl.reviewed_at is null
      )::bigint                                     as pending_count,
      min(pl.logged_at)                             as first_at,
      max(pl.logged_at)                             as last_at
    from public.power_logs pl
    group by pl.user_id
  ),
  fault_tallies as (
    select fr.user_id, count(*)::bigint as fault_count
    from public.fault_reports fr
    group by fr.user_id
  )
  select
    p.id, p.display_name, p.role, p.is_banned, p.trust_score,
    l.name, s.name,
    coalesce(t.log_count, 0),
    coalesce(t.flagged_count, 0),
    coalesce(t.pending_count, 0),
    coalesce(f.fault_count, 0),
    t.first_at,
    t.last_at
  from public.profiles p
  left join log_tallies   t on t.user_id = p.id
  left join fault_tallies f on f.user_id = p.id
  left join public.lgas   l on l.id = p.lga_id
  left join public.states s on s.id = p.state_id
  where (t.user_id is not null or f.user_id is not null or p.is_banned or p.role <> 'user')
    and (not coalesce(p_flagged_only, false) or coalesce(t.flagged_count, 0) > 0)
  order by
    coalesce(t.pending_count, 0) desc,
    coalesce(t.flagged_count, 0) desc,
    coalesce(t.log_count, 0) desc
  limit v_limit;
end;
$fn$;

comment on function public.admin_contributors(integer, boolean) is
  'Accounts with a footprint (logs, faults, a ban, or a staff role) with their log/flag tallies, place and trust score, worst first. Moderator/admin only.';


-- ============================================================================
-- 6. EXECUTE PRIVILEGES
--
-- The detector writes a column clients cannot write and must never be callable
-- over /rpc/ — same treatment as derive_outage_intervals in 0003, and for the
-- same reason: Supabase grants EXECUTE on new public functions to anon and
-- authenticated by name, so both revokes are needed.
-- ============================================================================

revoke all on function public.flag_suspect_power_logs() from public;
revoke all on function public.flag_suspect_power_logs() from anon, authenticated;
grant execute on function public.flag_suspect_power_logs() to service_role;

revoke all on function public.review_power_logs(uuid[], boolean, text) from public;
revoke all on function public.set_user_moderation(uuid, boolean, integer, text) from public;
revoke all on function public.admin_flagged_logs(integer) from public;
revoke all on function public.admin_contributors(integer, boolean) from public;

grant execute on function public.review_power_logs(uuid[], boolean, text) to authenticated;
grant execute on function public.set_user_moderation(uuid, boolean, integer, text) to authenticated;
grant execute on function public.admin_flagged_logs(integer) to authenticated;
grant execute on function public.admin_contributors(integer, boolean) to authenticated;


-- ============================================================================
-- 7. SCHEDULE
--
-- Every 15 minutes. The detector only ever adds work to a human queue, so it
-- has no reason to run as often as the interval derivation (5 minutes) — but
-- a flag also withdraws a log from the public figures, so it should not lag
-- by an hour either.
-- ============================================================================

create extension if not exists pg_cron;

do $sched$
begin
  if exists (select 1 from cron.job where jobname = 'flag-suspect-power-logs') then
    perform cron.unschedule('flag-suspect-power-logs');
  end if;

  perform cron.schedule(
    'flag-suspect-power-logs',
    '*/15 * * * *',
    $job$select public.flag_suspect_power_logs();$job$
  );
end;
$sched$;
