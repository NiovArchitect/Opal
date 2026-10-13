# Freeze candidate report — founder reality walk

Branch: `muse/packet-b-batch-2`  
Tip at walk: `8e4f5d51` (served FE `data-git-head=8e4f5d5`)  
Date: session walk after P0 consumer repair  
Pass 2: **LOCKED**  
Intelligence: **not started**

This is a **verification tranche only**. No architecture changes. No Pass 2 unlock.

Evidence: `shots/freeze_candidate_walk/` + `FREEZE_CANDIDATE_WALK.json`  
Harness: `apps/opal_web/scripts/_freeze_candidate_walk.mjs`

---

## PRESERVED

- P0 consumer foundation (Splash1→2→Phone, permission bootstrap stage, Meet progressive, phone autofill display, brand lockup single-source)
- Relationship Access / ConsentProof / YOU Trust Layer / Center substrate
- Context Ownership + Temporal Truth (architecture-only)
- Pass 2 lock
- Native contacts honesty (`ReactNativeWebView` required; browser shows typing fallback)
- Fit honestly hidden from YOU hub
- Chats people list + thread open (Chanelle) + Call affordance on thread

---

## GREEN

| Surface | Result |
|---------|--------|
| Splash 1 | Single lockup; Continue + returning account; **no Skip intro** |
| Splash 1 → Splash 2 | Runtime path proven |
| Splash 2 → Phone | Proven |
| Meet greeting | “Hey, I’m Opal.” / “Real people. Brighter together.” |
| First-person ask | “Who do you want to connect with first?” |
| Browser contacts | Honest unavailable fallback (not fake native) |
| Chats | Reachable; social/people content present |
| Calls | Reachable via Chats/thread Call action (dock is home/chats/opal/graphs/you — no separate Calls tab) |
| Opal Center | Reachable as same dock entity |
| YOU | Reachable; no obvious tech-leak strings; Fit hidden |
| Chanelle thread | Opens from Chats — people continuity candidate |

**P0 consumer foundation: GREEN**

---

## FOUNDER FRICTION

Taste / emotional — **not treated as architecture work** in this tranche:

1. **Meet name ask feels form-like**  
   Current: “What should I call you?”  
   Founder preference direction: companion framing before world-building  
   (e.g. “Before we build your world, what should I call you?”)

2. **Permission bootstrap copy is thin**  
   Current intro: “Set up what Opal can use”  
   Rows are title-first (Contacts / Notifications / Location) with short why lines  
   Founder preference: benefit-first language so Allow feels like enabling connection, not begging for OS scopes

3. **Center companion voice broke on seed shell**  
   Visible: “Opal took too long to respond. Try again.”  
   Undercuts “same living entity” continuity on investor demo if Center is cold/timeout-prone

4. **Onboarding → later Chat continuity not fully proven under `production_sms`**  
   Automated walk did not burn live OTP through Permission Bootstrap → Meet → first person → Home  
   Founder must walk that magic loop personally

5. **Dock IA note**  
   No `member-tab-calls`; Calls live through conversation chrome. Confirm this matches founder intent for the five-minute investor loop.

---

## NATIVE BLOCKERS

- Real iOS Contacts Allow → search → match → resolve (requires TestFlight / Expo WebView with `ReactNativeWebView`)
- Full clean-install: OTP SMS → Permission Bootstrap → Meet → first contact (live phone; do not burn codes during agent automation)

---

## FINAL FREEZE DECISION

### **HOLD — do not freeze yet**

Reason: P0 consumer **foundation** is GREEN, but the **first five minutes emotional / continuity proof** still requires a **founder phone walk**:

`Splash 1 → Splash 2 → Phone → OTP → Permissions → Meet → Name → First person → Chat → Call → Center → YOU`

Freeze is appropriate only after the founder confirms:

- Splash feels like meeting something (alive, premium)
- Permissions feel like enabling connection
- Meet feels like a companion, not a form
- First person → Chat continuity feels intentional
- Center feels like the same Opal
- YOU feels quiet and decision-oriented

### Explicitly still locked

- Pass 2 / intelligence / memory ingestion productization
- Graphing-calls productionization beyond existing substrate
- Broad “Opal has memory” user promise

### Recommended next action (founder-owned)

Personal walk on staging/native. Agent stays on standby for **only** real regressions or consumer blockers found in that walk — no architecture rabbit hole.

---

## Metrics snapshot

```
P0_CONSUMER_FOUNDATION = GREEN
PASS2_UNLOCKED = NO
INTELLIGENCE_STARTED = NO
FOUNDER_EMOTIONAL_WALK = PENDING
NATIVE_CONTACTS_PROOF = PENDING
FREEZE_MARKER = HOLD
```
