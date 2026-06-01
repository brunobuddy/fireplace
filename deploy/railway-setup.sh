#!/usr/bin/env bash
#
# Fireplace — one-shot Railway environment setup.
#
# Railway reads build/deploy config from railway.toml, but it will NOT read
# env vars or secrets from a file. This script sets the few that are left —
# the secrets and the first-deploy flag — on your linked Railway *app* service,
# so the only manual steps remaining are clicks in the dashboard (new project,
# add Postgres, connect repo).
#
# It sets:
#   DATABASE_URL    = ${Postgres.DATABASE_URL}   (Railway private network)
#   DB_SYNCHRONIZE  = true     (create the schema on first boot; no migrations yet)
#   JWT_SECRET      = <fresh 32-byte random hex, generated here>
#   JWT_EXPIRES_IN  = 7d
#   AUTH_USERS      = the email:secret login pairs you enter (bcrypt-hashed when
#                     backend deps are installed; plaintext otherwise — both work).
#                     ORDER MATTERS: the seeder maps the FIRST entry → Bruno
#                     and the SECOND → Audrey on every boot.
#
# It deliberately does NOT set:
#   DB_SSL    — the private DATABASE_URL is on Railway's isolated network and
#               needs no TLS; forcing it errors with "server does not support
#               SSL connections". Only set DB_SSL=true if you switch the app to
#               the PUBLIC database URL (DATABASE_PUBLIC_URL).
#   NODE_ENV  — baked into the image as `production` (backend/Dockerfile).
#   PORT      — injected by Railway; the app honours it.
#
# Usage:
#   railway link                 # once: pick your app service
#   ./deploy/railway-setup.sh    # interactive
#
#   # non-interactive (e.g. CI):
#   AUTH_USERS_PLAIN="alex@home.app:s3cret,sam@home.app:hunter2" \
#     ./deploy/railway-setup.sh
#
# No Railway CLI, or not linked? The script still generates the values and
# prints a paste-ready block for the dashboard (Variables → Raw Editor) plus
# the equivalent CLI command — nothing is lost.
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Postgres service name as it appears in your Railway project (default "Postgres").
PG_SERVICE="${PG_SERVICE:-Postgres}"
# Optional: target a specific app service instead of the linked one.
RAILWAY_SERVICE="${RAILWAY_SERVICE:-}"
JWT_EXPIRES_IN="${JWT_EXPIRES_IN:-7d}"

info()  { printf '\033[36m%s\033[0m\n' "$*" >&2; }
warn()  { printf '\033[33m%s\033[0m\n' "$*" >&2; }
err()   { printf '\033[31m%s\033[0m\n' "$*" >&2; }

# --- value generators -------------------------------------------------------

gen_secret() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 32
  else
    node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  fi
}

# Can we bcrypt-hash? Only if backend deps (bcryptjs) are installed.
can_hash() {
  ( cd "$REPO_ROOT/backend" && node -e "require('bcryptjs')" ) >/dev/null 2>&1
}

hash_secret() {
  local plain="$1"
  if [ "$CAN_HASH" = "1" ]; then
    ( cd "$REPO_ROOT/backend" \
        && node -e "console.log(require('bcryptjs').hashSync(process.argv[1],10))" "$plain" )
  else
    printf '%s' "$plain"
  fi
}

# Reject plaintext secrets that would break the email:secret,email:secret format.
validate_plain() {
  local email="$1" secret="$2"
  case "$email" in *:*|*,*) err "Email '$email' must not contain ':' or ','."; exit 1;; esac
  if [ "$CAN_HASH" != "1" ]; then
    case "$secret" in
      *:*|*,*)
        err "Password for '$email' contains ':' or ',', which breaks AUTH_USERS when stored as plaintext."
        err "Run 'npm install' first so the script can bcrypt-hash it, or choose a simpler password."
        exit 1;;
    esac
  fi
}

# --- collect login users → AUTH_USERS --------------------------------------

build_auth_users() {
  local pairs=()
  if [ -n "${AUTH_USERS_PLAIN:-}" ]; then
    # Non-interactive: "email:secret,email:secret".
    local IFS=','
    for entry in $AUTH_USERS_PLAIN; do
      local email="${entry%%:*}" secret="${entry#*:}"
      [ -n "$email" ] && [ -n "$secret" ] || { err "Bad AUTH_USERS_PLAIN entry: '$entry'"; exit 1; }
      validate_plain "$email" "$secret"
      pairs+=("$email:$(hash_secret "$secret")")
    done
  else
    info "Enter the two household logins (order matters: 1st → Bruno, 2nd → Audrey)."
    info "Press Enter on a blank email to finish."
    while true; do
      local email secret
      printf 'Email (blank to finish): ' >&2; IFS= read -r email
      [ -n "$email" ] || break
      printf 'Password: ' >&2; IFS= read -rs secret; printf '\n' >&2
      [ -n "$secret" ] || { warn "Empty password — skipped."; continue; }
      validate_plain "$email" "$secret"
      pairs+=("$email:$(hash_secret "$secret")")
    done
  fi
  [ "${#pairs[@]}" -gt 0 ] || { err "No users entered — AUTH_USERS would be empty (nobody could log in)."; exit 1; }
  local IFS=','
  printf '%s' "${pairs[*]}"
}

# --- apply ------------------------------------------------------------------

main() {
  CAN_HASH=0
  if can_hash; then CAN_HASH=1; info "bcryptjs found — passwords will be hashed."
  else warn "bcryptjs not installed (run 'npm install' to enable hashing) — storing passwords as plaintext."; fi

  local jwt_secret auth_users
  jwt_secret="$(gen_secret)"
  auth_users="$(build_auth_users)"

  # Double braces are Railway's reference syntax; single-quoted so the shell
  # leaves it literal for Railway to resolve at deploy time.
  local db_ref='${{'"$PG_SERVICE"'.DATABASE_URL}}'

  local kv=(
    "DATABASE_URL=$db_ref"
    "DB_SYNCHRONIZE=true"
    "JWT_SECRET=$jwt_secret"
    "JWT_EXPIRES_IN=$JWT_EXPIRES_IN"
    "AUTH_USERS=$auth_users"
  )

  local svc_flag=()
  [ -n "$RAILWAY_SERVICE" ] && svc_flag=(--service "$RAILWAY_SERVICE")

  if command -v railway >/dev/null 2>&1; then
    local set_args=()
    for pair in "${kv[@]}"; do set_args+=(--set "$pair"); done
    info "Setting ${#kv[@]} variables on the linked Railway service…"
    if railway variables "${svc_flag[@]}" "${set_args[@]}"; then
      info "Done. Railway will redeploy with these variables."
      info "Reminder: after the first successful deploy you can set DB_SYNCHRONIZE=false (schema already created)."
      return 0
    fi
    warn "Railway CLI call failed (not linked? old CLI? wrong service?). Falling back to a paste-ready block."
  else
    warn "Railway CLI not found. Here is everything to paste instead."
  fi

  print_manual "${kv[@]}"
}

print_manual() {
  cat >&2 <<'EOF'

──────────────────────────────────────────────────────────────────────────
Paste into Railway → your app service → Variables → "Raw Editor":
──────────────────────────────────────────────────────────────────────────
EOF
  printf '%s\n' "$@" >&2
  cat >&2 <<EOF
──────────────────────────────────────────────────────────────────────────
…or, once the Railway CLI is linked ('railway link'), run:

  railway variables \\
$(for p in "$@"; do printf "    --set '%s' \\\\\n" "$p"; done)

──────────────────────────────────────────────────────────────────────────
EOF
}

main "$@"
