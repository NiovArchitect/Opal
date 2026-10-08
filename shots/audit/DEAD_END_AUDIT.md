# Paste G Phase 1 — Dead-End Audit

**Worktree:** `/Users/genghishameha/Developer/NIOVI-Architect/worktrees/opal-grok-real-people`  
**Branch:** `muse/packet-b-batch-2`  
**Tip at audit:** `37229db9`  
**Phase 1 fixes:** 2026-10-08 (this pass — classifications updated; parent commits)  
**Scope:** User-facing journeys that look completeable — onboarding / Holy Shit, planning CTAs & pills, intelligence card actions, You hub / settings, empty states, conversational promise copy.  

## Verdict rules

| Class | Meaning |
|---|---|
| **REAL** | Control completes the promised outcome on a live product path (API / local durable state / honest handoff that continues the job). |
| **HONEST GATE** | Control is blocked or incomplete, and the UI says so (blockedReason, gate note, empty copy, disabled with reason). No fake success. |
| **DEAD END** | Looks actionable or promises an outcome, then no-ops, silently fails, or fakes success. |

Out of product shell (noted only): `?review=availability` → `AvailabilityReview` has multiple `() => undefined` taps (`AvailabilityReview.tsx:336,343,346,366`). Not counted in member-shell totals.

---

## Counts

| Class | Count |
|---|---|
| **REAL** | **42** |
| **HONEST GATE** | **68** |
| **DEAD END** | **6** |

Counts are discrete user-facing journeys / controls in the scoped surfaces (not every DOM node). You-settings `blockedReason` rows are one HONEST GATE each.

Phase 1 converted **D1–D5, D8–D12** (12 journeys) from DEAD END → REAL or HONEST GATE. Remaining DEAD END: D6, D7, D13–D15 polish/harness.

---

## Top 15 dead ends — Phase 1 status

1. **Trust “Send it”** — **REAL / HONEST GATE** — `TrustContractCard` calls `createInvitation` + `createProductInvite`; SMS success → “Sent to {name}”; fail → gate + Continue.  
2. **Trust lead “I'll message {name}”** — **HONEST GATE** — preview lead is `Message for {name}:`; `trustSentLead` only after real send.  
3. **Connect calendar fakes connected** — **HONEST GATE** — `onConnectCalendar` → connector status; only `connected` mode when status is connected; else unavailable copy + day proposals (no home dump).  
4. **Post-connect “I'll check your availability”** — **REAL (gated)** — `calendarConnectedDays` only on real connect; unavailable uses `calendarConnectUnavailableDays`.  
5. **`POST …/onboarding/contact` missing** — **REAL** — FE uses `POST /api/v1/product/contacts/resolve`; failures surface in `contactsStatus`.  
6. **Center coordinate queued delivery copy** — **HONEST GATE** — queued path no longer says “I'll message/draft”; draft + “outbound send isn't live yet”.  
7. **“I'll handle the details”** — **HONEST GATE** — plan confirm softens to “Say if you want me to hold a table or message them.”  
8. **Reminder “View plan”** — **REAL** — `onOpenPlan(planId)` → `openGraphDetail`; missing handler → “Plan link unavailable”.  
9. **Briefing Still open without link** — **HONEST GATE** — span + “Nothing to open yet.” (not a no-op button).  
10. **Briefing question with no link** — **HONEST GATE** — non-button + “Nothing to open yet.”  
11. **Chats seed plan pills** — **DEAD END** (Phase 2+; not in this pass).  
12. **HS Moments 6 / 9 / 10** — **DEAD END** (post-trust follow-through; Send now honest about SMS).  
13. **Wallet Add money** — HONEST GATE polish (unchanged).  
14. **Photo upload** — HONEST GATE (unchanged).  
15. **AvailabilityReview** — harness only (unchanged).

---

## 1. Onboarding / Holy Shit / Meet Opal / OpalWorking

### REAL

| Journey | Where | Evidence |
|---|---|---|
| Splash → Promise → Auth | `FirstRunExperience` / `OpalApp` | Stage machine advances |
| Phone OTP verify | `FirstRunExperience` | Live challenge/verify |
| Meet Opal greeting → ask people | `MeetOpalConversation.tsx` | Phase machine |
| Type name / Add another / Let's plan | same | Pills + composer |
| Contact suggest / native contacts | `ContactSuggestPicker` + bridge | When native host present |
| When pills → vibe pills / custom vibe | `MeetOpalConversation` | Advances to `working` |
| Watch Opal work step animation | `OpalWorking.tsx` | Steps + fixtures/curate |
| Spot pick / custom place / continue without spot | `OpalWorking.tsx` | `onSelectSpot` → trust |
| Day proposal pills after calendar resolve | `OpalWorking.tsx` + Meet `onPickDayProposal` | Updates `when` |
| Persist contact with phone | `MeetOpalConversation` → `POST /contacts/resolve` | Surfaces failure; sets `contactPersisted` on ok |
| Trust Send with phone + Twilio | `TrustContractCard` → invitations / product invites | `trustSentLead` on SMS success |
| Not yet | Trust → `finish(null)` → auth resume | Intentional skip path |
| fr08 profile Continue | First-run auth | Live |
| fr10 act-on-behalf grant (calls / bookings) | `ActOnBehalfOptInStep.tsx` | Consent API; no messaging_business |

### HONEST GATE

| Journey | Where | Notes |
|---|---|---|
| Calendar not connected grace | `holyShitCopy.ts` `stepCalendarGrace` | “I'll figure out when works for you.” — no fake free slots |
| Connect calendar when OAuth unset / not connected | `OpalWorking` + `checkCalendarConnected` | `calendarConnectUnavailableDays` + day proposals; never fake connected |
| `GET /calendar/free` absent from router | fetch fails → grace | Honest fallback |
| Unknown vibe → empty spots | `fixtureSpotsForVibe` → `[]`; `stepSpotsEmpty` | Continue without inventing restaurants |
| Contacts denied once | `holyShitCopy.ts` | Settings later |
| Taste empty | `stepTasteEmpty` | Empty floor, not Italian fixture |
| Just tell me what works | dismiss → day proposals | Stays in thread; no home dump |
| Trust Send no phone / API fail | `TrustContractCard` gate + Continue | `trustSendFailed` / `trustSendNoPhone` |
| Contact persist fail / no phone | `contactsStatus` | `contactPersistFailed` / `contactPersistNoPhone` |

### DEAD END

| # | Journey | Why dead | Notes |
|---|---|---|---|
| D6 | **Moments 6 / 9 / 10** | Post-trust follow-through not built | Send path now honest about SMS; remaining product moments still absent |
| D7 | *(moved to §2)* | | |

---

## 2. Planning conversational CTAs and pills

### REAL

| Journey | Where |
|---|---|
| Open chat row | `ChatsHome` → `openChat` |
| Alignment Accept change / Keep current / Withdraw | `OpalApp.tsx` → live alignment APIs |
| Plan set / completion chrome | alignment cards in thread |
| Center empty chips → `sendBody` | `OpalCenterChat.tsx` |
| Center plan confirm → SharedPlan | `opal_conversations.ex` + `OpalPlanConfirm` |
| New chat / group create | `NewChatPicker` |
| Graph create from Plan | WHO skip → `GraphCreateFlow` |
| Live / Alex trip plan pills | `OpalApp.tsx` special cases |

### HONEST GATE

| Journey | Where | Notes |
|---|---|---|
| Plan pill when id is `seed-chat-*` | `OpalApp.tsx` | Gate note: “Open the chat to see this plan.” |
| Calls / voice when unsigned | `setCallsGateNote(...)` | Honest |
| Center coordinate `:queued` | `opal_response.ex` | Draft + “outbound send isn't live yet” — no delivery claim |
| Center plan confirm follow-through | `opal_response.ex` / `opal_conversations.ex` | “Say if you want me to hold a table or message them.” |

### DEAD END

| # | Journey | Why dead | Proposed fix |
|---|---|---|---|
| D7 | **Seed plan pills (`seed-chanelle-juniper`, etc.)** | Often no chat lineage → null graph | Phase 2+: map seed ids or seed-chat gate |

---

## 3. Card actions (mediation, briefing, reminder, attention)

### REAL

| Action | Where |
|---|---|
| Mediation Send → Center handoff | `mediationActions.ts` |
| Mediation Edit / Dismiss | `MediationCard.tsx` |
| Mediation Create plan (consensus) | → Center prefill |
| Reminder Plan something | `ReminderCard.tsx` → Center |
| Reminder Dismiss | `resolveAttentionItem` |
| Reminder View plan | `OpalApp` `onOpenPlan(planId)` → `openGraphDetail` |
| Briefing Past weeks / Dismiss for week | `WeeklyBriefingCard.tsx` |
| Briefing Still open / question with link | navigate / Center prefill |
| Attention row with conversation deep link | `openChat` + alignment focus |
| Attention plan deep link | `openGraphDetail` |

### HONEST GATE

| Action | Where |
|---|---|
| Intelligence load error / empty | `IntelligenceForYouExtras.tsx` |
| Mediation honesty (owner sends) | Card note after Send |
| Mock reminder seed disabled under `real` | `requiresRealData` |
| Reminder View plan without handler | “Plan link unavailable” |
| Briefing Still open / question without link | span + “Nothing to open yet.” |

### DEAD END

None remaining in this section after Phase 1.

---

## 4. Settings / You hub

### REAL

| Surface | Where |
|---|---|
| Edit profile name/username Save | `YouSettingsDestination.tsx` |
| Consent: calls_outbound, bookings_reserve | `WhatOpalCanDoSection` |
| Assist on calls toggle | live |
| Messages & calls / Read receipts prefs | messaging preference callbacks |
| Spending comfort save/delete (trusted+) | `SpendingComfortSection` |
| Wallet balance + tx list read | `getOpalWallet` |
| Celebrations add/open/delete/curate | `CelebrationsSection` |
| Invite create / share / copy | `InviteFriendsSection` |
| Memory Forget | `WhatOpalRemembersSection` |
| People relationship type picker | same |
| Linked devices → nested screen | `opens: "linked-devices"` |
| Delete account nested screen | honest unavailable note |

### HONEST GATE (You settings rows)

All `blockedReason` entries in `YouSettingsDestination.tsx` — **46+** rows (unchanged). Zero user-facing “Coming soon”.

### DEAD END

None.

---

## 5. Empty states

| Empty | File | Class |
|---|---|---|
| Attention caught up | `ActivityDestination.tsx` | HONEST |
| Memory empty | `YouSettingsDestination.tsx` | HONEST |
| People empty | same | HONEST |
| Celebrations empty | same | REAL promise if worker runs; else soften → HONEST |
| Invite empty | same | HONEST + Create CTA REAL |
| Wallet tx empty | same | HONEST |
| Center empty + chips | `OpalCenterChat.tsx` | REAL |
| Search graphs empty | `SearchDestination` | HONEST |
| Spots empty (HS) | `OpalWorking` + Continue | HONEST / REAL continue |

---

## 6. Conversational promises (grep)

| Copy | Location | Class | Notes |
|---|---|---|---|
| “I'll figure out when works for you.” | `holyShitCopy.ts` | HONEST GATE | Pre-connect grace |
| “Calendar's connected - I'll check your availability…” | `holyShitCopy.ts` | **REAL (gated)** | Only after real connector status |
| “Calendar connect isn't set up yet - I'll propose times…” | `holyShitCopy.ts` | HONEST GATE | Connect tapped, not connected |
| “No problem - I'll work around it…” | `holyShitCopy.ts` | REAL/HONEST | Day pills follow |
| “No preferences yet - I'll learn.” | `holyShitCopy.ts` | HONEST | |
| “Message for {name}:” / “Sent to {name}:” | `holyShitCopy.ts` | HONEST / REAL | Preview vs post-send |
| Plan confirm follow-through | `opal_conversations.ex` / `opal_response.ex` | HONEST GATE | No “I'll handle the details” |
| Coordinate queued | `opal_response.ex` | HONEST GATE | No delivery promise |
| Unavailable draft “Want to send it yourself?” | `opal_response.ex` | HONEST GATE | |
| “Coming soon” in You settings | — | None | Guarded out |

---

## 7. Inventory by section (post Phase 1)

### Onboarding / HS — REAL↑ · HONEST↑ · DEAD D6 only  
### Planning CTAs / pills — REAL · HONEST (D8/D9 fixed) · DEAD D7  
### Card actions — REAL↑ · HONEST↑ · 0 DEAD  
### You hub / settings — unchanged  
### Empty states — unchanged  

Cross-cutting D13–D15 remain polish / harness.

---

## Phase 1 fix patterns applied

1. **Fake success → REAL or rename** — calendar connected / trust sent only after real side effects.  
2. **Missing route → existing endpoint** — `contacts/resolve` replaces missing `onboarding/contact`.  
3. **Clickable without link → don't use button** — briefing still_open / question.  
4. **Parent handlers honor ids** — Attention `onOpenPlan(planId)`.  
5. **Center coordinate copy** — match “queue only” law until delivery exists.  
6. **Keep You `blockedReason` pattern** — extended to HS calendar/send gates.

---

## Evidence pointers

- HS calendar stay-in-thread: `shots/first_run_fixes/VERIFY.md`, `holyShitFirstRun.test.ts`  
- You zero Coming soon: `youSettingsComingSoon.guard.test.ts`  
- Consent messaging_business blocked: `WhatOpalCanDoSection.test.tsx`  
- Real API intelligence defaults: `shots/audit/REAL_API_AUDIT.md`  
- Google calendar connector: `ConnectorController` + Meet `checkCalendarConnected`  
- Trust send: `TrustContractCard` → `createInvitation` / `createProductInvite`  

**Phase 1 fixes implemented in working tree. No commit in this pass (parent commits).**
