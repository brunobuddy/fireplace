# syntax=docker/dockerfile:1
# Build context = repo root (npm-workspaces monorepo). Alpine is safe here:
# `--ignore-scripts` means no native build at install time, and every backend
# *production* dependency is pure JS (pg, nestjs, typeorm, socket.io…).

# ---- builder: full install + compile -------------------------------------
FROM node:22-alpine AS builder
WORKDIR /app
ENV NODE_ENV=development

# Dependency layer — only the manifests, so it caches until deps change.
COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
# --ignore-scripts: skip the root "prepare"→husky hook (dev-only, absent here).
RUN npm ci --ignore-scripts

# Source + build (changes often → after the cached deps layer).
COPY backend ./backend
RUN npm run build --workspace=@fireplace/backend

# ---- runtime: backend production deps only, non-root ---------------------
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000

COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
# Scope to the backend workspace: installs ONLY backend prod deps (no
# frontend Kobalte/solid/font payload, no dev deps incl. better-sqlite3).
RUN npm ci --omit=dev --ignore-scripts --workspace=@fireplace/backend \
    && npm cache clean --force

COPY --from=builder /app/backend/dist ./backend/dist

USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "backend/dist/main.js"]
