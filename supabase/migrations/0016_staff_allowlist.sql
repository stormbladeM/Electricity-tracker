-- ============================================================================
-- Staff allowlist — make admin access survive the loss of a cookie.
--
-- Numbering note: 0016 on disk, expected to record remotely as 0017 — every
-- file since 0003 sits one slot ahead there. See the migrations README.
--
-- The problem this fixes. Until now `profiles.role` hung off an anonymous
-- auth.users id that existed only as a cookie in one browser. Clearing site
-- data, switching device or opening a private window produced a brand-new
-- anonymous user with role 'user', and the only route back to the admin panel
-- was an operator opening the SQL editor and promoting the new uuid by hand.
-- An admin panel whose access control is "whoever still has the cookie" is not
-- access control, and it cannot be demonstrated on a second machine.
--
-- The fix is to bind staff access to a *person* rather than to a session:
-- an allowlist keyed by verified email address. Once a user has linked a
-- Google identity (CLAUDE.md decision 2's promised upgrade path — anonymous
-- auth "upgradeable to a full account later without losing history", built in
-- this pass), their address is known and verified, and they can reclaim the
-- role the allowlist grants them on any device, forever.
--
-- What this migration does NOT do: hand out roles. Being on the allowlist is
-- necessary, not sufficient — the claim only lands for a caller whose email
-- auth.users itself records as confirmed and non-anonymous. Nothing a client
-- sends is trusted; the address is read server-side.
-- ============================================================================


-- ============================================================================
-- 1. THE ALLOWLIST
--
-- Email is the key because it is the one identifier that survives a device
-- change and that Google verifies on our behalf. Stored lowercase and
-- constrained to it, so a lookup never has to guess about case; `citext` would
-- do this too but needs an extension, and 0001 deliberately avoids adding one
-- where core Postgres suffices.
--
-- Read access is admin-only, deliberately. Who may become staff is not
-- something a contributor should be able to enumerate.
-- ============================================================================

create table if not exists public.staff_allowlist (
  email       text primary key,
  role        public.user_role not null,
  note        text,
  created_at  timestamptz not null default now(),
  constraint staff_allowlist_email_lowercase check (email = lower(email)),
  constraint staff_allowlist_email_not_blank check (char_length(btrim(email)) > 0),
  constraint staff_allowlist_role_is_staff check (role in ('moderator', 'admin'))
);

comment on table public.staff_allowlist is
  'Verified email addresses permitted to claim a staff role via claim_staff_role(). Admin-readable only — who may become staff is not enumerable by contributors.';

-- The bootstrap row. This is the entire recovery story: without at least one
-- entry here, nobody can ever become an admin again through the application,
-- which is why it lives in the migration rather than in supabase/seed/.
-- Change the address here (or, once you are in, from the allowlist itself)
-- if the project changes hands.
insert into public.staff_allowlist (email, role, note)
values ('sodiqmakanjuola1@gmail.com', 'admin', 'Project owner — initial bootstrap.')
on conflict (email) do nothing;


-- ============================================================================
-- 2. THE LOOKUP
--
-- Answers "what role, if any, is this user allowlisted for" from the server's
-- own record of who they are. Three gates, all of which must pass:
--
--   * not anonymous — an anonymous session asserts no identity at all;
--   * email present — nothing to match against otherwise;
--   * email_confirmed_at set — the address has actually been proven. Under a
--     Google OAuth link this is written by the provider's assertion, never by
--     the client.
--
-- SECURITY DEFINER because auth.users is not readable by application roles.
-- It returns null rather than raising for an ineligible user: it is consulted
-- from a trigger on every profile update, where "no" is an ordinary answer.
-- ============================================================================

create or replace function public.allowlisted_role_for(p_user_id uuid)
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select a.role
  from auth.users u
  join public.staff_allowlist a on a.email = lower(u.email)
  where u.id = p_user_id
    and not u.is_anonymous
    and u.email is not null
    and u.email_confirmed_at is not null
    and u.deleted_at is null;
$$;

comment on function public.allowlisted_role_for(uuid) is
  'The staff role this user''s verified email is allowlisted for, or null. Reads auth.users server-side; an anonymous or unconfirmed user always returns null.';


-- ============================================================================
-- 3. AMEND THE 0001 PRIVILEGED-COLUMN GUARD
--
-- 0001's trigger refuses any role change unless auth.uid() is null (service
-- role / scheduled jobs) or is_admin(). That is exactly right, and it is also
-- what would block the promotion this migration exists to enable: SECURITY
-- DEFINER swaps the executing *role*, not the JWT, so inside claim_staff_role
-- auth.uid() is still the caller and is_admin() is still false for the very
-- first admin. The guard has to learn one new exception.
--
-- The exception is deliberately narrow: a user may set the role on their own
-- row, and only to exactly the role allowlisted_role_for() returns for them.
-- is_banned, trust_score and id stay admin-only, unchanged.
--
-- Why this shape rather than a transaction-local flag set by the RPC: a GUC
-- (`set_config('app.claiming', ...)`) is only as safe as the guarantee that a
-- client cannot set it, and PostgREST's config passthrough makes that a
-- guarantee worth not depending on. Re-deriving the answer from auth.users
-- inside the trigger cannot be spoofed at all — a user who writes
-- role = 'admin' straight through PostgREST succeeds only if they are already
-- allowlisted under a verified address, which is precisely the intent.
-- ============================================================================

create or replace function public.enforce_profile_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid   uuid := (select auth.uid());
  v_claim boolean;
begin
  -- auth.uid() is null under the service role / scheduled jobs: let those pass.
  if v_uid is null or public.is_admin() then
    return new;
  end if;

  -- The one role change a non-admin may make: claiming their own allowlisted
  -- role. coalesce because allowlisted_role_for returns null for everyone else,
  -- and null must read as "no".
  v_claim := coalesce(
    new.role is distinct from old.role
      and new.id = old.id
      and new.id = v_uid
      and new.role = public.allowlisted_role_for(new.id),
    false
  );

  if (new.role is distinct from old.role and not v_claim)
     or new.is_banned is distinct from old.is_banned
     or new.trust_score is distinct from old.trust_score
     or new.id is distinct from old.id then
    raise exception 'Only an admin can change role, ban status or trust score'
      using errcode = 'insufficient_privilege';
  end if;

  return new;
end;
$$;

-- 0002 revoked EXECUTE on this trigger function from anon/authenticated;
-- create or replace preserves that, but re-assert it so a replay from scratch
-- in filename order cannot leave it exposed between 0002 and here.
revoke all on function public.enforce_profile_privileged_columns() from public;
revoke all on function public.enforce_profile_privileged_columns() from anon, authenticated;


-- ============================================================================
-- 4. THE CLAIM
--
-- Promotes the caller to their allowlisted role and records it, in one
-- transaction — the 0008/0009 pattern, where an action that changes privilege
-- cannot land without its audit row.
--
-- On a caller who is not allowlisted it returns their current role unchanged
-- rather than raising. Raising would turn the endpoint into an oracle for
-- "is this address on the list", and the honest UI answer is the same either
-- way: nothing happened.
-- ============================================================================

create or replace function public.claim_staff_role()
returns public.user_role
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid     uuid := (select auth.uid());
  v_target  public.user_role;
  v_current public.user_role;
begin
  if v_uid is null then
    raise exception 'Sign in before claiming a staff role'
      using errcode = 'insufficient_privilege';
  end if;

  select p.role into v_current from public.profiles p where p.id = v_uid;

  if exists (select 1 from auth.users u where u.id = v_uid and u.is_anonymous) then
    raise exception 'Save your account before claiming a staff role'
      using errcode = 'insufficient_privilege';
  end if;

  v_target := public.allowlisted_role_for(v_uid);

  -- Not allowlisted, or already holding the role: nothing to do, no signal.
  if v_target is null or v_target = v_current then
    return v_current;
  end if;

  update public.profiles set role = v_target where id = v_uid;

  insert into public.admin_audit_log (admin_id, action, target_type, target_id, notes)
  values (
    v_uid,
    'user.claim_staff_role',
    'profile',
    v_uid,
    format('Claimed %s from the staff allowlist', v_target)
  );

  return v_target;
end;
$$;

comment on function public.claim_staff_role() is
  'Promotes the calling user to the staff role their verified email is allowlisted for, with an audit row, and returns the resulting role. Returns the current role unchanged when the caller is not allowlisted — it is not an oracle for the list. Refuses anonymous callers.';


-- ============================================================================
-- 5. RLS AND GRANTS
--
-- The allowlist is admin-only in every direction. allowlisted_role_for and
-- claim_staff_role reach it as SECURITY DEFINER regardless, which is the only
-- way a not-yet-admin can be measured against it.
--
-- EXECUTE follows 0013: Supabase grants it to anon/authenticated by name, so
-- both revokes are needed. `authenticated` keeps claim_staff_role on purpose —
-- every signed-in visitor holds that role under anonymous auth, which is why
-- the real check is in the function body. allowlisted_role_for stays closed to
-- clients entirely: it exists for the trigger and for claim_staff_role, and
-- exposing it would let anyone test an address against the list.
-- ============================================================================

alter table public.staff_allowlist enable row level security;

drop policy if exists "admins read staff allowlist" on public.staff_allowlist;
create policy "admins read staff allowlist"
  on public.staff_allowlist for select
  to authenticated
  using (public.is_admin());

drop policy if exists "admins insert staff allowlist" on public.staff_allowlist;
create policy "admins insert staff allowlist"
  on public.staff_allowlist for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "admins update staff allowlist" on public.staff_allowlist;
create policy "admins update staff allowlist"
  on public.staff_allowlist for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "admins delete staff allowlist" on public.staff_allowlist;
create policy "admins delete staff allowlist"
  on public.staff_allowlist for delete
  to authenticated
  using (public.is_admin());

grant select, insert, update, delete on public.staff_allowlist to authenticated;

revoke all on function public.allowlisted_role_for(uuid) from public;
revoke all on function public.allowlisted_role_for(uuid) from anon, authenticated;

revoke all on function public.claim_staff_role() from public;
revoke all on function public.claim_staff_role() from anon;
grant execute on function public.claim_staff_role() to authenticated;
