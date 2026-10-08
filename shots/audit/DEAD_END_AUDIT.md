# Paste G Phase 1 — Dead-End Audit

**Worktree:** `/Users/genghishameha/Developer/NIOVI-Architect/worktrees/opal-grok-real-people`  
**Branch:** `muse/packet-b-batch-2`  
**Tip at audit:** `37229db9`  
**Date:** 2026-10-08  
**Scope:** User-facing journeys that look completeable — onboarding / Holy Shit, planning CTAs & pills, intelligence card actions, You hub / settings, empty states, conversational promise copy.  
**Do not implement in this pass** — proposed fixes are for parent.

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
| **REAL** | **38** |
| **HONEST GATE** | **58** |
| **DEAD END** | **18** |

Counts are discrete user-facing journeys / controls in the scoped surfaces (not every DOM node). You-settings `blockedReason` rows are one HONEST GATE each.

---

## Top 15 dead ends to fix first

1. **Trust “Send it” does not send** — advances Meet Opal to auth; no SMS / invite / outbound message.  
2. **Trust lead “I'll message {name}”** — same path; copy promises delivery.  
3. **Connect calendar fakes connected** — no OAuth; Meet Opal never wires `onConnectCalendar`.  
4. **Post-connect copy “I'll check your availability”** — spoken after fake connect.  
5. **`POST /api/v1/product/onboarding/contact` missing** — persist always fails silently.  
6. **Center coordinate “I'll message / I'll draft…” when queued** — log-only; no send.  
7. **“I'll handle the details” after plan confirm** — plan may exist; booking/calendar/follow-through not started.  
8. **Attention Reminder “View plan”** — parent `onOpenPlan` ignores `planId`, opens founder feed graph.  
9. **Briefing “Still open” rows without conversation link** — clickable, no-op.  
10. **Briefing question with no link** — `setNote(q.label)` only.  
11. **Chats seed plan pills with unresolved seed plan ids** — `openGraphDetail(seed-…)` often null graph.  
12. **HS Moments 6 / 9 / 10 claimed in product frame, not built** — post-trust follow-through absent.  
13. **Wallet “Add money” when Stripe disabled** — already mostly honest note; ensure CTA never looks like success (keep as gate polish).  
14. **Photo upload “next build”** — honest text but sits next to Save profile as if profile chrome is complete (gate clarity).  
15. **AvailabilityReview no-op chips** — founder review harness only; fix or hide from any shared CTA patterns.

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
| Spot pick / custom place / continue without spot | `OpalWorking.tsx:433–532` | `onSelectSpot` → trust |
| Day proposal pills after calendar resolve | `OpalWorking.tsx:398–421` + Meet `onPickDayProposal` | Updates `when` |
| Not yet | Trust → `finish(null)` → auth resume | Intentional skip path |
| fr08 profile Continue | First-run auth | Live |
| fr10 act-on-behalf grant (calls / bookings) | `ActOnBehalfOptInStep.tsx` | Consent API; no messaging_business |

### HONEST GATE

| Journey | Where | Notes |
|---|---|---|
| Calendar not connected grace | `holyShitCopy.ts:41` `stepCalendarGrace`; `OpalWorking.tsx:94–112` | “I'll figure out when works for you.” / ask — no fake free slots |
| `GET /calendar/free` absent from router | fetch fails → grace | Honest fallback (route missing is a product gap, not a fake success) |
| Unknown vibe → empty spots | `fixtureSpotsForVibe` → `[]`; `stepSpotsEmpty` | Continue without inventing restaurants |
| Contacts denied once | `holyShitCopy.ts:17–18` | Settings later |
| Taste empty | `stepTasteEmpty` “No preferences yet - I'll learn.” | Code uses empty floor (`OpalWorking.tsx:220`), not Italian fixture |
| Just tell me what works | dismiss → day proposals | Stays in thread; no home dump |

### DEAD END

| # | Journey | File:line | Why dead | Proposed fix |
|---|---|---|---|---|
| D1 | **Connect calendar** | `OpalWorking.tsx:372–380` (`onConnectCalendar?.()` then `resolveCalendarStayInThread(true)`); Meet never passes `onConnectCalendar` (`MeetOpalConversation.tsx:696–706`) | Button always marks connected; no Google OAuth start (`ConnectorController` exists but unused here) | **REAL:** wire `onConnectCalendar` → `POST …/connectors/google_calendar/start` + callback, then only call `resolveCalendarStayInThread(true)` on real connected status. **Or HONEST GATE:** rename CTA to “Set up calendar later” and never say “Calendar's connected”. |
| D2 | **Copy after fake connect** | `holyShitCopy.ts:44–45` `calendarConnectedDays` (“I'll check your availability”); applied at `OpalWorking.tsx:194–197` | Promises live free/busy after fake connect | Only emit after real connector status; else use dismiss copy |
| D3 | **Send it** | `TrustContractCard.tsx:139–145` → `MeetOpalConversation.tsx:914` `finish(spot)` → `OpalApp.tsx:7105` `onComplete={() => advanceMeetOpalToAuth()}` (`2809–2821`) | No outbound SMS / RelationshipInvitation / product invite; preview-only (`MessageController.preview`) | **REAL:** on Send, call product invite or onboarding message create with phone snapshot, show delivery honesty, then advance. **Or HONEST GATE:** change CTA to “Save plan & continue” and drop “I'll message / Send this one message” until SMS ships |
| D4 | **“I'll message {name}” / “Send this one message”** | `holyShitCopy.ts:72,74`; Trust `112,120` | Same as D3 | Align copy with D3 fix |
| D5 | **Persist onboarding contact** | `MeetOpalConversation.tsx:41–63` `POST /api/v1/product/onboarding/contact` | **No matching route in `router.ex`** — always `false`, silent | Add controller+route (or call existing invitation/contact upsert) and surface failure in UI |
| D6 | **Moments 6 / 9 / 10** | Product frame / memory (`opal-holy-shit-first-run`) | Post-trust follow-through not built; user exits to auth thinking message went out | Ship send+attention follow-through, or explicit “We'll finish this after your profile” gate on Send |

---

## 2. Planning conversational CTAs and pills

### REAL

| Journey | Where |
|---|---|
| Open chat row | `ChatsHome` → `openChat` |
| Alignment Accept change / Keep current / Withdraw | `OpalApp.tsx:5101–5158` → live alignment APIs |
| Plan set / completion chrome | alignment cards in thread |
| Center empty chips → `sendBody` | `OpalCenterChat.tsx:36–37,636–645` |
| Center plan confirm → SharedPlan | `opal_conversations.ex` + `OpalPlanConfirm` |
| New chat / group create | `NewChatPicker` |
| Graph create from Plan | WHO skip → `GraphCreateFlow` |
| Live / Alex trip plan pills | `OpalApp.tsx:8101–8111` special cases |

### HONEST GATE

| Journey | Where | Notes |
|---|---|---|
| Plan pill when id is `seed-chat-*` | `OpalApp.tsx:8113–8115` | Gate note: “Open the chat to see this plan.” |
| Calls / voice when unsigned | `setCallsGateNote(...)` | Honest |

### DEAD END

| # | Journey | File:line | Why dead | Proposed fix |
|---|---|---|---|---|
| D7 | **Seed plan pills (`seed-chanelle-juniper`, etc.)** | `founderChatsPlanPills.ts:37+`; `OpalApp.tsx:8117` `openGraphDetail(planId)` | Often no chat lineage → `canonicalGraph` null (`3665–3686`); detail opens empty/wrong | Map seed plan ids to founder graph cards / live lineage, or treat like seed-chat gate (“Open the chat…”) |
| D8 | **Center “I'll message / I'll draft…” on `:queued`** | `opal_response.ex:682–688,730–750` (`Queue only — do not send`) | Copy claims outbound; only `Logger.info` | **HONEST GATE:** always use unavailable draft copy until push/SMS queue ships; or **REAL:** enqueue job + show “Queued — you'll confirm before send” |
| D9 | **“I'll handle the details”** | `opal_conversations.ex:258,261`; `opal_response.ex:180` | Plan row may be REAL; phrase implies booking/calendar/outreach | Soften to “Plan is set — say if you want me to hold a table / message them” with gated CTAs |

---

## 3. Card actions (mediation, briefing, reminder, attention)

### REAL

| Action | Where |
|---|---|
| Mediation Send → Center handoff | `mediationActions.ts:17–40`; note “you send to the group” |
| Mediation Edit / Dismiss | `MediationCard.tsx` |
| Mediation Create plan (consensus) | → Center prefill |
| Reminder Plan something | `ReminderCard.tsx:65–88` → `postOpalMessage` + `opal-open-center` |
| Reminder Dismiss | `resolveAttentionItem` when non-mock id |
| Briefing Past weeks / Dismiss for week | `WeeklyBriefingCard.tsx` |
| Attention row with conversation deep link | `OpalApp.tsx:9831–9854` `openChat` + alignment focus |
| Attention plan deep link | `9856–9859` `openGraphDetail` |

### HONEST GATE

| Action | Where |
|---|---|
| Intelligence load error / empty | `IntelligenceForYouExtras.tsx:117–127` |
| Mediation honesty (owner sends) | Card note after Send |
| Mock reminder seed disabled under `real` | `ActivityDestination` + `requiresRealData` |

### DEAD END

| # | Journey | File:line | Why dead | Proposed fix |
|---|---|---|---|---|
| D10 | **Reminder View plan** | `ReminderCard.tsx:145–154` calls `onOpenPlan(planId)`; `OpalApp.tsx:9875–9880` **ignores planId**, opens `FOUNDER_HOME_FEED` graph card | Wrong destination | Pass `(planId) => { setActivityOpen(false); if (planId) openGraphDetail(planId, "graphs"); }` (same for `onOpenGraph` if still founder-feed hack at `9882–9887`) |
| D11 | **Briefing Still open button without `link.kind === "conversation"`** | `WeeklyBriefingCard.tsx:130–146` | Clickable CTA, no handler | Only render `<button>` when link present; else `<span>` / or route via Center prefill |
| D12 | **Briefing question with no link** | `WeeklyBriefingCard.tsx:57–80` → `setNote(q.label)` | Looks like action, only local note | Require link or post to Center like `plan_create` branch |

---

## 4. Settings / You hub

### REAL

| Surface | Where |
|---|---|
| Edit profile name/username Save | `YouSettingsDestination.tsx:980–995` `updateProfile` |
| Consent: calls_outbound, bookings_reserve | `WhatOpalCanDoSection` grant/revoke |
| Assist on calls toggle | live `updateAssistPreference` |
| Messages & calls / Read receipts prefs | messaging preference callbacks |
| Spending comfort save/delete (trusted+) | `SpendingComfortSection` |
| Wallet balance + tx list read | `getOpalWallet` / transactions |
| Celebrations add/open/delete/curate | `CelebrationsSection` |
| Invite create / share / copy | `InviteFriendsSection` (SMS honesty via `sms_honest`) |
| Memory Forget | `WhatOpalRemembersSection` |
| People relationship type picker | same |
| Linked devices → nested screen | `opens: "linked-devices"` |
| Delete account nested screen | honest unavailable note (not fake delete) |

### HONEST GATE (You settings rows)

All `blockedReason` entries in `YouSettingsDestination.tsx` — **46** rows, including:

- Privacy & audience (graph visibility, exact location, public counts, join requests, blocked & muted) — `:153–187`
- Feed & discovery — `:202–234`
- Location & travel — `:253–294`
- Engagement — `:309–340`
- Calls & Assist extras (ask every, suggest graphs, remember signals, call privacy) — `:366–393`
- Notification categories needing Expo/APNs — `:422–446`
- Linked devices QR / revoke — `:475–492`
- Safety lists — `:505–533`
- Spending extras — `:553–587`
- Account security phone / 2-step / session alerts — `:605–626`
- Bio field — `:137`
- Photo upload — `:810–815` (“Photo upload needs media storage — next build”)
- `messaging_business` consent — `:1073–1078` (“Twilio/business channel connector — not configured”)
- Wallet load when Stripe disabled — `:1353–1366` honest note
- Delete account unavailable — `:651–654`

Render path disables click chrome for blocked nav/toggles (`:824–926`). Zero user-facing “Coming soon” (guard tests).

### DEAD END

None of the blocked You rows are DEAD END (they are HONEST GATE). Residual risk only if a toggle without `blockedReason` fails to persist — currently live toggles (assist / messages / read receipts) write prefs.

Wallet Add money: **HONEST GATE** when disabled (note shown). Keep CTA from claiming “Loaded.” unless `res.wallet` present (already gated `:1358–1360`).

---

## 5. Empty states

| Empty | File | Class |
|---|---|---|
| Attention caught up | `ActivityDestination.tsx:295–302` | HONEST |
| Memory empty | `YouSettingsDestination.tsx:1769–1771` | HONEST |
| People empty | `:1803–1805` | HONEST |
| Celebrations empty | `:2318–2320` (“Opal will remind you…”) | **REAL promise** if `CelebrationReminderWorker` runs; else soften copy → HONEST |
| Invite empty | `:2662–2664` | HONEST + Create CTA REAL |
| Wallet tx empty | `:1467–1468` | HONEST |
| Center empty + chips | `OpalCenterChat.tsx:632–648` | REAL (chips send) |
| Search graphs empty | `SearchDestination` | HONEST |
| Spots empty (HS) | `OpalWorking` + Continue | HONEST / REAL continue |

---

## 6. Conversational promises (grep)

| Copy | Location | Class | Notes |
|---|---|---|---|
| “I'll figure out when works for you.” | `holyShitCopy.ts:41` | HONEST GATE | Pre-connect grace |
| “Calendar's connected - I'll check your availability…” | `holyShitCopy.ts:45` | **DEAD END** | After fake connect (D2) |
| “No problem - I'll work around it…” | `holyShitCopy.ts:47–48` | REAL/HONEST | Day pills follow |
| “No preferences yet - I'll learn.” | `holyShitCopy.ts:58` | HONEST | |
| “I'll message {name}:” | `holyShitCopy.ts:72` | **DEAD END** | D3/D4 |
| “I'll handle the details.” | `opal_conversations.ex:258,261`; `opal_response.ex:180` | **DEAD END** (over-promise) | D9 |
| “I'll draft… / I'll {action}…” when queued | `opal_response.ex:685–687` | **DEAD END** | D8 |
| Unavailable draft “Want to send it yourself?” | `opal_response.ex:690–695` | HONEST GATE | |
| “Coming soon” in You settings | — | None | Guarded out; blockedReason only |
| `TODO` / empty `onClick={() => {}}` in member shell | — | No product no-op handlers found | AvailabilityReview only |

Legacy dishonest taste line still in copy file (`stepTasteDone: "She mentioned loving Italian last month"`) but **unused** at runtime (`OpalWorking` sets `stepTasteEmpty`). Safe; delete or keep unused.

---

## 7. Inventory by section (for parent)

### Onboarding / HS — 11 REAL · 6 HONEST · 6 DEAD (D1–D6)
### Planning CTAs / pills — 8 REAL · 2 HONEST · 3 DEAD (D7–D9)
### Card actions — 8 REAL · 3 HONEST · 3 DEAD (D10–D12)
### You hub / settings — 12 REAL · 46+ HONEST · 0 DEAD
### Empty states — 2 REAL · 7 HONEST · 0 DEAD
### Extra conversational (Center) — folded into D8–D9

Cross-cutting D13–D15 are polish / harness.

---

## Proposed fix patterns (parent)

1. **Fake success → REAL or rename** — never claim connected / sent / queued-delivery without the side effect.  
2. **Missing route → add route or stop calling** — `onboarding/contact`, prefer existing invite/SMS path for Trust Send.  
3. **Clickable without link → don't use button** — briefing still_open / question.  
4. **Parent handlers must honor ids** — Attention `onOpenPlan(planId)`.  
5. **Center coordinate copy** — match OC-4 “queue only” law until delivery exists.  
6. **Keep You `blockedReason` pattern** — gold standard HONEST GATE; extend to HS calendar/send.

---

## Evidence pointers

- HS calendar stay-in-thread: `shots/first_run_fixes/VERIFY.md`, `holyShitFirstRun.test.ts`  
- You zero Coming soon: `youSettingsComingSoon.guard.test.ts`  
- Consent messaging_business blocked: `WhatOpalCanDoSection.test.tsx`  
- Real API intelligence defaults: `shots/audit/REAL_API_AUDIT.md`  
- Google calendar connector (unused by Meet Opal): `ConnectorController` + `router.ex` connectors  
- Message preview only (no send from Trust): `MessageController.preview` vs unused create path from HS  

**No fixes implemented in this audit. No commit.**
