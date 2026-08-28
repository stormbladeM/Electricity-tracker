-- ============================================================================
-- Seed: default areas
--
-- One "default area" per LGA — area_id with lga_id set and name IS NULL.
-- Per the comment on public.areas (0001_init.sql), this is the bucket
-- power_logs/fault_reports land in when a user only picks down to LGA level
-- (no estate/community chosen). The partial unique index areas_lga_default_key
-- enforces exactly one per LGA, and the ON CONFLICT clause below targets that
-- same partial index so this file is safely re-runnable.
--
-- disco_id is left null everywhere — DisCos are an M4 concern; public.discos
-- stays empty for now.
-- ============================================================================

insert into public.areas (lga_id, name, disco_id)
select l.id, null, null
from public.lgas l
on conflict (lga_id) where name is null do nothing;
