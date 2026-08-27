-- ============================================================================
-- Seed: a few real admin actions, so the audit log is not empty
--
-- The M6 audit screen reads admin_audit_log, which only ever fills as somebody
-- works the panel — so on a fresh demo it opens blank, the same "looks broken"
-- problem CLAUDE.md decision 6 covers.
--
-- The obvious fix would be to insert plausible-looking audit rows directly.
-- That is the one thing this file must not do: an audit trail that describes
-- decisions nobody made, on objects whose state does not match, is worse than
-- an empty one. So instead this *performs* a handful of genuine moderation
-- decisions through the same functions the panel calls, and the audit rows are
-- the real record of them. The state and the trail agree because the trail was
-- written by the work.
--
-- The decisions, all against seed 006's deliberately suspect logs:
--   * the Ikeja flapping cluster is rejected — four logs in six minutes is not
--     a supply, and the reason holds up;
--   * the Port Harcourt consensus outlier is *kept* — a moderator judging that
--     the street really was split is the whole point of a human queue, and a
--     demo where every flag is upheld would suggest the detector is never
--     wrong;
--   * one Ikeja low-voltage fault is acknowledged with a note.
--
-- Data, not schema — apply with execute_sql, after 001–006 and migrations
-- 0008/0009. It needs an admin: it takes the earliest `profiles` row with
-- role = 'admin' and acts as them, because auth.uid() is null under the
-- service role and every one of these functions refuses an anonymous caller.
-- If there is no admin yet, it says so and does nothing.
--
-- Re-runnability: each action is skipped when admin_audit_log already carries
-- a row for that target, so a second run writes nothing.
-- ============================================================================

do $seed$
declare
  v_admin uuid;
  v_reject uuid[];
  v_keep uuid := md5('consensus-outlier')::uuid;
  v_fault uuid := md5('ikeja-lowvolt')::uuid;
begin
  select p.id into v_admin
  from public.profiles p
  where p.role = 'admin'
  order by p.created_at
  limit 1;

  if v_admin is null then
    raise notice 'No admin profile found — promote one first, then re-run this seed.';
    return;
  end if;

  -- Act as that admin for the rest of the transaction: these functions read
  -- auth.uid() both to authorise the call and to stamp the audit row.
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_admin, 'role', 'authenticated')::text,
    true
  );

  v_reject := array[
    md5('flap-1')::uuid,
    md5('flap-2')::uuid,
    md5('flap-3')::uuid,
    md5('flap-4')::uuid
  ];

  if not exists (
    select 1 from public.admin_audit_log al where al.target_id = any(v_reject)
  ) then
    perform public.review_power_logs(
      v_reject,
      false,
      'Four logs in six minutes from one contributor. Left out of the figures.'
    );
  end if;

  if not exists (
    select 1 from public.admin_audit_log al where al.target_id = v_keep
  ) then
    perform public.review_power_logs(
      array[v_keep],
      true,
      'Checked with neighbours — the feeder really was split that evening. Genuine log.'
    );
  end if;

  if not exists (
    select 1 from public.admin_audit_log al where al.target_id = v_fault
  ) then
    perform public.set_fault_status(
      v_fault,
      'acknowledged',
      'Passed to Ikeja Electric. Low voltage across the estate, not a single-house fault.'
    );
  end if;
end;
$seed$;
