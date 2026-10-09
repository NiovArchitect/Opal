# Paste H Phase 0 — Single-User Journey Inventory

**Branch:** `muse/packet-b-batch-2`  
**Audited:** 2026-10-08  
**Law:** one human alone. Status is honest (code + existing tests/evidence).  
**Companion:** Paste G `DEAD_END_AUDIT.md` (0 DEAD ENDs). This inventory is the solo test surface.

## Status legend

| Status | Meaning |
|--------|---------|
| **works** | Entry→termination completes on a live product path with tests or live verify |
| **works-but-fragile** | Path exists but races, env gates, or missing pressure coverage |
| **untested** | Code present; no dedicated solo pressure/E2E covering the extreme case |

---

## Journeys

### 1. Onboarding / Holy Shit / Meet Opal

| | |
|--|--|
| **Entry** | First-run splash → Promise → phone OTP → Meet Opal |
| **Steps** | Splash → Promise immersion → Auth OTP → Meet Opal people/vibe → Trust Moment 5 → working shell |
| **Termination** | Authenticated product shell (`OpalApp`); Moments 6/9/10 not shipped (honest) |
| **Status** | **works** |
| **Evidence** | `holyShitGate.ts`, `TrustContractCard.tsx`, OTP production_sms `/health`, DEAD_END_AUDIT §1 |

### 2. Adding people / contact picker

| | |
|--|--|
| **Entry** | Meet Opal contact suggest; You hub People; `POST /api/v1/product/contacts/resolve` |
| **Steps** | Native/contact picker → resolve phone → persist contact → optional Trust send |
| **Termination** | Contact on account graph; invite SMS when Twilio LIVE |
| **Status** | **works-but-fragile** (native contacts permission / device-dependent) |
| **Evidence** | `ContactSuggestPicker`, contacts resolve API, DEAD_END_AUDIT D5 |

### 3. Planning (solo)

| | |
|--|--|
| **Entry** | Center chat / thread; Graph create; alignment Accept |
| **Steps** | Vague or concrete ask → extract → SharedPlan proposal → confirm → Graph detail |
| **Termination** | SharedPlan row + UI plan card; follow-through soft-gated when booking absent |
| **Status** | **works-but-fragile** (LLM path env-dependent; flip-flop / interrupt untested until Phase 2) |
| **Evidence** | `SharedPlan`, Center chips, `Extractor`/`LlmExtract`, Graph Detail |

### 4. Reminders (“remind me”)

| | |
|--|--|
| **Entry** | Center / thread message `remind me to…` |
| **Steps** | `Extractor` → `set_reminder` → TemporalAnchor / AttentionCenter item |
| **Termination** | Reminder card in For you / attention; fires per temporal rules |
| **Status** | **works-but-fragile** (5-min / Christmas / recurring / “whenever Maya’s free” need Phase 2) |
| **Evidence** | `Extractor.set_reminder`, `TemporalResolver`, ReminderCard, TRUST_AT_SCALE |

### 5. Memory view (correct / remove)

| | |
|--|--|
| **Entry** | You hub People → person memory |
| **Steps** | GET memory → PATCH fact / DELETE archive / confirm inferred |
| **Termination** | Fact updated or archived; not surfaced after archive |
| **Status** | **works** |
| **Evidence** | Paste F scenario harness 1–4 PASS; `ProductSurface` person memory APIs |

### 6. Briefings

| | |
|--|--|
| **Entry** | Weekly briefing card / `GET …/intelligence/briefings?current=1` |
| **Steps** | Worker generates → owner channel → dismiss / open link |
| **Termination** | Dismissed or opened; “Nothing to open yet” when no link |
| **Status** | **works** |
| **Evidence** | Scenario 7 PASS; WeeklyBriefingWorker; DEAD_END briefing gates |

### 7. Search (web / venues)

| | |
|--|--|
| **Entry** | Conversational world lookup / Places facade / Brave |
| **Steps** | Intent → Brave or Places → results section in response |
| **Termination** | Real hits when keys LIVE; honest disabled without keys |
| **Status** | **works-but-fragile** (Places API_NOT_ENABLED until GCP enable; Brave LIVE) |
| **Evidence** | Key wire batch; `OpalCore.Search.Brave`; `OpalCore.Places` |

### 8. Bookings (solo)

| | |
|--|--|
| **Entry** | Plan execution / booking_request intent / Duffel search |
| **Steps** | Search offers (test mode) → authorize → execute gates |
| **Termination** | Test offers or honest disabled; no invented confirmation numbers |
| **Status** | **works-but-fragile** (Duffel LIVE test; live money / OpenTable not claimed) |
| **Evidence** | Duffel test verify; PlanExecution; SENSES_HANDS |

### 9. Wallet

| | |
|--|--|
| **Entry** | You hub wallet / checkout |
| **Steps** | Load gated by `OPAL_WALLET_LOADS_ENABLED`; spend/refund ledger |
| **Termination** | Honest gate when loads disabled; spend when funded |
| **Status** | **works** (loads gated by design; Stripe key wired) |
| **Evidence** | `StripeCheckout` gated; wallet tests green |

### 10. Artifacts (solo)

| | |
|--|--|
| **Entry** | Shareable artifact / trip itinerary generation |
| **Steps** | Build from seed facts → share token HTML |
| **Termination** | Share page; invent-nothing adversarial covered |
| **Status** | **works** |
| **Evidence** | `artifacts_test.exs` invent-nothing; `/share/artifacts/:token` |

### 11. Voice notes (solo TTS)

| | |
|--|--|
| **Entry** | `POST …/voice/speak` approved text; thread voice_transcript |
| **Steps** | ElevenLabs Matilda → AudioStore → signed share URL → `<audio>` |
| **Termination** | Playable MPEG in thread player |
| **Status** | **works** |
| **Evidence** | Matilda LIVE verify; `Message.to_contract` audio_url mint; `shots/audit/elevenlabs/` |

### 12. Settings

| | |
|--|--|
| **Entry** | You hub settings |
| **Steps** | Assistance prefs, quiet hours, notifications, maturity |
| **Termination** | Prefs persisted; quiet hours bind AttentionBudget |
| **Status** | **works-but-fragile** (surface coverage uneven) |
| **Evidence** | AssistancePreference; AttentionBudget tests; You hub |

### 13. Calendar connect (Google OAuth)

| | |
|--|--|
| **Entry** | Connect calendar / `POST …/connectors/google_calendar/start` |
| **Steps** | OAuth start URL → consent → callback → TokenVault store |
| **Termination** | Connector connected (readonly); freeBusy available |
| **Status** | **works-but-fragile** (client LIVE; founder consent walk not pressure-tested; write still out of scope) |
| **Evidence** | OAUTH LIVE start URL; `docs/GOOGLE_OAUTH_URIS.md`; TokenVault round-trip |

### 14. Contact picker (native)

| | |
|--|--|
| **Entry** | Native host bridge / ContactSuggestPicker |
| **Steps** | Permission → pick → resolve → persist |
| **Termination** | Contact attached or honest denial |
| **Status** | **works-but-fragile** (device permission) |
| **Evidence** | DEAD_END contacts denied gate; native host bridge |

---

## Capable-assistant parity (Phase 1)

| Capability | Today (code evidence) | Gap handling |
|------------|----------------------|--------------|
| Vague request → real plan | Center `OpalIntent` + `OpalPlanConfirm` → SharedPlan; needs a named peer (`:need_who` if none). Extractor `plan.propose` + clarify ≤2. | **Honest gate:** solo self-plan without “who” does not invent a peer. Memory-backed propose when facts exist. |
| Collects & organizes over time | `PersonMemory` / `TemporalAnchor` / SocialMemory ingest compounds across sessions (Paste F scenarios 1–4; MEMORY_LAYER_VERIFY). | **works** |
| Remembers across sessions | Cold-start maturity gates + established memory; `get_person_memory` returns durable facts. | **works** (week-4 “smarter” is maturity+facts; not a separate model). |
| Verifies own work (outbox) | Wallet / mediation / briefing dismiss already outboxed. Paste H closed gaps: `reminder.created`, `booking.confirmed`, `plan.created`/`plan.agreed`, `memory.fact_*`. | **fixed** in Phase 1 |
| Communicates when it can’t | Disabled booking/Places/wallet-load honesty; `:needs_clarification` for “whenever X free”; Extractor `may_commit?/2` blocks negation/hypotheticals. | **fixed** + existing honest gates |
| Multi-step without losing thread | SharedPlan statuses `tentative/agreed/changed/cancelled/completed`; interrupt resume covered by pressure P7. | **works-but-fragile** until P7 green |
| Proactive within bounds | `AttentionBudget` daily 5 + quiet hours + maturity; user reminders exempt by law. | **works** (pressure under load = P1/P10) |

### Honest gates (promised-but-not-overclaimed)

- Calendar **write** still opt-in / out of scope (read-only default).
- Places venue enrichment BLOCKED until GCP Places API enabled (founder).
- Wallet **loads** gated (`OPAL_WALLET_LOADS_ENABLED=false`) until legal unlock.
- Kafka **not needed** for single-user baseline (see REALTIME_AUDIT.md).
- True “plan alone with no person” does not create SharedPlan — asks who.

## Pressure surface (Phase 2)

Journeys marked **works-but-fragile** or **untested** are the primary P1–P10 targets.

## Summary scorecard

| Journey | Status |
|---------|--------|
| Onboarding | works |
| Adding people / contact picker | works-but-fragile |
| Planning (solo) | works-but-fragile |
| Reminders | works-but-fragile |
| Memory correct/remove | works |
| Briefings | works |
| Search | works-but-fragile |
| Bookings (solo) | works-but-fragile |
| Wallet | works |
| Artifacts (solo) | works |
| Voice notes (solo) | works |
| Settings | works-but-fragile |
| Calendar connect | works-but-fragile |
