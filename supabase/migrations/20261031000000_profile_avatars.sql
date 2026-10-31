-- Private avatars. An active account can read/write only its own fixed JPEG path.
begin;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-avatars', 'profile-avatars', false, 1048576, array['image/jpeg'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy avatar_read_own on storage.objects for select to authenticated
using (
  bucket_id = 'profile-avatars'
  and name = (select auth.uid())::text || '/avatar.jpg'
  and exists (select 1 from public.profiles where id = (select auth.uid()) and status = 'ACTIVE')
);
create policy avatar_insert_own on storage.objects for insert to authenticated
with check (
  bucket_id = 'profile-avatars'
  and name = (select auth.uid())::text || '/avatar.jpg'
  and exists (select 1 from public.profiles where id = (select auth.uid()) and status = 'ACTIVE')
);
create policy avatar_update_own on storage.objects for update to authenticated
using (
  bucket_id = 'profile-avatars'
  and name = (select auth.uid())::text || '/avatar.jpg'
  and exists (select 1 from public.profiles where id = (select auth.uid()) and status = 'ACTIVE')
)
with check (
  bucket_id = 'profile-avatars'
  and name = (select auth.uid())::text || '/avatar.jpg'
  and exists (select 1 from public.profiles where id = (select auth.uid()) and status = 'ACTIVE')
);
commit;
