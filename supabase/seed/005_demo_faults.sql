-- ============================================================================
-- Seed: demo fault reports and confirmations
--
-- M5 adds fault reporting. An empty feed and an empty map look broken in a demo
-- (CLAUDE.md decision 6), so this seeds ~14 realistic fault_reports across the
-- 10 LGAs that already have demo power_logs from 003, plus fault_confirmations
-- so confirm_count and the reported→confirmed auto-promotion (trigger from
-- migration 0005) land in a lifelike state.
--
-- Data, not schema — apply with execute_sql, after 001–004. Everything is
-- resolved by join from the reference tables and the demo profiles seeded in
-- 003b (which carry lga_id / state_id / area_id), so no hard-coded row ids
-- beyond the deterministic md5()-derived primary keys that make re-running safe:
--   * fault_reports.id     = md5(<fault_key>)
--   * fault_confirmations  = md5(fault_id || user_id), plus ON CONFLICT on the
--     (fault_id, user_id) unique constraint
-- A re-run inserts nothing new.
--
-- Reporter and confirmers for each fault are demo contributors from that LGA
-- (profiles.lga_id), reporter first by id, confirmers the next N by id
-- excluding the reporter — a contributor never confirms their own report.
--
-- Photos: none. The report form uploads to the fault-photos bucket (migration
-- 0006); a SQL seed can't, so photo_url stays null here.
--
-- Does NOT touch power_logs, outage_intervals, admin_audit_log.
-- ============================================================================


-- ============================================================================
-- 005a: fault_reports
-- ============================================================================

with lga_ref as (
  select
    l.id            as lga_id,
    l.name          as lga_name,
    s.id            as state_id,
    s.name          as state_name,
    a.id            as area_id,
    a.disco_id      as disco_id
  from public.lgas l
  join public.states s on s.id = l.state_id
  join public.areas  a on a.lga_id = l.id and a.name is null
),
reporter as (
  -- One reporter per LGA: the lowest-id demo contributor there.
  select distinct on (p.lga_id) p.lga_id, p.id as user_id
  from public.profiles p
  where p.lga_id is not null
  order by p.lga_id, p.id
),
spec (
  lga_name, state_name, fault_type, severity, status,
  reported_hours_ago, resolved_hours_ago, latitude, longitude,
  description, resolution_note, fault_key
) as (
  values
    ('Ikeja', 'Lagos', 'transformer'::public.fault_type, 'critical'::public.fault_severity, 'in_progress'::public.fault_status,
      34, null::int, 6.6018::float8, 3.3515::float8,
      'The 500KVA transformer by the secretariat blew around 2am with a loud explosion. All of Alausa has been dark since.', null, 'ikeja-transformer'),
    ('Ikeja', 'Lagos', 'low_voltage'::public.fault_type, 'medium'::public.fault_severity, 'reported'::public.fault_status,
      6, null, null, null,
      'Power is on but very low all evening — fridge and pump will not start. Bulbs are dim.', null, 'ikeja-lowvolt'),
    ('Alimosho', 'Lagos', 'cable_snap'::public.fault_type, 'high'::public.fault_severity, 'confirmed'::public.fault_status,
      15, null, 6.6100::float8, 3.2700::float8,
      'A low-tension line came down across Governor Road after the rain. It is still lying on the fence.', null, 'alimosho-cable'),
    ('Abuja Municipal', 'Federal Capital Territory', 'pole_down'::public.fault_type, 'high'::public.fault_severity, 'acknowledged'::public.fault_status,
      50, null, 9.0700::float8, 7.4800::float8,
      'A pole on the Wuse 2 axis is leaning badly after a truck hit it. Wires are hanging low over the road.', null, 'abuja-pole'),
    ('Abuja Municipal', 'Federal Capital Territory', 'billing'::public.fault_type, 'low'::public.fault_severity, 'resolved'::public.fault_status,
      120, 8, null, null,
      'Estimated bill for a metered flat — charged far above what the prepaid meter shows.',
      'DisCo reissued the bill at the metered rate and applied a credit.', 'abuja-billing'),
    ('Kano Municipal', 'Kano', 'transformer'::public.fault_type, 'high'::public.fault_severity, 'confirmed'::public.fault_status,
      20, null, 12.0000::float8, 8.5200::float8,
      'Transformer at the Kofar Mata junction has been humming and smoking since morning. Two attempts to restore it tripped again.', null, 'kano-transformer'),
    ('Kano Municipal', 'Kano', 'meter_issue'::public.fault_type, 'medium'::public.fault_severity, 'reported'::public.fault_status,
      9, null, null, null,
      'Prepaid meter is blank and will not accept a token after the last recharge.', null, 'kano-meter'),
    ('Port Harcourt', 'Rivers', 'vandalism'::public.fault_type, 'critical'::public.fault_severity, 'in_progress'::public.fault_status,
      40, null, 4.8100::float8, 7.0100::float8,
      'Cables and the earthing were cut from the substation on Aggrey Road overnight. Whole area off since.', null, 'ph-vandalism'),
    ('Port Harcourt', 'Rivers', 'low_voltage'::public.fault_type, 'medium'::public.fault_severity, 'reported'::public.fault_status,
      4, null, null, null,
      'Very low voltage across D-Line since afternoon. Stabilisers cutting in and out.', null, 'ph-lowvolt'),
    ('Ibadan North', 'Oyo', 'cable_snap'::public.fault_type, 'high'::public.fault_severity, 'reported'::public.fault_status,
      2, null, null, null,
      'Line snapped near Bodija market and is sparking on the ground. People are avoiding the spot.', null, 'ibadan-cable'),
    ('Enugu North', 'Enugu', 'transformer'::public.fault_type, 'medium'::public.fault_severity, 'resolved'::public.fault_status,
      90, 30, null, null,
      'Transformer on Ogui Road burnt out. Reported to the district office.',
      'Transformer replaced and power restored to the whole feeder.', 'enugu-transformer'),
    ('Kaduna North', 'Kaduna', 'pole_down'::public.fault_type, 'high'::public.fault_severity, 'reported'::public.fault_status,
      7, null, 10.5500::float8, 7.4400::float8,
      'A pole fell during the storm on Isa Kaita Road. Live wires across the drainage.', null, 'kaduna-pole'),
    ('Uyo', 'Akwa Ibom', 'other'::public.fault_type, 'low'::public.fault_severity, 'reported'::public.fault_status,
      12, null, null, null,
      'Frequent trips every few minutes since yesterday — power comes and goes within a minute.', null, 'uyo-other'),
    ('Maiduguri', 'Borno', 'vandalism'::public.fault_type, 'high'::public.fault_severity, 'rejected'::public.fault_status,
      60, null, null, null,
      'Suspected line theft along the bypass.',
      'Field team found the line intact — outage was a scheduled feeder maintenance. Closed.', 'maiduguri-vandalism')
)
insert into public.fault_reports (
  id, user_id, area_id, lga_id, state_id, disco_id,
  fault_type, severity, status, description, resolution_note,
  latitude, longitude, reported_at, resolved_at
)
select
  md5(spec.fault_key)::uuid,
  reporter.user_id,
  lga_ref.area_id,
  lga_ref.lga_id,
  lga_ref.state_id,
  lga_ref.disco_id,
  spec.fault_type,
  spec.severity,
  spec.status,
  spec.description,
  spec.resolution_note,
  spec.latitude,
  spec.longitude,
  now() - make_interval(hours => spec.reported_hours_ago),
  case
    when spec.resolved_hours_ago is null then null
    else now() - make_interval(hours => spec.resolved_hours_ago)
  end
from spec
join lga_ref
  on lga_ref.lga_name = spec.lga_name
 and lga_ref.state_name = spec.state_name
join reporter
  on reporter.lga_id = lga_ref.lga_id
where not exists (
  select 1 from public.fault_reports fr where fr.id = md5(spec.fault_key)::uuid
);


-- ============================================================================
-- 005b: fault_confirmations
--
-- N confirmers per fault, taken from the same LGA's demo contributors, lowest
-- ids first, never the reporter. The trigger from migration 0005 recomputes
-- confirm_count and, for any still-'reported' fault that reaches 3, promotes it
-- to 'confirmed' — so after this runs some seeded 'reported' rows will show as
-- 'confirmed', which is the intended demo state.
-- ============================================================================

with target (fault_key, n) as (
  values
    ('ikeja-transformer',   4),
    ('ikeja-lowvolt',       1),
    ('alimosho-cable',      3),
    ('abuja-pole',          4),
    ('abuja-billing',       2),
    ('kano-transformer',    3),
    ('kano-meter',          0),
    ('ph-vandalism',        4),
    ('ph-lowvolt',          2),
    ('ibadan-cable',        1),
    ('enugu-transformer',   3),
    ('kaduna-pole',         2),
    ('uyo-other',           1),
    ('maiduguri-vandalism', 0)
),
fault_ref as (
  select
    md5(target.fault_key)::uuid as fault_id,
    target.n                    as n,
    fr.lga_id                   as lga_id,
    fr.user_id                  as reporter_id
  from target
  join public.fault_reports fr on fr.id = md5(target.fault_key)::uuid
),
confirmer as (
  select
    fault_ref.fault_id,
    p.id as user_id,
    fault_ref.n,
    row_number() over (partition by fault_ref.fault_id order by p.id) as rn
  from fault_ref
  join public.profiles p
    on p.lga_id = fault_ref.lga_id
   and p.id <> fault_ref.reporter_id
)
insert into public.fault_confirmations (id, fault_id, user_id)
select
  md5(confirmer.fault_id::text || confirmer.user_id::text)::uuid,
  confirmer.fault_id,
  confirmer.user_id
from confirmer
where confirmer.rn <= confirmer.n
on conflict (fault_id, user_id) do nothing;
