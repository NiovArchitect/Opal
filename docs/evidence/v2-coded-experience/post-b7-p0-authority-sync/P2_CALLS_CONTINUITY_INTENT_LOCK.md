# P2 Intent Lock — Calls / Communication Continuity

**Date:** 2026-09-01  
**Starting HEAD:** `51daee175ee904e8a03b7c6f59346a06d51ba20c`  
**Authorization:** Founder GO for **P2 only**. P3 = HOLD. P4 = HOLD.  
**HOLD / DO NOT MERGE / NO LIVE / permissionToStartLive = NO / FOUNDER_ACCEPTED = NO**

## Local phase definitions (resolved before product edits)

| Phase | Local ID | Scope | Status |
|-------|----------|-------|--------|
| **P2** | `POST_B7_P2_CALLS_CONTINUITY` | Calls / Communication Continuity vs CURRENT `928:3` | **GO** |
| **P3** | `POST_B7_P3_SIGNAL_GRAMMAR` | Signal Grammar audit/apply vs CURRENT `965:2` | **HOLD** |
| **P4** | `POST_B7_P4_DECISION_INTELLIGENCE` | Decision Intelligence / curation visuals vs CURRENT stack | **HOLD** |

**Sources:** `OPAL_CURRENT_AUTHORITY.yaml` `authorized_sequence` · `POST_B7_IMPLEMENTATION_TOUCHPOINT_MAP.md` · `POST_B7_FUTURE_TEST_MAP.md` · `CALLS_COMMUNICATION_CONTINUITY.md`

**Conflict with closed authority stack?** **NO.** P2 was always “after `928:3` promotion”; `CALLS_CONTINUITY_AUTHORITY = CURRENT`.

**Note:** `OPAL_CURATION_STATE_MAP.md` does **not** exist locally; curation statuses live in `OPAL_CURRENT_AUTHORITY.yaml` + `OPAL_DECISION_INTELLIGENCE.md` + promotion ledgers. Calls doc path is `CALLS_COMMUNICATION_CONTINUITY.md` (not `OPAL_COMMUNICATION_CONTINUITY.md`).

## P2 in scope

1. **Calls Home** — relationship-first list (not transaction log)  
2. Subtitle: **“The people you've been calling.”**  
3. Filters: All / Missed (minimum)  
4. **One earned signal slot** per relationship row (zero valid)  
5. Chats ↔ Calls mode switch on existing communication owner (no CallGraph)  
6. New Call / quick callback entry points extending existing call actions  
7. Provider/Opal-handled outcomes stay on Graph/Journey — **not** fake user Calls rows  
8. Outgoing≠Incoming state machine preserved (P1)

## P2 out of scope

- P3 Signal Grammar recolor / interruption budget system  
- P4 Decision Intelligence / Curate-for-me visuals (`979:*` / `988:*`)  
- New domains: CallGraph, OpalPlan, Graph2, etc.  
- Merge / Live / FOUNDER_ACCEPTED

## Owners to extend (not replace)

- `ChatsHome.tsx` / communication tab  
- `CallSurfaces.tsx`  
- `OpalApp.tsx` routing  
- Graph/Journey for consequence handoff only  

## Proof targets (from FUTURE_TEST_MAP)

- `calls_row_metadata_without_fake_consequence`  
- `calls_row_earned_consequence_open_graph`  
- `calls_provider_opal_not_user_call_row`  
- `calls_chats_mode_switch`  
- `assist_no_fabricated_transcript` (dependency truth if touched)

## Stop condition

On P2 complete: **PROVE → COMMIT → FOUNDER VERIFY → STOP.**  
Do **not** auto-start P3.
