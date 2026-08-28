-- ============================================================================
-- Location management — the M6 admin write paths for the reference tables.
--
-- Numbering note: 0011 on disk, expected to record remotely as 0012 — every
-- file since 0003 sits one slot ahead there. See the migrations README.
--
-- 0001 already gives admins full insert/update/delete on states, lgas, discos
-- and areas through RLS, so a client could edit them directly. These functions
-- exist for the same reason the moderation ones do: an admin action that
-- leaves no audit row is not an admin action, it is a mystery in three months'
-- time. Each one applies the change and writes its own trail entry in the same
-- transaction.
--
-- They are admin-only, not moderator-accessible. Every power log and fault
-- report carries denormalized lga_id and state_id, so the geographic tables
-- are load-bearing for every aggregate in the product — a renamed LGA is
-- cosmetic, but a merged or deleted area moves real rows.
--
--   1. admin_save_state / _lga / _disco / _area — create or update one row.
--   2. admin_merge_areas — fold a duplicate area into another, carrying its
--      logs, faults and residents across.
--
-- Blank text is normalized to null throughout, so an empty slug field in the
-- form clears the slug rather than storing '' and quietly breaking the partial
-- unique indexes that treat null as "no slug".
-- ============================================================================


-- ============================================================================
-- 1. SAVE HELPERS
--
-- One function per table rather than one generic one: a generic writer would
-- need dynamic SQL and a table name from the client, which is a lever nobody
-- should be handed on the tables every aggregate joins through.
-- ============================================================================

create or replace function public.admin_save_state(
  p_state_id uuid default null,
  p_name     text default null,
  p_code     text default null,
  p_slug     text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_admin uuid := (select auth.uid());
  v_name  text := nullif(btrim(coalesce(p_name, '')), '');
  v_code  text := nullif(btrim(coalesce(p_code, '')), '');
  v_slug  text := nullif(btrim(coalesce(p_slug, '')), '');
  v_id    uuid;
  v_before public.states;
begin
  if not public.is_admin() then
    raise exception 'Only an admin can edit locations' using errcode = 'insufficient_privilege';
  end if;

  if p_state_id is null then
    if v_name is null or v_code is null then
      raise exception 'A new state needs a name and a code' using errcode = 'check_violation';
    end if;

    insert into public.states (name, code, slug)
    values (v_name, v_code, v_slug)
    returning id into v_id;

    insert into public.admin_audit_log (admin_id, action, target_type, target_id, notes)
    values (v_admin, 'location.state.create', 'state', v_id, v_name);
    return v_id;
  end if;

  select * into v_before from public.states s where s.id = p_state_id;
  if not found then
    raise exception 'No such state' using errcode = 'no_data_found';
  end if;

  update public.states s
  set name = coalesce(v_name, s.name),
      code = coalesce(v_code, s.code),
      slug = case when p_slug is null then s.slug else v_slug end
  where s.id = p_state_id;

  insert into public.admin_audit_log (admin_id, action, target_type, target_id, notes)
  values (
    v_admin, 'location.state.update', 'state', p_state_id,
    concat_ws(' ', v_before.name, '->', coalesce(v_name, v_before.name))
  );

  return p_state_id;
end;
$fn$;

create or replace function public.admin_save_lga(
  p_lga_id   uuid default null,
  p_state_id uuid default null,
  p_name     text default null,
  p_slug     text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_admin uuid := (select auth.uid());
  v_name  text := nullif(btrim(coalesce(p_name, '')), '');
  v_slug  text := nullif(btrim(coalesce(p_slug, '')), '');
  v_id    uuid;
  v_before public.lgas;
begin
  if not public.is_admin() then
    raise exception 'Only an admin can edit locations' using errcode = 'insufficient_privilege';
  end if;

  if p_lga_id is null then
    if v_name is null or p_state_id is null then
      raise exception 'A new LGA needs a name and a state' using errcode = 'check_violation';
    end if;

    insert into public.lgas (state_id, name, slug)
    values (p_state_id, v_name, v_slug)
    returning id into v_id;

    -- Every LGA needs its default area: it is where logs land when a
    -- contributor only picks down to LGA level (see the comment on
    -- public.areas in 0001). Creating an LGA without one would produce a
    -- place the app cannot write to.
    insert into public.areas (lga_id, name)
    values (v_id, null)
    on conflict do nothing;

    insert into public.admin_audit_log (admin_id, action, target_type, target_id, notes)
    values (v_admin, 'location.lga.create', 'lga', v_id, v_name);
    return v_id;
  end if;

  select * into v_before from public.lgas l where l.id = p_lga_id;
  if not found then
    raise exception 'No such LGA' using errcode = 'no_data_found';
  end if;

  update public.lgas l
  set name = coalesce(v_name, l.name),
      slug = case when p_slug is null then l.slug else v_slug end
  where l.id = p_lga_id;

  insert into public.admin_audit_log (admin_id, action, target_type, target_id, notes)
  values (
    v_admin, 'location.lga.update', 'lga', p_lga_id,
    concat_ws(' ', v_before.name, '->', coalesce(v_name, v_before.name))
  );

  return p_lga_id;
end;
$fn$;

create or replace function public.admin_save_disco(
  p_disco_id   uuid default null,
  p_name       text default null,
  p_short_name text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_admin uuid := (select auth.uid());
  v_name  text := nullif(btrim(coalesce(p_name, '')), '');
  v_short text := nullif(btrim(coalesce(p_short_name, '')), '');
  v_id    uuid;
  v_before public.discos;
begin
  if not public.is_admin() then
    raise exception 'Only an admin can edit locations' using errcode = 'insufficient_privilege';
  end if;

  if p_disco_id is null then
    if v_name is null then
      raise exception 'A new DisCo needs a name' using errcode = 'check_violation';
    end if;

    insert into public.discos (name, short_name)
    values (v_name, v_short)
    returning id into v_id;

    insert into public.admin_audit_log (admin_id, action, target_type, target_id, notes)
    values (v_admin, 'location.disco.create', 'disco', v_id, v_name);
    return v_id;
  end if;

  select * into v_before from public.discos d where d.id = p_disco_id;
  if not found then
    raise exception 'No such DisCo' using errcode = 'no_data_found';
  end if;

  update public.discos d
  set name       = coalesce(v_name, d.name),
      short_name = case when p_short_name is null then d.short_name else v_short end
  where d.id = p_disco_id;

  insert into public.admin_audit_log (admin_id, action, target_type, target_id, notes)
  values (
    v_admin, 'location.disco.update', 'disco', p_disco_id,
    concat_ws(' ', v_before.name, '->', coalesce(v_name, v_before.name))
  );

  return p_disco_id;
end;
$fn$;

-- Areas are the only reference rows that carry a DisCo, and reassigning one is
-- the most likely real edit here: seed 004 mapped every Lagos LGA to Ikeja
-- Electric as a documented simplification, and EKEDC actually serves half of
-- them. This is how that gets fixed, one area at a time, with a trail.
create or replace function public.admin_save_area(
  p_area_id  uuid default null,
  p_lga_id   uuid default null,
  p_name     text default null,
  p_slug     text default null,
  p_disco_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_admin uuid := (select auth.uid());
  v_name  text := nullif(btrim(coalesce(p_name, '')), '');
  v_slug  text := nullif(btrim(coalesce(p_slug, '')), '');
  v_id    uuid;
  v_before public.areas;
begin
  if not public.is_admin() then
    raise exception 'Only an admin can edit locations' using errcode = 'insufficient_privilege';
  end if;

  if p_area_id is null then
    -- A null name marks the LGA's default area, and every LGA has exactly one
    -- already (0001's areas_lga_default_key). A new area is always a named
    -- community or estate.
    if v_name is null or p_lga_id is null then
      raise exception 'A new area needs a name and an LGA' using errcode = 'check_violation';
    end if;

    insert into public.areas (lga_id, name, slug, disco_id)
    values (p_lga_id, v_name, v_slug, p_disco_id)
    returning id into v_id;

    insert into public.admin_audit_log (admin_id, action, target_type, target_id, notes)
    values (v_admin, 'location.area.create', 'area', v_id, v_name);
    return v_id;
  end if;

  select * into v_before from public.areas a where a.id = p_area_id;
  if not found then
    raise exception 'No such area' using errcode = 'no_data_found';
  end if;

  -- The default area keeps its null name: renaming it would take the LGA's
  -- write target away and orphan the location picker.
  update public.areas a
  set name     = case
        when a.name is null then null
        else coalesce(v_name, a.name)
      end,
      slug     = case when p_slug is null then a.slug else v_slug end,
      disco_id = coalesce(p_disco_id, a.disco_id)
  where a.id = p_area_id;

  insert into public.admin_audit_log (admin_id, action, target_type, target_id, notes)
  values (
    v_admin, 'location.area.update', 'area', p_area_id,
    concat_ws(
      ' ',
      coalesce(v_before.name, 'default area'),
      case when p_disco_id is distinct from v_before.disco_id then '(DisCo reassigned)' end
    )
  );

  return p_area_id;
end;
$fn$;


-- ============================================================================
-- 2. MERGING AREAS
--
-- The one destructive operation in the panel, and the only place an admin
-- action moves user rows rather than reference rows. Everything pointing at
-- the duplicate is repointed — logs, fault reports, and the profiles of people
-- who had chosen it — and only then is it deleted.
--
-- Two guards that matter:
--   * both areas must be in the same LGA. Merging across LGAs would silently
--     rewrite the lga_id/state_id every aggregate reads, which is not a merge,
--     it is a relocation.
--   * the LGA's default area (name is null) can never be the source. It is
--     where LGA-level logs land; deleting it would break the write path for
--     everyone who never picked a community.
--
-- outage_intervals for the source are deleted rather than moved: they are
-- derived, and the (area_id, started_at) unique constraint means two areas'
-- intervals cannot simply be unioned. derive_outage_intervals() is called at
-- the end so the target's intervals are rebuilt from the combined logs
-- immediately, instead of the dashboards showing a hole until the next
-- five-minute run.
-- ============================================================================

create or replace function public.admin_merge_areas(
  p_source_id uuid,
  p_target_id uuid,
  p_note      text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_admin  uuid := (select auth.uid());
  v_source public.areas;
  v_target public.areas;
  v_logs   integer;
begin
  if not public.is_admin() then
    raise exception 'Only an admin can merge areas' using errcode = 'insufficient_privilege';
  end if;

  if p_source_id = p_target_id then
    raise exception 'An area cannot be merged into itself' using errcode = 'check_violation';
  end if;

  select * into v_source from public.areas a where a.id = p_source_id;
  if not found then
    raise exception 'No such area' using errcode = 'no_data_found';
  end if;

  select * into v_target from public.areas a where a.id = p_target_id;
  if not found then
    raise exception 'No such area' using errcode = 'no_data_found';
  end if;

  if v_source.lga_id is distinct from v_target.lga_id then
    raise exception 'Areas can only be merged within the same LGA'
      using errcode = 'check_violation';
  end if;

  if v_source.name is null then
    raise exception 'The LGA default area cannot be merged away'
      using errcode = 'check_violation';
  end if;

  update public.power_logs pl set area_id = p_target_id where pl.area_id = p_source_id;
  get diagnostics v_logs = row_count;

  update public.fault_reports fr set area_id = p_target_id where fr.area_id = p_source_id;
  update public.profiles p     set area_id = p_target_id where p.area_id = p_source_id;

  delete from public.outage_intervals oi where oi.area_id = p_source_id;
  delete from public.areas a where a.id = p_source_id;

  insert into public.admin_audit_log (admin_id, action, target_type, target_id, notes)
  values (
    v_admin,
    'location.area.merge',
    'area',
    p_target_id,
    concat_ws(
      ' - ',
      format('%s merged in, %s logs moved', v_source.name, v_logs),
      p_note
    )
  );

  perform public.derive_outage_intervals();
end;
$fn$;

comment on function public.admin_merge_areas(uuid, uuid, text) is
  'Folds a duplicate area into another in the same LGA: repoints power_logs, fault_reports and profiles, drops the source area and its derived intervals, then re-derives. The LGA default area can never be the source. Admin only; writes an audit row.';


-- ============================================================================
-- 3. EXECUTE PRIVILEGES
-- ============================================================================

revoke all on function public.admin_save_state(uuid, text, text, text) from public;
revoke all on function public.admin_save_lga(uuid, uuid, text, text) from public;
revoke all on function public.admin_save_disco(uuid, text, text) from public;
revoke all on function public.admin_save_area(uuid, uuid, text, text, uuid) from public;
revoke all on function public.admin_merge_areas(uuid, uuid, text) from public;

grant execute on function public.admin_save_state(uuid, text, text, text) to authenticated;
grant execute on function public.admin_save_lga(uuid, uuid, text, text) to authenticated;
grant execute on function public.admin_save_disco(uuid, text, text) to authenticated;
grant execute on function public.admin_save_area(uuid, uuid, text, text, uuid) to authenticated;
grant execute on function public.admin_merge_areas(uuid, uuid, text) to authenticated;
