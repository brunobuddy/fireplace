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
#   AUTH_USERS      = the email:pattern login pairs you enter, bcrypt-hashed.
#                     A pattern is the cells its walk visits on the 3x3 grid,
#                     row-major (0 1 2 / 3 4 5 / 6 7 8) — six cells minimum.
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
# SAFETY: `railway variables --set` writes to whatever service is currently
# linked, and a stale `railway link` is invisible from inside this repo. Before
# writing anything the script prints the target, refuses any project other than
# $EXPECTED_RAILWAY_PROJECT (default "Fireplace"), refuses a database service,
# and makes you type the project name. Pass --yes to skip only the typing.
#
# Usage:
#   railway link                 # once: pick your app service
#   ./deploy/railway-setup.sh    # interactive
#
#   # non-interactive (e.g. CI) — --yes is REQUIRED, there is no silent write:
#   AUTH_USERS_PLAIN="alex@home.app:0367852,sam@home.app:012543678" \
#     EXPECTED_RAILWAY_PROJECT=Fireplace \
#     ./deploy/railway-setup.sh --yes
#
# Patterns in AUTH_USERS_PLAIN must not contain ',' (it separates entries) or
# ':' (it separates email from secret). Use bare digits or '-': `0-3-6-7-8-5-2`.
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

# The only Railway project this script may write to. Override deliberately.
EXPECTED_PROJECT="${EXPECTED_RAILWAY_PROJECT:-Fireplace}"

# Double braces are Railway's reference syntax; single-quoted so the shell
# leaves it literal for Railway to resolve at deploy time. If PG_SERVICE does
# not name a real service, Railway resolves this to an EMPTY string.
DB_REF='${{'"$PG_SERVICE"'.DATABASE_URL}}'

ASSUME_YES=0
for arg in "$@"; do
  case "$arg" in
    -y|--yes) ASSUME_YES=1 ;;
    *) printf 'Unknown argument: %s (only -y/--yes)\n' "$arg" >&2; exit 1 ;;
  esac
done

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

# Hashing a pattern needs the backend's own helper (bcryptjs + ts-node).
can_hash() {
  ( cd "$REPO_ROOT/backend" && node -e "require('bcryptjs'); require('ts-node')" ) >/dev/null 2>&1
}

# Canonicalize *and* hash through backend/scripts/hash-pattern.ts. Re-implementing
# the skip rule here would be a third copy of it — and the day it drifted, the
# stored hash would stop matching what the phone sends and lock everyone out.
# Prints the bcrypt hash on stdout; returns non-zero on an invalid pattern.
hash_pattern() {
  local raw="$1" out canonical
  if ! out="$( cd "$REPO_ROOT/backend" && npm run --silent auth:hash-pattern -- "$raw" 2>&1 )"; then
    printf '%s\n' "$out" >&2
    return 1
  fi
  canonical="$(printf '%s\n' "$out" | sed -n 's/^pattern:[[:space:]]*//p')"
  if [ -n "$canonical" ]; then
    info "  canonical walk: $canonical"
  fi
  printf '%s\n' "$out" | sed -n 's/^hash:[[:space:]]*//p'
}

# Reject emails that would break the email:secret,email:secret format.
validate_email() {
  local email="$1"
  case "$email" in *:*|*,*) err "Email '$email' must not contain ':' or ','."; exit 1;; esac
}

# --- collect login users → AUTH_USERS --------------------------------------

build_auth_users() {
  local pairs=()
  if [ -n "${AUTH_USERS_PLAIN:-}" ]; then
    # Non-interactive: "email:pattern,email:pattern".
    local IFS=','
    for entry in $AUTH_USERS_PLAIN; do
      local email="${entry%%:*}" pattern="${entry#*:}" hash
      [ -n "$email" ] && [ -n "$pattern" ] || { err "Bad AUTH_USERS_PLAIN entry: '$entry'"; exit 1; }
      validate_email "$email"
      hash="$(hash_pattern "$pattern")" || { err "Invalid unlock pattern for '$email'."; exit 1; }
      pairs+=("$email:$hash")
    done
  else
    info "Enter the two household logins (order matters: 1st → Bruno, 2nd → Audrey)."
    info "A pattern is the cells its walk visits, e.g. 0-3-6-7-8-5-2 — six cells minimum:"
    info "    0 1 2"
    info "    3 4 5"
    info "    6 7 8"
    info "Press Enter on a blank email to finish."
    while true; do
      local email pattern hash
      printf 'Email (blank to finish): ' >&2; IFS= read -r email
      [ -n "$email" ] || break
      printf 'Pattern (cells 0-8): ' >&2; IFS= read -rs pattern; printf '\n' >&2
      [ -n "$pattern" ] || { warn "Empty pattern — skipped."; continue; }
      validate_email "$email"
      if ! hash="$(hash_pattern "$pattern")"; then
        warn "Not a valid unlock pattern (6-9 cells, no repeats) — try again."
        continue
      fi
      pairs+=("$email:$hash")
    done
  fi
  [ "${#pairs[@]}" -gt 0 ] || { err "No users entered — AUTH_USERS would be empty (nobody could log in)."; exit 1; }
  local IFS=','
  printf '%s' "${pairs[*]}"
}

# --- safety -----------------------------------------------------------------

# `railway variables --set` overwrites whatever service happens to be linked,
# and a stale `railway link` is invisible from inside this repo. So: name the
# target out loud, refuse anything that is not the expected project, refuse a
# database service outright, and make a human type the project name.
confirm_target() {
  local status project environment service
  if ! status="$(railway status 2>/dev/null)"; then
    err "Railway CLI is present but not linked. Run 'railway link' first."
    exit 1
  fi
  project="$(printf '%s\n' "$status" | sed -n 's/^Project: //p')"
  environment="$(printf '%s\n' "$status" | sed -n 's/^Environment: //p')"
  service="${RAILWAY_SERVICE:-$(printf '%s\n' "$status" | sed -n 's/^Service: //p')}"
  [ -n "$project" ] || { err "Could not read the linked project from 'railway status'."; exit 1; }

  warn "About to overwrite DATABASE_URL, DB_SYNCHRONIZE, JWT_SECRET, JWT_EXPIRES_IN and AUTH_USERS on:"
  warn "    project      $project"
  warn "    environment  ${environment:-<default>}"
  warn "    service      ${service:-<linked service>}"
  warn "    DATABASE_URL $DB_REF"

  if [ "$project" != "$EXPECTED_PROJECT" ]; then
    err "Linked project is '$project', but this script expects '$EXPECTED_PROJECT'."
    err "Run 'railway link' to select the Fireplace project, or re-run with"
    err "EXPECTED_RAILWAY_PROJECT='$project' if that is genuinely where Fireplace lives."
    exit 1
  fi

  # This script configures the *app* service. Pointed at a database it would
  # clobber DATABASE_URL with a self-reference and strand every dependent.
  case "$service" in
    *ostgres*|*DB*|*Database*|*database*)
      err "'$service' looks like a database service, not the Fireplace app service."
      err "Switch with 'railway service', or pass RAILWAY_SERVICE=<app service>."
      exit 1;;
  esac

  # PG_SERVICE has to name a real service or DATABASE_URL silently lands empty.
  info "Check that '$PG_SERVICE' is exactly your Postgres service's name — Railway"
  info "resolves a reference to an unknown service as an empty string, with no error."

  if [ "$ASSUME_YES" = "1" ]; then
    info "--yes supplied — proceeding without a prompt."
    return 0
  fi
  if [ ! -t 0 ]; then
    err "Refusing to write non-interactively. Re-run with --yes if you are sure."
    exit 1
  fi
  printf 'Type the project name (%s) to continue: ' "$project" >&2
  local typed=''
  IFS= read -r typed || true
  [ "$typed" = "$project" ] || { err "Name did not match — aborted. Nothing was changed."; exit 1; }
}

# --- apply ------------------------------------------------------------------

main() {
  # No plaintext fallback: the pattern must be canonicalized by the backend's
  # helper, or the hash we store will never match what the phone sends.
  if ! can_hash; then
    err "Backend deps missing. Run 'npm install' first — deploy/railway-setup.sh needs"
    err "backend/scripts/hash-pattern.ts to canonicalize and bcrypt each pattern."
    exit 1
  fi

  # Confirm the target before collecting any secrets, so an abort costs nothing.
  local have_railway=0
  if command -v railway >/dev/null 2>&1; then
    have_railway=1
    confirm_target
  fi

  local jwt_secret auth_users
  jwt_secret="$(gen_secret)"
  auth_users="$(build_auth_users)"

  local kv=(
    "DATABASE_URL=$DB_REF"
    "DB_SYNCHRONIZE=true"
    "JWT_SECRET=$jwt_secret"
    "JWT_EXPIRES_IN=$JWT_EXPIRES_IN"
    "AUTH_USERS=$auth_users"
  )

  local svc_flag=()
  [ -n "$RAILWAY_SERVICE" ] && svc_flag=(--service "$RAILWAY_SERVICE")

  if [ "$have_railway" = "1" ]; then
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
