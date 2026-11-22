-- Uji lokal draf komentar.sql di Postgres biasa (bukan Supabase). Membuat basis data sementara berisi
-- tiruan minimal Supabase (peran anon/authenticated, auth.users, auth.uid()), memuat admin dan komentar,
-- lalu menguji RLS dan batas. Tidak menyentuh proyek Supabase mana pun.
-- Pakai (dari akar repo, sebagai pengguna postgres):
--   psql -v ON_ERROR_STOP=1 -f supabase/draf/uji-komentar-lokal.sql
-- Keluar dengan galat bila ada pemeriksaan yang gagal. Semua pemeriksaan memakai fungsi cek(nama, kondisi).

\set ON_ERROR_STOP on
drop database if exists uji_komentar;
create database uji_komentar;
\c uji_komentar

do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
end $$;

create schema auth;
create table auth.users (id uuid primary key default gen_random_uuid(), email text);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
grant usage on schema public to anon, authenticated;

create table public.waitlist (id uuid primary key default gen_random_uuid(), email text);   -- agar 001-admin.sql bisa dimuat
\i supabase/admin/001-admin.sql
\i supabase/draf/komentar.sql

-- pengguna uji
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@contoh.test'),
  ('00000000-0000-0000-0000-00000000000b', 'b@contoh.test'),
  ('00000000-0000-0000-0000-00000000000c', 'c@contoh.test'),
  ('00000000-0000-0000-0000-00000000000d', 'd@contoh.test'),
  ('00000000-0000-0000-0000-0000000000ad', 'admin@contoh.test');
insert into public.admins (user_id) values ('00000000-0000-0000-0000-0000000000ad');

create table hasil (nama text, ok boolean);
grant all on hasil to public;
create function cek(nama text, kondisi boolean) returns void language plpgsql as $$
begin insert into hasil values (nama, coalesce(kondisi, false)); end $$;
grant execute on function cek(text, boolean) to public;

-- pembantu: jalankan pernyataan sebagai peran/pengguna, kembalikan galat (atau 'ok')
create function coba(peran text, uid text, sqlteks text) returns text language plpgsql as $$
declare r text; begin
  perform set_config('request.jwt.claim.sub', coalesce(uid, ''), true);
  execute 'set local role ' || peran;
  begin execute sqlteks; r := 'ok';
  exception when others then r := sqlstate || ':' || sqlerrm; end;
  execute 'reset role';
  return r;
end $$;
grant execute on function coba(text, text, text) to public;
create function hitung(peran text, uid text, sqlteks text) returns bigint language plpgsql as $$
declare n bigint; begin
  perform set_config('request.jwt.claim.sub', coalesce(uid, ''), true);
  execute 'set local role ' || peran;
  begin execute sqlteks into n; exception when others then n := -1; end;
  execute 'reset role';
  return n;
end $$;
grant execute on function hitung(text, text, text) to public;

\set A '''00000000-0000-0000-0000-00000000000a'''
\set B '''00000000-0000-0000-0000-00000000000b'''
\set C '''00000000-0000-0000-0000-00000000000c'''
\set D '''00000000-0000-0000-0000-00000000000d'''
\set AD '''00000000-0000-0000-0000-0000000000ad'''

-- 1. Profil
select cek('profil: A membuat profil sendiri', coba('authenticated', :A, $q$insert into public.profil (user_id, nama_tampil) values ('00000000-0000-0000-0000-00000000000a', 'Ayu')$q$) = 'ok');
select cek('profil: B tidak bisa membuat profil atas nama A', coba('authenticated', :B, $q$insert into public.profil (user_id, nama_tampil) values ('00000000-0000-0000-0000-00000000000a', 'Palsu')$q$) like '42501%');
select cek('profil: nama dengan bidi ditolak', coba('authenticated', :B, $q$insert into public.profil (user_id, nama_tampil) values ('00000000-0000-0000-0000-00000000000b', E'Bud\u202Ei')$q$) like '23514%');
select cek('profil: nama berawalan = ditolak', coba('authenticated', :B, $q$insert into public.profil (user_id, nama_tampil) values ('00000000-0000-0000-0000-00000000000b', '=cmd')$q$) like '23514%');
select cek('profil: nama berisi < ditolak', coba('authenticated', :B, $q$insert into public.profil (user_id, nama_tampil) values ('00000000-0000-0000-0000-00000000000b', 'a<b>')$q$) like '23514%');
select cek('profil: B membuat profil sendiri', coba('authenticated', :B, $q$insert into public.profil (user_id, nama_tampil) values ('00000000-0000-0000-0000-00000000000b', 'Budi')$q$) = 'ok');
select cek('profil: C dan D membuat profil', coba('authenticated', :C, $q$insert into public.profil (user_id, nama_tampil) values ('00000000-0000-0000-0000-00000000000c', 'Citra')$q$) = 'ok'
  and coba('authenticated', :D, $q$insert into public.profil (user_id, nama_tampil) values ('00000000-0000-0000-0000-00000000000d', 'Dewi')$q$) = 'ok');
select cek('profil: anon tidak bisa membaca', coba('anon', null, 'select * from public.profil') like '42501%');
select cek('profil: A hanya melihat miliknya', hitung('authenticated', :A, 'select count(*) from public.profil') = 1);

-- 2. Insert komentar
select cek('komentar: anon tidak bisa insert', coba('anon', null, $q$insert into public.komentar (pelajaran_id, isi) values ('l1-m1-p1', 'halo')$q$) like '42501%');
select cek('komentar: A insert sah', coba('authenticated', :A, $q$insert into public.komentar (pelajaran_id, isi) values ('l1-m1-p1', 'Penjelasannya jelas, terima kasih.')$q$) = 'ok');
select cek('komentar: status awal menunggu dan nama dari profil', (select status = 'menunggu' and nama_tampil = 'Ayu' and user_id = '00000000-0000-0000-0000-00000000000a' from public.komentar limit 1));
select cek('komentar: klien tidak boleh mengisi status', coba('authenticated', :A, $q$insert into public.komentar (pelajaran_id, isi, status) values ('l1-m1-p1', 'x1', 'tampil')$q$) like '42501%');
select cek('komentar: klien tidak boleh mengisi user_id', coba('authenticated', :A, $q$insert into public.komentar (pelajaran_id, isi, user_id) values ('l1-m1-p1', 'x2', '00000000-0000-0000-0000-00000000000b')$q$) like '42501%');
select cek('komentar: klien tidak boleh mengisi nama_tampil', coba('authenticated', :A, $q$insert into public.komentar (pelajaran_id, isi, nama_tampil) values ('l1-m1-p1', 'x3', 'Admin Resmi')$q$) like '42501%');
select cek('komentar: duplikat ditolak', coba('authenticated', :A, $q$insert into public.komentar (pelajaran_id, isi) values ('l1-m1-p1', 'Penjelasannya jelas, terima kasih.')$q$) like '23505%');
select cek('komentar: tanpa profil ditolak', coba('authenticated', '00000000-0000-0000-0000-0000000000ad', $q$insert into public.komentar (pelajaran_id, isi) values ('l1-m1-p1', 'admin tanpa profil')$q$) like 'P0001:profil_belum_ada%');
select cek('komentar: isi kosong ditolak', coba('authenticated', :B, $q$insert into public.komentar (pelajaran_id, isi) values ('l1-m1-p1', '')$q$) like '23514%');
select cek('komentar: 501 karakter ditolak', coba('authenticated', :B, $q$insert into public.komentar (pelajaran_id, isi) values ('l1-m1-p1', repeat('a', 501))$q$) like '23514%');
select cek('komentar: 500 karakter diterima', coba('authenticated', :B, $q$insert into public.komentar (pelajaran_id, isi) values ('l1-m1-p1', repeat('b', 500))$q$) = 'ok');
select cek('komentar: tag HTML ditolak', coba('authenticated', :B, $q$insert into public.komentar (pelajaran_id, isi) values ('l1-m1-p1', '<img src=x onerror=alert(1)>')$q$) like '23514%');
select cek('komentar: tautan http ditolak', coba('authenticated', :B, $q$insert into public.komentar (pelajaran_id, isi) values ('l1-m1-p1', 'lihat HTTPS://contoh.test')$q$) like '23514%');
select cek('komentar: www ditolak', coba('authenticated', :B, $q$insert into public.komentar (pelajaran_id, isi) values ('l1-m1-p1', 'kunjungi www.contoh.test')$q$) like '23514%');
select cek('komentar: javascript: ditolak', coba('authenticated', :B, $q$insert into public.komentar (pelajaran_id, isi) values ('l1-m1-p1', 'javascript:alert(1)')$q$) like '23514%');
select cek('komentar: pengecoh bidi ditolak', coba('authenticated', :B, $q$insert into public.komentar (pelajaran_id, isi) values ('l1-m1-p1', E'teks \u202Eterbalik')$q$) like '23514%');
select cek('komentar: lebar nol ditolak', coba('authenticated', :B, $q$insert into public.komentar (pelajaran_id, isi) values ('l1-m1-p1', E'ke\u200Bcoh')$q$) like '23514%');
select cek('komentar: karakter kontrol ditolak', coba('authenticated', :B, $q$insert into public.komentar (pelajaran_id, isi) values ('l1-m1-p1', E'a\u0007b')$q$) like '23514%');
select cek('komentar: tiga baris kosong ditolak', coba('authenticated', :B, $q$insert into public.komentar (pelajaran_id, isi) values ('l1-m1-p1', E'a\n\n\nb')$q$) like '23514%');
select cek('komentar: spasi di ujung ditolak', coba('authenticated', :B, $q$insert into public.komentar (pelajaran_id, isi) values ('l1-m1-p1', 'a ')$q$) like '23514%');
select cek('komentar: id pelajaran aneh ditolak', coba('authenticated', :B, $q$insert into public.komentar (pelajaran_id, isi) values ('../x', 'ok')$q$) like '23514%');
select cek('komentar: SQL injection hanya jadi teks', coba('authenticated', :B, $q$insert into public.komentar (pelajaran_id, isi) values ('l1-m1-p1', $$'); drop table public.komentar; --$$)$q$) = 'ok' and to_regclass('public.komentar') is not null);
select cek('komentar: injeksi tersimpan sebagai teks biasa', exists (select 1 from public.komentar where isi like '%drop table%'));
select cek('komentar: emoji dan huruf Unicode diterima', coba('authenticated', :C, $q$insert into public.komentar (pelajaran_id, isi) values ('l1-m1-p1', 'Mantap 👍 café ñ 日本')$q$) = 'ok');

-- 3. Batas laju: D dapat 3 per menit
select cek('laju: komentar 1-3 diterima', coba('authenticated', :D, $q$insert into public.komentar (pelajaran_id, isi) values ('l1-m1-p1', 'satu')$q$) = 'ok'
  and coba('authenticated', :D, $q$insert into public.komentar (pelajaran_id, isi) values ('l1-m1-p1', 'dua')$q$) = 'ok'
  and coba('authenticated', :D, $q$insert into public.komentar (pelajaran_id, isi) values ('l1-m1-p1', 'tiga')$q$) = 'ok');
select cek('laju: komentar ke-4 dalam semenit ditolak', coba('authenticated', :D, $q$insert into public.komentar (pelajaran_id, isi) values ('l1-m1-p1', 'empat')$q$) like 'P0001:komentar_terlalu_sering%');

-- 4. Membaca
select cek('baca: anon tidak melihat komentar menunggu', hitung('anon', null, 'select count(*) from public.komentar') = 0);
select cek('baca: pemilik melihat komentarnya sendiri', hitung('authenticated', :A, 'select count(*) from public.komentar') = 1);
select cek('baca: pengguna lain tidak melihat komentar menunggu orang lain', hitung('authenticated', :C, $q$select count(*) from public.komentar where user_id <> '00000000-0000-0000-0000-00000000000c'$q$) = 0);
select cek('baca: admin melihat semua', hitung('authenticated', :AD, 'select count(*) from public.komentar') = (select count(*) from public.komentar));

-- 5. Moderasi
select cek('moderasi: A mencoba menyetujui komentarnya sendiri', coba('authenticated', :A, $q$update public.komentar set status = 'tampil' where user_id = '00000000-0000-0000-0000-00000000000a'$q$) = 'ok');
select cek('moderasi: status komentar A tetap menunggu', (select status from public.komentar where user_id = '00000000-0000-0000-0000-00000000000a') = 'menunggu');
select cek('moderasi: pengguna tidak bisa mengubah isi', coba('authenticated', :A, $q$update public.komentar set isi = 'diubah' where user_id = '00000000-0000-0000-0000-00000000000a'$q$) like '42501%');
select cek('moderasi: admin menjalankan update status', coba('authenticated', :AD, $q$update public.komentar set status = 'tampil' where user_id = '00000000-0000-0000-0000-00000000000a'$q$) = 'ok');
select cek('moderasi: status berubah menjadi tampil', (select status from public.komentar where user_id = '00000000-0000-0000-0000-00000000000a') = 'tampil');
select cek('moderasi: admin tidak bisa mengubah isi lewat API', coba('authenticated', :AD, $q$update public.komentar set isi = 'x' where user_id = '00000000-0000-0000-0000-00000000000a'$q$) like '42501%');
select cek('moderasi: catatan mencatat admin', (select count(*) = 1 and bool_and(oleh = '00000000-0000-0000-0000-0000000000ad') from public.moderasi_log));
select cek('baca: anon melihat komentar tampil, hanya kolom aman', hitung('anon', null, 'select count(*) from public.komentar') = 1
  and coba('anon', null, 'select user_id from public.komentar') like '42501%'
  and coba('anon', null, 'select status from public.komentar') like '42501%'
  and coba('anon', null, 'select id, pelajaran_id, nama_tampil, isi, created_at from public.komentar') = 'ok');

-- 6. Laporan
select cek('laporan: B melapor komentar tampil', coba('authenticated', :B, $q$insert into public.laporan_komentar (komentar_id, alasan) select id, 'spam' from public.komentar where status = 'tampil'$q$) = 'ok');
select cek('laporan: pelapor sama dua kali ditolak', coba('authenticated', :B, $q$insert into public.laporan_komentar (komentar_id, alasan) select id, 'kasar' from public.komentar where status = 'tampil'$q$) like '23505%');
select cek('laporan: alasan di luar daftar ditolak', coba('authenticated', :C, $q$insert into public.laporan_komentar (komentar_id, alasan) select id, 'iseng' from public.komentar where status = 'tampil'$q$) like '23514%');
select cek('laporan: catatan berisi < ditolak', coba('authenticated', :C, $q$insert into public.laporan_komentar (komentar_id, alasan, catatan) select id, 'spam', '<b>' from public.komentar where status = 'tampil'$q$) like '23514%');
select cek('laporan: anon tidak bisa melapor', coba('anon', null, $q$insert into public.laporan_komentar (komentar_id, alasan) select id, 'spam' from public.komentar$q$) like '42501%');
select cek('laporan: tidak bisa mengatasnamakan orang lain', coba('authenticated', :C, $q$insert into public.laporan_komentar (komentar_id, alasan, pelapor_id) select id, 'spam', '00000000-0000-0000-0000-00000000000d' from public.komentar where status = 'tampil'$q$) like '42501%');
select cek('laporan: C melapor', coba('authenticated', :C, $q$insert into public.laporan_komentar (komentar_id, alasan) select id, 'spam' from public.komentar where status = 'tampil'$q$) = 'ok');
select cek('laporan: dua pelapor belum menyembunyikan', (select status from public.komentar where user_id = '00000000-0000-0000-0000-00000000000a') = 'tampil');
select cek('laporan: D melapor', coba('authenticated', :D, $q$insert into public.laporan_komentar (komentar_id, alasan) select id, 'lainnya' from public.komentar where status = 'tampil'$q$) = 'ok');
select cek('laporan: tiga pelapor mengembalikan komentar ke menunggu', (select status from public.komentar where user_id = '00000000-0000-0000-0000-00000000000a') = 'menunggu');
select cek('laporan: perubahan otomatis tercatat tanpa id pelapor', (select count(*) = 2 and count(*) filter (where oleh is null) = 1 from public.moderasi_log));
select cek('laporan: pelapor hanya melihat laporannya sendiri', hitung('authenticated', :B, 'select count(*) from public.laporan_komentar') = 1);
select cek('laporan: pelapor tidak bisa membaca pelapor_id', coba('authenticated', :B, 'select pelapor_id from public.laporan_komentar') like '42501%');
select cek('laporan: anon tidak bisa membaca', coba('anon', null, 'select 1 from public.laporan_komentar') like '42501%');

-- 7. Hapus dan tabel sensitif
select cek('hapus: B mencoba menghapus komentar A', coba('authenticated', :B, $q$delete from public.komentar where user_id = '00000000-0000-0000-0000-00000000000a'$q$) = 'ok');
select cek('hapus: komentar A tetap ada', (select count(*) from public.komentar where user_id = '00000000-0000-0000-0000-00000000000a') = 1);
select cek('hapus: A menghapus komentarnya sendiri', coba('authenticated', :A, $q$delete from public.komentar where user_id = '00000000-0000-0000-0000-00000000000a'$q$) = 'ok');
select cek('hapus: komentar A hilang', (select count(*) from public.komentar where user_id = '00000000-0000-0000-0000-00000000000a') = 0);
select cek('moderasi_log: pengguna biasa tidak melihat', hitung('authenticated', :B, 'select count(*) from public.moderasi_log') = 0);
select cek('moderasi_log: admin melihat', hitung('authenticated', :AD, 'select count(*) from public.moderasi_log') >= 1);
select cek('moderasi_log: tidak bisa ditulis lewat API', coba('authenticated', :AD, $q$insert into public.moderasi_log (komentar_id, dari_status, ke_status) values (gen_random_uuid(), 'a', 'b')$q$) like '42501%');
select cek('admins: tidak bisa ditulis lewat API', coba('authenticated', :B, $q$insert into public.admins (user_id) values ('00000000-0000-0000-0000-00000000000b')$q$) like '42501%');
select cek('fungsi pemicu tidak bisa dipanggil langsung', coba('authenticated', :B, 'select private.komentar_sebelum_insert()') like '42501%');
select cek('RLS aktif di semua tabel baru', (select bool_and(relrowsecurity) from pg_class where oid in ('public.profil'::regclass, 'public.komentar'::regclass, 'public.laporan_komentar'::regclass, 'public.moderasi_log'::regclass)));

\echo
select (case when ok then 'lulus  ' else 'GAGAL  ' end) || nama as hasil from hasil order by ok, nama;
select count(*) filter (where ok) as lulus, count(*) filter (where not ok) as gagal from hasil \gset
\echo Ringkasan: :lulus lulus, :gagal gagal
do $$ begin if exists (select 1 from hasil where not ok) then raise exception 'ada pemeriksaan gagal'; end if; end $$;
