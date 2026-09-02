# P2.1 STOP REPORT — Founder Verification Correction

**Date:** 2026-09-01  
**Starting HEAD:** `c353f8d578f730129bcce3d12af7a2653452a766`  
**HOLD · DO NOT MERGE · NO LIVE · FOUNDER_ACCEPTED = NO**  
**P3_AUTHORIZED = NO · P4_AUTHORIZED = NO · P2_FROZEN = NO**

---

## A. HOLD

YES.

## B. Starting HEAD

`c353f8d578f730129bcce3d12af7a2653452a766`

## C. P2 historical proof preserved

YES — `P2_AUTOMATED_PROOF_AT_C353F8D = HISTORICAL_PASS`

## D. P2 founder verification failure recorded

YES — `P2_FOUNDER_VERIFICATION` was FAIL; this pass prepares **READY_FOR_RETEST**

## E. Root cause Calls + → global Search

`onNewCall` opened Search PEOPLE mode instead of CURRENT `928:276` New Call.

## F. New Call 928:276 implementation

YES — `NewCallDestination.tsx` · Calls `+` → `setNewCallOpen(true)`

## G. New Call data owner

Founder fixture people/groups via `FOUNDER_PEOPLE` + default groups; no CallContacts domain.

## H–I. People / Group rows

Chanelle / Maya / Jordan + Juniper crew (4) with ☎ dial controls.

## J. New Call scoped search

“Search people and groups” only — no Top/Places/Experiences taxonomy.

## K. One-tap outgoing call proof

YES — dial Chanelle → outgoing CallSurface.

## L. Call Continuity row proof

YES — `928:158` Call / Video / Chat + signal + recent.

## M. Story-ring behavior

Chanelle `hasStory: true` → ring tap opens Story; no false ring without Story.

## N. Section 06 stage root cause

`position: fixed; left: 0` on `.you-pane-nested` / `.profile-person-overlay` bound to **viewport**, not centered `.app`.

## O. Section 06 stage results

Privacy aligned on desktop (`deltaLeft: 0`). Same media-query centering applies to all nested You settings + profile overlay.

## P. Person Profile stage result

Same centering fix as Section 06 (`.profile-person-overlay`).

## Q–R. Search/Activity

Root cause: independent booleans could both be true.  
Fix: open handlers close the other; mounts require `searchOpen && !activityOpen` / `activityOpen && !searchOpen`.  
Exclusivity proof: **PASS**.

## S–T. Global Search destination matrix / dead taps

Not a full Section 07 audit this pass. Places still use hint note (pre-existing). No new dead destination invented. Objective remaining: deeper Search result routing audit (separate square if founder requires).

## U–W. Activity

- Destination **618:2384 = CURRENT** (kept)  
- Icon **FOUNDER_REJECTED**  
- Figma successor proposal **YES** — node **`995:2`** FOUNDER_REVIEW only  
  https://www.figma.com/design/fy69K8cCug9prf5GLwQ7Hy/?node-id=995-2

## X. Calls friction measurement

Target: visible person → **1 tap** (☎); not visible → **+ → dial** (≤2 taps). New Call restores that path.

## Y–Z. Zero-dead-tap / Back

New Call / Continuity have Back. Search/Activity Back preserved.

## AA–AD

- Responsive: stage centering at ≥391px; 390 mobile unchanged  
- Console: see proof JSON  
- Tests: `p21CallsNewCall.test.ts` + continuity tests **PASS**  
- Browser: `prove_p21_founder_correction.mjs` **P2_CURRENT_COMPLETE=true**

## AE–AF. Files

- Product: `NewCallDestination.tsx`, `CallContinuityDestination.tsx`, `ChatsHome.tsx`, `OpalApp.tsx`, `styles.css`, seeds/tests/prove  
- Authority/evidence: this STOP + proof JSON + screenshots; YAML status flips  

## AG–AI

Implementation SHA / Evidence HEAD: filled at commit. Clean tree expected after commit.

## AJ. Explicit statuses

```
P2_AUTOMATED_PROOF_AT_C353F8D = HISTORICAL_PASS
P2_FOUNDER_VERIFICATION = READY_FOR_RETEST
P2_CURRENT_COMPLETE = YES
P2_FROZEN = NO
P3_AUTHORIZED = NO
P4_AUTHORIZED = NO
ACTIVITY_DESTINATION = CURRENT
ACTIVITY_ICON = FOUNDER_REJECTED
ACTIVITY_ICON_SUCCESSOR = 995:2 FOUNDER_REVIEW
MERGE = NO
LIVE = NO
permissionToStartLive = NO
FOUNDER_ACCEPTED = NO
```

## AK. Founder verification URL

`http://127.0.0.1:5173/?opal_reset_first_run=1&opal_founder_seed=1&runtime=<HEAD_SHORT>`

## AL. Exact founder verification path

1. Chats → Calls → **+** → New Call (people/groups only)  
2. ☎ Chanelle → outgoing audio  
3. Chanelle row → Call Continuity → Call / Video / Chat  
4. Home Search then Activity — never both headers  
5. You → Privacy on desktop — stage aligned with dock  

## AM. Remaining objective defects

- Full Search result destination matrix (Places/Experiences → real ends) not closed  
- Activity icon still needs founder pick among `995:2` candidates  
- Formal pixel parity vs 928:276/158 not claimed  

## AN. STOP

Do **not** start P3. Founder retest required before freeze.  
**STOP.**
