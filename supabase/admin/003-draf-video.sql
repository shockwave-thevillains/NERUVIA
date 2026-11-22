-- NERUVIA admin, tahap 3 (22 Nov 2026): draf pelajaran dan bucket video privat. Diterapkan ke neruvia-dev (migrasi admin_tahap3_draf_video), uji RLS lulus.
-- Semua akses hanya untuk admin (private.is_admin()). anon tidak punya hak apa pun.
-- Draf BUKAN materi terbit: situs tetap membaca content/pelajaran/*.json dari repo. Draf diunduh sebagai JSON
-- lalu dimasukkan ke repo lewat commit setelah ditinjau.

create table if not exists public.pelajaran_draf (
  id         text primary key check (id ~ '^l[0-9]{1,2}-m[0-9]{1,2}-p[0-9]{1,2}$'),
  isi        jsonb not null check (jsonb_typeof(isi) = 'object' and octet_length(isi::text) <= 60000 and isi->>'id' = id),
  status     text not null default 'draf' check (status in ('draf', 'siap')),
  updated_at timestamptz not null default now(),
  updated_by uuid
);
comment on table public.pelajaran_draf is 'Draf pelajaran dari halaman admin. Bukan materi terbit.';

create or replace function private.cap_draf() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  new.updated_by := (select auth.uid());
  return new;
end $$;
revoke all on function private.cap_draf() from public, anon, authenticated;

drop trigger if exists pelajaran_draf_cap on public.pelajaran_draf;
create trigger pelajaran_draf_cap before insert or update on public.pelajaran_draf
  for each row execute function private.cap_draf();

alter table public.pelajaran_draf enable row level security;
revoke all on public.pelajaran_draf from public, anon, authenticated;
grant select, insert, update, delete on public.pelajaran_draf to authenticated;
drop policy if exists draf_admin_baca on public.pelajaran_draf;
drop policy if exists draf_admin_tambah on public.pelajaran_draf;
drop policy if exists draf_admin_ubah on public.pelajaran_draf;
drop policy if exists draf_admin_hapus on public.pelajaran_draf;
create policy draf_admin_baca  on public.pelajaran_draf for select to authenticated using ((select private.is_admin()));
create policy draf_admin_tambah on public.pelajaran_draf for insert to authenticated with check ((select private.is_admin()));
create policy draf_admin_ubah  on public.pelajaran_draf for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy draf_admin_hapus on public.pelajaran_draf for delete to authenticated using ((select private.is_admin()));

-- Bucket video privat: batas 50 MB per berkas (batas paket gratis), hanya mp4 dan webm.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('video-materi', 'video-materi', false, 52428800, array['video/mp4', 'video/webm'])
on conflict (id) do update set public = false, file_size_limit = 52428800, allowed_mime_types = array['video/mp4', 'video/webm'];

drop policy if exists video_admin_baca  on storage.objects;
drop policy if exists video_admin_tambah on storage.objects;
drop policy if exists video_admin_ubah  on storage.objects;
drop policy if exists video_admin_hapus on storage.objects;
create policy video_admin_baca  on storage.objects for select to authenticated using (bucket_id = 'video-materi' and (select private.is_admin()));
create policy video_admin_tambah on storage.objects for insert to authenticated with check (bucket_id = 'video-materi' and (select private.is_admin()));
create policy video_admin_ubah  on storage.objects for update to authenticated using (bucket_id = 'video-materi' and (select private.is_admin())) with check (bucket_id = 'video-materi' and (select private.is_admin()));
create policy video_admin_hapus on storage.objects for delete to authenticated using (bucket_id = 'video-materi' and (select private.is_admin()));
