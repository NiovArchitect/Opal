# Micro-Journey Compatibility — Social Flow 3

**Authority:** EVIDENCE  
**Related product truth:** `docs/product/OPAL_MICRO_JOURNEY_MODEL.md`

---

## Definition

A micro-journey is a bounded social objective: trigger → objective → authority → uncertainty → next action → completion → optional calm reward → continuation.

Long journeys (trips, birthdays, conflict repair) are compositions of micro-journeys — not a single giant workflow.

---

## Long-journey example (synthetic): Romantic weekend trip

| # | Micro-journey | Status model | SF mapping | User signal level |
|---|---------------|--------------|------------|-------------------|
| 1 | Explore interest | emerging → settled | Conversation turns | L1 if useful |
| 2 | Choose dates | active → completed | Plan options / agreement (SF-1) | L3 |
| 3 | Choose destination | active | Future | L2–L3 |
| 4 | Budget (often private) | private prep | Private memory/reminder (SF-2) | L1 private |
| 5 | Book hotel commitment | waiting_on_user | Follow-through (SF-2) | L2 |
| 6 | Clarify ambiguous “whatever you want” | active | Ambiguity insight (SF-3) | L1–L2 private |
| 7 | Answer dual questions (pickup + reservation) | partially_answered → resolved | Open loop (SF-3) | L2 private |
| 8 | Pre-send clarity before harsh reply | proposed → resolved | Pre-send insight (SF-3) | L2 private |
| 9 | Impact repair after “felt dismissive” | active | Repair insight (SF-3) | L2 private |
| 10 | “What did we decide?” | settled summary | Decision summary (SF-3) | L1–L2 private |
| 11 | Shared “reservation booked” | completed | Shared completion (SF-2) | L3 |
| 12 | Final readiness | settled | Future journey rollup | L4 rare |

SF-3 implements meaning/repair micro-types; plan/follow-through remain SF-1/2.

---

## Micro-journey states (compatibility)

detected · proposed · active · waiting_on_user · waiting_on_other · blocked · resolved · completed · dismissed · superseded · cancelled · expired

SF-3 `ConversationInsight.status` and `OpenLoop.status` are compatible subsets.

---

## Signal policy

| Transition class | Policy |
|------------------|--------|
| Meaningful social progress | Visible if useful (L2–L3) |
| System housekeeping | Invisible (L0) |
| Private prep | Owner only |
| Partner commercial | **Not in SF-3** |

---

## Reward-intensity policy

Levels 0–4 as in product model. SF-3 uses L0–L2 primarily; L3 only for shared agreement/shared completion from prior slices; L4 not implemented.

---

## Journey compression

Traditional multi-app path (chat + calendar + notes + email) → Opal conversation-native transitions. Consent, privacy, and clarity preserved; no forced compression of emotional pacing.

---

## Next-best-social-action rule

Smallest helpful action or leave-it-alone. Never “open the app for points.”

---

## Emotional pacing

Repair and ambiguity allow dismiss/continue without punishment. No premature “relationship fixed” claims.

---

## Privacy

Private insights/drafts never leak to peer. Shared signals only for shared social objects.

---

## Future partner boundary

Documented only; zero commercial events in SF-3.

---

## Implementation scope (this slice)

| In | Out |
|----|-----|
| Meaning micro-journeys A–E | Full SocialJourney table engine |
| Mapping to model | Partner APIs |
| Reward policy docs + tests for calm copy | Streaks, scores, confetti |

---

## Deferred

- Persistent SocialJourney aggregate table  
- Partner recommendations  
- L4 trip-ready orchestration UI  
- Multi-device journey ownership transfer UX details  
