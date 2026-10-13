#!/usr/bin/env bash
# One-command founder staging recovery (hold-period).
# Brings up Postgres check → Phoenix :4000 → Vite :5173 (LAN bind).
# Optional: Cloudflare Quick Tunnel + caffeinate.
#
# Usage:
#   ./scripts/opal_founder_staging_up.sh
#   ./scripts/opal_founder_staging_up.sh --with-tunnel
#   ./scripts/opal_founder_staging_up.sh --with-tunnel --caffeinate
#
# Never commits secrets. Never enables founder seed by default.
# This is NOT production. Render/Fly remain the always-on path.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OPAL_HOME="${HOME}/.opal"
RUN_DIR="${HOME}/.grok/long-running-background-tasks"
API_PORT="${OPAL_API_PORT:-4000}"
WEB_PORT="${OPAL_FE_PORT:-5173}"
WITH_TUNNEL=0
WITH_CAFFEINATE=0

for arg in "$@"; do
  case "$arg" in
    --with-tunnel) WITH_TUNNEL=1 ;;
    --caffeinate) WITH_CAFFEINATE=1 ;;
    -h|--help)
      sed -n '1,20p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown arg: $arg" >&2
      exit 2
      ;;
  esac
done

mkdir -p "$OPAL_HOME" "$RUN_DIR"

echo "== Opal founder staging up =="
echo "Worktree: $ROOT"
echo "Branch:   $(git -C "$ROOT" branch --show-current 2>/dev/null || echo '?')"
echo "HEAD:     $(git -C "$ROOT" rev-parse --short HEAD 2>/dev/null || echo '?')"
echo "Mode:     founder staging (seed OFF by default; not production)"

# --- secrets (names only; never echo values) ---
ENV_FILE="${OPAL_HOME}/r1a1.env"
if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
  echo "Env:      loaded $ENV_FILE"
else
  echo "WARN:     $ENV_FILE missing — Phoenix may lack provider keys"
fi

# --- Postgres ---
if command -v pg_isready >/dev/null 2>&1; then
  if pg_isready -h 127.0.0.1 >/dev/null 2>&1; then
    echo "Postgres: accepting connections on 127.0.0.1:5432"
  else
    echo "Postgres: not ready — attempting docker compose..."
    if [[ -f "$ROOT/infra/local/docker-compose.yml" ]]; then
      docker compose -f "$ROOT/infra/local/docker-compose.yml" up -d postgres
      for _ in $(seq 1 40); do
        pg_isready -h 127.0.0.1 >/dev/null 2>&1 && break
        sleep 0.5
      done
      pg_isready -h 127.0.0.1 >/dev/null 2>&1 || {
        echo "FAILED: Postgres still down" >&2
        exit 1
      }
      echo "Postgres: up via docker compose"
    else
      echo "FAILED: Postgres down and no docker-compose path" >&2
      exit 1
    fi
  fi
else
  echo "WARN:     pg_isready missing — skipping Postgres probe"
fi

# --- Phoenix ---
phx_ok() { curl -sf --max-time 5 "http://127.0.0.1:${API_PORT}/health" >/dev/null 2>&1; }
if phx_ok; then
  echo "Phoenix:  already healthy on :${API_PORT}"
else
  echo "Phoenix:  starting mix phx.server..."
  (
    cd "$ROOT/apps/opal_core"
    # Prefer production_sms when Twilio wired; otherwise runtime decides.
    export MIX_ENV="${MIX_ENV:-dev}"
    export PHX_SERVER=true
    exec mix phx.server
  ) >"${RUN_DIR}/opal_phoenix_staging.log" 2>&1 &
  echo $! >"${RUN_DIR}/opal_phoenix.pid"
  for i in $(seq 1 60); do
    if phx_ok; then
      echo "Phoenix:  healthy"
      break
    fi
    sleep 1
    if [[ $i -eq 60 ]]; then
      echo "FAILED: Phoenix did not become healthy. See ${RUN_DIR}/opal_phoenix_staging.log" >&2
      tail -40 "${RUN_DIR}/opal_phoenix_staging.log" || true
      exit 1
    fi
  done
fi
curl -s --max-time 5 "http://127.0.0.1:${API_PORT}/health" | head -c 240
echo

# --- Vite (LAN bind for phone / tunnel) ---
vite_ok() { curl -sf --max-time 5 "http://127.0.0.1:${WEB_PORT}/" >/dev/null 2>&1; }
if vite_ok; then
  echo "Vite:     already healthy on :${WEB_PORT}"
else
  echo "Vite:     starting npx vite --host 0.0.0.0 --port ${WEB_PORT}..."
  (
    cd "$ROOT/apps/opal_web"
    # Same-origin proxy to Phoenix; do not bake production API into founder staging.
    unset VITE_OPAL_API_URL || true
    unset VITE_OPAL_SOCKET_URL || true
    exec npx vite --host 0.0.0.0 --port "$WEB_PORT"
  ) >"${RUN_DIR}/opal_vite_staging.log" 2>&1 &
  echo $! >"${RUN_DIR}/opal_vite.pid"
  for i in $(seq 1 40); do
    if vite_ok; then
      echo "Vite:     healthy"
      break
    fi
    sleep 0.5
    if [[ $i -eq 40 ]]; then
      echo "FAILED: Vite did not become healthy. See ${RUN_DIR}/opal_vite_staging.log" >&2
      tail -40 "${RUN_DIR}/opal_vite_staging.log" || true
      exit 1
    fi
  done
fi

LAN_IP="$(ipconfig getifaddr en0 2>/dev/null || true)"
echo "LAN:      ${LAN_IP:-unknown} (same-WiFi: http://${LAN_IP:-LAN}:${WEB_PORT}/)"

# --- Optional Cloudflare Quick Tunnel ---
TUNNEL_URL=""
if [[ "$WITH_TUNNEL" -eq 1 ]]; then
  if ! command -v cloudflared >/dev/null 2>&1; then
    echo "FAILED: cloudflared not installed (brew install cloudflare/cloudflare/cloudflared)" >&2
    exit 1
  fi
  # Stop prior FE tunnel if pid file points at a live process
  if [[ -f "${OPAL_HOME}/cloudflared-fe.pid" ]]; then
    old="$(cat "${OPAL_HOME}/cloudflared-fe.pid" 2>/dev/null || true)"
    if [[ -n "$old" ]] && kill -0 "$old" 2>/dev/null; then
      echo "Tunnel:   reusing pid $old"
    else
      rm -f "${OPAL_HOME}/cloudflared-fe.pid"
    fi
  fi
  if [[ ! -f "${OPAL_HOME}/cloudflared-fe.pid" ]] || ! kill -0 "$(cat "${OPAL_HOME}/cloudflared-fe.pid")" 2>/dev/null; then
    : >"${OPAL_HOME}/cloudflared-fe.log"
    nohup cloudflared tunnel --url "http://127.0.0.1:${WEB_PORT}" \
      >"${OPAL_HOME}/cloudflared-fe.log" 2>&1 &
    echo $! >"${OPAL_HOME}/cloudflared-fe.pid"
    echo "Tunnel:   starting cloudflared → :${WEB_PORT} (pid $(cat "${OPAL_HOME}/cloudflared-fe.pid"))"
  fi
  for _ in $(seq 1 40); do
    TUNNEL_URL="$(grep -Eo 'https://[a-zA-Z0-9.-]+\.trycloudflare\.com' "${OPAL_HOME}/cloudflared-fe.log" 2>/dev/null | head -1 || true)"
    [[ -n "$TUNNEL_URL" ]] && break
    sleep 0.5
  done
  if [[ -z "$TUNNEL_URL" ]]; then
    echo "FAILED: no trycloudflare URL yet. See ${OPAL_HOME}/cloudflared-fe.log" >&2
    exit 1
  fi
  cat >"${OPAL_HOME}/tunnel.env" <<EOF
OPAL_PUBLIC_BASE_MODE=tunnel
OPAL_TUNNEL_FE_URL=${TUNNEL_URL}
OPAL_TUNNEL_API_URL=${TUNNEL_URL}
OPAL_PUBLIC_BASE_URL=${TUNNEL_URL}
OPAL_CLOUDFLARED_PID=$(cat "${OPAL_HOME}/cloudflared-fe.pid")
OPAL_CLOUDFLARED_TARGET=http://127.0.0.1:${WEB_PORT}
EOF
  chmod 600 "${OPAL_HOME}/tunnel.env"
  echo "Tunnel:   $TUNNEL_URL"
  echo "Env:      wrote ${OPAL_HOME}/tunnel.env (never commit)"
  # Prove proxy path
  code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 45 "${TUNNEL_URL}/health" || echo 000)"
  echo "Tunnel /health → HTTP $code"
fi

# --- Optional caffeinate (watch cloudflared if present, else Phoenix) ---
if [[ "$WITH_CAFFEINATE" -eq 1 ]]; then
  watch_pid=""
  if [[ -f "${OPAL_HOME}/cloudflared-fe.pid" ]]; then
    watch_pid="$(cat "${OPAL_HOME}/cloudflared-fe.pid")"
  elif [[ -f "${RUN_DIR}/opal_phoenix.pid" ]]; then
    watch_pid="$(cat "${RUN_DIR}/opal_phoenix.pid")"
  fi
  if [[ -n "$watch_pid" ]]; then
    if ! pgrep -x caffeinate >/dev/null 2>&1; then
      nohup caffeinate -dims -w "$watch_pid" >"${OPAL_HOME}/caffeinate-staging.log" 2>&1 &
      echo $! >"${OPAL_HOME}/caffeinate-staging.pid"
      echo "Caffeinate: watching pid $watch_pid"
    else
      echo "Caffeinate: already running"
    fi
  fi
fi

echo ""
echo "========================================"
echo "FOUNDER STAGING READY"
echo "Local web:   http://127.0.0.1:${WEB_PORT}/"
if [[ -n "${LAN_IP:-}" ]]; then
  echo "LAN web:     http://${LAN_IP}:${WEB_PORT}/"
fi
if [[ -n "$TUNNEL_URL" ]]; then
  echo "Phone HTTPS: $TUNNEL_URL"
fi
echo "API health:  http://127.0.0.1:${API_PORT}/health"
echo "Seed:        OFF (do not add ?opal_founder_seed=1 for reality walks)"
echo "Walk:        shots/steward/FOUNDER_STAGING_REALITY_WALK.md"
echo "========================================"
echo "Boundaries: Cloudflare = founder bridge only. Production = Render/Fly always-on."
