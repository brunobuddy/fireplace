# syntax=docker/dockerfile:1
# Build context = repo root. The SPA is built *without* a baked API URL;
# the URL is injected at container start (/env.js) so one image runs anywhere.

# ---- builder: compile the Vite bundle -------------------------------------
FROM node:22-bookworm-slim AS builder
WORKDIR /app
ENV NODE_ENV=development

COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
# --ignore-scripts: skip the root "prepare"→husky hook (dev-only).
RUN npm ci --ignore-scripts

COPY frontend ./frontend
RUN npm run build --workspace=@fireplace/frontend

# ---- runtime: non-root nginx ---------------------------------------------
FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime
ENV PORT=8080 \
    API_URL=""

COPY --chown=101:0 --from=builder /app/frontend/dist /usr/share/nginx/html
COPY frontend/docker/default.conf.template /etc/nginx/templates/default.conf.template
COPY --chmod=0755 frontend/docker/30-fireplace-env.sh /docker-entrypoint.d/30-fireplace-env.sh
# env.js is rewritten at runtime by the (non-root) entrypoint.
RUN chmod 0664 /usr/share/nginx/html/env.js

EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=5 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/env.js" >/dev/null 2>&1 || exit 1

# Base image's entrypoint runs templates + /docker-entrypoint.d, then nginx.
