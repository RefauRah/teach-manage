# Panduan Deploy ke Railway

Proyek ini telah dilengkapi dengan `Dockerfile` multi-stage yang siap pakai. Railway secara otomatis akan mendeteksi `Dockerfile` tersebut, melakukan build image, dan menjalankannya.

Berikut adalah langkah-langkah detail untuk melakukan deployment ke Railway.

---

## Langkah 1: Persiapan Repositori Git

Pastikan perubahan kode terakhir Anda (refactoring database dan Supabase) sudah di-commit dan di-push ke repositori Git Anda (GitHub/GitLab):
```bash
git add .
git commit -m "feat: add supabase db mode and update project structure"
git push origin main
```

---

## Langkah 2: Buat Project Baru di Railway

1. Masuk ke [Railway Console](https://railway.app/).
2. Klik tombol **New Project** di pojok kanan atas.
3. Pilih **Deploy from GitHub repo**.
4. Cari dan pilih repositori proyek `teaching-management` Anda.
5. Klik **Deploy Now**. 
   > *Catatan: Awalnya build mungkin akan gagal/pending karena Anda belum mengatur Environment Variables.*

---

## Langkah 3: Mengatur Environment Variables

Di Railway, buka tab **Variables** pada service aplikasi Anda, lalu tambahkan environment variables berikut berdasarkan mode database yang ingin digunakan.

### A. Opsi 1: Menggunakan Database Supabase (Rekomendasi)
Jika ingin menggunakan mode database Supabase, tambahkan variabel berikut:

| Key | Value / Contoh | Deskripsi |
| :--- | :--- | :--- |
| `DB_MODE` | `supabase` | Mengaktifkan mode database Supabase via HTTP REST API. |
| `SUPABASE_URL` | `https://xxxx.supabase.co` | URL API Supabase Anda. |
| `SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ...` | Anon Key Supabase Anda. |
| `JWT_SECRET` | *SecretKeyPanjangAcakDanAman* | Key enkripsi untuk access token JWT. |
| `JWT_REFRESH_SECRET` | *SecretKeyLainnyaYangAman* | Key enkripsi untuk refresh token JWT. |
| `JWT_ACCESS_EXPIRY_MINUTES` | `60` | Durasi kedaluwarsa access token (dalam menit). |
| `JWT_REFRESH_EXPIRY_DAYS` | `7` | Durasi kedaluwarsa refresh token (dalam hari). |

---

### B. Opsi 2: Menggunakan Database PostgreSQL bawaan Railway
Jika Anda ingin mendepoloy PostgreSQL langsung di Railway sebagai database terpisah:

1. Di dashboard proyek Railway Anda, klik **+ New** -> **Database** -> **Add PostgreSQL**.
2. Railway akan membuat instance database PostgreSQL baru.
3. Kembali ke service aplikasi Anda, masuk ke tab **Variables** dan tambahkan variabel berikut (menghubungkan otomatis dengan database Railway):

| Key | Value (Menggunakan Reference Variable Railway) |
| :--- | :--- |
| `DB_MODE` | `postgres` |
| `DB_HOST` | `${{Postgres.DATABASE_PRIVATE_URL}}` |
| `DB_PORT` | `5432` |
| `DB_USER` | `${{Postgres.POSTGRES_USER}}` |
| `DB_PASSWORD` | `${{Postgres.POSTGRES_PASSWORD}}` |
| `DB_NAME` | `${{Postgres.POSTGRES_DB}}` |
| `DB_SSLMODE` | `disable` |
| `JWT_SECRET` | *SecretKeyAman* |
| `JWT_REFRESH_SECRET` | *SecretKeyAman* |
| `JWT_ACCESS_EXPIRY_MINUTES` | `60` |
| `JWT_REFRESH_EXPIRY_DAYS` | `7` |

---

## Langkah 4: Hubungkan Domain & Selesai

1. Secara default, Railway tidak langsung mengekspos aplikasi ke publik. Pergi ke tab **Settings** pada service aplikasi Anda.
2. Di bagian **Networking**, cari sub-bagian **Public Networking** dan klik **Generate Domain** (atau masukkan custom domain Anda sendiri).
3. Railway akan membuat link publik seperti `https://teaching-management-production.up.railway.app`.
4. Buka domain tersebut di browser untuk memastikan aplikasi berjalan lancar!
