# S1.1 — FINAL INTEGRATED CLOSURE RETURN

**HOLD. DO NOT MERGE.**  
**Do not start S2.**

---

## 1–2. Pre-change baseline

| Item | Value |
|------|-------|
| Pre-change HEAD | `4507d0a` |
| Pre-change product SHA (S1 impl) | `bea863c` |
| Pre-change remote CI | `32022796107` / S1 docs tip CI `32026907797` SUCCESS |

---

## 3–4. Profile photo decision

**OPTION B — `PROFILE_PHOTO_DURABILITY_DEFERRED`**

### Exact behavior

- FR08 shows **initials only** (from display name)
- Label: **Your initials for now**
- Note: **Profile photos are not available in this build. Initials are how people know you.**
- **No** interactive Add photo button
- **No** file input
- **No** object URL / localStorage image / false save path
- Name + optional username still persist via real `PATCH /session/profile`

Rationale: durable Option A would require production object storage. Existing `MediaLocalStore` is `LOCAL_DEV` only and violates “no local filesystem runtime dependency.” Honest defer is correct for S1.1.

---

## 5. Actor IDs used (latest PASS run)

| Actor | Role | user_id |
|-------|------|---------|
| A | Primary | `47aa5856-8c56-4b18-a4d4-6a9b456516a8` |
| B | Direct friend | `b599fcd7-7a97-4736-8221-86e0a6d8dc7a` |
| C | Second friend | `f69f941c-…` (stable phone `+12025550103`) |
| E | Group bad actor | `5c9baed1-…` (phone `+12025550104`) |
| F | Unrelated | `ee88e6fb-…` (phone `+12025550105`) |
| R | Revoked A session | same user as A; prior bearer after `DELETE /session` |

Presentation names are fixtures only.

---

## 6. Multi-session mechanism

`scripts/s1_1_level5_adversarial_proof.mjs`

- Independent OTP activations per actor (real product activation)
- Concurrent bearer sessions against live Phoenix API (`http://127.0.0.1:4000`)
- Phoenix Socket + `conversation:{id}` channel (`socket_ticket` + `ws` transport)
- Optional `PROOF_BROWSER=1` Playwright dual independent browser contexts

Evidence:

- `docs/evidence/v2-coded-experience/s1-first-run/level5/S1_1_LEVEL5_PROOF.json`
- `docs/evidence/v2-coded-experience/s1-first-run/level5/S1_1_LEVEL5_PROOF.md`

---

## 7–20. Level 5 matrix (latest PASS)

| # | Proof | Result |
|---|-------|--------|
| 7 | A↔B pair ensure idempotent dyad + Juniper 7:30 in B history | **PASS** |
| 8 | Realtime pair: B channel receives `message:new` without reload; A sees B reply; sender = B user_id | **PASS** |
| 9 | Group widening: A,B,E group; direct secret to B; **E gets 403** on direct | **PASS** |
| 10 | Group masquerade: group titled with B’s name ≠ person dyad; dyad reuses true id | **PASS** |
| 11 | Unrelated F: history/send/group **403** | **PASS** |
| 12 | Revoked A token: session **401**, send **401** | **PASS** |
| 13 | Multi-tab: second device session for A works after first revoked | **PASS** |
| 14 | Group speakers A/B/C/E correct `sender_user_id` + A reintroduced after others | **PASS** |
| 15 | Solo: session alive without forced peer fabric | **PASS** |
| 16 | Reservation confirmed (`status=confirmed`, `live_claimed=false`) | **PASS** |
| 17 | Reservation pending/held (`booked=false`) | **PASS** |
| 18 | Reservation failed (`payment_authorization_required`, not confirmed) | **PASS** |
| 19 | Reservation idempotency (`idempotent=true`) | **PASS** |
| 20 | Pair disagreement: “8 works better” keeps 7:30 human text; **no false alignment claim** | **PASS** |

Verdict line: **PASS 36 · PRODUCT_FAIL 0** (with `PROOF_BROWSER=1`).

---

## 21. Auth adversarial

| Attack | Result |
|--------|--------|
| Wrong code | **401** `invalid_code`, no session |
| Username collision | **422** `handle_taken` |
| Walkthrough cannot grant auth | **401** without bearer |

---

## 22–24. Defects / repairs / regressions

### Discovered

1. **False product truth on FR08 Add photo** (interactive preview, not durable).
2. **Duplicate dyads** for same A↔B pair; `ensure_direct` returned non-deterministic conversation ids (L5 group-masquerade flake).

### Repaired

1. Option B photo: remove file picker / object URL; initials-only honest UI.
2. `Messages.find_direct_conversation_id/2`: SQL oldest exact dyad (`member_count == 2`), stable order.
3. `create_direct_conversation/2`: re-check inside transaction before insert.

### Regression tests

- `messages_direct_conversation_test.exs` — stable when historical duplicate dyads exist
- `s1Adversarial.test.ts` — no `type=file` / no object URL; deferred photo copy
- L5 harness as ongoing multi-session proof script

---

## 25. Optimization

- Removed dead interactive photo control (one less false tap)
- No founder-approved copy/flow reorder

---

## 26. Console / network

- Expected denials: 401/403 captured for F and revoked A
- Unexpected 5xx: **none** in PASS report
- WS: join ok; `message:new` received on B

---

## 27. Local tests

| Suite | Result |
|-------|--------|
| Vitest opal_web | **304** passed |
| ExUnit messages direct | **5** passed |
| ExUnit profile S1 | **2** passed |
| Level 5 harness | **PASS** (0 PRODUCT_FAIL) |

---

## 28–29. Product SHA / remote CI

Product bytes changed (photo defer + dyad stability).

- New product SHA: _(fill after commit)_
- New remote CI: _(fill after push)_

Do **not** cite `bea863c` / `32026907797` for post-S1.1 product bytes.

---

## 30. Dirty tree

Unrelated pre-existing dirty brand/media evidence files may remain unstaged. S1.1 commit is scoped.

---

## 31. Remaining explicit gaps

| Gap | Status |
|-----|--------|
| Durable profile photo (CDN/object storage) | Deferred (`PROFILE_PHOTO_DURABILITY_DEFERRED`) |
| Home continuum `201:5` | S6 |
| Graph create | S5 |
| Full Live production | later |
| Conversational consensus after “8 works better” | Future seam — correctly not auto-rewriting 7:30 |
| Founder L6 walk | **Required next** |

---

## 32. Founder walkthrough (required)

1. Splash → full first run (initials profile, no Add photo trap)
2. Wrong OTP / valid OTP
3. Username collision if tried
4. Find People / Not now → Home
5. Direct message A↔B realtime
6. Solo path
7. Brand 168:2 / Opal Graph
8. Spot-check Plans / People

---

## 33. HOLD verdict

**S1.1 proof gaps closed at technical Level 5.**  
**HOLD. DO NOT MERGE.**  
**Founder walk is the remaining gate before S1 acceptance.**  
**Do not begin S2.**
