#!/usr/bin/env python3
"""Slice #1 API proof — controlled synthetic auth, real ProductSession UUIDs."""
import json, os, time, urllib.request, uuid

API = os.environ.get("OPAL_API_BASE", "http://127.0.0.1:4000").rstrip("/")
A_PHONE = os.environ.get("USER_A_PHONE", "+12025550101")
B_PHONE = os.environ.get("USER_B_PHONE", "+12025550102")

def post(path, body, token=None):
    data = json.dumps(body).encode()
    req = urllib.request.Request(API + path, data=data, method="POST")
    req.add_header("content-type", "application/json")
    if token:
        req.add_header("authorization", f"Bearer {token}")
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)

def get(path, token):
    req = urllib.request.Request(API + path)
    req.add_header("authorization", f"Bearer {token}")
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)

def activate(phone, name, handle):
    ch = post("/api/v1/product/activation/challenges", {
        "phone": phone,
        "otp_consent_accepted": True,
        "otp_consent_policy_version": "otp-sms-v1",
        "idempotency_key": f"s1-{int(time.time())}-{handle}-{uuid.uuid4().hex[:6]}",
        "device_label": f"slice1-{handle}",
    })
    code = ch.get("development_code")
    assert code, ch
    print(f"AUTH_PROVIDER={ch.get('provider')} not_production_sms={ch.get('not_production_sms')}")
    ver = post("/api/v1/product/activation/verify", {
        "challenge_id": ch["challenge"]["id"],
        "code": code,
        "phone": phone,
        "display_name": name,
        "handle_hint": handle,
        "device_label": f"slice1-{handle}",
        "platform": "web",
        "include_bearer": True,
    })
    return ver["session"]["access_token"], ver["user"]["id"], ver["user"]["display_name"]

print("API=", API)
tok_a, uuid_a, name_a = activate(A_PHONE, "User A", "user_a_s1")
tok_b, uuid_b, name_b = activate(B_PHONE, "User B", "user_b_s1")
assert uuid_a != uuid_b
print(f"USER_A_UUID={uuid_a} NAME={name_a}")
print(f"USER_B_UUID={uuid_b} NAME={name_b}")

d1 = post("/api/v1/product/conversations/direct", {"peer_user_id": uuid_b}, tok_a)
cid = d1["conversation_id"]
d2 = post("/api/v1/product/conversations/direct", {"peer_user_id": uuid_b}, tok_a)
assert d2["conversation_id"] == cid
d3 = post("/api/v1/product/conversations/direct", {"peer_user_id": uuid_a}, tok_b)
assert d3["conversation_id"] == cid
print(f"DIRECT_CONVERSATION_ID={cid}")
print("DUPLICATE_DIRECT_THREADS=0")

post(f"/api/v1/product/conversations/{cid}/messages", {
    "body": "Hey - can you meet tomorrow?",
    "client_message_id": f"s1-a-{uuid.uuid4().hex[:8]}",
}, tok_a)

list_b = get("/api/v1/product/conversations", tok_b)
row = next(c for c in list_b["conversations"] if c["id"] == cid)
assert row["unread_count"] >= 1, row
assert "meet tomorrow" in (row.get("preview") or "")
print("CHAT_SEND_A_TO_B=GREEN unread_b=", row["unread_count"])

# resolve phone A from B
res = post("/api/v1/product/contacts/resolve", {
    "phone": A_PHONE,
    "idempotency_key": f"cr-{uuid.uuid4().hex[:8]}",
}, tok_b)
matched = (res.get("resolution") or {}).get("matched_user_id")
print("RESOLVE_A_FROM_B matched=", matched, "outcome=", (res.get("resolution") or {}).get("outcome"))
assert matched == uuid_a

post(f"/api/v1/product/conversations/{cid}/messages", {
    "body": "Yes, after 6 works.",
    "client_message_id": f"s1-b-{uuid.uuid4().hex[:8]}",
}, tok_b)

post(f"/api/v1/product/conversations/{cid}/read", {}, tok_b)
list_b2 = get("/api/v1/product/conversations", tok_b)
row2 = next(c for c in list_b2["conversations"] if c["id"] == cid)
assert row2["unread_count"] == 0, row2
print("CHAT_READ_STATE=GREEN")

# authz
try:
    tok_c, uuid_c, _ = activate("+12025550103", "User C", "user_c_s1")
    get(f"/api/v1/product/conversations/{cid}/messages", tok_c)
    raise SystemExit("expected 403")
except Exception as e:
    if "403" not in str(e) and "HTTP Error 403" not in str(e):
        # urllib raises HTTPError
        import urllib.error
        if not isinstance(e, urllib.error.HTTPError) or e.code != 403:
            raise
print("CHAT_AUTHZ=GREEN")
print("SLICE1_API_PROOF=GREEN")
