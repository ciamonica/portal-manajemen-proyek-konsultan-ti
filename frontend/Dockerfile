# ========================================================
# KATEGORI      : Docker Configuration (Frontend)
# DESKRIPSI     : File definisi kontainer untuk layanan frontend menggunakan multi-stage build.
# FUNGSI UTAMA  : Membangun aplikasi React dengan Vite, lalu menyajikannya melalui Nginx.
# ========================================================

# --------------------------------------------------------
# STAGE 1: Build
# Mengompilasi source code React menjadi file statis (HTML, CSS, JS).
# --------------------------------------------------------
FROM node:20-alpine AS build

# Menetapkan direktori kerja untuk proses build
WORKDIR /app

# Menyalin file package.json dan package-lock.json
COPY package*.json ./
# Menginstal semua dependensi (termasuk devDependencies untuk build)
RUN npm ci

# Menyalin seluruh source code frontend
COPY . .
# Menjalankan proses build Vite (output ke folder /app/dist)
RUN npm run build

# --------------------------------------------------------
# STAGE 2: Production (Nginx)
# Menyajikan file statis hasil build melalui web server Nginx yang ringan.
# --------------------------------------------------------
FROM nginx:1.27-alpine

# Menyalin hasil build dari stage sebelumnya ke direktori default Nginx
COPY --from=build /app/dist /usr/share/nginx/html
# Menyalin konfigurasi Nginx kustom (untuk SPA routing dan proxy API)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Mengekspos port 80 (port default HTTP Nginx)
EXPOSE 80
