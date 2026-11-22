-- NERUVIA admin, tahap 1 (22 Nov 2026). Diterapkan ke neruvia-dev 22 Nov 2026 (migrasi admin_tahap1); uji RLS lulus.
-- Admin ditentukan oleh user_id di tabel public.admins. Hanya peran postgres/service yang bisa menambah admin
-- (lewat dashboard SQL), tidak ada jalur lewat API. Email sengaja tidak dipakai sebagai kunci: bila pendaftaran
-- Auth terbuka, orang lain tidak bisa "mengklaim" admin dengan mendaftar memakai email yang sama.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create table if not exists public.admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  catatan    text check (catatan is null or char_length(catatan) <= 100),
  created_at timestamptz not null default now()
);
comment on table public.admins is 'Daftar admin NERUVIA. Ditambah hanya lewat SQL oleh pengelola project.';
alter table public.admins enable row level security;
revoke all on public.admins from anon, authenticated;
grant select on public.admins to authenticated;
drop policy if exists admins_baca_diri_sendiri on public.admins;
create policy admins_baca_diri_sendiri on public.admins for select to authenticated
  using (user_id = (select auth.uid()));

create or replace function private.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admins a where a.user_id = (select auth.uid()))
$$;
revoke all on function private.is_admin() from public, anon, authenticated;
grant execute on function private.is_admin() to authenticated;

-- Admin boleh membaca pendaftar waitlist; peran authenticated lain tidak melihat baris apa pun.
grant select on public.waitlist to authenticated;
drop policy if exists waitlist_admin_baca on public.waitlist;
create policy waitlist_admin_baca on public.waitlist for select to authenticated
  using ((select private.is_admin()));
