# Panduan Deploy ke Vercel

Proyek ini telah dikonfigurasi agar dapat langsung dideploy ke **Vercel** dengan arsitektur serverless (Node.js + Express API) dan frontend SPA (Vite + TypeScript), menggunakan database **Turso (LibSQL / SQLite)**.

---

## 1. Persiapan Database Turso

1. Buat akun di [Turso](https://turso.tech/) (atau instal Turso CLI: `brew install tursodatabase/tap/turso` / `curl -sSfL https://get.tur.so/install.sh | bash`).
2. Buat database baru di Turso:
   ```bash
   turso db create teaching-management
   ```
3. Dapatkan Database URL:
   ```bash
   turso db show teaching-management --url
   # Contoh output: libsql://teaching-management-username.turso.io
   ```
4. Buat Authentication Token:
   ```bash
   turso db tokens create teaching-management
   # Salin token yang dihasilkan
   ```

---

## 2. Deploy ke Vercel

### Opsi A: Menggunakan Vercel Dashboard (GitHub)
1. Push repository Anda ke GitHub / GitLab:
   ```bash
   git add .
   git commit -m "feat: setup fullstack typescript with turso and vercel deployment"
   git push origin main
   ```
2. Buka [Vercel Dashboard](https://vercel.com/new).
3. Pilih repository proyek `teach-manage` Anda dan klik **Import**.
4. Di bagian **Environment Variables**, tambahkan variabel berikut:
   | Key | Value / Contoh | Deskripsi |
   | :--- | :--- | :--- |
   | `TURSO_DATABASE_URL` | `libsql://teaching-management-xxx.turso.io` | URL database Turso Anda |
   | `TURSO_AUTH_TOKEN` | `eyJhbGci...` | Token otentikasi Turso |
   | `JWT_SECRET` | `rahasia_jwt_sangat_panjang_dan_aman` | Secret key untuk Access Token |
   | `JWT_REFRESH_SECRET` | `rahasia_jwt_refresh_sangat_aman` | Secret key untuk Refresh Token |
   | `JWT_ACCESS_EXPIRY_MINUTES` | `60` | Durasi Access Token (menit) |
   | `JWT_REFRESH_EXPIRY_DAYS` | `7` | Durasi Refresh Token (hari) |
5. Klik tombol **Deploy**.

---

### Opsi B: Menggunakan Vercel CLI
```bash
# Install Vercel CLI (jika belum)
npm i -g vercel

# Login dan deploy
vercel
```
Saat diminta, atur environment variables di dashboard Vercel atau via CLI:
```bash
vercel env add TURSO_DATABASE_URL
vercel env add TURSO_AUTH_TOKEN
vercel env add JWT_SECRET
vercel env add JWT_REFRESH_SECRET
```

---

## 3. Selesai!

Vercel akan otomatis men-generate URL publik (misal: `https://teach-manage.vercel.app`).
Skema database akan otomatis diinisialisasi saat pertama kali aplikasi dijalankan di Vercel.
