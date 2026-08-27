-- ============================================================================
-- Close /rpc/ execution on the admin functions for anon.
--
-- Numbering note: 0013 on disk, expected to record remotely as 0014.
--
-- Same finding as 0002, and the same cause. Supabase's default privileges
-- grant EXECUTE on every new public-schema function to `anon` and
-- `authenticated` **by name**, not through PUBLIC membership — so the
-- `revoke all ... from public` in 0007 through 0012 did not remove it, and
-- Supabase's security linter flagged all sixteen admin functions as callable
-- without signing in. Those files each say "authenticated only"; this is what
-- makes that true.
--
-- How bad was it: not very, and that is the point of gating inside the
-- function as well as outside it. Every one of these opens with
-- is_moderator_or_admin() or is_admin(), which read the caller's profile —
-- null for anon — so an anonymous call raised insufficient_privilege and
-- returned nothing. The defence in depth held; the grant should still not
-- exist. An endpoint that only fails safely is one refactor away from failing
-- unsafely.
--
-- `authenticated` keeps EXECUTE on purpose. That is how the panel calls them,
-- and it is why the role check lives in the function body: every signed-in
-- visitor is `authenticated` here (anonymous sign-in, CLAUDE.md decision 2),
-- so being authenticated has never been the authorisation.
--
-- The four helpers from 0001 (current_user_role, is_admin,
-- is_moderator_or_admin, is_current_user_banned) keep their anon grant, also
-- on purpose: they only ever report on the caller's own auth.uid(), and 0001
-- granted them deliberately.
-- ============================================================================

revoke all on function public.admin_overview_stats(integer) from anon;
revoke all on function public.admin_growth_series(integer) from anon;

revoke all on function public.review_power_logs(uuid[], boolean, text) from anon;
revoke all on function public.set_user_moderation(uuid, boolean, integer, text) from anon;
revoke all on function public.admin_flagged_logs(integer) from anon;
revoke all on function public.admin_contributors(integer, boolean) from anon;

revoke all on function public.set_fault_status(uuid, public.fault_status, text) from anon;
revoke all on function public.merge_fault_reports(uuid, uuid, text) from anon;
revoke all on function public.admin_fault_metrics(integer) from anon;

revoke all on function public.admin_lga_coverage(integer) from anon;

revoke all on function public.admin_save_state(uuid, text, text, text) from anon;
revoke all on function public.admin_save_lga(uuid, uuid, text, text) from anon;
revoke all on function public.admin_save_disco(uuid, text, text) from anon;
revoke all on function public.admin_save_area(uuid, uuid, text, text, uuid) from anon;
revoke all on function public.admin_merge_areas(uuid, uuid, text) from anon;

revoke all on function public.admin_audit_feed(integer, integer, text) from anon;
