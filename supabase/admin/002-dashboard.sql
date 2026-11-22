-- NERUVIA admin, tahap 2 (22 Nov 2026): ringkasan waitlist untuk dashboard.
-- View memakai security_invoker, jadi RLS tabel waitlist tetap berlaku untuk pemanggil:
-- admin melihat angka sebenarnya, akun login lain melihat 0 baris, anon ditolak (tanpa hak select).
-- View hanya memuat agregat; tidak ada nama atau email di dalamnya.

create or replace view public.waitlist_per_hari with (security_invoker = true) as
  select (w.created_at at time zone 'Asia/Jakarta')::date as hari, count(*)::int as jumlah
  from public.waitlist w
  group by 1;

create or replace view public.waitlist_per_jalur with (security_invoker = true) as
  select w.jalur, count(*)::int as jumlah
  from public.waitlist w
  group by 1;

revoke all on public.waitlist_per_hari, public.waitlist_per_jalur from public, anon, authenticated;
grant select on public.waitlist_per_hari, public.waitlist_per_jalur to authenticated;
