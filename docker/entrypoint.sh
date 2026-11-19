#!/bin/sh
set -eu

: "${VITE_AUTH_API_URL:=/auth-api}"
: "${VITE_FUSION_API_URL:=/fusion-api}"
: "${AUTH_API_PROXY:=https://stg-login.abafusion.ai}"
: "${FUSION_API_PROXY:=https://stg-perf.abafusion.ai}"
: "${SERVICE_TOKEN:=}"
: "${ALLOWED_IPS:=}"
: "${REAL_IP_FROM:=127.0.0.1 10.0.0.0/8 172.16.0.0/12 192.168.0.0/16}"

fail() {
  echo "ERREUR: $*" >&2
  exit 1
}
strip_slash() { printf '%s' "$1" | sed 's:/*$::'; }
origin_of() { printf '%s' "$1" | sed -nE 's#^(https?://[^/]+).*#\1#p'; }

AUTH_API_PROXY=$(strip_slash "$AUTH_API_PROXY")
FUSION_API_PROXY=$(strip_slash "$FUSION_API_PROXY")

# --- 1. Jeton de service -------------------------------------------------------
# Avec SERVICE_TOKEN, nginx ajoute ce Bearer côté serveur : il n'est jamais envoyé au
# navigateur, le dashboard s'ouvre sans login et les routes de login sont fermées.
# Sans SERVICE_TOKEN : login + 2FA classique.
if [ -n "$SERVICE_TOKEN" ]; then
  case "$SERVICE_TOKEN" in
    *[!A-Za-z0-9._~+/=-]*) fail "SERVICE_TOKEN contient des caractères non autorisés (espace, guillemet, retour à la ligne ?)." ;;
  esac
  SERVICE_TOKEN_MODE=true
  AUTH_HEADER="Bearer $SERVICE_TOKEN"
  LOGIN_ACCESS='return 403;'
else
  SERVICE_TOKEN_MODE=false
  AUTH_HEADER='$http_authorization'
  LOGIN_ACCESS=''
fi

# --- 2. Liste blanche d'IP (optionnelle) ---------------------------------------
ACCESS_DIRECTIVES=''
if [ -n "$ALLOWED_IPS" ]; then
  for ip in $(printf '%s' "$ALLOWED_IPS" | tr ',' ' '); do
    ACCESS_DIRECTIVES="${ACCESS_DIRECTIVES}allow ${ip};
    "
  done
  ACCESS_DIRECTIVES="${ACCESS_DIRECTIVES}deny all;"
fi

# --- 3. IP réelle derrière un reverse proxy (limites, liste blanche, journal) ----
REAL_IP_DIRECTIVES=''
if [ -n "$REAL_IP_FROM" ] && [ "$REAL_IP_FROM" != none ]; then
  for cidr in $REAL_IP_FROM; do
    REAL_IP_DIRECTIVES="${REAL_IP_DIRECTIVES}set_real_ip_from ${cidr};
    "
  done
  REAL_IP_DIRECTIVES="${REAL_IP_DIRECTIVES}real_ip_header X-Forwarded-For;
    real_ip_recursive on;"
fi

# --- 4. En-têtes de sécurité et CSP ---------------------------------------------
CSP_SCRIPT_HASHES=$(cat /etc/nginx/csp-script-hashes 2>/dev/null || true)
CONNECT_SRC=$(printf "'self' %s %s" "$(origin_of "$VITE_AUTH_API_URL")" "$(origin_of "$VITE_FUSION_API_URL")" | sed 's/ *$//')

mkdir -p /etc/nginx/snippets
cat > /etc/nginx/snippets/headers-base.conf <<'EOT'
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
add_header Referrer-Policy "same-origin" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=(), usb=()" always;
add_header Cross-Origin-Opener-Policy "same-origin" always;
add_header Cross-Origin-Resource-Policy "same-origin" always;
EOT
# Vers les API : aucun cookie du navigateur transmis, et les en-têtes de l'amont
# (Cloudflare, sécurité, alt-svc...) ne sont pas renvoyés tels quels au navigateur.
cat > /etc/nginx/snippets/proxy-common.conf <<'EOT'
proxy_set_header Cookie "";
proxy_set_header X-Forwarded-For "";
proxy_hide_header Set-Cookie;
proxy_hide_header Access-Control-Allow-Origin;
proxy_hide_header Access-Control-Allow-Credentials;
proxy_hide_header Alt-Svc;
proxy_hide_header CF-RAY;
proxy_hide_header CF-Cache-Status;
proxy_hide_header Report-To;
proxy_hide_header NEL;
proxy_hide_header Document-Policy;
proxy_hide_header Strict-Transport-Security;
proxy_hide_header Content-Security-Policy;
proxy_hide_header X-Frame-Options;
proxy_hide_header X-Content-Type-Options;
proxy_hide_header X-XSS-Protection;
proxy_hide_header Referrer-Policy;
proxy_hide_header Permissions-Policy;
proxy_hide_header Cross-Origin-Opener-Policy;
proxy_hide_header Cross-Origin-Resource-Policy;
proxy_hide_header Origin-Agent-Cluster;
proxy_hide_header X-Permitted-Cross-Domain-Policies;
proxy_hide_header X-Download-Options;
proxy_hide_header X-DNS-Prefetch-Control;
proxy_hide_header X-Powered-By;
EOT
cat > /etc/nginx/snippets/headers-csp.conf <<EOT
add_header Content-Security-Policy "default-src 'self'; script-src 'self' ${CSP_SCRIPT_HASHES}; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src ${CONNECT_SRC}; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'" always;
EOT

# --- 5. Configuration du front et de nginx --------------------------------------
js_escape() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

cat > /usr/share/nginx/html/config.js <<EOT
window.__APP_CONFIG__ = {
  VITE_AUTH_API_URL: "$(js_escape "$VITE_AUTH_API_URL")",
  VITE_FUSION_API_URL: "$(js_escape "$VITE_FUSION_API_URL")",
  SERVICE_TOKEN_MODE: "$SERVICE_TOKEN_MODE"
};
EOT

export AUTH_API_PROXY FUSION_API_PROXY AUTH_HEADER LOGIN_ACCESS ACCESS_DIRECTIVES REAL_IP_DIRECTIVES
envsubst '${AUTH_API_PROXY} ${FUSION_API_PROXY} ${AUTH_HEADER} ${LOGIN_ACCESS} ${ACCESS_DIRECTIVES} ${REAL_IP_DIRECTIVES}' \
  < /etc/nginx/templates/default.conf.template \
  > /etc/nginx/conf.d/default.conf

echo "fusion-usage-dashboard: service_token=$SERVICE_TOKEN_MODE allowed_ips=${ALLOWED_IPS:-tous}" >&2
exec nginx -g 'daemon off;'
