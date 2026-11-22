-- NERUVIA · waitlist · perketat validasi di server (S2)
-- STATUS: DRAF. TIDAK diterapkan ke proyek mana pun. Master yang menerapkannya ke neruvia-dev
-- (SQL Editor), setelah membaca catatan di bawah. Dasar: supabase/waitlist.sql (sudah diterapkan di neruvia-dev).
-- Temuan yang ditangani: K6 (hak insert per kolom), K7 (karakter nama dan email), K4 sebagian (teks persetujuan
-- hanya yang dikenal), K1 (fungsi opsional yang membalas sama untuk email baru dan lama).
--
-- Aturan: server tidak boleh lebih longgar daripada validasi klien di index.html (fungsi norm, NAME, EMAIL).
-- Klien menormalisasi lebih dulu (NFKC, buang karakter kontrol/lebar nol/bidi, rapikan spasi), jadi di sini
-- nilai yang MASIH memuat karakter itu ditolak, bukan diperbaiki.
--
-- Catatan penerapan:
--  * Constraint ditambah dengan NOT VALID supaya baris uji lama tidak menggagalkan migrasi. Setelah baris uji
--    dihapus atau dirapikan, jalankan bagian VALIDATE di akhir berkas.
--  * Bagian A–C aman diterapkan tanpa mengubah situs. Bagian D (fungsi) hanya berguna bila klien nanti diarahkan
--    ke /rest/v1/rpc/join_waitlist; itu mengubah endpoint form dan merupakan keputusan Master, jadi tidak
--    dikerjakan run otomatis. Selama klien masih POST ke /rest/v1/waitlist, JANGAN jalankan bagian D2.
--  * Teks persetujuan: bila teks di index.html diubah (consent_text), tambahkan nilai barunya di constraint C3
--    sebelum situs dirilis, kalau tidak pendaftaran akan ditolak.

begin;

-- A. K6 · Hak insert per kolom. Anon tidak boleh mengisi id, created_at, atau kolom turunan.
revoke insert on public.waitlist from anon;
grant  insert (name, email, jalur, consent, consent_text, client_ts) on public.waitlist to anon;

-- B. K7 · Karakter yang dibolehkan
-- B1. Nama: boleh kosong (null). Bila ada: 1–60 karakter, huruf/angka/spasi/titik/apostrof/strip,
--     diawali huruf atau angka (mencegah sel spreadsheet berawalan = + - @), tanpa spasi ganda atau di ujung,
--     tanpa karakter kontrol, lebar nol, atau pengecoh arah. [[:alnum:]] mengikuti locale basis data
--     (UTF-8 mengenali huruf Unicode); di locale C hanya ASCII, yang tetap lebih ketat, bukan lebih longgar.
alter table public.waitlist drop constraint if exists waitlist_name_len;
alter table public.waitlist drop constraint if exists waitlist_name_chars;
alter table public.waitlist add constraint waitlist_name_chars check (
  name is null or (
    char_length(name) between 1 and 60
    and name ~ '^[[:alnum:]][[:alnum:] .''’-]*$'
    and name = btrim(name)
    and name !~ '  '
    and name !~ '[\u0001-\u001F\u007F-\u009F\u00AD\u061C\u180E\u200B-\u200F\u2028-\u202E\u2060-\u206F\uFEFF\uFFF9-\uFFFC]'
  )
) not valid;

-- B2. Email: ASCII saja, bagian lokal maks. 64 karakter, diawali huruf/angka, tanpa titik ganda,
--     total maks. 254. Email internasional (IDN) belum didukung; tambahkan bila ada kebutuhan.
alter table public.waitlist drop constraint if exists waitlist_email_fmt;
alter table public.waitlist drop constraint if exists waitlist_email_strict;
alter table public.waitlist add constraint waitlist_email_strict check (
  char_length(email) <= 254
  and email ~ '^[A-Za-z0-9][A-Za-z0-9._%+-]{0,63}@[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?(\.[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*\.[A-Za-z]{2,24}$'
  and email !~ '\.\.'
) not valid;

-- C. K4 sebagian · hanya teks persetujuan yang dikenal (versi yang tampil di formulir).
alter table public.waitlist drop constraint if exists waitlist_consent_text;
alter table public.waitlist drop constraint if exists waitlist_consent_text_known;
alter table public.waitlist add constraint waitlist_consent_text_known check (
  consent_text in ('v4 2026-11-19 (18+, nama, email, level; sampai peluncuran; kebijakan-privasi.html v2)')
) not valid;

commit;

-- D. K1 · Jawaban sama untuk email baru dan email lama (OPSIONAL, lihat catatan penerapan).
-- D1. Fungsi: sisipkan, abaikan duplikat, selalu balas sama. Berjalan sebagai pemilik, jadi anon tidak
--     perlu hak insert langsung pada tabel bila klien memakai fungsi ini.
create or replace function public.join_waitlist(p_name text, p_email text, p_jalur text, p_consent_text text)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  insert into public.waitlist (name, email, jalur, consent, consent_text, client_ts)
  values (nullif(p_name, ''), p_email, p_jalur, true, p_consent_text, now())
  on conflict (email_key) do nothing;
  -- Pelanggaran constraint format (bukan duplikat) tetap melempar galat 23514 sehingga klien tahu
  -- isiannya salah; itu tidak membocorkan status pendaftaran email mana pun.
end;
$$;

revoke all on function public.join_waitlist(text, text, text, text) from public;
revoke all on function public.join_waitlist(text, text, text, text) from anon, authenticated;

-- D2. Setelah klien dialihkan ke rpc (keputusan Master), jalankan dua baris ini:
--   grant execute on function public.join_waitlist(text, text, text, text) to anon;
--   revoke insert on public.waitlist from anon;     -- tutup jalur insert langsung (dan celah 409)

-- E. Setelah baris lama dirapikan, aktifkan pemeriksaan penuh:
--   alter table public.waitlist validate constraint waitlist_name_chars;
--   alter table public.waitlist validate constraint waitlist_email_strict;
--   alter table public.waitlist validate constraint waitlist_consent_text_known;
