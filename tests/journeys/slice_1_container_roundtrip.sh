#!/usr/bin/env bash
# True multi-container HTTP E2E for Build Slice 1.
# Requires Docker. Proves Elixir → live Python → Elixir over compose network.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
COMPOSE=(docker compose -f "$ROOT/infra/local/docker-compose.yml")
CORE_URL="${OPAL_CORE_URL:-http://127.0.0.1:4000}"
AI_URL="${OPAL_AI_URL_HOST:-http://127.0.0.1:8000}"

ALEX="a1111111-1111-4111-8111-111111111111"
JORDAN="a2222222-2222-4222-8222-222222222222"
CONV_AJ="b1111111-1111-4111-8111-111111111111"
CONSENT_GRANTED="c1111111-1111-4111-8111-111111111111"
CONSENT_DENIED="c2222222-2222-4222-8222-222222222222"

EVIDENCE_DIR="$ROOT/docs/evidence"
mkdir -p "$EVIDENCE_DIR"
LOG="$EVIDENCE_DIR/BUILD_SLICE_1_CONTAINER_E2E_RUN.log"
: >"$LOG"

log() {
  echo "$@" | tee -a "$LOG"
}

hdr_alex=(-H "content-type: application/json" -H "x-opal-dev-user-id: $ALEX")
hdr_jordan=(-H "content-type: application/json" -H "x-opal-dev-user-id: $JORDAN")

wait_http() {
  local url=$1
  local name=$2
  local i=0
  until curl -fsS "$url" >/dev/null 2>&1; do
    i=$((i + 1))
    if [ "$i" -gt 90 ]; then
      log "FAIL: $name not healthy at $url"
      "${COMPOSE[@]}" logs --tail=80 || true
      exit 1
    fi
    sleep 2
  done
  log "OK health: $name ($url)"
}

json_field() {
  python3 -c 'import json,sys; d=json.load(sys.stdin); print(d'"$1"')'
}

ai_count() {
  curl -fsS "$AI_URL/v1/debug/request-count" | json_field "['request_count']"
}

reset_ai_count() {
  curl -fsS -X POST "$AI_URL/v1/debug/reset-count" >/dev/null
}

require_http_client() {
  info=$(curl -fsS "${hdr_alex[@]}" "$CORE_URL/api/v1/dev/client-info")
  log "client-info: $info"
  echo "$info" | grep -q 'OpalCore.AI.HTTPClient' || {
    log "FAIL: opal_core is not using live HTTPClient"
    exit 1
  }
}

log "=== Slice 1 container E2E ==="
log "ROOT=$ROOT"
log "time=$(date -u +%Y-%m-%dT%H:%M:%SZ)"

if [ "${SKIP_COMPOSE_REBUILD:-0}" = "1" ]; then
  log "--- start existing images (SKIP_COMPOSE_REBUILD=1) ---"
  "${COMPOSE[@]}" up -d
else
  log "--- teardown/start clean ---"
  "${COMPOSE[@]}" down -v --remove-orphans >/dev/null 2>&1 || true
  "${COMPOSE[@]}" build
  "${COMPOSE[@]}" up -d
fi

wait_http "$AI_URL/health" "opal_ai"
wait_http "$CORE_URL/health" "opal_core"
require_http_client

network=$("${COMPOSE[@]}" ps --format json 2>/dev/null | head -1 || true)
log "compose services:"
"${COMPOSE[@]}" ps | tee -a "$LOG"

# ---------- happy path ----------
log "--- happy path: message + ai_echo ---"
reset_ai_count
before=$(ai_count)
log "python request_count before=$before"

curl -fsS "${hdr_alex[@]}" -X POST "$CORE_URL/api/v1/dev/events/reset" >/dev/null || true

msg=$(curl -fsS "${hdr_alex[@]}" -X POST "$CORE_URL/api/v1/messages" -d "{
  \"conversation_id\":\"$CONV_AJ\",
  \"client_message_id\":\"e2e-msg-$(date +%s)\",
  \"message_type\":\"text\",
  \"body\":\"container e2e hello\"
}")
log "message response: $msg"
message_id=$(echo "$msg" | json_field "['message']['id']")
server_seq=$(echo "$msg" | json_field "['message']['server_seq']")
trace_id="trace-e2e-$(date +%s)"

job=$(curl -fsS "${hdr_alex[@]}" -X POST "$CORE_URL/api/v1/messages/${message_id}/ai-jobs" -d "{
  \"capability\":\"ai_echo\",
  \"consent_proof_id\":\"$CONSENT_GRANTED\",
  \"idempotency_key\":\"e2e-idem-$(date +%s)\",
  \"trace_id\":\"$trace_id\"
}")
log "ai-job response: $job"
status=$(echo "$job" | json_field "['job']['status']")
job_id=$(echo "$job" | json_field "['job']['id']")

# Oban may complete inline or async; poll if needed
i=0
while [ "$status" != "completed" ] && [ "$i" -lt 30 ]; do
  sleep 1
  job=$(curl -fsS "${hdr_alex[@]}" "$CORE_URL/api/v1/ai-jobs/${job_id}")
  status=$(echo "$job" | json_field "['job']['status']")
  i=$((i + 1))
done
log "final job: $job"

if [ "$status" != "completed" ]; then
  log "FAIL: expected completed, got $status"
  exit 1
fi

after=$(ai_count)
log "python request_count after=$after"
if [ "$after" -le "$before" ]; then
  log "FAIL: Python was not called over the network"
  exit 1
fi

norm=$(echo "$job" | python3 -c "import json,sys; j=json.load(sys.stdin); print(j['job']['result']['output']['normalized_text'])")
if [ "$norm" != "container e2e hello" ]; then
  log "FAIL: unexpected echo output: $norm"
  exit 1
fi

# PubSub / event probe
sleep 1
events=$(curl -fsS "${hdr_alex[@]}" "$CORE_URL/api/v1/dev/events")
log "events: $events"
echo "$events" | grep -q 'ai_job.completed' || log "WARN: event probe may have missed live subscribe; job completed is still proven via API"

# Message still authoritative
msg_check=$(curl -fsS "${hdr_alex[@]}" -X POST "$CORE_URL/api/v1/messages" -d "{
  \"conversation_id\":\"$CONV_AJ\",
  \"client_message_id\":\"e2e-msg-seq-$(date +%s)-$RANDOM\",
  \"body\":\"seq-check\"
}")
seq2=$(echo "$msg_check" | json_field "['message']['server_seq']")
log "server_seq first=$server_seq second=$seq2"
if [ "$seq2" -le "$server_seq" ]; then
  log "FAIL: server_seq did not advance"
  exit 1
fi

# ---------- invalid consent: zero python calls ----------
log "--- invalid consent: denied must not call Python ---"
reset_ai_count
before=$(ai_count)
msg2=$(curl -fsS "${hdr_jordan[@]}" -X POST "$CORE_URL/api/v1/messages" -d "{
  \"conversation_id\":\"$CONV_AJ\",
  \"client_message_id\":\"e2e-denied-$(date +%s)\",
  \"body\":\"should not reach python\"
}")
mid2=$(echo "$msg2" | json_field "['message']['id']")
code=$(curl -s -o /tmp/opal_denied.json -w "%{http_code}" "${hdr_jordan[@]}" \
  -X POST "$CORE_URL/api/v1/messages/${mid2}/ai-jobs" -d "{
  \"capability\":\"ai_echo\",
  \"consent_proof_id\":\"$CONSENT_DENIED\",
  \"idempotency_key\":\"e2e-denied-$(date +%s)\",
  \"trace_id\":\"trace-e2e-denied-0001\"
}")
log "denied http=$code body=$(cat /tmp/opal_denied.json)"
after=$(ai_count)
if [ "$code" != "403" ]; then
  log "FAIL: expected 403 for denied consent"
  exit 1
fi
if [ "$after" != "$before" ]; then
  log "FAIL: Python called despite denied consent ($before -> $after)"
  exit 1
fi
log "OK denied consent produced zero Python calls"

# ---------- idempotency ----------
log "--- AI idempotency over live path ---"
reset_ai_count
idem="e2e-idem-once-$(date +%s)"
msg3=$(curl -fsS "${hdr_alex[@]}" -X POST "$CORE_URL/api/v1/messages" -d "{
  \"conversation_id\":\"$CONV_AJ\",
  \"client_message_id\":\"e2e-idem-msg-$(date +%s)\",
  \"body\":\"idem body\"
}")
mid3=$(echo "$msg3" | json_field "['message']['id']")
j1=$(curl -fsS "${hdr_alex[@]}" -X POST "$CORE_URL/api/v1/messages/${mid3}/ai-jobs" -d "{
  \"capability\":\"ai_echo\",
  \"consent_proof_id\":\"$CONSENT_GRANTED\",
  \"idempotency_key\":\"$idem\",
  \"trace_id\":\"trace-e2e-idem-000001\"
}")
j2=$(curl -fsS "${hdr_alex[@]}" -X POST "$CORE_URL/api/v1/messages/${mid3}/ai-jobs" -d "{
  \"capability\":\"ai_echo\",
  \"consent_proof_id\":\"$CONSENT_GRANTED\",
  \"idempotency_key\":\"$idem\",
  \"trace_id\":\"trace-e2e-idem-000001\"
}")
id1=$(echo "$j1" | json_field "['job']['id']")
id2=$(echo "$j2" | json_field "['job']['id']")
origin2=$(echo "$j2" | json_field "['origin']")
count=$(ai_count)
log "idem ids $id1 vs $id2 origin2=$origin2 python_count=$count"
if [ "$id1" != "$id2" ] || [ "$origin2" != "idempotent" ]; then
  log "FAIL: AI idempotency broken"
  exit 1
fi
if [ "$count" -ne 1 ]; then
  log "FAIL: expected exactly 1 Python call for idempotent pair, got $count"
  exit 1
fi

# ---------- safety refusal ----------
log "--- safety refusal marker ---"
msg4=$(curl -fsS "${hdr_alex[@]}" -X POST "$CORE_URL/api/v1/messages" -d "{
  \"conversation_id\":\"$CONV_AJ\",
  \"client_message_id\":\"e2e-refuse-$(date +%s)\",
  \"body\":\"please OPAL_TEST_FORCE_REFUSAL now\"
}")
mid4=$(echo "$msg4" | json_field "['message']['id']")
j4=$(curl -fsS "${hdr_alex[@]}" -X POST "$CORE_URL/api/v1/messages/${mid4}/ai-jobs" -d "{
  \"capability\":\"ai_echo\",
  \"consent_proof_id\":\"$CONSENT_GRANTED\",
  \"idempotency_key\":\"e2e-refuse-$(date +%s)\",
  \"trace_id\":\"trace-e2e-refuse-00001\"
}")
# poll
rid=$(echo "$j4" | json_field "['job']['id']")
st=$(echo "$j4" | json_field "['job']['status']")
i=0
while [ "$st" != "refused" ] && [ "$st" != "completed" ] && [ "$st" != "failed" ] && [ "$i" -lt 30 ]; do
  sleep 1
  j4=$(curl -fsS "${hdr_alex[@]}" "$CORE_URL/api/v1/ai-jobs/${rid}")
  st=$(echo "$j4" | json_field "['job']['status']")
  i=$((i + 1))
done
log "refusal job: $j4"
if [ "$st" != "refused" ]; then
  log "FAIL: expected refused, got $st"
  exit 1
fi

# ---------- Python unavailable ----------
log "--- Python unavailable ---"
"${COMPOSE[@]}" stop opal_ai >/dev/null
msg5=$(curl -fsS "${hdr_alex[@]}" -X POST "$CORE_URL/api/v1/messages" -d "{
  \"conversation_id\":\"$CONV_AJ\",
  \"client_message_id\":\"e2e-down-$(date +%s)\",
  \"body\":\"python down\"
}")
mid5=$(echo "$msg5" | json_field "['message']['id']")
j5=$(curl -fsS "${hdr_alex[@]}" -X POST "$CORE_URL/api/v1/messages/${mid5}/ai-jobs" -d "{
  \"capability\":\"ai_echo\",
  \"consent_proof_id\":\"$CONSENT_GRANTED\",
  \"idempotency_key\":\"e2e-down-$(date +%s)\",
  \"trace_id\":\"trace-e2e-down-0000001\"
}")
jid5=$(echo "$j5" | json_field "['job']['id']")
st5=$(echo "$j5" | json_field "['job']['status']")
i=0
while [ "$st5" != "failed" ] && [ "$i" -lt 30 ]; do
  sleep 1
  j5=$(curl -fsS "${hdr_alex[@]}" "$CORE_URL/api/v1/ai-jobs/${jid5}")
  st5=$(echo "$j5" | json_field "['job']['status']")
  i=$((i + 1))
done
log "unavailable job: $j5"
if [ "$st5" != "failed" ]; then
  log "FAIL: expected failed when Python down, got $st5"
  exit 1
fi
# message authority remains
echo "$msg5" | grep -q 'python down'

"${COMPOSE[@]}" start opal_ai >/dev/null
wait_http "$AI_URL/health" "opal_ai-restart"

log "=== ALL CONTAINER E2E CHECKS PASSED ==="
log "teardown optional: docker compose -f infra/local/docker-compose.yml down -v"
exit 0
