# Deployment Guide

## Docker Compose

Jalankan seluruh stack lokal production-like:

```bash
docker compose up --build
```

Layanan:

- Frontend: `http://localhost:8080`
- Backend API: `http://localhost:4000`
- OpenAPI docs: `http://localhost:4000/api/docs`
- MySQL: `localhost:3306`, database `project_portal`

## Environment Variables

Backend wajib mengatur:

- `NODE_ENV=production`
- `PORT=4000`
- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `CORS_ORIGIN`

Frontend Vite menggunakan:

- `VITE_API_BASE=/api` untuk proxy Nginx/Docker
- `VITE_API_BASE=https://domain-backend.example.com/api` jika frontend dan backend beda domain

## Render/Railway/Vercel Notes

- Backend dapat dideploy sebagai Node web service dengan start command `npm start` dari folder `backend`.
- Frontend dapat dideploy sebagai static site dengan build command `npm run build` dari folder `frontend` dan output `dist`.
- Database MySQL dapat menggunakan Railway/MySQL, PlanetScale, Aiven, atau provider MySQL lain.
- Jangan memakai nilai contoh `JWT_SECRET`; gunakan secret acak panjang dari dashboard provider.

## Logs

Backend mencetak log request dasar berisi method, path, status code, dan durasi. Error tidak tertangani diproses oleh middleware global `errorHandler`.
