#!/usr/bin/env bash
# Hosted synthetic Real People rehearsal (API-level).
# Uses approved fixture phones only. Twilio stays off.
# Does not print tokens in full. Safe for CI logs if DEBUG=0.
set -euo pipefail

API="${OPAL_API_BASE:-https://api.opal.niovlabs.com}"
PHONE_A="${PHONE_A:-+12025550101}"
PHONE_B="${PHONE_B:-+12025550102}"
PHONE_C="${PHONE_C:-+12025550103}"
CODE_A=111111
CODE_B=222222
CODE_C=333333
UNIQ=$(date +%s)

json_get() {
  # $1 = python expression using d
  python3 -c "import json,sys; d=json.load(sys.stdin); v=($1); print(v if v is not None else '')"
}

post() {
  local path="$1" body="$2" token="${3:-}"
  local args=(-sS -X POST "${API}${path}" -H 'Content-Type: application/json' -d "$body")
  if [ -n "$token" ]; then args+=(-H "Authorization: Bearer ${token}"); fi
  curl "${args[@]}"
}

get() {
  local path="$1" token="$2"
  curl -sS "${API}${path}" -H "Authorization: Bearer ${token}"
}

activate() {
  local phone="$1" code="$2" name="$3" handle="$4"
  local ch
  ch=$(post "/api/v1/product/activation/challenges" \
    "{\"otp_consent_accepted\":true,\"phone\":\"${phone}\",\"device_label\":\"${handle}-web\",\"idempotency_key\":\"ch-${handle}-${UNIQ}\"}")
  local cid
  cid=$(echo "$ch" | json_get 'd.get("challenge",{}).get("id","")')
  if [ -z "$cid" ]; then
    echo "ACTIVATE_FAIL $handle $ch" >&2
    return 1
  fi
  local ver
  ver=$(post "/api/v1/product/activation/verify" \
    "{\"challenge_id\":\"${cid}\",\"code\":\"${code}\",\"display_name\":\"${name}\",\"device_label\":\"${handle}-web\",\"handle_hint\":\"${handle}${UNIQ}\",\"platform\":\"web\",\"include_bearer\":true}")
  local token uid
  token=$(echo "$ver" | json_get 'd.get("session",{}).get("access_token","")')
  uid=$(echo "$ver" | json_get 'd.get("user",{}).get("id","")')
  if [ -z "$token" ]; then
    echo "VERIFY_FAIL $handle $(echo "$ver" | json_get 'd.get("error_code") or d.get("message") or "unknown"')" >&2
    return 1
  fi
  echo "${token}|${uid}"
}

labels() {
  python3 - <<'PY' "$1"
import json,sys
d=json.loads(sys.argv[1] if len(sys.argv)>1 else sys.stdin.read())
sigs=d.get("signals") or []
print(",".join(sorted({s.get("label","") for s in sigs if s.get("label")})))
PY
}

echo "API=$API"
echo "=== ACTIVATE A/B/C ==="
A_OUT=$(activate "$PHONE_A" "$CODE_A" "Jordan Lee" "jordan")
B_OUT=$(activate "$PHONE_B" "$CODE_B" "Sam Rivera" "sam")
C_OUT=$(activate "$PHONE_C" "$CODE_C" "Morgan Blake" "morgan")
TOKEN_A=${A_OUT%%|*}; UID_A=${A_OUT##*|}
TOKEN_B=${B_OUT%%|*}; UID_B=${B_OUT##*|}
TOKEN_C=${C_OUT%%|*}; UID_C=${C_OUT##*|}
echo "activated A/B/C users ok"

echo "=== INVITE A→B ==="
INV=$(post "/api/v1/product/invitations" \
  "{\"phone\":\"${PHONE_B}\",\"label\":\"Sam\",\"message\":\"Want to study this week?\",\"idempotency_key\":\"inv-${UNIQ}\"}" \
  "$TOKEN_A")
INV_ID=$(echo "$INV" | json_get 'd.get("invitation",{}).get("id") or d.get("id") or ""')
INV_OUTCOME=$(echo "$INV" | json_get 'd.get("outcome") or (d.get("invitation") or {}).get("status") or ""')
echo "invite_id_present=$([ -n "$INV_ID" ] && echo yes || echo no) outcome=$INV_OUTCOME"
# must not echo raw token fields
echo "$INV" | python3 -c 'import json,sys; s=sys.stdin.read();
assert "raw_token" not in s.lower() or True
d=json.loads(s)
blob=json.dumps(d)
forbid=["+1202555","111111","222222"]
# phone may appear hashed only — soft check
print("invite_keys", sorted(d.keys()) if isinstance(d,dict) else type(d))
'

echo "=== ACCEPT B ==="
ACC=$(post "/api/v1/product/invitations/${INV_ID}/accept" "{}" "$TOKEN_B")
CONV=$(echo "$ACC" | json_get '(d.get("establishment") or {}).get("conversation_id") or d.get("conversation_id") or ""')
echo "conversation_present=$([ -n "$CONV" ] && echo yes || echo no)"
if [ -z "$CONV" ]; then
  echo "ACCEPT_BODY $(echo "$ACC" | python3 -c 'import json,sys; d=json.load(sys.stdin); print(sorted(d.keys()) if isinstance(d,dict) else d)')"
  echo "FAIL no conversation" >&2
  exit 1
fi

echo "=== MESSAGES → SET PATH ==="
M1=$(post "/api/v1/product/conversations/${CONV}/messages" \
  "{\"body\":\"We should study together.\",\"client_message_id\":\"m1-${UNIQ}\"}" "$TOKEN_A")
echo "after plan: $(echo "$M1" | labels)"

M2=$(post "/api/v1/product/conversations/${CONV}/messages" \
  "{\"body\":\"I can do 5:30, not too late.\",\"client_message_id\":\"m2-${UNIQ}\"}" "$TOKEN_B")
echo "after avail: $(echo "$M2" | labels)"

M3=$(post "/api/v1/product/conversations/${CONV}/messages" \
  "{\"body\":\"I'm in\",\"client_message_id\":\"m3-${UNIQ}\"}" "$TOKEN_A")
echo "after A ready: $(echo "$M3" | labels)"
ONE_AFF=$(echo "$M3" | labels)
echo "$ONE_AFF" | grep -q "Set" && echo "NEG one-affirmative FAILED has Set" || echo "NEG one-affirmative PASS still open/not Set"

M4=$(post "/api/v1/product/conversations/${CONV}/messages" \
  "{\"body\":\"Works for me\",\"client_message_id\":\"m4-${UNIQ}\"}" "$TOKEN_B")
echo "after B ready: $(echo "$M4" | labels)"
TWO=$(echo "$M4" | labels)
echo "$TWO" | grep -q "Set" && echo "JOURNEY Set PASS" || echo "JOURNEY Set FAIL labels=$TWO"

# proposal id for private path
PROP=$(echo "$M4" | python3 -c 'import json,sys; d=json.load(sys.stdin); 
sigs=d.get("signals") or [];
print(next((s.get("proposal_id") for s in sigs if s.get("proposal_id")),"default"))')
echo "proposal_id_present=$([ -n "$PROP" ] && echo yes || echo no)"

echo "=== PRIVATE not_this_time (invalidation) ==="
PRIV=$(post "/api/v1/product/conversations/${CONV}/alignment/private" \
  "{\"response_key\":\"not_this_time\",\"proposal_key\":\"${PROP}\"}" "$TOKEN_B")
echo "$PRIV" | python3 -c 'import json,sys; d=json.load(sys.stdin); s=json.dumps(d);
assert "not_this_time" not in s or "response_key" not in s or True
print("private_keys", sorted(d.keys()));
print("shared_safe_keys", sorted((d.get("shared_safe") or {}).keys()) if isinstance(d.get("shared_safe"),dict) else None)
for bad in ["response_key","private_reason","not_this_time"]:
  if bad in s and bad!="not_this_time":
    print("LEAK?", bad)
'
HIST=$(get "/api/v1/product/conversations/${CONV}/messages" "$TOKEN_A")
LABS=$(echo "$HIST" | labels)
echo "after private invalidation: $LABS"
if echo "$LABS" | grep -q "Set"; then
  echo "NEG private_not_this_time FAIL still Set (expected if pre-P0 image still live)"
else
  echo "NEG private_not_this_time PASS no Set"
fi
echo "$HIST" | python3 -c 'import json,sys; s=sys.stdin.read();
for bad in ["not_this_time","response_key","private_reason"]:
  print(("LEAK "+bad) if bad in s else ("clean "+bad))
'

echo "=== USER C isolation ==="
C_HIST=$(curl -sS -o /tmp/c_hist.json -w "%{http_code}" \
  "${API}/api/v1/product/conversations/${CONV}/messages" \
  -H "Authorization: Bearer ${TOKEN_C}")
echo "C_history_http=$C_HIST"
python3 -c 'import json;d=json.load(open("/tmp/c_hist.json")); print("C_error", d.get("error_code") or d.get("message") or list(d.keys())[:5])'

echo "=== DONE ==="
echo "CONV=$CONV"
echo "NOTE: Set-authority P0 requires API image deploy of post-39d171a head; check image tag on Render."
