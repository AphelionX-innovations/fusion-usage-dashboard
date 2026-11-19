#!/bin/sh
set -eu

: "${VITE_AUTH_API_URL:=/auth-api}"
: "${VITE_FUSION_API_URL:=/fusion-api}"
: "${AUTH_API_PROXY:=https://stg-login.abafusion.ai}"
: "${FUSION_API_PROXY:=https://stg-perf.abafusion.ai}"
: "${SERVICE_TOKEN:=}"

# Si SERVICE_TOKEN est défini, nginx l'injecte à la place du Bearer du navigateur
# et le dashboard n'affiche plus de login/2FA.
if [ -n "$SERVICE_TOKEN" ]; then
  SERVICE_TOKEN_MODE=true
  AUTH_HEADER="Bearer $SERVICE_TOKEN"
else
  SERVICE_TOKEN_MODE=false
  AUTH_HEADER='$http_authorization'
fi

AUTH_API_PROXY=$(printf '%s' "$AUTH_API_PROXY" | sed 's:/*$::')
FUSION_API_PROXY=$(printf '%s' "$FUSION_API_PROXY" | sed 's:/*$::')

js_escape() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

cat > /usr/share/nginx/html/config.js <<EOF
window.__APP_CONFIG__ = {
  VITE_AUTH_API_URL: "$(js_escape "$VITE_AUTH_API_URL")",
  VITE_FUSION_API_URL: "$(js_escape "$VITE_FUSION_API_URL")",
  SERVICE_TOKEN_MODE: "$SERVICE_TOKEN_MODE"
};
EOF

export AUTH_API_PROXY FUSION_API_PROXY AUTH_HEADER
envsubst '${AUTH_API_PROXY} ${FUSION_API_PROXY} ${AUTH_HEADER}' \
  < /etc/nginx/templates/default.conf.template \
  > /etc/nginx/conf.d/default.conf

exec nginx -g 'daemon off;'
