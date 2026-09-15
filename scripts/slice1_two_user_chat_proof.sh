#!/usr/bin/env bash
# Slice #1 — controlled two-user activate + direct chat + unread (API).
# Auth mode: synthetic_development (LABEL HONESTLY). Identities are real ProductSession UUIDs.
set -euo pipefail
API="${OPAL_API_BASE:-http://127.0.0.1:4000}"
A_PHONE="${USER_A_PHONE:-+12025550101}"
B_PHONE="${USER_B_PHONE:-+12025550102}"

activate() {
  local phone="$1" name="$2" handle="$3"
  local idem="s1-$(date +%s)-$handle-$RANDOM"
  local ch challenge_id code provider ver
  ch=$(curl -sS -X POST "$API/api/v1/product/activation/challenges" \
    -H 'content-type: application/json' \
    -d "{\"phone\":\"$phone\",\"otp_consent_accepted\":true,\"otp_consent_policy_version\":\"otp-sms-v1\",\"idempotency_key\":\"$idem\",\"device_label\":\"slice1-$handle\"}")
  challenge_id=$(printf '%s' "$ch" | python3 -c 'import sys,json;d=json.load(sys.stdin);print(d.get("challenge",{}).get("id") or "")')
  code=$(printf '%s' "$ch" | python3 -c 'import sys,json;d=json.load(sys.stdin);print(d.get("development_code") or "")')
  provider=$(printf '%s' "$ch" | python3 -c 'import sys,json;d=json.load(sys.stdin);print(d.get("provider") or "")')
  if [ -z "$challenge_id" ] || [ -z "$code" ]; then
    echo "ACTIVATE_FAIL phone=$phone body=$ch" >&2
    exit 1
  fi
  echo "AUTH_PROVIDER=$provider (controlled RC expects synthetic_development)" >&2
  ver=$(curl -sS -X POST "$API/api/v1/product/activation/verify" \
    -H 'content-type: application/json' \
    -d "{\"challenge_id\":\"$challenge_id\",\"code\":\"$code\",\"phone\":\"$phone\",\"display_name\":\"$name\",\"handle_hint\":\"$handle\",\"device_label\":\"slice1-$handle\",\"platform\":\"web\",\"include_bearer\":true}")
  printf '%s' "$ver" | python3 -c 'import sys,json;d=json.load(sys.stdin);print(d["session"]["access_token"]);print(d["user"]["id"]);print(d["user"]["display_name"])'
}

echo "API=$API"
A_OUT=$(activate "$A_PHONE" "User A" "user_a_s1")
B_OUT=$(activate "$B_PHONE" "User B" "user_b_s1")
TOKEN_A=$(printf '%s\n' "$A_OUT" | sed -n '1p')
UUID_A=$(printf '%s\n' "$A_OUT" | sed -n '2p')
NAME_A=$(printf '%s\n' "$A_OUT" | sed -n '3p')
TOKEN_B=$(printf '%s\n' "$B_OUT" | sed -n '1p')
UUID_B=$(printf '%s\n' "$B_OUT" | sed -n '2p')
NAME_B=$(printf '%s\n' "$B_OUT" | sed -n '3p')
echo "USER_A_UUID=$UUID_A NAME=$NAME_A"
echo "USER_B_UUID=$UUID_B NAME=$NAME_B"
test "$UUID_A" != "$UUID_B"

DIRECT=$(curl -sS -X POST "$API/api/v1/product/conversations/direct" \
  -H "authorization: Bearer $TOKEN_A" -H 'content-type: application/json' \
  -d "{\"peer_user_id\":\"$UUID_B\"}")
CID=$(printf '%s' "$DIRECT" | python3 -c 'import sys,json;print(json.load(sys.stdin)["conversation_id"])')
echo "DIRECT_CONVERSATION_ID=$CID"

DIRECT2=$(curl -sS -X POST "$API/api/v1/product/conversations/direct" \
  -H "authorization: Bearer $TOKEN_A" -H 'content-type: application/json' \
  -d "{\"peer_user_id\":\"$UUID_B\"}")
CID2=$(printf '%s' "$DIRECT2" | python3 -c 'import sys,json;print(json.load(sys.stdin)["conversation_id"])')
test "$CID" = "$CID2"
echo "DUPLICATE_DIRECT_THREADS=0"

curl -sS -X POST "$API/api/v1/product/conversations/$CID/messages" \
  -H "authorization: Bearer $TOKEN_A" -H 'content-type: application/json' \
  -d '{"body":"Hey - can you meet tomorrow?","client_message_id":"s1-script-a1"}' >/dev/null

LIST_B=$(curl -sS "$API/api/v1/product/conversations" -H "authorization: Bearer $TOKEN_B")
printf '%s' "$LIST_B" | CID="$CID" python3 - <<'PY'
import json,os
d=json.load(sys.stdin)
import sys
cid=os.environ['CID']
row=next(c for c in d['conversations'] if c['id']==cid)
assert row['unread_count']>=1, row
assert 'meet tomorrow' in (row.get('preview') or '')
print('CHAT_SEND_A_TO_B=GREEN unread_b=', row['unread_count'])
PY

curl -sS -X POST "$API/api/v1/product/conversations/$CID/messages" \
  -H "authorization: Bearer $TOKEN_B" -H 'content-type: application/json' \
  -d '{"body":"Yes, after 6 works.","client_message_id":"s1-script-b1"}' >/dev/null

curl -sS -X POST "$API/api/v1/product/conversations/$CID/read" \
  -H "authorization: Bearer $TOKEN_B" -H 'content-type: application/json' \
  -d '{}' >/dev/null

LIST_B2=$(curl -sS "$API/api/v1/product/conversations" -H "authorization: Bearer $TOKEN_B")
printf '%s' "$LIST_B2" | CID="$CID" python3 - <<'PY'
import json,os,sys
d=json.load(sys.stdin)
cid=os.environ['CID']
row=next(c for c in d['conversations'] if c['id']==cid)
assert row['unread_count']==0, row
print('CHAT_READ_STATE=GREEN')
print('SLICE1_API_PROOF=GREEN')
print('USER_A_UUID='+os.environ.get('UUID_A',''))
PY

echo "USER_A_UUID=$UUID_A"
echo "USER_B_UUID=$UUID_B"
echo "EXPORT_TOKENS_FOR_UI_WALK=see_secure_local_only"
