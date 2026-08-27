-- ============================================================================
-- The audit feed — the read behind the M6 audit log screen.
--
-- Numbering note: 0012 on disk, expected to record remotely as 0013 — every
-- file since 0003 sits one slot ahead there. See the migrations README.
--
-- admin_audit_log is already selectable by moderators (0001) and every admin
-- write since 0008 has been putting rows in it. This adds the one thing a
-- plain select cannot: who each row's admin_id belongs to. admin_id
-- references auth.users, not profiles, so PostgREST has no foreign key to
-- embed a name through — the same reason the moderation queue is a function.
--
-- Ordering is `created_at desc, id desc`. Several rows from one action share a
-- timestamp to the microsecond (a bulk review writes one row per log inside a
-- single transaction), and without the tiebreak their order would wander
-- between page loads.
--
-- Filtering is by action *prefix* — 'log.', 'user.', 'fault.', 'location.' —
-- because the action names are already namespaced that way, and a moderator
-- looking for what happened to a fault does not want to pick between
-- fault.status and fault.merge first.
-- ============================================================================

create or replace function public.admin_audit_feed(
  p_limit         integer default 100,
  p_days          integer default 30,
  p_action_prefix text    default null
)
returns table (
  id          uuid,
  created_at  timestamptz,
  admin_id    uuid,
  admin_name  text,
  admin_role  public.user_role,
  action      text,
  target_type text,
  target_id   uuid,
  notes       text
)
language plpgsql
stable
security definer
set search_path = ''
as $fn$
declare
  v_limit  integer     := least(greatest(coalesce(p_limit, 100), 1), 500);
  v_days   integer     := least(greatest(coalesce(p_days, 30), 1), 3650);
  v_start  timestamptz := now() - make_interval(days => v_days);
  v_prefix text        := nullif(btrim(coalesce(p_action_prefix, '')), '');
begin
  if not public.is_moderator_or_admin() then
    raise exception 'The audit log is restricted to moderators and admins'
      using errcode = 'insufficient_privilege';
  end if;

  return query
  select
    al.id,
    al.created_at,
    al.admin_id,
    p.display_name,
    p.role,
    al.action,
    al.target_type,
    al.target_id,
    al.notes
  from public.admin_audit_log al
  left join public.profiles p on p.id = al.admin_id
  where al.created_at >= v_start
    and (v_prefix is null or al.action like v_prefix || '%')
  order by al.created_at desc, al.id desc
  limit v_limit;
end;
$fn$;

comment on function public.admin_audit_feed(integer, integer, text) is
  'The admin audit trail, newest first, with the acting account resolved to a display name and role. Optional action-prefix filter (log./user./fault./location.). Moderator/admin only.';

revoke all on function public.admin_audit_feed(integer, integer, text) from public;
grant execute on function public.admin_audit_feed(integer, integer, text) to authenticated;
