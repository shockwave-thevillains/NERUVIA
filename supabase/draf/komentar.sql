-- NERUVIA · komentar pelajaran + laporan penyalahgunaan + moderasi (S4)
-- STATUS: DRAF. TIDAK diterapkan ke proyek mana pun. Perubahan skema di neruvia-dev hanya oleh Master
-- (SQL Editor) setelah keputusan di docs/security/auth-komentar.md butir 9 terjawab.
-- Rancangan dan alasan tiap kontrol: docs/security/auth-komentar.md. Uji lokal: supabase/draf/uji-komentar-lokal.sql.
--
-- Prasyarat: supabase/admin/001-admin.sql sudah diterapkan (memakai private.is_admin()), dan Supabase Auth
-- aktif dengan konfirmasi email. Tanpa Auth aktif, tabel ini tidak bisa dipakai siapa pun (anon hanya membaca).
--
-- Prinsip:
--  * Server sumber kebenaran: aturan isi komentar di bawah tidak boleh lebih longgar daripada
--    NVKomentar.validasi di belajar/komentar-draf.js. Klien memperbaiki (NFKC, buang karakter kontrol,
--    rapikan spasi); server menolak yang masih melanggar.
--  * Tidak ada UPDATE isi komentar oleh pengguna. Hanya hapus milik sendiri.
--  * Publik (anon) tidak melihat user_id, email, atau status; hanya nama tampil, isi, waktu.
--  * Komentar baru berstatus 'menunggu' (pra-moderasi). Admin mengubahnya menjadi 'tampil'.

begin;

-- A. Profil: nama tampil terpisah dari email. Email tidak pernah dibaca dari sisi publik.
create table if not exists public.profil (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  nama_tampil text not null,
  created_at  timestamptz not null default now(),
  constraint profil_nama_tampil check (
    char_length(nama_tampil) between 2 and 30
    and nama_tampil ~ '^[[:alnum:]][[:alnum:] .''’-]*$'
    and nama_tampil = btrim(nama_tampil)
    and nama_tampil !~ '  '
    and nama_tampil !~ '[\u0001-\u001F\u007F-\u009F\u00AD\u061C\u180E\u200B-\u200F\u2028-\u202E\u2060-\u206F\uFEFF\uFFF9-\uFFFC]'
  )
);
comment on table public.profil is 'Nama tampil pengguna. Dibuat oleh pemilik akun; tidak berisi email.';
alter table public.profil enable row level security;
revoke all on public.profil from anon, authenticated;
grant select on public.profil to authenticated;
grant insert (user_id, nama_tampil) on public.profil to authenticated;
grant update (nama_tampil) on public.profil to authenticated;
drop policy if exists profil_baca_sendiri on public.profil;
create policy profil_baca_sendiri on public.profil for select to authenticated
  using (user_id = (select auth.uid()));
drop policy if exists profil_buat_sendiri on public.profil;
create policy profil_buat_sendiri on public.profil for insert to authenticated
  with check (user_id = (select auth.uid()));
drop policy if exists profil_ubah_sendiri on public.profil;
create policy profil_ubah_sendiri on public.profil for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- B. Komentar
create table if not exists public.komentar (
  id           uuid primary key default gen_random_uuid(),
  pelajaran_id text not null check (pelajaran_id ~ '^[a-z0-9][a-z0-9-]{0,39}$'),
  user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nama_tampil  text not null,                              -- disalin dari profil oleh pemicu; klien tidak bisa mengisinya
  isi          text not null,
  status       text not null default 'menunggu' check (status in ('menunggu', 'tampil', 'disembunyikan')),
  created_at   timestamptz not null default now(),
  constraint komentar_isi_aturan check (
    char_length(isi) between 1 and 500
    and isi !~ '[\u0001-\u0009\u000B-\u001F\u007F-\u009F\u00AD\u061C\u180E\u200B-\u200F\u2028-\u202E\u2060-\u206F\uFEFF\uFFF9-\uFFFC]'
    and isi !~ '[<>]'
    and isi !~* '(https?:|ftp:|javascript:|data:|www\.)'
    and isi !~ E'\n{3,}'
    and isi !~ '^\s'
    and isi !~ '\s$'
  )
);
comment on table public.komentar is 'Komentar pelajaran. Pra-moderasi. Tampil ke publik hanya bila status = tampil.';
create index if not exists komentar_publik_idx  on public.komentar (pelajaran_id, created_at desc) where status = 'tampil';
create index if not exists komentar_pengguna_idx on public.komentar (user_id, created_at desc);
-- Cegah salin-tempel komentar sama oleh satu pengguna di satu pelajaran
create unique index if not exists komentar_tanpa_duplikat on public.komentar (user_id, pelajaran_id, md5(isi));

alter table public.komentar enable row level security;
revoke all on public.komentar from anon, authenticated;
-- Publik: hanya kolom yang aman, dan hanya baris berstatus tampil (kebijakan di bawah).
grant select (id, pelajaran_id, nama_tampil, isi, created_at) on public.komentar to anon;
grant select (id, pelajaran_id, nama_tampil, isi, created_at, user_id, status) on public.komentar to authenticated;
-- Pengguna masuk: hanya dua kolom yang boleh diisi. user_id, status, nama_tampil, created_at ditentukan server.
grant insert (pelajaran_id, isi) on public.komentar to authenticated;
grant delete on public.komentar to authenticated;
-- Admin: ubah status saja (RLS membatasi ke admin).
grant update (status) on public.komentar to authenticated;

drop policy if exists komentar_publik_baca on public.komentar;
create policy komentar_publik_baca on public.komentar for select to anon, authenticated
  using (status = 'tampil');
drop policy if exists komentar_milik_sendiri_baca on public.komentar;
create policy komentar_milik_sendiri_baca on public.komentar for select to authenticated
  using (user_id = (select auth.uid()));
drop policy if exists komentar_admin_baca on public.komentar;
create policy komentar_admin_baca on public.komentar for select to authenticated
  using ((select private.is_admin()));
drop policy if exists komentar_buat on public.komentar;
create policy komentar_buat on public.komentar for insert to authenticated
  with check (user_id = (select auth.uid()) and status = 'menunggu');
drop policy if exists komentar_hapus_sendiri on public.komentar;
create policy komentar_hapus_sendiri on public.komentar for delete to authenticated
  using (user_id = (select auth.uid()));
drop policy if exists komentar_admin_ubah_status on public.komentar;
create policy komentar_admin_ubah_status on public.komentar for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

-- C. Pemicu sebelum insert: nama tampil dari profil, batas laju per pengguna.
--    Batas: maks. 3 komentar per menit dan 30 per 24 jam. Melewati batas: galat 'komentar_terlalu_sering'.
create or replace function private.komentar_sebelum_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_nama text; v_menit int; v_hari int;
begin
  select p.nama_tampil into v_nama from public.profil p where p.user_id = new.user_id;
  if v_nama is null then
    raise exception 'profil_belum_ada' using errcode = 'P0001';
  end if;
  new.nama_tampil := v_nama;
  new.status := 'menunggu';
  select count(*) filter (where k.created_at > now() - interval '1 minute'),
         count(*) filter (where k.created_at > now() - interval '24 hours')
    into v_menit, v_hari
    from public.komentar k where k.user_id = new.user_id and k.created_at > now() - interval '24 hours';
  if v_menit >= 3 or v_hari >= 30 then
    raise exception 'komentar_terlalu_sering' using errcode = 'P0001';
  end if;
  return new;
end $$;
revoke all on function private.komentar_sebelum_insert() from public, anon, authenticated;
drop trigger if exists komentar_sebelum_insert on public.komentar;
create trigger komentar_sebelum_insert before insert on public.komentar
  for each row execute function private.komentar_sebelum_insert();

-- D. Laporan penyalahgunaan. Satu laporan per pengguna per komentar. Tiga pelapor berbeda menyembunyikan
--    komentar sementara (status kembali 'menunggu') sampai admin meninjau.
create table if not exists public.laporan_komentar (
  id          uuid primary key default gen_random_uuid(),
  komentar_id uuid not null references public.komentar(id) on delete cascade,
  pelapor_id  uuid not null default auth.uid() references auth.users(id) on delete cascade,
  alasan      text not null check (alasan in ('spam', 'kasar', 'data_pribadi', 'menyesatkan', 'lainnya')),
  catatan     text check (catatan is null or (char_length(catatan) <= 200 and catatan !~ '[<>]'
              and catatan !~ '[\u0001-\u001F\u007F-\u009F\u00AD\u061C\u180E\u200B-\u200F\u2028-\u202E\u2060-\u206F\uFEFF\uFFF9-\uFFFC]')),
  created_at  timestamptz not null default now(),
  unique (komentar_id, pelapor_id)
);
alter table public.laporan_komentar enable row level security;
revoke all on public.laporan_komentar from anon, authenticated;
grant insert (komentar_id, alasan, catatan) on public.laporan_komentar to authenticated;
grant select (id, komentar_id, alasan, created_at) on public.laporan_komentar to authenticated;
drop policy if exists laporan_buat on public.laporan_komentar;
create policy laporan_buat on public.laporan_komentar for insert to authenticated
  with check (pelapor_id = (select auth.uid())
    and exists (select 1 from public.komentar k where k.id = komentar_id and k.status = 'tampil'));
drop policy if exists laporan_baca_sendiri on public.laporan_komentar;
create policy laporan_baca_sendiri on public.laporan_komentar for select to authenticated
  using (pelapor_id = (select auth.uid()));
drop policy if exists laporan_admin_baca on public.laporan_komentar;
create policy laporan_admin_baca on public.laporan_komentar for select to authenticated
  using ((select private.is_admin()));
-- Admin perlu membaca catatan dan pelapor lewat dashboard SQL; API hanya memberi kolom di atas.

create or replace function private.laporan_sesudah_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(distinct l.pelapor_id) from public.laporan_komentar l where l.komentar_id = new.komentar_id) >= 3 then
    update public.komentar set status = 'menunggu' where id = new.komentar_id and status = 'tampil';
  end if;
  return null;
end $$;
revoke all on function private.laporan_sesudah_insert() from public, anon, authenticated;
drop trigger if exists laporan_sesudah_insert on public.laporan_komentar;
create trigger laporan_sesudah_insert after insert on public.laporan_komentar
  for each row execute function private.laporan_sesudah_insert();

-- E. Catatan moderasi tanpa data pribadi pengguna biasa: hanya id komentar, perubahan status, dan id admin (kosong bila otomatis dari laporan).
--    Tidak ada IP, email, atau isi komentar.
create table if not exists public.moderasi_log (
  id          bigint generated always as identity primary key,
  komentar_id uuid not null,
  dari_status text not null,
  ke_status   text not null,
  oleh        uuid,
  created_at  timestamptz not null default now()
);
alter table public.moderasi_log enable row level security;
revoke all on public.moderasi_log from anon, authenticated;
grant select on public.moderasi_log to authenticated;
drop policy if exists moderasi_log_admin_baca on public.moderasi_log;
create policy moderasi_log_admin_baca on public.moderasi_log for select to authenticated
  using ((select private.is_admin()));

create or replace function private.komentar_catat_status() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status is distinct from old.status then
    insert into public.moderasi_log (komentar_id, dari_status, ke_status, oleh)
    values (new.id, old.status, new.status,
            case when (select private.is_admin()) then (select auth.uid()) end);   -- otomatis (laporan) = null, bukan id pelapor
  end if;
  return new;
end $$;
revoke all on function private.komentar_catat_status() from public, anon, authenticated;
drop trigger if exists komentar_catat_status on public.komentar;
create trigger komentar_catat_status after update of status on public.komentar
  for each row execute function private.komentar_catat_status();

commit;

-- Pembatalan (bila perlu): drop table public.moderasi_log, public.laporan_komentar, public.komentar, public.profil cascade;
--   drop function private.komentar_sebelum_insert(), private.laporan_sesudah_insert(), private.komentar_catat_status();
