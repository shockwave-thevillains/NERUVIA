-- NERUVIA · tabel waitlist (Supabase / PostgreSQL)
-- STATUS: DRAF. Belum diterapkan ke proyek mana pun.
-- Jangan jalankan sebelum placeholder di kebijakan-privasi.html terisi
-- (identitas pengendali data, alamat, kontak, prosesor, tanggal berlaku).

create table if not exists public.waitlist (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  name         text,
  email        text not null,
  -- kunci unik huruf kecil agar Budi@x.com dan budi@x.com dianggap sama
  email_key    text generated always as (lower(btrim(email))) stored,
  jalur        text not null default 'AI dari Nol',
  consent      boolean not null,
  consent_text text not null,
  client_ts    timestamptz,
  constraint waitlist_email_unique unique (email_key),
  constraint waitlist_email_fmt    check (email ~* '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$' and char_length(email) <= 254),
  constraint waitlist_name_len     check (name is null or char_length(name) <= 60),
  constraint waitlist_jalur_ok     check (jalur in ('AI dari Nol','AI untuk Kerja','AI Lanjutan','Masih bingung')),
  constraint waitlist_consent_true check (consent is true),
  constraint waitlist_consent_text check (char_length(consent_text) between 10 and 400)
);

comment on table public.waitlist is
  'Pendaftar waitlist NERUVIA. Data pribadi (UU 27/2022): nama panggilan, email, level minat, bukti persetujuan.';

-- Row Level Security: pengunjung anonim hanya boleh MENAMBAH baris.
-- Tidak ada kebijakan select/update/delete, jadi daftar email tidak bisa dibaca dari browser.
alter table public.waitlist enable row level security;

drop policy if exists waitlist_insert_anon on public.waitlist;
create policy waitlist_insert_anon
  on public.waitlist
  for insert
  to anon
  with check (consent is true);

revoke all on public.waitlist from anon, authenticated;
grant insert on public.waitlist to anon;

-- Penghapusan atas permintaan pemilik data dilakukan manual oleh pengelola lewat dashboard
-- (service role), mis.: delete from public.waitlist where email_key = lower(btrim('alamat@email.com'));
