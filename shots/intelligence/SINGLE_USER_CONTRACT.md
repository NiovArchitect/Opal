# Paste H — Single-User Contract

**Branch:** `muse/packet-b-batch-2`  
**Date:** 2026-10-09  
**Law:** If it is not in this document and backed by a passing test, it is not part of the single-user baseline. Multi-user choreography is held until this contract holds.

## Promise (plain language)

One human, using Opal alone, can:

1. **Onboard** through Holy Shit / OTP / Meet Opal into the member shell.  
   *Test:* product activation + Holy Shit evidence; journey inventory §1.

2. **Add people** via contact resolve / invite (selected contact only — never bulk address book).  
   *Test:* NE-1 / contacts resolve; inventory §2.

3. **Plan** (with a named person when a SharedPlan is required) through Center / conversation → tentative SharedPlan; flip-flops supersede without ghost duplicates.  
   *Test:* `pressure_harness_test` P2, P7; `OpalPlanConfirm` honesty on `:need_who`.

4. **Set reminders** (“remind me…”) including relative minutes, Christmas, weekly Tuesday; vague “whenever X is free” asks for clarification.  
   *Test:* P5; `RemindersTest`; outbox `reminder.created`.

5. **View, correct, and remove memory** — corrections propagate; archives stay out of prompts; audit via outbox `memory.fact_*`.  
   *Test:* Paste F scenarios 1–4; P9.

6. **Receive briefings** within AttentionBudget (daily 5 counting slots; quiet hours; user reminders exempt).  
   *Test:* scenario 7; `attention_budget_test`.

7. **Search / enrich** when providers are LIVE; honest disable when not (Places BLOCKED until GCP enable).  
   *Test:* SENSES_HANDS_VERIFY; inventory §7.

8. **Book (test mode)** without invented confirmation numbers; booking confirm writes `booking.confirmed` outbox.  
   *Test:* Bookings service + Phase 1 outbox; inventory §8.

9. **Use wallet** (spend/refund ledger; loads gated until legal unlock).  
   *Test:* wallet outbox pattern; inventory §9.

10. **Share artifacts** without inventing facts.  
    *Test:* `artifacts_test` invent-nothing.

11. **Speak voice notes** (ElevenLabs Matilda free-tier) with playable `audio_url`.  
    *Test:* voice speak + Message.to_contract; elevenlabs evidence.

12. **Connect Google Calendar read-only** (write remains opt-in / out of scope).  
    *Test:* OAuth start LIVE; inventory §13.

13. **Survive extreme human use** without 500s, lost data, invented facts, or duplicate side-effects.  
    *Test:* P1–P10 all PASS (`PRESSURE_VERIFY.json`).

14. **Extract messy conversation** at ≥90% precision on people/times/intents; adversarial inputs produce **zero** false commitments.  
    *Test:* `EXTRACTION_VERIFY.json` (50 messy + 10 adversarial).

15. **Trust realtime pipes** — reconnect refetch is truth; user-facing completions go through transactional outbox; Kafka not required for single-user.  
    *Test:* P8; `REALTIME_AUDIT.md`; `event_driven_test`.

## Explicitly NOT in baseline

- Multi-account choreography (held Phase 4 multi-user)
- Calendar write without opt-in
- Places LIVE venue enrichment (founder GCP enable)
- Wallet card loads (legal gate)
- Production Kafka (not needed until second-service / multi-region criteria)
- Card-on-file / crypto

## Evidence bundle

| Artifact | Path |
|----------|------|
| Journey inventory | `shots/audit/SINGLE_USER_INVENTORY.md` |
| Pressure verify | `shots/intelligence/PRESSURE_VERIFY.json` |
| Realtime audit | `shots/audit/REALTIME_AUDIT.md` |
| Extraction verify | `shots/intelligence/EXTRACTION_VERIFY.json` |
| Extraction corpus | `shots/intelligence/extraction_corpus.json` |
| This contract | `shots/intelligence/SINGLE_USER_CONTRACT.md` |

## Permanent suite hooks

```bash
cd apps/opal_core
mix test test/opal_core/intelligence/pressure_harness_test.exs
mix test test/opal_core/intelligence/extraction_pressure_test.exs
mix test test/opal_core/intelligence/scenario_harness_test.exs
mix test test/opal_core/intelligence/
```
