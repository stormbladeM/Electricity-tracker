-- ============================================================================
-- Maintain fault_reports.confirm_count, and auto-promote reported → confirmed.
--
-- 0001_init.sql created fault_reports.confirm_count with the comment "a cached
-- counter maintained by the M5 confirmation flow", and fault_confirmations with
-- "fault_reports.confirm_count is maintained by the M5 flow". This migration is
-- that flow.
--
-- Why a trigger and not application code: the RLS policies in 0001 let an
-- authenticated client INSERT its own fault_confirmations row and nothing else.
-- fault_reports.confirm_count and fault_reports.status are writable only by
-- moderators/admins. So the counter has to be kept by something that bypasses
-- RLS — the same reason derive_outage_intervals in 0003 is SECURITY DEFINER.
--
-- What it does, on every insert/delete of a fault_confirmations row:
--   * Recompute confirm_count for that fault as count(*) of its confirmations.
--   * If the fresh count is >= 3 and the fault is still 'reported', advance it
--     to 'confirmed'. This is the only status transition the flow performs;
--     everything past 'confirmed' is moderator/admin work (M6). Status only
--     moves forward — dropping back below 3 confirmations (a delete) never
--     demotes a fault.
--
-- Numbering note: 0005 on disk, expected to record remotely as 0006. Every file
-- since 0002 sits one slot ahead remotely (see the migrations README); this one
-- keeps that offset.
--
-- Re-runnable: the function is CREATE OR REPLACE and the trigger is dropped
-- first.
-- ============================================================================


-- ============================================================================
-- 1. THE SYNC FUNCTION
-- ============================================================================

create or replace function public.sync_fault_confirm_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  -- NEW on insert, OLD on delete — one of them is always present.
  v_fault_id uuid := coalesce(new.fault_id, old.fault_id);
  v_count    integer;
begin
  select count(*) into v_count
  from public.fault_confirmations
  where fault_id = v_fault_id;

  update public.fault_reports fr
  set
    confirm_count = v_count,
    status = case
      when v_count >= 3 and fr.status = 'reported'::public.fault_status
        then 'confirmed'::public.fault_status
      else fr.status
    end
  where fr.id = v_fault_id
    and (
      fr.confirm_count is distinct from v_count
      or (v_count >= 3 and fr.status = 'reported'::public.fault_status)
    );

  return null; -- AFTER trigger: return value is ignored.
end;
$fn$;

comment on function public.sync_fault_confirm_count() is
  'Recomputes fault_reports.confirm_count from fault_confirmations and advances a still-reported fault to confirmed at 3 confirmations. Fired by the fault_confirmations_sync_count trigger; never demotes status.';


-- ============================================================================
-- 2. THE TRIGGER
-- ============================================================================

drop trigger if exists fault_confirmations_sync_count on public.fault_confirmations;
create trigger fault_confirmations_sync_count
  after insert or delete on public.fault_confirmations
  for each row execute function public.sync_fault_confirm_count();


-- ============================================================================
-- 3. EXECUTE PRIVILEGES
--
-- Trigger-only function: firing a trigger does not check EXECUTE on the trigger
-- function, so revoking it costs nothing and closes the /rpc/ exposure the
-- Supabase security linter flags (same finding handled in 0002 for the other
-- trigger functions). SECURITY DEFINER makes closing it worth doing explicitly.
-- ============================================================================

revoke all on function public.sync_fault_confirm_count() from public;
revoke execute on function public.sync_fault_confirm_count() from anon, authenticated;
