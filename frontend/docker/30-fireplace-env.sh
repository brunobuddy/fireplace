#!/bin/sh
# Runs (as the non-root nginx user) before nginx starts. Bakes the API_URL
# env var into /env.js so the static SPA can find the backend without a
# rebuild — the key to deploying one image to any environment (Railway).
set -e
: "${API_URL:=}"
cat > /usr/share/nginx/html/env.js <<EOF
window.__FIREPLACE__ = { apiUrl: "${API_URL}" };
EOF
echo "[fireplace] env.js → apiUrl='${API_URL}'"
