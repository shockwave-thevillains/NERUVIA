/* Konfigurasi publik build dev. Hanya berisi kunci publishable (aman dipublikasikan, dibatasi RLS insert-only).
   Jangan taruh kunci service_role atau rahasia lain di sini. Sebelum merge ke main, tinjau ulang berkas ini. */
window.NERUVIA_WAITLIST_ENDPOINT = 'https://buxnhdafaafhrlviaotw.supabase.co/rest/v1/waitlist';
window.NERUVIA_WAITLIST_HEADERS = {
  apikey: 'sb_publishable_H6peNS8IuBEqE36qnmfQEg_ImzvepZQ',
  Authorization: 'Bearer sb_publishable_H6peNS8IuBEqE36qnmfQEg_ImzvepZQ',
  Prefer: 'return=minimal'
};
