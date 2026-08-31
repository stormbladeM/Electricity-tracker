-- ============================================================================
-- Seed: synchronized power_logs that detect_grid_events() (migration 0015)
-- resolves into demo grid_events.
--
-- The 003 demo logs are generated per contributor, independently, so no two
-- land close enough together to look like a grid event — the detector finds
-- nothing in them and the area dashboard's "Grid restored / area-wide outage"
-- note never appears. Same "looks broken" gap CLAUDE.md decision 6 covers, and
-- the same fix 006 uses for the moderation queue: add a small, deliberate set
-- of examples.
--
-- Four clusters, each in an LGA 003 already seeds contributors for, timestamped
-- relative to now() so they stay inside the detector's 48-hour window:
--
--   Ikeja (Lagos)            restoration, 5 contributors within 4 minutes   -> high
--   Abuja Municipal (FCT)    restoration, 4 contributors within 9 minutes   -> medium
--   Kano Municipal (Kano)    area-wide outage, 4 contributors within 6 min  -> medium
--   Enugu North (Enugu)      restoration, 3 of 4 agree within 9 minutes     -> medium
--
-- These are real power_logs rows (source 'manual' — they stand for real people
-- noticing the grid flip), so derive_outage_intervals picks them up too, as it
-- would any log. They are not guaranteed to alternate perfectly with each
-- contributor's existing 003 history; that does not matter to the detector,
-- which reads timing and agreement, not per-user runs.
--
-- Re-runnable: each row's id is md5()-derived from the contributor and cluster
-- (relative timestamps rule out a logged_at match), guarded by
-- ON CONFLICT (id) DO NOTHING against the power_logs primary key.
--
-- Requires migration 0015. After applying, either wait for the
-- detect-grid-events cron job or run `select public.detect_grid_events();` —
-- this file does that at the end.
-- ============================================================================

insert into public.power_logs (id, user_id, area_id, lga_id, state_id, status, logged_at, source)
select
  md5('gridsync:' || v.user_id::text || ':' || v.cluster)::uuid,
  v.user_id, a.id, l.id, s.id, v.status::public.power_status,
  now() - v.ago, 'manual'
from (values
  -- Ikeja — grid restoration, tight, unanimous (5 contributors, ~4 min)
  ('c30cd0f4-0d30-4471-89ac-38483b6c7998'::uuid, 'Lagos', 'Ikeja', 'ikeja-restore', 'on',  interval '20 hours'),
  ('9a5a33dd-fae4-4467-bd7b-c8c470549ba5'::uuid, 'Lagos', 'Ikeja', 'ikeja-restore', 'on',  interval '19 hours 59 minutes'),
  ('56f1cc92-ae6e-4049-9301-49e7b2392546'::uuid, 'Lagos', 'Ikeja', 'ikeja-restore', 'on',  interval '19 hours 58 minutes'),
  ('2806b33d-bba7-4e71-a130-b3f9ff005d00'::uuid, 'Lagos', 'Ikeja', 'ikeja-restore', 'on',  interval '19 hours 57 minutes'),
  ('ea7559b6-f208-4d85-b618-fe93bbab591f'::uuid, 'Lagos', 'Ikeja', 'ikeja-restore', 'on',  interval '19 hours 56 minutes'),

  -- Abuja Municipal — grid restoration, unanimous but looser (4 contributors, ~9 min)
  ('5560b15c-3654-4a34-bbba-3c4af2d7d5bc'::uuid, 'Federal Capital Territory', 'Abuja Municipal', 'abuja-restore', 'on', interval '32 hours'),
  ('06be7cc6-0100-4520-aea2-2cc48cfbced0'::uuid, 'Federal Capital Territory', 'Abuja Municipal', 'abuja-restore', 'on', interval '31 hours 57 minutes'),
  ('12c9c98b-d838-4e8f-8d24-0e9ae85cdb9c'::uuid, 'Federal Capital Territory', 'Abuja Municipal', 'abuja-restore', 'on', interval '31 hours 54 minutes'),
  ('de63213c-c737-4f6f-9be4-e2952fdbd82a'::uuid, 'Federal Capital Territory', 'Abuja Municipal', 'abuja-restore', 'on', interval '31 hours 51 minutes'),

  -- Kano Municipal — area-wide outage (4 contributors, ~6 min)
  ('fcaaffa3-150b-4b60-ae55-f2cfa808594a'::uuid, 'Kano', 'Kano Municipal', 'kano-outage', 'off', interval '10 hours'),
  ('6d7d9ef6-f587-4cd2-8758-81f62ee62722'::uuid, 'Kano', 'Kano Municipal', 'kano-outage', 'off', interval '9 hours 58 minutes'),
  ('9f6c4027-56bf-4edf-9145-f2db6b94ca10'::uuid, 'Kano', 'Kano Municipal', 'kano-outage', 'off', interval '9 hours 56 minutes'),
  ('1254edc7-e568-4b4f-8267-c9860fe1d18a'::uuid, 'Kano', 'Kano Municipal', 'kano-outage', 'off', interval '9 hours 54 minutes'),

  -- Enugu North — restoration with one dissenter (3 of 4 agree, ~9 min)
  ('858f59a5-0dd7-4523-83a9-c733aa18651f'::uuid, 'Enugu', 'Enugu North', 'enugu-restore', 'on',  interval '38 hours'),
  ('7cd2b8ed-cfb5-4203-b584-08fbe84b688e'::uuid, 'Enugu', 'Enugu North', 'enugu-restore', 'on',  interval '37 hours 57 minutes'),
  ('585dda60-8fec-4423-bd89-031275d30867'::uuid, 'Enugu', 'Enugu North', 'enugu-restore', 'on',  interval '37 hours 54 minutes'),
  ('ec117d91-6e96-4a82-9837-cd33cc9b178e'::uuid, 'Enugu', 'Enugu North', 'enugu-restore', 'off', interval '37 hours 51 minutes')
) as v(user_id, state_name, lga_name, cluster, status, ago)
join public.states s on s.name = v.state_name
join public.lgas l on l.state_id = s.id and l.name = v.lga_name
join public.areas a on a.lga_id = l.id and a.name is null
on conflict (id) do nothing;

-- Derive the events now rather than waiting for the 5-minute cron.
select public.detect_grid_events();
