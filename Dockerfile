# Frontend Dockerfile: Vite build → nginx (multi-stage).
FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ------------------------------------------------------------------
FROM nginx:1.27-alpine

# nginx config: SPA fallback, gzip, asset cache.
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Entrypoint: generates /usr/share/nginx/html/env.js with the runtime URLs.
# `dos2unix` is critical: the repo is cloned on Windows with CRLF and busybox sh
# doesn't support a shebang with \r (fails "not found" even though the file exists).
COPY entrypoint.sh /docker-entrypoint.d/40-env.sh
RUN sed -i 's/\r$//' /docker-entrypoint.d/40-env.sh && chmod +x /docker-entrypoint.d/40-env.sh

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

# nginx:alpine already runs /docker-entrypoint.sh (which runs the scripts in
# /docker-entrypoint.d before starting nginx).
CMD ["nginx", "-g", "daemon off;"]
