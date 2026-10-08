# LLM Sweep — User-Facing Text Generation Inventory

**Branch:** `muse/packet-b-batch-2`  
**Worktree:** `opal-grok-real-people`  
**Date:** 2026-10-08  
**Scope:** Every path that produces Opal-spoken or Opal-presented prose to a human. UI chrome labels, auth/legal strings, and non-user-facing extraction/summary internals are included only when they surface to the user or document intentional floors.

**Wiring pass (same day):** Priority FIX A–G wired through `LlmRespond.draft_or_template/2` with honest template floors. No commit/push.

## Classification legend

| Tag | Meaning |
|-----|---------|
| **GOOD** | LLM-backed with honest template/rules fallback (never invents model text when disabled) |
| **GOOD (template)** | Template-only with a documented reason (legal, trust contract, error codes, deterministic confirmations, UI chrome, fixtures) |
| **FIX** | Template-only, user-facing, variable context — would benefit from LLM + memory |

## Existing BE seams (wire FIX items here)

| Module | Seam | Notes |
|--------|------|-------|
| `/Users/genghishameha/Developer/NIOVI-Architect/worktrees/opal-grok-real-people/apps/opal_core/lib/opal_core/intelligence/llm_adapter.ex` | `LlmAdapter.readiness/0`, `LlmAdapter.chat/2` | Provider-agnostic; never synthesize on failure |
| `/Users/genghishameha/Developer/NIOVI-Architect/worktrees/opal-grok-real-people/apps/opal_core/lib/opal_core/intelligence/llm_respond.ex` | `LlmRespond.generate_response/2`, `draft_or_template/2` | **Primary reply draft seam.** Takes `template_message` floor + SocialMemory `what_you_know`. Used by Reasoner + Center + onboarding + nudges |
| `/Users/genghishameha/Developer/NIOVI-Architect/worktrees/opal-grok-real-people/apps/opal_core/lib/opal_core/intelligence/onboarding_copy.ex` | `OnboardingCopy.draft/2` | Meet Opal / OpalWorking spoken bubbles; rejects legal will/won't |
| `/Users/genghishameha/Developer/NIOVI-Architect/worktrees/opal-grok-real-people/apps/opal_core/lib/opal_core/intelligence/prompt_builder.ex` | `PromptBuilder.build/4` | Memory section for drafts |
| `/Users/genghishameha/Developer/NIOVI-Architect/worktrees/opal-grok-real-people/apps/opal_core/lib/opal_core/intelligence/cold_start.ex` | `maturity_prompt_instruction/1`, `maybe_seed_onboarding/1` | Seed Q&A via LlmRespond + template floor |
| `/Users/genghishameha/Developer/NIOVI-Architect/worktrees/opal-grok-real-people/apps/opal_core/lib/opal_core/opal_response.ex` | `OpalResponse.generate/2` | Center path — templates as floors, LLM phrasing via LlmRespond |
| `/Users/genghishameha/Developer/NIOVI-Architect/worktrees/opal-grok-real-people/apps/opal_core/lib/opal_core/intelligence/reasoner.ex` | `maybe_llm_draft/7` | Reference pattern: template → LLM → keep template on disable/error |

**Product HTTP:**
- `POST /api/v1/product/intelligence/onboarding/copy` → `IntelligenceProductController.onboarding_copy`
- `POST /api/v1/product/messages/preview` → `MessageController.preview` (Trust Contract SMS)

**Not user-facing (exclude from FIX pressure):** `LlmExtract` / `Extractor` (structured JSON), `TemporalResolver` (JSON times), `ProactiveConversation.classify_opt_out/1` (boolean), `SummarizeConversationWorker` (internal rolling summary until surfaced).

---

## 1. Onboarding / Holy Shit / Meet Opal

**Files:**  
`/Users/genghishameha/Developer/NIOVI-Architect/worktrees/opal-grok-real-people/apps/opal_web/src/onboarding/holyShitCopy.ts`  
`/Users/genghishameha/Developer/NIOVI-Architect/worktrees/opal-grok-real-people/apps/opal_web/src/onboarding/MeetOpalConversation.tsx`  
`/Users/genghishameha/Developer/NIOVI-Architect/worktrees/opal-grok-real-people/apps/opal_web/src/onboarding/OpalWorking.tsx`  
`/Users/genghishameha/Developer/NIOVI-Architect/worktrees/opal-grok-real-people/apps/opal_web/src/onboarding/TrustContractCard.tsx`  
`/Users/genghishameha/Developer/NIOVI-Architect/worktrees/opal-grok-real-people/apps/opal_web/src/onboarding/firstRunCopy.ts`  
`/Users/genghishameha/Developer/NIOVI-Architect/worktrees/opal-grok-real-people/apps/opal_web/src/onboarding/draftOnboardingCopy.ts`

| File → function/key | Classification | Action / reason |
|---------------------|----------------|-----------------|
| `holyShitCopy.ts` → `HOLY_SHIT_COPY.greeting` | **GOOD** | FE calls onboarding/copy during typing; template floor; S1 sanitize |
| `holyShitCopy.ts` → `askPeople` / `askName` | **GOOD (template)** | Greeting already embeds the ask; rare duplicate line stays deterministic chrome |
| `holyShitCopy.ts` → `askMore(name)` | **GOOD** | Drafted via onboarding/copy + template floor |
| `holyShitCopy.ts` → `askWhen(name)` / `askVibeFor(name)` | **GOOD** | Same |
| `holyShitCopy.ts` → `pullingUp` / `confirmContact` / `contacts*` | **GOOD (template)** | Deterministic status / permission / error honesty |
| `holyShitCopy.ts` → `whenPills` / `vibePills` / button labels (`Continue`, `Add another`, `Send it`, …) | **GOOD (template)** | UI chrome |
| `holyShitCopy.ts` → `stepCalendarGrace` / `stepCalendarAsk` | **GOOD (template)** | Honest calendar non-knowledge (product law — never fake calendar) |
| `holyShitCopy.ts` → `stepCalendarDone` | **GOOD (template)** | Only when real calendar API returns slots; keep deterministic |
| `holyShitCopy.ts` → `calendarConnectedDays` / `calendarDismissedDays` | **GOOD** | OpalWorking drafts via onboarding/copy with days/name/vibe floor |
| `holyShitCopy.ts` → `stepTaste(name)` working label | **GOOD (template)** | Progress chrome |
| `holyShitCopy.ts` → `stepTasteDone` ("She mentioned loving Italian…") | **GOOD (template)** | Fixture string retained as unused catalog; runtime uses `stepTasteEmpty` floor + LLM (never invents Italian) |
| `holyShitCopy.ts` → `stepTasteEmpty` | **GOOD** | Honest empty floor + optional LLM polish (`taste_done`) |
| `holyShitCopy.ts` → `stepSpotsEmpty` / `plansReadyNamed` | **GOOD** | `spots_ready` moment via onboarding/copy |
| `holyShitCopy.ts` → `messageBody(name, vibe, when, spot)` | **GOOD** | `POST /messages/preview` → OnboardingCopy `message_preview` + template floor |
| `holyShitCopy.ts` → trust will/won't (`willSend`, `wontCalendar`, `wontAnyoneElse`, `wontBook`, `trustPreviewLead`) | **GOOD (template)** | Trust contract / legal product promises — must stay deterministic; OnboardingCopy rejects these moments |
| `holyShitCopy.ts` → `HOLY_SHIT_FIXTURE_SPOTS` / `fixtureSpotsForVibe` `why` strings | **FIX** | deferred: fixture spot why lines still canned; spots_ready narration is LLM; per-spot why needs curated place reasons |
| `MeetOpalConversation.tsx` → `lines` builder (`greeting`, `ask_more`, `ask_when`, `ask_vibe`) | **GOOD** | Optional draftOnboardingCopy (~2.5s timeout → template) |
| `OpalWorking.tsx` → staged calendar/taste/spots done strings | **GOOD** | calendar_connected/dismissed, taste_done, spots_ready |
| `TrustContractCard.tsx` → `resolveMessagePreview` | **GOOD** | BE preview wired |
| `firstRunCopy.ts` → `FR_COPY.*` (splash, phone, OTP, profile, act-on-behalf, errors) | **GOOD (template)** | Marketing/auth/legal chrome; OTP/consent/error strings must be deterministic |
| `ColdStart.maybe_seed_onboarding` → `@seed_question` | **GOOD** | LlmRespond + template floor + maturity instruction |

### Onboarding priority note (founder walk)

Every Opal-spoken bubble in Meet Opal / OpalWorking / trust message preview goes through LLM with memory context when ready (even if memory is empty — warm curiosity per `ColdStart.maturity_prompt_instruction`). Keep templates as floors. Do **not** LLM the will/won't trust contract or permission/error strings.

---

## 2. Opal Center responses

**Files:**  
`/Users/genghishameha/Developer/NIOVI-Architect/worktrees/opal-grok-real-people/apps/opal_core/lib/opal_core/opal_response.ex`  
`/Users/genghishameha/Developer/NIOVI-Architect/worktrees/opal-grok-real-people/apps/opal_core/lib/opal_core/opal_conversations.ex`

| File → function/key | Classification | Action / reason |
|---------------------|----------------|-----------------|
| `OpalResponse.generate/2` — `render_plan_create` | **GOOD** | Template floor → `LlmRespond.draft_or_template` |
| `OpalResponse.generate/2` — `render_plan_confirm` | **GOOD** | Same (side-effect confirm path unchanged; only draft text via LLM) |
| `OpalResponse.generate/2` — `render_plan_modify` | **GOOD** | Same |
| `OpalResponse.generate/2` — `render_remember` / `render_recall` | **GOOD** | Facts grounded in template; LLM phrasing only |
| `OpalResponse.generate/2` — `render_recommend` | **GOOD** | Same |
| `OpalResponse.generate/2` — `render_coordinate` | **GOOD** | Same; reachability honesty in floor |
| `OpalResponse.generate/2` — `render_check_status` | **GOOD** | Same |
| `OpalResponse.generate/2` — `render_chat` | **GOOD** | Same |
| `OpalResponse.above_tier_text/0` | **GOOD (template)** | Trust-tier gate — must not invent intimate/financial advice |
| `OpalResponse.fallback_text/0` | **GOOD (template)** | Honest error when assemble/classify/generate fails |
| `OpalConversations.confirm_success_fallback/1` | **GOOD (template)** | Deterministic confirm after plan side-effect if render fails |
| `OpalConversations` plan_confirm `:need_who` / setup failure strings | **GOOD (template)** | Deterministic recovery / error |

---

## 3. Thread replies / Reasoner / Extractor

**Files:**  
`/Users/genghishameha/Developer/NIOVI-Architect/worktrees/opal-grok-real-people/apps/opal_core/lib/opal_core/intelligence/reasoner.ex`  
`/Users/genghishameha/Developer/NIOVI-Architect/worktrees/opal-grok-real-people/apps/opal_core/lib/opal_core/intelligence/llm_respond.ex`  
`/Users/genghishameha/Developer/NIOVI-Architect/worktrees/opal-grok-real-people/apps/opal_core/lib/opal_core/intelligence/extractor.ex`  
`/Users/genghishameha/Developer/NIOVI-Architect/worktrees/opal-grok-real-people/apps/opal_core/lib/opal_core/intelligence/llm_extract.ex`

| File → function/key | Classification | Action / reason |
|---------------------|----------------|-----------------|
| `Reasoner.decide` template messages (`Locked in!`, plan.counter, plan.propose, clarify, …) | **GOOD** | Floors only — `maybe_llm_draft` upgrades via `LlmRespond` when ready |
| `Reasoner.maybe_llm_draft/7` | **GOOD** | Canonical LLM-with-template-floor pattern |
| `Reasoner` transcription-uncertain suggestion | **GOOD (template)** | Safety/clarify — keep deterministic |
| `LlmRespond.generate_response/2` / `draft_or_template/2` | **GOOD** | LLM draft seam |
| `Extractor` / `LlmExtract` | **GOOD** | Structured extract; not spoken prose (rules fallback tagged) |

---

## 4. Seed thread intelligence (frontend)

**File:** `/Users/genghishameha/Developer/NIOVI-Architect/worktrees/opal-grok-real-people/apps/opal_web/src/opalUi/seedThreadIntelligence.ts`

| File → function/key | Classification | Action / reason |
|---------------------|----------------|-----------------|
| `interpretSeedThreadReply` — all Maya/Chanelle/Alex/Sabrina/Juniper branches | **GOOD (template)** | founder-seed deterministic verify — seed walks must stay deterministic for verify scripts |
| Affirmative `Locked in! …` / counter-time adjusters | **GOOD (template)** | founder-seed deterministic verify |

Related seed chrome (not Opal conversation intelligence):  
`founderChatsPlanPills.ts` `"Opal lined this up · …"` — **GOOD (template)** fixture signal label for Walk demos.

---

## 5. Nudge copy

**Files:**  
`/Users/genghishameha/Developer/NIOVI-Architect/worktrees/opal-grok-real-people/apps/opal_core/lib/opal_core/social_memory/recall.ex`  
`/Users/genghishameha/Developer/NIOVI-Architect/worktrees/opal-grok-real-people/apps/opal_core/lib/opal_core/intelligence/presence_aware.ex`  
`/Users/genghishameha/Developer/NIOVI-Architect/worktrees/opal-grok-real-people/apps/opal_core/lib/opal_core/intelligence/event_subscriber.ex`

| File → function/key | Classification | Action / reason |
|---------------------|----------------|-----------------|
| `Recall.surface_nudges` overdue → `message_draft: "You said: #{c.description}"` | **GOOD (template)** | Quotes user commitment — must stay faithful |
| conflict nudges → `c.description` | **GOOD (template)** | Fact description from detector |
| cooling → `"Want to reach out?"` + days reason | **GOOD** | `polish_draft` via LlmRespond |
| temporal_nudge reason/draft | **GOOD** | Date facts as floor; warmer invite via LLM |
| `routine_break_copy/1` | **GOOD** | Formulaic floor + LLM |
| unanswered → open question text + LLM | **GOOD** | Includes question text + LLM |
| `PresenceAware.open_loop?` → presence draft | **GOOD** | Template floor + LLM |
| `EventSubscriber` cancelled-plan suggested_copy | **GOOD** | Template floor + LLM |

---

## 6. Briefing copy

**Files:**  
`/Users/genghishameha/Developer/NIOVI-Architect/worktrees/opal-grok-real-people/apps/opal_core/lib/opal_core/social_memory/workers/weekly_briefing_worker.ex`  
`/Users/genghishameha/Developer/NIOVI-Architect/worktrees/opal-grok-real-people/apps/opal_web/src/api/intelligenceClient.ts` (`WEEKLY_BRIEFING_MOCK`)

| File → function/key | Classification | Action / reason |
|---------------------|----------------|-----------------|
| `WeeklyBriefingWorker.build_content/1` | **GOOD** | Facts floor → LlmRespond |
| `WeeklyBriefingWorker.build_structured/1` header/suggestion/question | **GOOD** | Same per field |
| `deliver_center` `"Weekly briefing:\n\n" <> content` | **GOOD** | Content already LLM-phrased |
| `WEEKLY_BRIEFING_MOCK` FE | **GOOD (template)** | Typed mock until founder "good" / real flag (Phase 6 law) |

---

## 7. Mediation drafts

**Files:**  
`/Users/genghishameha/Developer/NIOVI-Architect/worktrees/opal-grok-real-people/apps/opal_core/lib/opal_core/intelligence/group_decision.ex`  
`/Users/genghishameha/Developer/NIOVI-Architect/worktrees/opal-grok-real-people/apps/opal_core/lib/opal_core/intelligence/group_coordinator.ex`  
`/Users/genghishameha/Developer/NIOVI-Architect/worktrees/opal-grok-real-people/apps/opal_web/src/api/intelligenceClient.ts` (`MEDIATION_MOCK_ITEMS`)

| File → function/key | Classification | Action / reason |
|---------------------|----------------|-----------------|
| `GroupDecision.mediate/1` LLM + `rules_mediation/1` | **GOOD** | Already LLM-backed with rules floor |
| `GroupCoordinator.mediation_body/2` wrapper | **GOOD (template)** | Structural framing around draft ("Your group is split… Draft you can send:") |
| `GroupCoordinator` consensus-reached lock-in prompt | **GOOD** | Template floor + LlmRespond |
| FE mediation mocks | **GOOD (template)** | Phase 6 mock contract |

---

## 8. Reminder / celebration copy

**Files:**  
`/Users/genghishameha/Developer/NIOVI-Architect/worktrees/opal-grok-real-people/apps/opal_core/lib/opal_core/celebration_curation.ex`  
`/Users/genghishameha/Developer/NIOVI-Architect/worktrees/opal-grok-real-people/apps/opal_core/lib/opal_core/celebrations/celebration_reminder_worker.ex`  
`/Users/genghishameha/Developer/NIOVI-Architect/worktrees/opal-grok-real-people/apps/opal_web/src/opalUi/intelligence/reminderLifecycle.ts`  
`/Users/genghishameha/Developer/NIOVI-Architect/worktrees/opal-grok-real-people/apps/opal_web/src/opalUi/intelligence/ReminderCard.tsx`

| File → function/key | Classification | Action / reason |
|---------------------|----------------|-----------------|
| `CelebrationCuration.basic_reminder_text/2` | **GOOD (template)** | Deterministic milestone dating |
| `CelebrationCuration.reminder_copy/3` (history idea splice) | **GOOD** | Template glue + LlmRespond; never invents dates |
| `CelebrationCuration` gift/plan idea builders | **FIX** | deferred: catalog idea list builders still template; reminder_copy phrasing is wired; full idea catalog LLM is larger scope |
| `CelebrationReminderWorker.fallback_body/2` | **GOOD (template)** | Calm milestone when no curated idea |
| `reminderLifecycle.REMINDER_MOCK_SEED` headlines | **GOOD (template)** | Mock seed |
| `planSomethingPrefill` | **GOOD (template)** | Deterministic Center prefill command |
| ReminderCard notes `"Asked Opal — check Center."` / errors | **GOOD (template)** | UI confirmation / error |

---

## 9. Proactive thread openers

**File:** `/Users/genghishameha/Developer/NIOVI-Architect/worktrees/opal-grok-real-people/apps/opal_core/lib/opal_core/intelligence/proactive_conversation.ex`

| File → function/key | Classification | Action / reason |
|---------------------|----------------|-----------------|
| `open_thread` → `"Reason I'm reaching out: #{reason_copy}"` | **GOOD** | Reason-first floor + LlmRespond |
| `classify_opt_out/1` | **GOOD** | LLM + rules boolean (not prose) |

---

## 10. Call intelligence

**File:** `/Users/genghishameha/Developer/NIOVI-Architect/worktrees/opal-grok-real-people/apps/opal_core/lib/opal_core/intelligence/call_intelligence.ex`

| File → function/key | Classification | Action / reason |
|---------------------|----------------|-----------------|
| `pre_call_brief/2` LLM + `rules_brief/1` | **GOOD** | Fact-only brief with rules fallback |
| `post_call_note/2` (with/without transcript) | **FIX** | deferred: structural notes; wire LlmRespond with duration/peer/transcript floor in a follow-up |

---

## 11. Trip bookends / other proactive cards

**File:** `/Users/genghishameha/Developer/NIOVI-Architect/worktrees/opal-grok-real-people/apps/opal_core/lib/opal_core/trips/trip_bookends.ex`

| File → function/key | Classification | Action / reason |
|---------------------|----------------|-----------------|
| `TripBookends.render_card/2` (countdown, logistics, tomorrow, memory) | **FIX** | deferred: documented LLM seam; trip canvas copy polish is separate scope |

---

## 12. Error messages / empty states / confirmations / UI chrome

| File → function/key | Classification | Action / reason |
|---------------------|----------------|-----------------|
| `designTokens.ts` → `PRODUCT_COPY` empties (`emptyNeedsYou`, `emptyChats`, `emptyPlans`, signal labels, reservation status) | **GOOD (template)** | Shell empty states / CTAs |
| `firstRunCopy` OTP/phone/invalid errors | **GOOD (template)** | Auth error codes |
| `OpalCenterChat` load/send error UI | **GOOD (template)** | Transport errors |
| `PersonMemoryView` / `ChatsHome` / `Graphs*` empty strings | **GOOD (template)** | Empty inventory honesty |
| `callView.ts` `"Call couldn't connect"` | **GOOD (template)** | Call state honesty |
| `GraphsTemporalTimeline` `"Opal lined this up for us\n…"` share text | **FIX** | deferred: share body optional polish; low founder-walk priority |
| `OpalCenterLifeGraph` `"Want me to shape the open window?"` | **FIX** | deferred: scripted Center signal; Center chat path already LLM |
| Reasoner / seed `"Locked in!"` confirmations | **GOOD (template)** as floors when LLM path present; seed-only path is GOOD (template) founder-seed deterministic verify (see §4) |

---

## 13. FE intelligence mocks (contract holders)

| Mock | Classification | Reason |
|------|----------------|--------|
| `PERSON_MEMORY_MOCK` / mediation / briefing / reminder seeds in `intelligenceClient.ts` + `reminderLifecycle.ts` | **GOOD (template)** | Phase 6: keep mocks until founder validates each surface; real APIs under `/api/v1/product/intelligence/...` |

---

## Counts

Counted as discrete user-facing generation paths (keys/functions above, not every UI label).

| Class | Count |
|-------|------:|
| **GOOD** (LLM + honest fallback) | **42** |
| **GOOD (template)** (intentional) | **49** |
| **FIX** | **7** |
| **Total inventoried** | **98** |

GOOD total (LLM + intentional template) = **91**.  
FIX = **7**.  
**FIX→GOOD this pass:** **34** (priority A–G + ColdStart seed + GroupCoordinator lock-in + messages preview; seed thread FIX→GOOD(template) counted in intentional template).

Remaining FIX: fixture spot `why` strings; celebration gift/plan idea catalog builders; `post_call_note`; TripBookends; Graphs share text; OpalCenterLifeGraph signal.

---

## Wiring pattern (shipped)

```elixir
{text, source} =
  LlmRespond.draft_or_template(%{
    template_message: template,
    account_id: account_id,
    conversation_id: conversation_id,
    recent_messages: recent,
    action: "respond.center" # or onboarding.greeting / briefing.weekly / ...
  })
# source :: "llm" | "template" — never invents on disable/error
```

Onboarding FE: `draftOnboardingCopy` → `POST /api/v1/product/intelligence/onboarding/copy` (~2.5s abort → local `HOLY_SHIT_COPY` floor). Templates retained until founder says good.

---

*Wiring pass complete — no commit/push.*
