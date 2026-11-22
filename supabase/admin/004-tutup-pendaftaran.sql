-- NERUVIA, 22 Nov 2026 (permintaan Master): tutup pendaftaran akun Auth sementara (menutup temuan K2).
-- Setiap INSERT ke auth.users ditolak, baik lewat pendaftaran publik maupun pembuatan user di dashboard.
-- Akun yang sudah ada (akun dummy admin) tetap bisa masuk. Diterapkan ke neruvia-dev (migrasi tutup_pendaftaran_auth).
--
-- Membuka kembali (mis. saat membuat akun admin sungguhan di dashboard, lalu tutup lagi):
--   drop trigger tolak_pendaftaran on auth.users;
-- Menutup lagi:
--   create trigger tolak_pendaftaran before insert on auth.users for each row execute function private.tolak_pendaftaran();
-- Pengaturan bawaan Supabase yang setara: Authentication, Sign In / Providers, matikan "Allow new users to sign up".

create or replace function private.tolak_pendaftaran() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  raise exception 'Pendaftaran akun ditutup sementara.' using errcode = 'P0001';
end $$;
revoke all on function private.tolak_pendaftaran() from public, anon, authenticated;

drop trigger if exists tolak_pendaftaran on auth.users;
create trigger tolak_pendaftaran before insert on auth.users
  for each row execute function private.tolak_pendaftaran();
