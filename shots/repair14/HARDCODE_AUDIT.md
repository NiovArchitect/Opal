# Repair #14 — Hardcoded-Values Audit

Question from the founder: are there values hardcoded for ONE user (the founder) that are
meant to be dynamic for all users? **Answer: yes — there were. All user-facing ones found
are remediated below.** Full remediation detail: `HARDCODE_REMEDIATION.md` (Track B record).

Method: targeted fixes for 6 verified hits (H1–H6), then a sweep of prod source
(`apps/opal_core/lib`, `apps/opal_web/src`, `apps/opal_mobile/src`, `services/opal_ai`)
for founder-circle names (Maya, Jordan, Chanelle, Alex, Sabrina, Nina, Taylor, Riley,
Sam, Sadeil), signature venues, phone numbers, and addresses.

## Remediated — the 6 named hits

| ID | Location | Was | Now |
|---|---|---|---|
| H1 | `extractor.ex` `extract_person/1` | hardcoded `[{Maya},{Jordan},{Chanelle},{Alex}]` — extraction only worked for the founder's circle | resolves against the speaking user's contacts (`contacts_with_types/1`) + generic grammar candidates |
| H2 | `extractor.ex` `extract_place/1` | hardcoded 7 venues (~w(Juniper Pujol Contramar Quintonil Rosetta Soumaya Teotihuacan)) | generic venue-candidate extraction; resolution in the real Places/Geoapify pipeline |
| H3 | `OpalApp.tsx` ~8486 | empty fast-path fell back to 9 fabricated people with founder avatars — new users saw the founder's friends | only real people passed; honest empty state ("No people here yet…") |
| H4 | `trips.ex` ~1005 (+~1069) | template notes "Chanelle-energy market morning." / "Alex photography track…" / "Maya track…" | generic copy ("Big-energy market morning — go hungry." etc.) |
| H5 | `economic_qualification.ex:191` | `forbidden_creator_copy` "Jordan booked with Chanelle Thursday at 7." | "Guest A booked with Guest B Thursday at 7." |
| H6 | `attribution_entitlement.ex` moduledoc | "Chanelle's Moment…" doc example | "A creator's Moment…" |

## Remediated — sweep hits beyond the named items

| Location | Was | Now |
|---|---|---|
| `action_orchestrator.ex` `recall_prior_copy/2` | `\bmaya\b` trigger + `"Maya"` label fallback | fires on the plan's own person + birthday topic, any user |
| `meaning.ex` + `conversation_meaning.py` (Python mirror) | "Jordan asked whether you are still coming." / "Jordan said the message felt dismissive." | "They asked…" / "They said…" |
| `journey_authority.ex` | fabricated fallbacks `location \|\| "Juniper & Ivy"`, `time_label \|\| "Saturday · 7:30 PM"` | dropped (columns nullable, eligibility nil-safe) |
| `provider_vertical.ex` | `"who" \|\| "Jordan"`, `"jordan-1"` id, `leave_copy(…, "dinner with Jordan")` | `"friend"`, `"conv-1"`, `"dinner"` (real bridge passes who/id explicitly) |
| `onboarding_copy.ex` | LLM instruction example "(Got Maya.)" | "(e.g. "Got it — added them.")" |
| `CallSurfaces.tsx` | `DEFAULT_GROUP_PARTICIPANTS = ["Sadeil","Chanelle","Maya","Jordan"]` | `["You","Guest 1","Guest 2","Guest 3"]` |
| OpalApp curate handler | inline `\|\| "Juniper & Ivy"` / `"Little Italy"` fallback places | removed — no candidate, no fabricated place draft |

## Reviewed, not changed (dispositions)

- **Deepgram "Juniper" stub** — test-only; left per instructions.
- **Founder seed modules** — config-gated (`allow_founder_communication_seed` default
  false; web `isFounderSeedEnabled()`-gated). Demo tooling, off by default, not product logic.
- **Labeled fixture/catalog boundaries** — `real_world/place/catalog.ex`,
  `candidate_provider.ex`, `venue_lookup.ex` demo path, web `placeComposition.ts`
  `DEFAULT_FIXTURE`, AvailabilityReview fixtures, `SEED_TIMELINE_ITEMS`
  (production-excluded by graphsHydration), `product_shell` synthetic journey helpers.
  Explicitly labeled as fixtures; not presented as real user data.
- **Test-only mocks** — `PERSON_MEMORY_MOCK`, `REMINDER_MOCK_SEED`, all `*.test.*` files.
- **Mobile synthetic shell** — `SYNTHETIC.*`/`DEMO_*` defaults, mock contacts bridge with
  555 numbers. Placeholder shell data, labeled synthetic.
- **`data.ts`** — legacy static data, replaced by hydration at runtime.
- **Doc/comment/LLM-prompt sample names** — Alice/Bob-style examples; no runtime effect.
- **Phone numbers / addresses** — no real ones exist in prod source (only `+1 202 555 01xx`
  placeholders and generic LAN-IP logic).

## Filed open (needs a bigger decision — see FAILURE_LEDGER F14-14..17)

- `conversation_alignment.ex` `canonical_from_text/1`: only Juniper & Ivy / Herb & Wood /
  Fort Oak recognized as canonical places — load-bearing at 6 call sites in the alignment
  state machine; genericizing redefines place-lock semantics (R15-scale).
- `FirstRunExperience`/`firstRunCopy`: founder's first name "Sadeil" as the illustrated
  user persona (design-frozen demo illustration).
- `DatedConversationContent.tsx`: dead component, no callers (dead-code pass).
- OpalApp call-continuity seed-keyed literals inside the founder-seed wiring (gated, off
  by default).
