#!/usr/bin/env bash
# Start worktree API + #112 web + seed for founder visual review.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

API_PORT="${API_PORT:-4000}"
WEB_PORT="${WEB_PORT:-5173}"
API_URL="http://127.0.0.1:${API_PORT}"
SOCKET_URL="ws://127.0.0.1:${API_PORT}"

echo "== Opal V2 coded experience review up =="
echo "Worktree: $ROOT"
echo "Branch: build/v2-coded-experience-closure (or current)"

# Stop stale worktree-unrelated preview that confuses founders (best-effort).
if lsof -ti tcp:"$WEB_PORT" >/dev/null 2>&1; then
  echo "Port $WEB_PORT busy — leaving existing process. Prefer free port if not this worktree."
fi

# Start API if health fails
if ! curl -sf "$API_URL/health" >/dev/null 2>&1; then
  echo "Starting API on :$API_PORT ..."
  (
    cd "$ROOT/apps/opal_core"
    MIX_ENV=dev exec mix phx.server
  ) > /tmp/opal_review_api.log 2>&1 &
  echo $! > /tmp/opal_review_api.pid
  for i in $(seq 1 40); do
    if curl -sf "$API_URL/health" >/dev/null 2>&1; then
      echo "API healthy."
      break
    fi
    sleep 1
    if [[ $i -eq 40 ]]; then
      echo "API failed to start. See /tmp/opal_review_api.log"
      tail -40 /tmp/opal_review_api.log || true
      exit 1
    fi
  done
else
  echo "API already healthy at $API_URL"
fi

# Start web
if ! curl -sf "http://127.0.0.1:${WEB_PORT}/" >/dev/null 2>&1; then
  echo "Starting web on :$WEB_PORT with VITE_OPAL_API_URL=$API_URL ..."
  (
    cd "$ROOT/apps/opal_web"
    export VITE_OPAL_API_URL="$API_URL"
    export VITE_OPAL_SOCKET_URL="$SOCKET_URL"
    exec npm run dev -- --host 127.0.0.1 --port "$WEB_PORT"
  ) > /tmp/opal_review_web.log 2>&1 &
  echo $! > /tmp/opal_review_web.pid
  sleep 2
else
  echo "Web already responding on :$WEB_PORT — ensure it was started with VITE_OPAL_API_URL=$API_URL"
fi

echo "Seeding review conversations..."
API_BASE="$API_URL" node "$ROOT/scripts/founder_review_seed.mjs"

echo ""
echo "========================================"
echo "FOUNDER URL:  http://127.0.0.1:${WEB_PORT}/"
echo "Login phone:  +12025550101"
echo "Code:         111111"
echo "========================================"
echo "Skip walkthrough → activate → Home (3s field) → chats → Shared Reality."
echo "Click-through: Home · Dating dyad · Friend dyad · Group · Curate · Extend · Plans · Recall"
echo "PR #112 remains UNMERGED. Logo is working direction only."
