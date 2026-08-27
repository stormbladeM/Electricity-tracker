-- ============================================================================
-- Seed: deliberately suspect power logs, for the moderation queue
--
-- Migration 0008 adds the detector (flag_suspect_power_logs) and the queue it
-- feeds. The 003 demo logs were generated to be *plausible*, so the detector
-- finds almost nothing in them and the M6 moderation screen opens empty — the
-- exact failure CLAUDE.md decision 6 exists to prevent.
--
-- So this seeds one clear example of each thing the detector looks for, and
-- nothing else. Every row here is meant to be caught:
--
--   * Ikeja — one contributor flapping on/off/on/off inside six minutes.
--   * Kano Municipal — one contributor posting twelve logs in forty-four
--     minutes.
--   * Port Harcourt — three contributors report an outage; a fourth reports
--     power on ten minutes later, contradicting all three. Only the fourth log
--     should be flagged; the three genuine ones are here precisely so the
--     queue can be seen *not* flagging them.
--   * Ibadan North — a log timestamped three hours in the future.
--
-- Data, not schema — apply with execute_sql, after 001–005 and migration 0008.
-- Then either wait for the `flag-suspect-power-logs` cron job (every 15
-- minutes) or run `select public.flag_suspect_power_logs();` to see them land
-- in the queue.
--
-- Re-runnability: power_logs has no natural unique key (consecutive-duplicate
-- prevention is an app-layer concern, per 0001), and these timestamps are
-- relative to now(), so a second run would otherwise insert a second copy at
-- new times. Each row therefore takes a deterministic md5()-derived primary
-- key, the same trick 005 uses for faults, and the insert is guarded on it.
--
-- Contributors are resolved by position within each LGA (lowest profile id is
-- rank 1), never hard-coded, and staff accounts are excluded so a demo admin
-- never ends up as the suspect.
-- ============================================================================

with lga_ref as (
  select
    l.id       as lga_id,
    l.name     as lga_name,
    s.id       as state_id,
    s.name     as state_name,
    a.id       as area_id
  from public.lgas l
  join public.states s on s.id = l.state_id
  join public.areas  a on a.lga_id = l.id and a.name is null
),
contributor as (
  select
    p.lga_id,
    p.id                                                          as user_id,
    row_number() over (partition by p.lga_id order by p.id)        as rank
  from public.profiles p
  where p.lga_id is not null
    and p.role = 'user'
),
spec (log_key, lga_name, state_name, user_rank, minutes_ago, status) as (
  values
    -- Rapid toggling: four logs inside six minutes. No supply flaps like this.
    ('flap-1', 'Ikeja', 'Lagos', 2, 2880, 'off'::public.power_status),
    ('flap-2', 'Ikeja', 'Lagos', 2, 2878, 'on'::public.power_status),
    ('flap-3', 'Ikeja', 'Lagos', 2, 2876, 'off'::public.power_status),
    ('flap-4', 'Ikeja', 'Lagos', 2, 2875, 'on'::public.power_status),

    -- Burst: twelve logs from one contributor inside forty-four minutes.
    ('burst-01', 'Kano Municipal', 'Kano', 3, 1500, 'off'::public.power_status),
    ('burst-02', 'Kano Municipal', 'Kano', 3, 1496, 'on'::public.power_status),
    ('burst-03', 'Kano Municipal', 'Kano', 3, 1492, 'off'::public.power_status),
    ('burst-04', 'Kano Municipal', 'Kano', 3, 1488, 'on'::public.power_status),
    ('burst-05', 'Kano Municipal', 'Kano', 3, 1484, 'off'::public.power_status),
    ('burst-06', 'Kano Municipal', 'Kano', 3, 1480, 'on'::public.power_status),
    ('burst-07', 'Kano Municipal', 'Kano', 3, 1476, 'off'::public.power_status),
    ('burst-08', 'Kano Municipal', 'Kano', 3, 1472, 'on'::public.power_status),
    ('burst-09', 'Kano Municipal', 'Kano', 3, 1468, 'off'::public.power_status),
    ('burst-10', 'Kano Municipal', 'Kano', 3, 1464, 'on'::public.power_status),
    ('burst-11', 'Kano Municipal', 'Kano', 3, 1460, 'off'::public.power_status),
    ('burst-12', 'Kano Municipal', 'Kano', 3, 1456, 'on'::public.power_status),

    -- Consensus: three contributors agree power is off, a fourth says it is on.
    ('consensus-off-1', 'Port Harcourt', 'Rivers', 1, 720, 'off'::public.power_status),
    ('consensus-off-2', 'Port Harcourt', 'Rivers', 2, 718, 'off'::public.power_status),
    ('consensus-off-3', 'Port Harcourt', 'Rivers', 3, 715, 'off'::public.power_status),
    ('consensus-outlier', 'Port Harcourt', 'Rivers', 4, 712, 'on'::public.power_status),

    -- Impossible: timestamped three hours from now.
    ('future-1', 'Ibadan North', 'Oyo', 1, -180, 'on'::public.power_status)
)
insert into public.power_logs (
  id, user_id, area_id, lga_id, state_id, status, logged_at, source
)
select
  md5(spec.log_key)::uuid,
  contributor.user_id,
  lga_ref.area_id,
  lga_ref.lga_id,
  lga_ref.state_id,
  spec.status,
  now() - make_interval(mins => spec.minutes_ago),
  'manual'::public.log_source
from spec
join lga_ref
  on lga_ref.lga_name = spec.lga_name
 and lga_ref.state_name = spec.state_name
join contributor
  on contributor.lga_id = lga_ref.lga_id
 and contributor.rank = spec.user_rank
where not exists (
  select 1 from public.power_logs pl where pl.id = md5(spec.log_key)::uuid
);
