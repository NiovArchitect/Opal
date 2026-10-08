# Paste G Phase 1 — Dead-End Audit

**Worktree:** `/Users/genghishameha/Developer/NIOVI-Architect/worktrees/opal-grok-real-people`  
**Branch:** `muse/packet-b-batch-2`  
**Tip at audit:** `37229db9`  
**Phase 1 fixes:** 2026-10-08  
**Phase 1 wipe complete:** 2026-10-08 (D6/D7/D13–D15 converted — **0 DEAD END remaining**)  
**Scope:** User-facing journeys that look completeable — onboarding / Holy Shit, planning CTAs & pills, intelligence card actions, You hub / settings, empty states, conversational promise copy.

## Verdict rules

| Class | Meaning |
|---|---|
| **REAL** | Control completes the promised outcome on a live product path (API / local durable state / honest handoff that continues the job). |
| **HONEST GATE** | Control is blocked or incomplete, and the UI says so (blockedReason, gate note, empty copy, disabled with reason). No fake success. |
| **DEAD END** | Looks actionable or promises an outcome, then no-ops, silently fails, or fakes success. |

Out of product shell: `?review=availability` → `AvailabilityReview` is a **founder review harness** (not member shell). Harness taps now show an honest gate note (D15).

---

## Counts

| Class | Count |
|---|---|
| **REAL** | **46** |
| **HONEST GATE** | **72** |
| **DEAD END** | **0** |

Phase 1 converted **D1–D5, D8–D12** (12 journeys). Later wipe converted **D6, D7, D13–D15**.

---

## Top 15 — final status

1. **Trust “Send it”** — **REAL / HONEST GATE** — `TrustContractCard` → invitation/SMS; fail → gate + Continue.
2. **Trust lead “I'll message {name}”** — **HONEST GATE** — preview is `Message for {name}:`; `trustSentLead` only after real send.
3. **Connect calendar fakes connected** — **HONEST GATE** — connector status; never fake connected.
4. **Post-connect “I'll check your availability”** — **REAL (gated)** — only after real connect.
5. **`POST …/onboarding/contact` missing** — **REAL** — FE uses `POST /api/v1/product/contacts/resolve`.
6. **Center coordinate queued delivery copy** — **HONEST GATE** — draft + “outbound send isn't live yet”.
7. **“I'll handle the details”** — **HONEST GATE** — soft follow-through copy.
8. **Reminder “View plan”** — **REAL** — `onOpenPlan(planId)` → `openGraphDetail`.
9. **Briefing Still open without link** — **HONEST GATE** — “Nothing to open yet.”
10. **Briefing question with no link** — **HONEST GATE** — same.
11. **Chats seed plan pills (D7)** — **REAL / HONEST GATE** — known seed graph fixtures (`seed-chanelle-juniper`, `seed-maya-graph-coast`, `seed-alex-graph-gallery`, `seed-live-sabrina`) open Graph Detail / Live / Alex trip; `seed-chat-*` and unknown `seed-*` → “Open the chat to see this plan.”
12. **HS Moments 6 / 9 / 10 (D6)** — **HONEST GATE (not shipped)** — first-run terminates at Moment 5 Trust (`holyShitGate.ts` / `TrustContractCard.tsx` product-law comments). No CTA promises Moments 6/9/10.
13. **Wallet Add money (D13)** — **REAL when Stripe keyed / HONEST GATE when not** — `createOpalWalletCheckout` → Stripe session URL, else honest load-disabled note.
14. **Photo upload (D14)** — **HONEST GATE** — “Photo upload needs media storage — next build”.
15. **AvailabilityReview (D15)** — **HONEST GATE (harness)** — taps set `review-harness-gate` note; no silent no-op.

---

## 1. Onboarding / Holy Shit / Meet Opal / OpalWorking

### REAL

| Journey | Where |
|---|---|
| Splash → Promise → Auth | First-run stage machine |
| Phone OTP verify | Live challenge/verify |
| Meet Opal greeting → people → vibe → working | MeetOpalConversation / OpalWorking |
| Contact suggest / native contacts | ContactSuggestPicker + bridge |
| Persist contact with phone | `POST /contacts/resolve` |
| Trust Send with phone + Twilio | TrustContractCard |
| Not yet | Intentional skip → auth resume |
| fr08 / fr10 consent | Live APIs |

### HONEST GATE

| Journey | Where |
|---|---|
| Calendar grace / connect unavailable | holyShitCopy + connector status |
| Taste empty / spots empty | Honest empty floors |
| Contacts denied | Settings later |
| Trust Send no phone / API fail | Gate + Continue |
| **Moments 6 / 9 / 10** | Not in UI — first-run ends at Moment 5 |

### DEAD END

None.

---

## 2. Planning conversational CTAs and pills

### REAL

Open chat, alignment Accept/Keep/Withdraw, Center chips → sendBody, plan confirm → SharedPlan, New chat/group, Graph create, Live / Alex trip pills, **known seed graph fixtures**.

### HONEST GATE

| Journey | Where |
|---|---|
| `seed-chat-*` / unknown `seed-*` plan pills | `OpalApp` gate note |
| Calls / voice when unsigned | `setCallsGateNote` |
| Center coordinate `:queued` | Draft + no delivery claim |
| Plan confirm follow-through | Soft hold/message copy |

### DEAD END

None.

---

## 3. Card actions

### REAL

Mediation Send/Edit/Dismiss/Create plan; Reminder Plan/Dismiss/View plan; Briefing Past/Dismiss; Attention deep links.

### HONEST GATE

Intelligence load error; mediation honesty note; mock reminder under `real`; briefing without link.

### DEAD END

None.

---

## 4. Settings / You hub

### REAL

Profile save, consent toggles, spending comfort, wallet balance + tx + threshold edit, Load (Stripe when keyed), celebrations, invites, memory forget, people types, linked devices.

### HONEST GATE

All `blockedReason` rows; photo upload; wallet Load when Stripe absent; delete account unavailable note.

### DEAD END

None.

---

## 5. Empty states

Attention / memory / people / celebrations / invite / wallet tx / search graphs / HS spots — HONEST or REAL continue. Zero silent empties that look actionable.

---

## 6. Conversational promises (grep)

| Copy | Class |
|---|---|
| “I'll figure out when works for you.” | HONEST GATE (pre-connect) |
| “Calendar's connected - I'll check…” | REAL (gated on connector) |
| “Calendar connect isn't set up yet…” | HONEST GATE |
| Plan confirm / coordinate queued | HONEST GATE (no false delivery) |
| “Coming soon” in You settings | None (guarded out) |

Promise grep: every “I'll check / look into / figure out” either has a real mechanism or was rewritten to an honest gate.

---

## Evidence pointers

- HS calendar stay-in-thread: `shots/first_run_fixes/VERIFY.md`, `holyShitFirstRun.test.ts`
- You zero Coming soon: `youSettingsComingSoon.guard.test.ts`
- Seed plan pill gate: `OpalApp.tsx` `onOpenPlan` known-seed list
- Moments 6/9/10: `holyShitGate.ts`, `TrustContractCard.tsx` product-law comments
- Wallet Load: `YouSettingsDestination.tsx` `onLoadWallet` + Stripe checkout
- AvailabilityReview harness: `data-testid="review-harness-gate"`
