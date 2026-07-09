# Panduan Setup di Supabase

Untuk menjalankan aplikasi menggunakan mode `supabase`, Anda perlu menyiapkan proyek dan skema database di dashboard Supabase Anda.

Berikut langkah-langkah detailnya:

---

## 1. Buat Proyek Baru di Supabase
1. Masuk ke [Supabase Dashboard](https://supabase.com/).
2. Klik **New Project** dan pilih organisasi Anda.
3. Masukkan nama proyek (misal: `teaching-management`), atur password database, dan pilih region terdekat (misal: *Singapore*).
4. Tunggu beberapa menit hingga proyek selesai dibuat.

---

## 2. Setup Skema Database (Menjalankan Migrasi)
Supabase menyediakan SQL Editor untuk menjalankan query SQL. Kita perlu membuat tabel-tabel sesuai skema aplikasi.

1. Di menu sidebar kiri dashboard Supabase, masuk ke menu **SQL Editor**.
2. Klik **New Query**.
3. Buka file migrasi lokal proyek Anda di [001_init.sql](file:///c:/projects/teaching-management/pkg/database/migrations/001_init.sql), lalu salin seluruh isi kodenya.
4. Paste kode SQL tersebut ke dalam SQL Editor di Supabase.
5. Klik tombol **Run** di pojok kanan bawah.
6. Pastikan output menunjukkan bahwa query sukses dijalankan dan tabel-tabel (`users`, `students`, `subjects`, dll.) telah dibuat.

---

## 3. Konfigurasi Row Level Security (RLS)

Supabase mengaktifkan fitur **Row Level Security (RLS)** secara default untuk keamanan tabel. Namun, karena aplikasi Go kita bertindak sebagai backend server yang aman (memiliki otentikasi JWT sendiri), ada **dua cara** untuk menangani RLS:

### Opsi A: Menggunakan `service_role` key (Sangat Direkomendasikan & Paling Mudah)
Gunakan key **`service_role`** (bukan `anon` key) sebagai nilai untuk `SUPABASE_ANON_KEY` di Railway/.env Anda. 
- *Kenapa?* Key `service_role` memiliki hak akses admin (bypass RLS), sehingga backend Go Anda bisa membaca dan menulis data ke database Supabase tanpa harus membuat RLS Policy satu per satu.
- **Peringatan Keamanan**: Jangan pernah membagikan `service_role` key ke client-side (web browser/aplikasi mobile). Menyimpannya di backend server Go (seperti Railway) aman.

### Opsi B: Menonaktifkan RLS (Alternatif)
Jika Anda tetap ingin menggunakan `anon` key standar, Anda harus menonaktifkan RLS pada seluruh tabel di Supabase agar backend Go bisa mengaksesnya secara publik:
1. Masuk ke menu **Database** -> **Tables** di Supabase.
2. Untuk setiap tabel (`users`, `students`, `subjects`, `parents`, `student_subjects`, `schedules`, `sessions`, `reports`):
   - Klik ikon titik tiga di sebelah nama tabel.
   - Pilih **Disable Row Level Security (RLS)**.

---

## 4. Mendapatkan API URL dan API Keys
Untuk mengisi variabel environment di proyek Anda:

1. Di dashboard Supabase, masuk ke **Project Settings** (ikon gerigi di kiri bawah) -> **API**.
2. Cari bagian **Project API Keys**:
   - `anon` key (jika menggunakan Opsi B).
   - `service_role` key (jika menggunakan Opsi A - **Direkomendasikan**).
   - Salin nilainya untuk dijadikan `SUPABASE_ANON_KEY`.
3. Cari bagian **Project URL**:
   - Salin URL API (contoh: `https://xxxx.supabase.co`) untuk dijadikan `SUPABASE_URL`.
