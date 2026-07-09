# Deploying Fireplace to Railway

One service runs the whole app: the Dockerfile builds both workspaces and
NestJS serves the API **and** the built SPA on a single port. You need a
Railway project, a Postgres plugin, and ~5 env vars — most of which the setup
script fills in for you.

Build/deploy config lives in [`railway.toml`](../railway.toml) at the repo
root, so Railway auto-detects it — **no config path to set in the dashboard.**

---

## TL;DR (CLI path — least clicks)

```bash
# 0. Install + log in once
npm i -g @railway/cli && railway login

# 1. Create the project and add Postgres (opens the dashboard to confirm)
railway init                       # name it "fireplace"
railway add --database postgres    # or add the Postgres plugin in the UI

# 2. Connect this repo's app service and link your shell to it
railway link                       # pick the project, then the app service

# 3. Set the secrets + first-deploy flag in one shot
./deploy/railway-setup.sh          # generates JWT_SECRET, sets AUTH_USERS, etc.

# 4. Deploy
railway up                         # builds backend/Dockerfile, deploys
railway domain                     # generate a public URL
```

Open the URL, log in with one of the `AUTH_USERS` you entered. Done.

> ⚠️ **`railway-setup.sh` writes to whatever service `railway link` last
> selected**, and that link is global to your shell — not to this repo. It will
> overwrite `DATABASE_URL`, `JWT_SECRET` and `AUTH_USERS` on that service. The
> script therefore prints the target, refuses any project other than
> `$EXPECTED_RAILWAY_PROJECT` (default `Fireplace`), refuses a database service,
> and makes you type the project name; `--yes` skips only the typing and is
> **required** to run non-interactively. Run `railway status` first.
>
> `PG_SERVICE` (default `Postgres`) must match your Postgres service's name
> **exactly**. Railway resolves `${{Wrong.DATABASE_URL}}` to an **empty string**
> with no error, so a typo here leaves the app with no database URL at all.

---

## What gets set, and why

| Variable         | Value                          | Set by         | Notes |
| ---------------- | ------------------------------ | -------------- | ----- |
| `DATABASE_URL`   | `${{Postgres.DATABASE_URL}}`   | setup script   | Railway **private** network reference. |
| `DB_SYNCHRONIZE` | `true`                         | setup script   | Creates the schema on first boot (no migrations yet). Flip to `false` after the first deploy. |
| `JWT_SECRET`     | fresh 32-byte random hex       | setup script   | App refuses to boot in production without it. |
| `JWT_EXPIRES_IN` | `7d`                           | setup script   | Token lifetime; optional. |
| `AUTH_USERS`     | `email:pattern,email:pattern`  | setup script   | Two login pairs; the secret is an unlock pattern (grid cells row-major, six minimum), always bcrypt-hashed. **Order matters:** first → Bruno, second → Audrey (the seeder maps them onto the two hardcoded members on every boot). |
| `LOGIN_*`        | see `.env.example`             | you (optional) | Throttle tuning. Defaults: 5 tries/min → 15-min lockout, 20/day, per (IP, email). |
| `NODE_ENV`       | `production`                   | **image**      | Baked into `backend/Dockerfile` — nothing to set. |
| `PORT`           | (injected)                     | **Railway**    | The app binds to it automatically. |

### Do **not** set `DB_SSL` with the private URL

Railway's `${{Postgres.DATABASE_URL}}` resolves to the isolated private
network (`postgres.railway.internal`), which does **not** use TLS. Forcing
`DB_SSL=true` there fails with *"server does not support SSL connections."*
Leave it unset.

Only set `DB_SSL=true` if you intentionally connect over the **public** URL
(`DATABASE_PUBLIC_URL`, e.g. for an external client) — that path goes through
Railway's TCP proxy and does use TLS.

---

## Dashboard path (no CLI)

1. **New Project → Deploy from GitHub repo** → pick this repo. Railway reads
   `railway.toml` and builds `backend/Dockerfile` automatically.
2. **+ New → Database → Add PostgreSQL.**
3. On the **app service → Variables → Raw Editor**, paste:

   ```
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   DB_SYNCHRONIZE=true
   JWT_SECRET=<paste a long random string>
   JWT_EXPIRES_IN=7d
   AUTH_USERS=bruno@your.app:<pattern-or-bcrypt-hash>,audrey@your.app:<…>
   ```

   - Generate a secret: `openssl rand -hex 32`
   - Bcrypt a pattern (recommended): `npm run auth:hash-pattern --workspace=backend -- 0-3-6-7-8-5-2`
     — it prints the walk as a grid so you can check it, canonicalizes the walk
     exactly as the phone does, and emits the hash. A plaintext pattern
     (`0367852`) works too; six cells minimum.
4. **Settings → Networking → Generate Domain.** Open it and log in.

> Tip: running `./deploy/railway-setup.sh` without the Railway CLI prints this
> exact block for you (with the secret and hashes already filled in).

---

## After the first deploy

- The seeder runs idempotently on boot (aisle catalogue + the `Home` family
  with Bruno and Audrey reconciled from `AUTH_USERS`).
- Set **`DB_SYNCHRONIZE=false`** once the schema exists — leaving auto-sync on
  risks unintended schema changes as entities evolve. Add TypeORM migrations
  before real data matters (see CLAUDE.md §9).
- Health check: `GET /api/health` (already wired into `railway.toml` and the
  Docker `HEALTHCHECK`).

## Troubleshooting

| Symptom | Fix |
| ------- | --- |
| `JWT_SECRET must be set in production` (boot crash) | Set `JWT_SECRET`. |
| `AUTH_USERS is not set — nobody can log in` | Set `AUTH_USERS`. |
| `server does not support SSL connections` | Remove `DB_SSL` (private URL needs none). |
| Tables missing / "relation does not exist" | Set `DB_SYNCHRONIZE=true` and redeploy. |
| Health check timing out | First boot waits on the DB; confirm `DATABASE_URL` references the Postgres service by its real name. |
