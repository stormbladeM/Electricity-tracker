-- ============================================================================
-- Revoke direct RPC execution on trigger-only functions.
--
-- The trigger functions from 0001 (handle_new_user,
-- enforce_profile_privileged_columns, set_updated_at) reference NEW/OLD and
-- only make sense fired by their triggers — calling them directly via
-- PostgREST's /rpc/<fn> would just error, but the Supabase security linter
-- flags the exposure anyway, so it's closed explicitly.
--
-- Revoke directly from anon/authenticated, not just from PUBLIC: Supabase's
-- default privileges grant EXECUTE on new public-schema functions straight
-- to anon/authenticated/service_role, not merely via PUBLIC membership, so a
-- "revoke ... from public" alone does not remove it.
--
-- The four query-helper functions (current_user_role, is_admin,
-- is_moderator_or_admin, is_current_user_banned) are deliberately left
-- EXECUTE-able by anon/authenticated: they only ever read the caller's own
-- auth.uid(), so calling them directly exposes nothing a user can't already
-- see via their own profiles row.
-- ============================================================================

revoke execute on function public.handle_new_user() from anon, authenticated;
revoke execute on function public.enforce_profile_privileged_columns() from anon, authenticated;
revoke execute on function public.set_updated_at() from anon, authenticated;
