# Paste W9 Phase 1 — Two-device calling proof

**Tip:** `81276ef8`  
**Date:** 2026-10-11 (UTC)  
**Rule:** Do **not** claim PASS without two physical devices. Lab/code ≠ physical call.

---

## Verdict (1a / 1b / 1c)

| Gate | Status | Why |
|------|--------|-----|
| **1a** push-to-wake + CallKit incoming | **GATED** | Code routes to `native_callkit` + CallKeep bridge + plist plugin, but `react-native-callkeep` is **not** a dependency (in-app fallback only). Physical push-to-wake / lock-screen CallKit never walked. AdHoc build #5 **strips push**; production push needs TestFlight install + token registration (checklist unexecuted). Agent has **0** physical iPhones. |
| **1b** two-way audio over Twilio NTS TURN | **GATED** (lab relay **PASS**) | W9 re-ran `turn_relay_test.mjs`: NTS mint OK, dual Chromium PC, `iceTransportPolicy=relay`, `selectedType=relay`, both ICE `connected`, `ontrack`. Proves TURN credentials + relay media path in lab only. **Does not** prove two-human device audio. Memory: `PLAIN_CALL_PHYSICAL` remains RED/UNRESOLVED. |
| **1c** decline / missed / call-log truthful | **GATED** (code **PASS**) | Mix: decline → `ended_reason=declined`; unanswered → `missed`; viewer-relative history labels. FE: IncomingCallHandler + callLifecycle/media tests 33/33. No two-device confirmation that caller sees declined ≤5s or that device call-log matches. |

**Overall:** **GATED** — cannot certify a real voice/video call between two physical devices from this agent session.

---

## 1. Inventory — lab proven vs needs physical devices

### Already proven in lab / code (agent-capable)

| Item | Evidence | Limit |
|------|----------|--------|
| Twilio NTS mint + TURN URIs | `shots/calling/w9/W9_TURN_RELAY.json` (also prior `PHASE1_TURN_RELAY.json`) | Not device NAT |
| ICE relay-only media (Chromium) | `selectedType=relay`, pc1/pc2 connected | Fake media device; same machine |
| CallClient fetches TURN before PC | `apps/opal_web/src/realtime/CallClient.ts` | Needs live call session + API |
| Incoming payload routing | `incomingCallHandler` 5/5; `PHASE2_PUSH_VERIFY.json` | Not APNs delivery |
| Decline / missed / hangup domain | `calls_test.exs` + `CallPush.notify_*` | Not two phones |
| Call-log copy (declined / missed / no answer) | `calls.ex` + `callView.ts` + history tests | Not UI on device |
| Intelligence `call.ended` outcome | `TWO_DEVICE_MATRIX` row `intelligence_call_ended` | Prior lab |
| CallKeep **fallback** UI | `IncomingCallFallback` + bridge lazy-require | Not CallKit UI |
| Keep-set lifecycle/mediaRuntime | vitest 33/33 this run | Above transport |

### Needs physical two-device / founder-only

| Item | Why agent cannot close |
|------|-------------------------|
| Push-to-wake while backgrounded/locked | Needs Expo token on device + APNs + second caller |
| CallKit lock-screen answer | Needs native CallKeep binary + physical iPhone (simulator insufficient) |
| WiFi↔cellular / cross-NAT two-way audio | Needs Device A + Device B on different networks |
| Decline visible to caller ≤5s on devices | Needs two live clients |
| Missed after 30s on both call-logs | Needs two live clients + wait |
| Poor-network / throttle recover | Founder throttle walk |
| Video mute/hold on devices | Audio-first; video track not certified |

Prior matrix: `/Users/genghishameha/Developer/NIOVI-Architect/worktrees/opal-grok-real-people/shots/calling/TWO_DEVICE_MATRIX.json` — lab rows PASS / `PASS_CODE`; physical rows `BLOCKED_FOUNDER_*`. Still accurate at `81276ef8`.

---

## 2. Automated proofs run this session (no second phone)

Evidence dir: `shots/calling/w9/`

| Proof | Result | Path |
|-------|--------|------|
| Twilio NTS + relay ICE | **PASS** `selectedType=relay` | `w9/W9_TURN_RELAY.json`, `w9/PHASE1_TURN_RELAY_w9.json` |
| FE call handler/lifecycle/media | **33/33 PASS** | `w9/W9_UNIT_PROOFS.json` |
| Elixir calls + turn credentials | **19/19 PASS** | `w9/W9_UNIT_PROOFS.json` |

Script: `apps/opal_web/scripts/turn_relay_test.mjs` (direct NTS via `~/.opal/r1a1.env`; Phoenix not required).

**Not run / unavailable this session**

- Local Phoenix `:4000` — down (`curl` → connection fail)
- Production API — `https://api.opal.niovlabs.com/health` → **503**
- Physical iPhones — **0** available to agent
- TestFlight push walk — procedure only (`shots/PUSH_VERIFY_CHECKLIST.md`); not executed

---

## 3. Exact blockers for physical two-device proof

1. **Second device availability** — Agent cannot drive a second iPhone. Founder (or second pair of hands) required for A↔B.
2. **CallKit native binary missing** — `react-native-callkeep` **absent** from `apps/opal_mobile/package.json` (`shots/audit/NATIVE_MODULE_AUDIT.md`). Only plist `withCallKeep.js` + JS bridge that falls back to in-app UI. True CallKit needs dependency + **Dev Client / production rebuild**.
3. **Push entitlement split** — Development AdHoc build #5 ships **without** push (`aps-environment` stripped so AdHoc signs). Production/TestFlight keeps push; IPA exists but **TestFlight upload + install + token registration** not proven in this worktree session.
4. **APNs / Expo** — Key assigned for `local.opal.mobile` (BLOCKED.md LIVE post-EAS). Still need installed production build registering an Expo push token before push-to-wake can be claimed.
5. **Prod API health** — Observed **503** on `api.opal.niovlabs.com/health` during this inventory; two-device walk against production is blocked until API is healthy (or use a healthy staging/LAN pair with tunnel).
6. **Local BEAM** — Phoenix not running on `:4000` this session; LAN Dev Client walks need BEAM + Vite + tunnel/ngrok as applicable.
7. **ASC API key for AdHoc push refresh** — Still blocked for non-interactive AdHoc profile refresh (`EXPO_ASC_*`); cannot restore push on development builds without founder ASC key.
8. **PLAIN_CALL_PHYSICAL** — Historical RED: “Connecting audio…” without certified two-way audio; do not treat lab GREEN as device GREEN.

### Minimal founder path to ungating

1. Ensure API health (prod or local+tunnel).
2. Upload production IPA → TestFlight; install on **two** iPhones; allow notifications; register tokens.
3. (Optional for true CallKit) Add `react-native-callkeep`, rebuild, verify lock-screen UI — until then accept in-app / notification fallback only and mark CallKit still GATED.
4. Walk: A calls B (B backgrounded) → wake → answer → two-way audio; decline; miss 30s; confirm call-log labels on both.
5. Prefer one WiFi↔cellular pair for TURN realism; capture ICE `selectedType` if diagnosable.

---

## 4. Code map (authority paths)

| Concern | Path |
|---------|------|
| WebRTC / ICE / TURN fetch | `apps/opal_web/src/realtime/CallClient.ts` |
| Inbox lifecycle | `apps/opal_web/src/opalUi/callLifecycle.ts` |
| Incoming route | `apps/opal_web/src/realtime/incomingCallHandler.ts` |
| Native CallKeep bridge | `apps/opal_mobile/src/bridge/callKeepBridge.ts` |
| Push → CallKit/fallback | `apps/opal_mobile/src/bridge/incomingCallPush.ts` |
| Plist plugin | `apps/opal_mobile/plugins/withCallKeep.js` |
| Domain decline/missed | `apps/opal_core/lib/opal_core/calls.ex` |
| NTS mint | `apps/opal_core/lib/opal_core/calls/twilio_nts.ex` |
| Credentials | `BLOCKED.md` (Twilio NTS LIVE via `r1a1.env`) |
| Prior matrix | `shots/calling/TWO_DEVICE_MATRIX.json` |

---

## Honest claim

**Lab:** Twilio NTS TURN relay + call lifecycle/decline/missed/call-log **code** are green at tip `81276ef8` (re-verified W9).  
**Physical two-device calling (1a/1b/1c as product proof):** **GATED** — no PASS claimed.
