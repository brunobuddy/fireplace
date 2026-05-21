# CLAUDE.md — Fireplace

Operating guide for this repo. Read this before working here. The user's
**global** `~/.claude/CLAUDE.md` rules still apply on top of this (commit
policy, no AI branding, branch naming, never push to main, run all tests
before a PR).

---

## 1. What this is

**Fireplace** is a family-management app (a family with kids). It is built
feature-by-feature; more views are planned (agenda, conversations). The
scaffold was deliberately shaped so new views slot in without rework.

**Feature 1 (done): a collaborative, real-time grocery list** — built
together, run through at the supermarket, items checked off live across
phones.

## 2. Stack

| Layer    | Choice                                                    |
| -------- | --------------------------------------------------------- |
| Backend  | NestJS (TypeScript), modular + SOLID                      |
| ORM      | TypeORM                                                   |
| Database | PostgreSQL (Docker locally; managed/Railway in prod)      |
| Realtime | Socket.IO (NestJS gateway ⇄ Solid store)                  |
| Frontend | SolidJS + Vite (TypeScript), feature-sliced               |
| UI       | **Kobalte** primitives + **solid-ui**-style components, Tailwind |
| Tooling  | npm workspaces · ESLint · Prettier · Husky · GH Actions   |
| Deploy   | Single multi-stage Docker image · docker-compose · Railway |

Monorepo via npm workspaces: `backend/` (`@fireplace/backend`),
`frontend/` (`@fireplace/frontend`).

## 3. Decisions log (don't relitigate without asking)

- **Identity = profile switcher, no passwords.** Seeded family + members;
  the chosen member is stamped on items. Data model is family-scoped so
  real auth slots in later — that's the seam, no migration needed.
- **Access = app-level login gate (2 users in `.env`), separate from the
  profile switcher.** `AUTH_USERS` holds comma-separated `email:secret` pairs
  (secret = plaintext _or_ bcrypt hash, auto-detected); login mints a JWT
  (`JWT_SECRET` / `JWT_EXPIRES_IN`). A global guard protects every route —
  `@Public()` opts out (login + health) — and the websocket gateway verifies
  the token on connect. Token is a **bearer in `localStorage`** (sent as the
  `Authorization` header and in the Socket.IO handshake) — simpler than
  httpOnly cookies, no CSRF machinery, and a clean fit for the websocket
  handshake. Member identity stays passwordless.
- **One service — NestJS serves the SPA *and* the API on a single port/origin**
  (one Railway service), like `mnfst/manifest`. The SPA calls relative `/api`
  and connects the socket same-origin; in dev Vite proxies `/api` +
  `/socket.io` to the backend (`VITE_BACKEND_PORT`). So there's **no CORS and
  no runtime URL injection** — the build is environment-agnostic by design.
- **Sync = real-time Socket.IO.** All mutations are optimistic and
  **idempotent by item id**, so HTTP responses and socket broadcasts
  converge without flicker.
- **UI = Kobalte + solid-ui** (Tailwind, CVA, `cn`). Components live in
  `frontend/src/components/ui/`. Interactive ones are Kobalte-backed
  (accessible by default).
- **Look = warm & cosy "family home".** Palette: oat-milk cream bg with a
  hearth-glow, terracotta primary, honey-amber accent, herb-green success;
  warm espresso dark mode (follows OS). Fonts: **Nunito** (UI) +
  **Baloo 2** (display/wordmark), self-hosted via `@fontsource`,
  latin-only. Tokens in `frontend/src/app.css` + `tailwind.config.cjs`.

## 4. Architecture

### Backend — SOLID, modular
- Feature modules: `auth/`, `family/`, `groceries/`, `health/`; `database/`
  owns the connection + bootstrap seeder. New domains are added to
  `app.module.ts` without touching existing ones (OCP).
- **Auth:** `auth/` gates the app. `EnvUserStore` (the swap-for-DB seam, DIP)
  parses `AUTH_USERS` and feeds `AuthService` (constant-time SHA-256 compare
  for plaintext / bcrypt for hashes; JWT mint + verify). A global
  `JwtAuthGuard` (`APP_GUARD`) denies by default; `@Public()` exempts
  `POST /api/auth/login` + `GET /api/health`. `GroceriesGateway` verifies the
  handshake token and drops unauthenticated sockets. Fail-closed: in
  production a missing `JWT_SECRET` aborts boot; outside production an
  insecure dev secret + demo login (`demo@fireplace.app` / `demo`) are used
  and logged.
- **Dependency Inversion:** `GroceriesService` depends on the
  `IGroceryItemRepository` port (token + interface), bound to a TypeORM
  adapter in the module. Swap persistence / fake in tests = one line.
- **SRP:** thin controllers, use cases in services, the gateway is pure
  websocket transport, repositories only persist.
- DTOs validated globally (`class-validator` + `ValidationPipe`).
- `database.config.ts` resolution order: `NODE_ENV=test` → in-memory
  SQLite; `DATABASE_URL` set → that URL (Railway); else discrete `DB_*`.
  `DB_SYNCHRONIZE` (default: on unless `NODE_ENV=production`) controls
  schema sync — **no migrations yet**. `DB_SSL` / `sslmode=require` → TLS.
- The seeder (`database/seed/`) is idempotent: ensures the aisle catalogue
  + one demo family ("The Sample Family": Alex, Sam, Robin) on boot.
- `GET /api/health` → liveness probe (Docker + Railway).
- **Serves the SPA:** in production `ServeStaticModule` serves the built
  `frontend/dist` from the same server (history fallback; `/api` + `/socket.io`
  excluded). Skipped under test / when no build is present (dev → Vite). The
  static files load *outside* the auth guard so the login page is reachable
  anonymously.

### Frontend — feature-sliced, fine-grained reactivity
- `features/groceries`, `features/family`, `features/auth`; shared
  `shared/ui`, `shared/layout`, `components/ui` (the solid-ui layer); routing
  via `@solidjs/router`, bottom-nav already anticipates future views.
- **Auth gate:** `AuthProvider` owns the bearer token (in `localStorage`) +
  signed-in user and renders `<LoginPage>` until authenticated. The token is
  injected into `lib/api/http.ts` (Bearer header) and the Socket.IO handshake
  via `lib/api/auth-token.ts`; a 401 on an authenticated request auto-logs-out.
- One `createStore` controller is the source of truth; pure list logic in
  `groceries.helpers.ts` is isolated and unit-tested.
- **Same-origin API:** the SPA calls a relative `/api` and connects the socket
  to its own origin — no `API_URL`, no `/env.js`, no CORS. In prod NestJS
  serves the SPA; in dev Vite proxies `/api` + `/socket.io` to the backend
  (`vite.config.ts`, target `VITE_BACKEND_PORT` → default 3000).

## 5. Local development

```bash
npm run db:up        # Postgres only (compose, no profile)
npm install
npm run dev          # API (nest watch) + Vite, concurrently
```

⚠️ **Host port 5432 is often taken** on this machine by an unrelated
`postgres_db` container. Override with `POSTGRES_HOST_PORT`, or point the
backend at another Postgres via `DB_*` / `DATABASE_URL`.

**Login is gated.** With no `AUTH_USERS` set, dev falls back to an insecure
demo login (**demo@fireplace.app / demo**, logged on boot). Set `AUTH_USERS`
+ `JWT_SECRET` (see `.env.example`) for real credentials.

The `/serve` skill in this environment is written for a *different* project
(Manifest); for Fireplace it was adapted to: two random ports (backend +
Vite), Vite serving the SPA and **proxying `/api` + `/socket.io` to the
backend** via `VITE_BACKEND_PORT` (so the dev app is single-origin, like
prod), plus a throwaway DB inside the existing `postgres_db` container. There
is no Wingman drawer here — that checklist is N/A.

## 6. Docker

`docker-compose.yml` uses **profiles**:

```bash
npm run db:up        # docker compose up -d        → Postgres only
npm run app:up       # --profile app up -d --build → postgres + app (one svc)
npm run app:down
```

Host ports are overridable to dodge collisions: `POSTGRES_HOST_PORT`,
`APP_HOST_PORT`. The app is single-origin, so there's no cross-service
`CORS_ORIGINS` / `API_URL` wiring to keep in sync.

**One image** (`backend/Dockerfile`, **repo root as context**): an Alpine
builder runs `npm ci` + `npm run build` for **both** workspaces; a slim
runtime then installs only the backend's prod deps
(`npm ci --omit=dev --ignore-scripts -w @fireplace/backend` — every prod dep
is pure JS, so `--ignore-scripts` is safe) and copies in `backend/dist` + the
built `frontend/dist` (served by `ServeStaticModule`). Non-root (`node`),
`node backend/dist/main.js`, healthcheck `/api/health`.

## 7. Railway deployment

**One service** deploys the whole app (config-as-code in `deploy/railway.json`).

1. **Add a Postgres** (Railway plugin).
2. **App service** — config path `deploy/railway.json` (Dockerfile
   `backend/Dockerfile`, healthcheck `/api/health`). Env:
   - `DATABASE_URL = ${{Postgres.DATABASE_URL}}`
   - `DB_SYNCHRONIZE = true`  (no migrations yet — needed on first deploy)
   - `DB_SSL = true`  (managed Postgres)
   - `NODE_ENV = production`
   - `AUTH_USERS = email:secret,email:secret`  (bcrypt hashes recommended;
     `npm run auth:hash --workspace=backend -- 'pw'`)
   - `JWT_SECRET = <long random string>`  (**required** — app won't boot
     in production without it)
   - `JWT_EXPIRES_IN = 7d`  (optional; default `7d`)
   - `PORT` is provided by Railway.

The SPA is baked into the image and served same-origin, so there's no
`API_URL` / `CORS_ORIGINS` to set — and no second service.

## 8. Testing / validation gate

Run from repo root; **all must be green before a PR** (global rule):

```bash
npm run typecheck    # tsc --noEmit, both workspaces
npm run lint         # ESLint --max-warnings 0, both
npm test             # unit: backend Jest + frontend Vitest
npm run test:e2e     # backend e2e — in-memory SQLite, no DB needed
npm run build        # nest build + vite build
```

Current baseline: typecheck ✅ · lint ✅ · unit 18+9 ✅ · e2e 15 ✅ · build ✅.
e2e/test uses SQLite on purpose → entities avoid pg-only types (no native
enum/jsonb; `status` is varchar). Backend lint = prettier-as-eslint; run
`npm run format --workspace=@fireplace/backend` to auto-fix.

## 9. Known follow-ups

- ✅ Done: backend image slimmed 526 → ~401 MB (Alpine + workspace-scoped
  prod install, no frontend payload). Further cuts would need bundling the
  app (`nest build --webpack`) — deferred (risky with TypeORM dynamic
  requires / decorators; disproportionate for a scaffold).
- `synchronize` instead of migrations — fine for the scaffold; add TypeORM
  migrations before real data exists.
- Auth: a basic app-level login gate is in (2 `.env` users + JWT). Next steps
  when needed: DB-backed per-user accounts, password reset, refresh tokens,
  and login rate-limiting (e.g. `@nestjs/throttler`). The model is
  family-scoped, so per-user accounts can map onto the member seam.

## 10. Roadmap

- [x] Real-time collaborative grocery list (warm/cosy UI)
- [x] Dockerised + Railway-ready
- [x] Basic login gate (2 users in `.env`, JWT)
- [ ] Family agenda / shared calendar
- [ ] Family conversations
- [ ] Real per-user authentication (DB-backed accounts)
- [ ] DB migrations
