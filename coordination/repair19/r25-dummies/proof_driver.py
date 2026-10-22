#!/usr/bin/env python3
"""Repair #25 — live proof driver (runs on the founder's Mac against
the Mac-side R25 proof stack; real Deepgram, real fold).

Steps:
  1. Activate three synthetic staging accounts (A=Daniel Reyes,
     B=Priya Nair, C=Sam Whitaker — C is never a party to any call).
  2. Import every dummy recording through the real HTTP door as A,
     timing the whole round trip.
  3. Also exercise the door's refusals live (no attestation;
     uploader not a participant; duplicate import).
  4. Read back per-account Memory surfaces (wallet + facts) for
     A, B, and C and dump a single evidence bundle JSON.

The product pipeline is event-driven (Oban + PubSub, no polling in
the app). This external harness samples the import status to know
when to read back; the authoritative per-leg latencies are the
server's own stamps on each import row, captured in the bundle.

Usage: proof_driver.py --base http://127.0.0.1:4100 --dir <dummies dir>
       --out proof-bundle.json
"""
import argparse
import json
import subprocess
import sys
import time
import urllib.request
import urllib.error

BASIS = "Both participants consented to this call being recorded and imported into Opal (fictional staging recording, R25 proof)."


def http(method, base, path, token=None, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(base + path, data=data, method=method)
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode())


def activate(base, phone, name, handle):
    status, body = http("POST", base, "/api/v1/product/activation/challenges", body={
        "otp_consent_accepted": True, "phone": phone,
        "device_label": f"{handle}-mac", "idempotency_key": f"r25-{handle}-{int(time.time())}",
    })
    assert status == 201, (status, body)
    code = body.get("development_code")
    challenge_id = body["challenge"]["id"]
    assert code, f"no development_code exposed: {body}"
    status, body = http("POST", base, "/api/v1/product/activation/verify", body={
        "challenge_id": challenge_id, "code": code, "phone": phone,
        "display_name": name, "device_label": f"{handle}-mac",
        "handle_hint": handle, "platform": "web", "include_bearer": True,
    })
    assert status == 200, (status, body)
    return body["session"]["access_token"], body["user"]["id"]


MIME = {".wav": "audio/wav", ".mp3": "audio/mpeg", ".m4a": "audio/mp4",
        ".webm": "audio/webm", ".ogg": "audio/ogg"}


def import_file(base, token, path, speakers, consent=True, basis=BASIS, language=None, filename=None):
    import os.path

    mime = MIME.get(os.path.splitext(path)[1].lower(), "application/octet-stream")
    cmd = ["curl", "-s", "-X", "POST", base + "/api/v1/product/call-recording-imports",
           "-H", f"Authorization: Bearer {token}",
           "-F", f"file=@{path};type={mime}" + (f";filename={filename}" if filename else ""),
           "-F", f"speaker_user_ids={json.dumps(speakers)}"]
    if consent:
        cmd += ["-F", "consent_attested=true"]
    if basis is not None:
        cmd += ["-F", f"consent_basis={basis}"]
    if language:
        cmd += ["-F", f"language={language}"]
    t0 = time.time()
    raw = subprocess.run(cmd, capture_output=True, text=True)
    wall_ms = int((time.time() - t0) * 1000)
    try:
        return wall_ms, json.loads(raw.stdout)
    except json.JSONDecodeError:
        return wall_ms, {"raw": raw.stdout, "stderr": raw.stderr}


def get_import(base, token, import_id):
    return http("GET", base, f"/api/v1/product/call-recording-imports/{import_id}", token=token)


def wait_done(base, token, import_id, timeout_s=600):
    """Harness-side observation only (the app itself never polls)."""
    t0 = time.time()
    last = None
    while time.time() - t0 < timeout_s:
        status, body = get_import(base, token, import_id)
        last = body
        st = body.get("import", {}).get("status")
        if st in ("done", "failed"):
            return int((time.time() - t0) * 1000), body
        time.sleep(0.25)
    return int((time.time() - t0) * 1000), last


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", required=True)
    ap.add_argument("--dir", required=True)
    ap.add_argument("--out", required=True)
    args = ap.parse_args()
    base, d = args.base, args.dir

    bundle = {"base": base, "accounts": {}, "imports": [], "refusals": {}, "readback": {}}

    tok_a, a = activate(base, "+12025550101", "Daniel Reyes", "r25_daniel")
    tok_b, b = activate(base, "+12025550102", "Priya Nair", "r25_priya")
    tok_c, c = activate(base, "+14155552671", "Sam Whitaker", "r25_sam")
    bundle["accounts"] = {"A": a, "B": b, "C": c}
    print(f"accounts: A={a} B={b} C={c}")

    imports = [
        ("call1", f"{d}/call1-dinner-plan.wav", [a, b], None),
        ("call2", f"{d}/call2-hike-plan.mp3", [a, b], None),
        ("call3", f"{d}/call3-recital.m4a", [a, b], None),
        ("silence", f"{d}/adv-silence.wav", [a, b], None),
        ("corrupt", f"{d}/adv-corrupt.mp3", [a, b], None),
        ("spanish", f"{d}/adv-spanish.wav", [a, b], "es"),
        ("three-speakers", f"{d}/adv-three-speakers.wav", [a, b], None),
        ("overlap", f"{d}/adv-overlap.wav", [a, b], None),
        ("long", f"{d}/adv-long.wav", [a, b], None),
    ]

    for label, path, speakers, language in imports:
        wall_ms, resp = import_file(base, tok_a, path, speakers, language=language)
        entry = {"label": label, "file": path.split("/")[-1], "post_wall_ms": wall_ms, "post_response": resp}
        imp = resp.get("import") or {}
        if imp.get("id"):
            obs_ms, final = wait_done(base, tok_a, imp["id"], timeout_s=1200)
            entry["observed_completion_ms"] = obs_ms
            entry["final"] = final
            print(f"{label}: status={final['import']['status']} segments={final['import'].get('segment_count')} "
                  f"server_total_ms={final['import'].get('timings_ms', {}).get('total')} observed_ms={obs_ms}")
        else:
            print(f"{label}: door response: {json.dumps(resp)[:200]}")
        bundle["imports"].append(entry)

    # Live door refusals.
    _, resp = import_file(base, tok_a, f"{d}/call1-dinner-plan.wav", [a, b], consent=False)
    bundle["refusals"]["no_attestation"] = resp
    print(f"no_attestation -> {json.dumps(resp)[:160]}")

    _, resp = import_file(base, tok_c, f"{d}/call1-dinner-plan.wav", [a, b])
    bundle["refusals"]["uploader_not_participant"] = resp
    print(f"uploader_not_participant -> {json.dumps(resp)[:160]}")

    wall_ms, resp = import_file(base, tok_a, f"{d}/call2-hike-plan.mp3", [a, b])
    bundle["refusals"]["duplicate_import"] = {"post_wall_ms": wall_ms, "response": resp}
    print(f"duplicate_import -> origin={resp.get('origin')} id match check in bundle")

    # Read-back on served Memory surfaces.
    for label, tok in (("A", tok_a), ("B", tok_b), ("C", tok_c)):
        _, wallet = http("GET", base, "/api/v1/product/memory-wallet", token=tok)
        _, facts = http("GET", base, "/api/v1/product/memory/facts", token=tok)
        bundle["readback"][label] = {"wallet": wallet, "facts": facts}
        print(f"readback {label}: wallet keys={list(wallet.keys()) if isinstance(wallet, dict) else type(wallet)}")

    # The non-party's view of call1's import must be 404.
    call1_id = bundle["imports"][0]["post_response"]["import"]["id"]
    status, body = get_import(base, tok_c, call1_id)
    bundle["readback"]["C_import_get"] = {"status": status, "body": body}
    print(f"C reading call1 import -> HTTP {status}")

    json.dump(bundle, open(args.out, "w"), indent=2)
    print(f"bundle written to {args.out}")


if __name__ == "__main__":
    sys.exit(main())
