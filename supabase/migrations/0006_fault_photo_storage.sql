-- ============================================================================
-- Storage bucket for fault report photos.
--
-- M5's fault report form takes an optional photo. fault_reports.photo_url
-- (0001) holds the resulting public URL; this migration creates the bucket it
-- points into and the RLS on storage.objects that governs writes to it.
--
-- Access model, matching the rest of the schema:
--   * Public read. The fault feed, the fault detail page and the public area
--     pages all show fault photos without a login, exactly as they show fault
--     reports themselves (fault_reports has a public SELECT policy in 0001).
--   * A signed-in, non-banned user may upload only under their own user-id
--     folder — object name must be '<auth.uid()>/<something>'. The client
--     writes 'fault-photos/<uid>/<uuid>.jpg'.
--   * A user may delete their own objects, so replacing a photo while fixing a
--     still-untriaged report works (mirrors the "users update own untriaged
--     fault reports" policy in 0001).
--
-- Numbering note: 0006 on disk, expected to record remotely as 0007 — the same
-- one-slot offset every file since 0002 carries (see the migrations README).
--
-- Re-runnable: bucket insert is ON CONFLICT DO NOTHING; policies are dropped
-- first.
-- ============================================================================


-- ============================================================================
-- 1. THE BUCKET
--
-- public = true: served through Supabase's storage CDN without a signed URL,
-- which is what lets an <img src> on a no-login page just work. The size and
-- mime limits are a backstop — the client downscales to a small JPEG before it
-- ever uploads.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'fault-photos',
  'fault-photos',
  true,
  5242880, -- 5 MiB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;


-- ============================================================================
-- 2. POLICIES ON storage.objects
--
-- RLS is already enabled on storage.objects by Supabase. storage.foldername(name)
-- splits the object path on '/', so [1] is the first folder — the owning user's
-- id in our layout.
-- ============================================================================

drop policy if exists "fault photos are publicly readable" on storage.objects;
create policy "fault photos are publicly readable"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'fault-photos');

drop policy if exists "users upload own fault photos" on storage.objects;
create policy "users upload own fault photos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'fault-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and not public.is_current_user_banned()
  );

drop policy if exists "users delete own fault photos" on storage.objects;
create policy "users delete own fault photos"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'fault-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- No UPDATE policy: replacing a photo is a delete + a fresh upload under a new
-- name, so the fault_reports.photo_url always changes with it.
