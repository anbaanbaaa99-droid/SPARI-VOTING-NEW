SPARI ELECTION 2026 - VERSI PERBAIKAN
=====================================

PERBAIKAN YANG SUDAH DITERAPKAN
1. File utama sudah memakai nama normal: index.html, style.css, dan script.js.
2. Struktur dua kartu kandidat sudah diperbaiki.
3. Menu Pemilihan, Hasil Vote, Hasil Akhir, dan Admin sudah dapat dibuka.
4. URL API ditempatkan hanya di config.js agar mudah diganti.
5. Diagram hasil tersedia pada halaman utama, hasil akhir, dan dashboard admin.
6. Dashboard admin menampilkan total, data pemilih, pencarian, diagram, buka/tutup voting, dan export CSV.
7. Proteksi satu user satu vote dilakukan di SERVER berdasarkan ID peserta, bukan hanya localStorage.
8. Request no-cors dihapus sehingga pesan duplikat/gagal dari server dapat dibaca browser.
9. Admin login memakai sessionStorage dan seluruh data admin tetap diverifikasi oleh server.

CARA MEMASANG BACKEND GOOGLE APPS SCRIPT
1. Buka Google Spreadsheet yang akan menyimpan hasil vote.
2. Pilih Extensions > Apps Script.
3. Hapus kode lama, lalu salin seluruh isi Code.gs dari paket ini.
4. Pada bagian CONFIG, ganti ADMIN_PASSWORD: "SPARI2026" dengan password Anda.
5. Sesuaikan DEFAULT_DEADLINE jika diperlukan.
6. Klik Deploy > Manage deployments.
   - Untuk mempertahankan URL lama: edit deployment yang sudah ada, pilih New version, lalu Deploy.
   - Untuk deployment baru: pilih New deployment > Web app.
7. Execute as: Me.
8. Who has access: Anyone.
9. Salin URL yang berakhir /exec.
10. Buka config.js dan isi API_URL dengan URL tersebut jika URL berubah.

CARA UPLOAD KE HOSTING
Upload seluruh isi ZIP langsung ke public_html/domain tujuan. Jangan mengubah nama file berikut:
- index.html
- style.css
- script.js
- config.js
- admin-login.html
- admin-login.js
- admin.html
- admin.js
- admin.css
- winner.html
- winner.js
- winner.css
- closed.html
- folder assets

CATATAN GAMBAR
Folder assets berisi gambar SVG placeholder. Ganti dengan gambar asli bila tersedia, tetapi pertahankan nama file:
- logo-spari.svg
- kandidat-1.svg
- kandidat-2.svg
Atau ubah path gambar pada index.html ke JPG/PNG milik Anda.

PENGUJIAN WAJIB
A. Vote pertama memakai ID A001 harus berhasil.
B. Vote kedua memakai ID A001, meskipun nama/kandidat berbeda, harus ditolak.
C. Vote memakai ID A002 harus berhasil.
D. Tutup voting dari admin, lalu coba vote: harus ditolak.
E. Buka voting kembali dari admin: ID baru dapat vote.
F. Refresh admin: total, tabel, dan diagram harus konsisten.

PASSWORD ADMIN DEFAULT
SPARI2026
Ganti password ini di Code.gs sebelum dipublikasikan.
