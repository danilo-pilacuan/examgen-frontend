#!/bin/sh
# Generates /usr/share/nginx/html/env.js with the runtime URLs.
# index.html loads env.js before the bundle, so the image is environment-agnostic
# (dev, staging, production) without rebuilding.

set -e

API_URL="${VITE_API_URL:-http://localhost:8000}"
WS_URL="${VITE_WS_URL:-ws://localhost:8000/ws}"

cat > /usr/share/nginx/html/env.js <<EOF
// Generated at runtime by the container entrypoint.
window.__ENV__ = {
  VITE_API_URL: "${API_URL}",
  VITE_WS_URL: "${WS_URL}"
};
EOF

echo "env.js generated: API_URL=${API_URL} WS_URL=${WS_URL}"
