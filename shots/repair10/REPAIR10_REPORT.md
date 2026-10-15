# Repair #10 — Behavioral Reliability

**Branch:** `muse/packet-b-batch-2`  
**Baseline (Repair #9 stamp):** `f8b94294`  
**Product commit:** `5e7a7b4a`  
**FOUNDER_ACCEPTED = NO** · **FREEZE = HOLD** · **PASS2_UNLOCKED = NO**  
**FOUNDER_PHONE_PASS = NOT_CLAIMED**

## Purpose

Prove current Center capabilities work consistently. No feature expansion.

1. Conversation independence across 20–30 mixed-intent turns  
2. Location end-to-end forensics by layer  
3. Memory boundaries (short-term continuity, New Chat clears transient, durable preserve contract)  
4. Founder physical iPhone / HTTPS walk checklist (human gate)

## Code repaired this tranche

| Area | Change |
| ---- | ------ |
| Capability vs sticky who | `opal_response.ex` — `capability_question?/1` wins over `recent_who` re-engagement |
| Jump-to-latest | `OpalCenterChat.tsx` — cancelable pin timers, gen guard, focus-safe Jump click, multi-pin settle |
| Scroll anchoring | `styles.css` — `overflow-anchor: none` on Center thread |
| Harness | `apps/opal_web/scripts/_repair10_behavioral_reliability.mjs` |

## Machine gates (`shots/repair10/VERIFY.json`)

| Layer | Result |
| ----- | ------ |
| API_PASS | **28/28** mixed turns; pending Chanelle isolation; New Chat memory; durable-preserve contract note |
| BROWSER_PASS | Independence, scroll stick (history read holds), Jump-to-latest, New Chat empty state |
| LIVE_PROVIDER_PASS | Geoapify Henry exact probed (honest unresolved); Med discovery 3 names; HTTPS 200 |
| FOUNDER_PHONE_PASS | **NOT_CLAIMED** — see `FOUNDER_PHONE_WALK_R10.md` |

`fail_count = 0` · `critical_demo_fails = 0`

### Mixed-intent highlights

| Behavior | Evidence |
| -------- | -------- |
| Greeting / help not restaurant-captured | M01–M02, M07, M12, M24 |
| Exact The Henry vs discovery Mediterranean | M05 / M11 / M23 |
| Chanelle draft honesty (no fake send) | M06, M16, pending isolation |
| Cancel search without hijack | M09, M26 |
| Capability remind after Maya context | M13 → plan / Graph / places copy (not “You mentioned Maya…”) |
| Near-me honest location gap | M18 + LOCATION_FORENSICS |

### Location layer map

| Layer | Status |
| ----- | ------ |
| Browser permission in Center | `NOT_WIRED_IN_CENTER` |
| Device coordinates passed to backend | `NOT_PASSED` |
| Near-me Center reply | Honest gap (asks for location access) |
| Geoapify exact (The Henry / Coronado) | Live probe; `exact_unresolved` (no fabrication) |
| Geoapify discovery (Mediterranean / Coronado) | 3 provider-ordered names |
| Ranking | `provider_order` (not claimed as cuisine-perfect) |

## Remaining limitations

1. Physical iPhone walk required before any phone-pass claim.  
2. Geoapify may not resolve The Henry — identity preserved, unresolved kept honest.  
3. Center outbound messaging remains draft / authorization-gated.  
4. Near-me ranked discovery needs Center location wiring (permission → coords → backend).  
5. Mediterranean discovery quality / cuisine filter not claimed perfect.  
6. No merge / Pass 2 / production without founder authority.

## Hackathon HTTPS

`https://throbbing-strainer-almanac.ngrok-free.dev`  
(Title alone is insufficient; behavior proven via harness + screenshots under `shots/repair10/`.)
