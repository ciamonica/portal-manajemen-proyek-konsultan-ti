# ========================================================
# KATEGORI      : Docker Configuration (Backend)
# DESKRIPSI     : File definisi kontainer untuk layanan backend Node.js.
# FUNGSI UTAMA  : Membangun image Docker yang berisi aplikasi Express.js siap produksi.
# ========================================================

# Menggunakan Node.js versi 20 berbasis Alpine Linux (image ringan)
FROM node:20-alpine

# Menetapkan direktori kerja di dalam kontainer
WORKDIR /app

# Menyalin file package.json dan package-lock.json untuk instalasi dependensi
COPY backend/package*.json ./
# Menginstal dependensi produksi saja (tanpa devDependencies)
RUN npm ci --omit=dev

# Menyalin source code backend ke dalam kontainer
COPY backend/src ./src
# Menyalin file dokumentasi OpenAPI untuk endpoint /api/docs
COPY docs/openapi.yaml ./docs/openapi.yaml

# Menetapkan variabel lingkungan untuk mode produksi
ENV NODE_ENV=production
# Menetapkan port yang akan digunakan oleh Express
ENV PORT=4000
# Menetapkan path file OpenAPI di dalam kontainer
ENV OPENAPI_PATH=/app/docs/openapi.yaml

# Mengekspos port 4000 agar bisa diakses dari luar kontainer
EXPOSE 4000

# Perintah untuk menjalankan aplikasi saat kontainer dimulai
CMD ["npm", "start"]
