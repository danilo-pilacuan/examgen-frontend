#!/bin/sh
# Generates /usr/share/nginx/html/env.js with the runtime URLs.
# index.html loads env.js before the bundle, so the image is environment-agnostic
# (dev, staging, production) without rebuilding.

set -e

# Empty string (compose sets VITE_API_URL: "") means "same origin": the
# nginx proxy serves /api, /ws, /output and the REST routes. Only fall
# back to the dev default when the variable is UNSET.
if [ -f /proc/1/environ ]; then
    if tr '\0' '\n' < /proc/1/environ | grep -q '^VITE_API_URL='; then
        API_URL="$VITE_API_URL"
    else
        API_URL="${VITE_API_URL:-http://localhost:8000}"
    fi
    if tr '\0' '\n' < /proc/1/environ | grep -q '^VITE_WS_URL='; then
        WS_URL="$VITE_WS_URL"
    else
        WS_URL="${VITE_WS_URL:-ws://localhost:8000/ws}"
    fi
else
    API_URL="${VITE_API_URL:-http://localhost:8000}"
    WS_URL="${VITE_WS_URL:-ws://localhost:8000/ws}"
fi

cat > /usr/share/nginx/html/env.js <<EOF
// Generated at runtime by the container entrypoint.
window.__ENV__ = {
  VITE_API_URL: "${API_URL}",
  VITE_WS_URL: "${WS_URL}"
};
EOF

echo "env.js generated: API_URL=${API_URL} WS_URL=${WS_URL}"
