# syntax=docker/dockerfile:1
# Build context = repo root (npm-workspaces monorepo). Debian-slim base so
# the better-sqlite3 dev dependency has a prebuilt binary (no musl rebuild).

# ---- builder: full install + compile -------------------------------------
FROM node:22-bookworm-slim AS builder
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

# ---- runtime: production deps only, non-root ------------------------------
FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000

COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
# --omit=dev drops typescript/nest-cli *and* better-sqlite3 (a dev dep) →
# no native toolchain needed in the final image.
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

COPY --from=builder /app/backend/dist ./backend/dist

USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "backend/dist/main.js"]
