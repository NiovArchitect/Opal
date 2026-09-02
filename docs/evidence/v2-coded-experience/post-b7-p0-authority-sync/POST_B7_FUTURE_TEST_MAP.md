# POST-B7 Future Test Map

**Pass:** P0 — map only. Tests are **not** required to pass yet for unpromoted proposals.  
**Do not** rewrite B1–B7 historical proofs.

---

## P1 — Objective defects (must become executable)

| Test ID | Asserts | Suggested home |
|---------|---------|----------------|
| `call_outgoing_never_shows_answer_decline` | Place-call → outgoing dialing/ringing; no Answer | CallSurfaces + browser prove |
| `call_incoming_only_answer_decline` | Incoming ringing shows Answer/Decline | Existing call proves extended |
| `call_no_overlapping_state_copy` | Exactly one state title cluster visible | Browser DOM assert |
| `call_leave_does_not_leave_group` | End group call → still in group | Domain + UI |
| `spine_node_centers_aligned` | Spine x == node center; spine z behind | CSS/geometry prove |
| `destination_stage_origin_stable` | Open Graph Detail/Journey/Call/Opal — stage origin unchanged | Shell geometry prove |

---

## P2 — Calls continuity (after `928:3` promotion)

| Test ID | Asserts |
|---------|---------|
| `calls_row_metadata_without_fake_consequence` | No consequence when none earned |
| `calls_row_earned_consequence_open_graph` | Confirmed consequence → Open Graph → same Reality |
| `calls_provider_opal_not_user_call_row` | Opal-handled provider → Graph outcome, not user Calls row |
| `calls_chats_mode_switch` | Chats↔Calls mode; dock Chats-active per proposal |
| `assist_no_fabricated_transcript` | Without consent/capability → DEPENDENCY truth |

---

## P3 — Signal grammar (after `965:2` promotion)

| Test ID | Asserts |
|---------|---------|
| `signal_gold_requires_shared_truth` | Gold never from inference alone |
| `signal_lifecycle_ack_stops_motion` | After ack, no perpetual pulse |
| `interruption_budget_level_0_silent` | No consequence → zero signal/sound/haptic |
| `private_inference_never_color_justified` | No private budget string as colorful signal |

---

## P4 — Decision intelligence (after `975:2` promotion)

| Test ID | Asserts |
|---------|---------|
| `curate_not_a_nav_tab` | No new dock destination named Curate |
| `high_confidence_one_best_fit` | One candidate + safe reason + one CTA |
| `medium_confidence_one_question` | Exactly one question; known WHO/WHEN/WHERE preserved |
| `hard_constraints_never_silently_dropped` | Conflict surfaced, not averaged away |
| `solo_no_group_prerequisite` | Solo path without invite |
| `same_reality_handoff` | Selection mutates existing Graph — no OpalPlan/Graph2 |
| `delegation_act_requires_scope` | ACT blocked without capability/consent/spend |
| `group_output_share_safe` | No “Maya under $35” in group UI |

---

## Permanent guards (already exist — keep)

| Guard | Script / schema |
|-------|-----------------|
| Formal ≤0.12 | `OPAL_PROOF_SCHEMA.yaml` |
| Global Opal MODE A | `prove_b6_guards` / `prove_b53_integrity` |
| Home top-844 | `prove_b6_guards` |
| Create 863 not 149:31 | `opal-authority-check` |
| Activity FOUNDER_REVIEW | Authority YAML + runtime attrs |
| No duplicate domains | Authority forbidden list |

---

## Historical immutability

```
DO_NOT_MUTATE_B1_B7_PROOF_JSON = YES
NEW_PROOFS_GET_NEW_PACKAGES = YES
```
