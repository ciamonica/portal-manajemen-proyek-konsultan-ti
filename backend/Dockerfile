# ========================================================
# KATEGORI      : Docker Configuration (Backend)
# DESKRIPSI     : File definisi kontainer untuk layanan backend.
# ========================================================

FROM node:20-alpine

WORKDIR /app

COPY backend/package*.json ./
RUN npm ci --omit=dev

COPY backend/src ./src
COPY docs/openapi.yaml ./docs/openapi.yaml

ENV NODE_ENV=production
ENV PORT=4000
ENV OPENAPI_PATH=/app/docs/openapi.yaml

EXPOSE 4000

CMD ["npm", "start"]
