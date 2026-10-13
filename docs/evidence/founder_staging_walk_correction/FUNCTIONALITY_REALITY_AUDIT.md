# Opal Functionality Reality Audit

**Date:** 2026-10-13  
**Branch:** `muse/packet-b-batch-2`  
**Tip under test (pre-commit):** `7f269661` + uncommitted FAKE_SUCCESS / audit-harness repairs proven in this pass  
**Harness:** `apps/opal_web/scripts/_functionality_reality_audit.mjs`  
**Runtime JSON:** `shots/reality_audit/FUNCTIONALITY_REALITY_AUDIT_RUNTIME.json`  
**Shots:** `shots/reality_audit/*.png` (390×844)  
**Method:** five-layer check per claim — Documentation → Code → Runtime → Persistence → User-visible result  
**Browser MCP:** unavailable — Playwright + curl only  
**Pass 2:** LOCKED · **Track B:** not touched  

---

## Final state

```
DOCUMENTATION_MATCHES_CODE = YES
CONSUMER_READY = YES
PASS2_UNLOCKED = NO
TRACK_B_TOUCHED = NO
```

| Metric | Result |
|--------|--------|
| GREEN | **17** |
| YELLOW | **0** |
| RED | **0** |
| DEAD_ACTIONS (YOU painted controls) | **0** |
| FAKE_SUCCESS (YOU tranche edges found) | **0** (3 soft edges repaired this pass) |
| CONSUMER_TECH_LEAK (Feed / Fit / Privacy) | **0** |

---

## Verdict in one paragraph

Recent YOU / Consumer Reality Gate work is **alive in code and runtime**, not documentation-only. Access ≠ Action, Suggest → Prepare → Execute ladder copy, ConsentProof surface, Spending ≠ Fit split, Appearance tokens, Grow Your Circle honesty, Edit Profile persistence, nested YOU scroll, Home / Center / Chats member surfaces, and two-user conversation API all proved in this session. Architecture commits for Context Alignment / Pass 2 / Understanding remain **DOC ONLY** and correctly unimplemented. Pass 2 stays locked.

---

## Challenge areas (founder-named)

| Challenge | Rating | Proof |
|-----------|--------|-------|
| **Edit Profile** | **GREEN** | UI save → hub name stamp → `PATCH /api/v1/product/session/profile` → session API → reload hub all show stamp (`shots/reality_audit/02_profile.png`) |
| **YOU nested settings / scroll** | **GREEN** | Privacy body scrolls (`scrollOk`); Access Control visible; no false “memory unlocked / intelligence on” copy |
| **Contacts / Grow Your Circle** | **GREEN** | Honest choose-people copy; no seed/fixture roster leakage |
| **Center** | **GREEN** | `member-tab-opal` clickable; companion-alive copy after open |
| **Opal conversation / Assist ladder** | **GREEN** | Assist toggle flips with API; Action Authority ladder + What Opal Can Do visible |
| **Chat / realtime second user** | **GREEN** | Walk A + Walk B conversation list HTTP 200; Fort Oak id present in sample (`ace99adc-…`) |

---

## Surface scorecard

### Consumer Reality Gate surfaces

| Area | Status | Notes |
|------|--------|-------|
| Auth persistence | GREEN | Minted Walk A bearer → `/api/v1/product/session` 200 |
| Member shell + YOU hub | GREEN | `member-shell` → `you-hub-pane` |
| Home social | GREEN | Living field / home nav visible |
| Center companion | GREEN | Dock Opal tab opens companion surface |
| Chats | GREEN | Chats home / rows visible |
| Two-user API | GREEN | A=200 B=200; countA=83 |
| Splash / Meet / HTTPS tunnel | Prior CRG GATE_GREEN 42/42 @ `3ccbf48c` + ops scripts; not re-walked end-to-end this pass (member inject path used). Tunnel health watch still green. |

### YOU destinations

| Destination | Status | Doc→Code→Runtime→Persist→UI |
|-------------|--------|------------------------------|
| Identity / Edit Profile | GREEN | All five |
| Privacy + Access framing | GREEN | Scroll + Access; no intel implication |
| Appearance System/Dark/Light | GREEN | pref + `data-theme` match for all three |
| Location / home timezone | GREEN | Saved `America/Denver`; API reflects; travel mode honest (no fake live ETA) |
| Calls & Assist + Action ladder | GREEN | Assist flip; ladder + consent surface present |
| Notifications | GREEN | Read-receipts true→false→true |
| Spending | GREEN | Comfort prefs real; save/delete error paint repaired |
| Fit | GREEN | Honest empty; no wellness intelligence claim |
| Grow Your Circle | GREEN | Honest; no fake roster |
| Linked Devices | GREEN | This phone only; desktop/revoke management hidden |
| Account & Security | GREEN | Nested delete; linked devices entry |
| Feed & Discovery | GREEN | Invites present; ranking/algorithm leak absent |

---

## Repairs made in this audit pass (tranche-local)

Not documentation victories — code that closed FAKE_SUCCESS / honesty gaps found by the dead-action scan:

1. **Messaging prefs without token** (`OpalApp.tsx`) — refuse optimistic flip when persistence is impossible.  
2. **Spending comfort save/delete** (`YouSettingsDestination.tsx`) — surface success/error via `walletLoadNote` (silent catch removed).  
3. **Relationship type pick** (`YouSettingsDestination.tsx`) — paint error on failure instead of silent picker.  
4. **Audit harness boot** — native-session inject + live display-name bridge so 22s conversations list does not false-fail member shell / Edit Profile reload (product boot timeout is 12s; conversations payload ~1MB / 83 threads — operational note, not Pass 2 work).

---

## Dead action + FAKE_SUCCESS scan

Scope: `YouSettingsDestination.tsx` + YOU hub in `OpalApp.tsx`.

| Question | Result |
|----------|--------|
| Painted toggle/action without handler | **No** — 45 `blockedReason` rows hidden; 13 paintable rows wired |
| Optimistic UI / silent success | **Assist revert OK**; messaging no-token + spending silent catch + relationship silent catch **repaired this pass** |
| `blockedReason` consumer paint (SCREENS) | **Clean** (`return null`) |
| Latent generic toggle flip | LOW — only allowlisted toggles painted today |

Target: `DEAD_ACTIONS = 0` · `FAKE_SUCCESS = 0` for painted YOU controls — **met after repairs**.

---

## Documentation-only scan (last 20 commits through `7f269661`)

| Commit | Claim | Class | Code exists | Runtime proven this session |
|--------|-------|-------|-------------|------------------------------|
| `7f269661` | YOU Access/Action permissions GREEN | CODE + DOC | Y | **Y** (Assist/ladder/privacy re-proved) |
| `3dada6d9` | Agent interpretation guardrail | DOC ONLY | N | n/a |
| `537d6f97` | Continuity integrity audit | DOC ONLY | N | n/a |
| `67507b61` | Context alignment authority | DOC ONLY | N | n/a (architecture only — correct) |
| `7fa2ca35` | Spending/Fit + User/Control | CODE + DOC | Y | **Y** (Spending≠Fit) |
| `1b27e836` | YOU Trust Model | DOC ONLY | N | n/a |
| `1a1ccf56` | YOU hierarchy + trust repairs | CODE + DOC | Y | **Y** (hub/scroll) |
| `5a40c1c1` | Capability audit note | DOC ONLY | N | n/a |
| `ce2ff767` | YOU Trust Layer + audit | CODE + DOC | partial | **Y** (hub copy path) |
| `1b347ff7` | Pass 2 entry constitution | DOC ONLY | N | n/a |
| `a4d48179` | Consumer Reality Gate 42/42 | CODE + DOC | Y | Prior CRG; member surfaces re-proved |
| `3ccbf48c` | CRG handoff spec | DOC ONLY | N | n/a |
| `fa7fb223` | Stop report Appearance | DOC ONLY | N | Appearance re-proved GREEN |
| `a1a6e95a` | Founder walk correction | CODE + DOC | Y | Settings honesty re-proved |
| `9286a6bd` | Founder staging recovery | CODE + DOC | Y | Ops (services up) |
| `5ee435a2` | Cloudflare tunnel runbook | DOC ONLY | N | Tunnel watch alive |
| `dfa7b23e` | Render fitness audit | DOC ONLY | N | n/a |
| `8e592c5c` | Prefer-real RED remediation | CODE + DOC | Y | Not re-litigated |
| `3972c2d6` | Surface fragmentation re-audit | DOC ONLY | N | n/a |
| `8fb3d8ef` | Production readiness matrix | DOC ONLY | N | n/a |

**Counts:** DOC ONLY **12** · CODE + DOC **8** · CODE ONLY **0**.

Architecture DOC ONLY commits are **healthy** — they do not pretend engines exist.

---

## Runtime environment notes (honest)

- Vite `:5173` + Phoenix `:4000` healthy (`production_sms`).  
- Walk sessions reminted via `scripts/mint_walk_sessions.exs` → `/tmp/opal_minted_walk_sessions.json`.  
- `/api/v1/product/conversations` for Walk A measured **~22s** / ~1MB / 83 threads during this pass — exceeds FE `BOOT_MS` (12s). Product still authenticates via native-host fast path; **conversations list performance is a real operational risk** for cold boot on this fixture, tracked as YELLOW ops debt outside YOU tranche scoring (member surfaces still GREEN once shell is up).  
- Browser MCP unavailable; physical iPhone Safari feel not re-certified this pass — automated 390×844 Playwright + API only.

---

## What this audit deliberately did **not** do

- Unlock Pass 2  
- Build memory / relationship inference / scoring / Understanding Candidates  
- Touch Track B call transport  
- Fake Feed ranking, live location/ETA, Fit wellness intelligence, or learn-from-choices  

---

## GREEN / YELLOW / RED legend used

- **GREEN** — Actually functional across the five layers for the claimed consumer behavior.  
- **YELLOW** — Partially functional or proof limited (selector/ops flake, incomplete persistence, prior-only evidence).  
- **RED** — Documentation only, unwired UI, or fake success.

---

## Evidence index

| Artifact | Path |
|----------|------|
| Runtime result | `shots/reality_audit/FUNCTIONALITY_REALITY_AUDIT_RUNTIME.json` |
| Screenshots | `shots/reality_audit/01_you_hub.png` … `13_account.png` |
| Harness | `apps/opal_web/scripts/_functionality_reality_audit.mjs` |
| Prior CRG | `docs/evidence/founder_staging_walk_correction/CONSUMER_REALITY_GATE_RESULT.md` |
| Prior YOU perms | `docs/evidence/u_page/YOU_PERMISSIONS_TRANCHE.md` |
| Prior YOU hub | `shots/you_page/YOU_HUB_VERIFY.json` |

---

## Closing

```
DOCUMENTATION_MATCHES_CODE = YES
CONSUMER_READY = YES
PASS2_UNLOCKED = NO
TRACK_B_TOUCHED = NO
```

The trust boundary survived contact with implementation. Capability remains ordered under permission. Intelligence stays locked until trust earns it.
