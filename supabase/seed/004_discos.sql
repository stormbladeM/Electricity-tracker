-- ============================================================================
-- Seed: distribution companies, and each area's DisCo
--
-- CLAUDE.md decision 5: DisCo is added in M4, not day one. public.discos was
-- created empty by 0001_init.sql; this fills it and stamps every area with the
-- company that serves it.
--
-- This is data, not schema — apply with execute_sql, never apply_migration.
--
-- The eleven successor DisCos from the 2013 privatisation of PHCN. The
-- franchise areas below are the state-level assignment; two DisCos (Ikeja and
-- Eko) split Lagos by LGA in reality, but every Lagos LGA is mapped to Ikeja
-- Electric here — a deliberate simplification until areas carry their own
-- DisCo override. Every state + FCT is covered exactly once.
--
-- Re-runnable: 004a is ON CONFLICT (name) DO NOTHING against discos_name_key;
-- 004b only writes areas whose disco_id would actually change.
-- ============================================================================

-- 004a: the eleven DisCos
insert into public.discos (name, short_name) values
  ('Abuja Electricity Distribution Company',         'AEDC'),
  ('Benin Electricity Distribution Company',         'BEDC'),
  ('Eko Electricity Distribution Company',           'EKEDC'),
  ('Enugu Electricity Distribution Company',         'EEDC'),
  ('Ibadan Electricity Distribution Company',        'IBEDC'),
  ('Ikeja Electric',                                 'IKEDC'),
  ('Jos Electricity Distribution Company',           'JED'),
  ('Kaduna Electric',                                'KAEDCO'),
  ('Kano Electricity Distribution Company',          'KEDCO'),
  ('Port Harcourt Electricity Distribution Company', 'PHED'),
  ('Yola Electricity Distribution Company',          'YEDC')
on conflict (name) do nothing;

-- 004b: assign every area its DisCo, by the state its LGA sits in
update public.areas a
set disco_id = d.id
from public.lgas l
join public.states s on s.id = l.state_id
join (values
  ('Federal Capital Territory', 'AEDC'), ('Niger', 'AEDC'), ('Kogi', 'AEDC'), ('Nasarawa', 'AEDC'),
  ('Edo', 'BEDC'), ('Delta', 'BEDC'), ('Ondo', 'BEDC'), ('Ekiti', 'BEDC'),
  ('Enugu', 'EEDC'), ('Anambra', 'EEDC'), ('Imo', 'EEDC'), ('Abia', 'EEDC'), ('Ebonyi', 'EEDC'),
  ('Oyo', 'IBEDC'), ('Ogun', 'IBEDC'), ('Osun', 'IBEDC'), ('Kwara', 'IBEDC'),
  ('Lagos', 'IKEDC'),
  ('Plateau', 'JED'), ('Bauchi', 'JED'), ('Benue', 'JED'), ('Gombe', 'JED'),
  ('Kaduna', 'KAEDCO'), ('Sokoto', 'KAEDCO'), ('Kebbi', 'KAEDCO'), ('Zamfara', 'KAEDCO'),
  ('Kano', 'KEDCO'), ('Katsina', 'KEDCO'), ('Jigawa', 'KEDCO'),
  ('Rivers', 'PHED'), ('Cross River', 'PHED'), ('Akwa Ibom', 'PHED'), ('Bayelsa', 'PHED'),
  ('Adamawa', 'YEDC'), ('Taraba', 'YEDC'), ('Borno', 'YEDC'), ('Yobe', 'YEDC')
) as m(state_name, disco_short) on m.state_name = s.name
join public.discos d on d.short_name = m.disco_short
where a.lga_id = l.id
  and a.disco_id is distinct from d.id;
