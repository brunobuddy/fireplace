# 🔥 Fireplace

The shared home for your family. One calm place for the things a household
juggles — starting with a **collaborative, real-time grocery list** you build
together and run through at the supermarket.

This repo is the foundation: the data model, module boundaries and UI shell
are built so the next views (agenda, conversations, …) slot in without
rework.

## Stack

| Layer    | Choice                                               |
| -------- | ---------------------------------------------------- |
| Backend  | NestJS (TypeScript), modular + SOLID                 |
| ORM      | TypeORM                                              |
| Database | PostgreSQL (Docker for local dev)                    |
| Realtime | Socket.IO (NestJS gateway ⇄ Solid store)             |
| Frontend | SolidJS + Vite (TypeScript), feature-sliced          |
| Tooling  | npm workspaces · ESLint · Prettier · Husky · GH CI   |

## Quick start

```bash
# 1. Postgres in Docker
npm run db:up

# 2. Install everything (npm workspaces)
npm install

# 3. Run API + web together (http://localhost:5173)
npm run dev
```

The app is gated by a login, and the secret is an **Android-style unlock
pattern** rather than a password — you drag it on a 3×3 grid. With no
`AUTH_USERS` configured, local dev falls back to insecure demo accounts —
**bruno@fireplace.local** and **audrey@fireplace.local**, both with the pattern
`0367852` (down the left column, across the bottom, up the right) — so you can
sign in immediately. Set `AUTH_USERS` + `JWT_SECRET` in `.env` for real
credentials (see `.env.example`), hashing a pattern with:

```bash
npm run auth:hash-pattern --workspace=backend -- 0-3-6-7-8-5-2
```

A pattern is only ~18.5 bits — far weaker than a passphrase — so login is
rate-limited per (IP, email): 5 tries a minute then a 15-minute lockout, and 20
a day. That throttle, not the grid, is what keeps the secret out of reach.

After signing in, the API reconciles the `Home` family with **Bruno** and
**Audrey** (the two members; emails come from `AUTH_USERS`, in that order)
and seeds the aisle catalogue. Whatever you add is stamped with your signed-in
identity — open a second browser, log in as the other parent, and watch it
sync live.

Copy `.env.example` to `.env` to change ports/credentials.

## Useful scripts

| Command               | What it does                                   |
| --------------------- | ---------------------------------------------- |
| `npm run dev`         | API (watch) + web (Vite) concurrently          |
| `npm run db:up/down`  | Start / stop the Postgres container            |
| `npm test`            | Unit tests (backend + frontend)                |
| `npm run test:e2e`    | API e2e on in-memory SQLite (no DB needed)     |
| `npm run typecheck`   | `tsc --noEmit` across both workspaces          |
| `npm run lint`        | ESLint across both workspaces                  |
| `npm run build`       | Production build of both workspaces            |

## Deploy

Production is a **single Docker image** — NestJS serves the API and the built
SPA on one port (no second service, no CORS).

```bash
npm run app:up      # Postgres + the app via docker-compose (prod-like, local)
```

For **Railway**: one app service + a Postgres plugin. Build/deploy config is
auto-detected from `railway.toml`, and `deploy/railway-setup.sh` sets the
secrets for you in one command. Step-by-step: [`deploy/RAILWAY.md`](deploy/RAILWAY.md).

## Architecture

### Backend (`backend/`) — NestJS, SOLID

- **Modules** map to family domains: `family/`, `groceries/`
  (`database/` owns the connection + bootstrap seeder). New domains are added
  to `app.module.ts` without touching existing ones (**OCP**).
- **Dependency Inversion**: `GroceriesService` depends on the
  `IGroceryItemRepository` *port*, bound to a TypeORM adapter in the module.
  Swapping persistence — or faking it in unit tests — is one line.
- **Single Responsibility**: controllers are thin HTTP, the service holds use
  cases, the gateway only does websocket transport, repositories only persist.
- DTOs are validated globally (`class-validator` + `ValidationPipe`).

### Frontend (`frontend/`) — SolidJS

- **Feature-sliced**: `features/groceries`, `features/family`, with shared
  `shared/ui` + `shared/layout`. Routing (`@solidjs/router`) + the
  `AppShell` bottom-nav already anticipate the future views.
- **Fine-grained reactivity**: a single `createStore` controller is the
  source of truth. Mutations are **optimistic** and every change is
  idempotent by id, so HTTP responses and live socket broadcasts converge
  without flicker.
- Pure list logic (`groceries.helpers.ts`) is isolated and unit-tested.

## Roadmap

- [x] Real-time collaborative grocery list
- [x] Real-time shared to-do board
- [x] Spark — daily two-parent bonding question
- [x] Login = identity (2 hardcoded members, emails from `AUTH_USERS`)
- [x] Unlock-pattern login (3×3 grid) + per-account login throttling
- [ ] Family agenda / shared calendar
- [ ] Family conversations
- [ ] Multi-family / per-user accounts (the data model is already family-scoped)
