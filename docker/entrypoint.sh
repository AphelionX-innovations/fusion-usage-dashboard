#!/bin/sh
set -eu

: "${VITE_AUTH_API_URL:=/auth-api}"
: "${VITE_FUSION_API_URL:=/fusion-api}"
: "${AUTH_API_PROXY:=https://stg-login.abafusion.ai}"
: "${FUSION_API_PROXY:=https://stg-perf.abafusion.ai}"

AUTH_API_PROXY=$(printf '%s' "$AUTH_API_PROXY" | sed 's:/*$::')
FUSION_API_PROXY=$(printf '%s' "$FUSION_API_PROXY" | sed 's:/*$::')

js_escape() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

cat > /usr/share/nginx/html/config.js <<EOF
window.__APP_CONFIG__ = {
  VITE_AUTH_API_URL: "$(js_escape "$VITE_AUTH_API_URL")",
  VITE_FUSION_API_URL: "$(js_escape "$VITE_FUSION_API_URL")"
};
EOF

export AUTH_API_PROXY FUSION_API_PROXY
envsubst '${AUTH_API_PROXY} ${FUSION_API_PROXY}' \
  < /etc/nginx/templates/default.conf.template \
  > /etc/nginx/conf.d/default.conf

exec nginx -g 'daemon off;'
