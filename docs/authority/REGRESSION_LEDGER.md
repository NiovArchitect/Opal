# WHOLE-APP REGRESSION LEDGER

**Status:** CURRENT — every founder-discovered class must appear here  
**Synced:** physical-contradiction recovery 2026-10-03

```yaml
authority_class: REGRESSION_LEDGER
real_device_can_block_commit: true
```

## Required regression classes

| ID | Class | Required zero / assert | Owner / proof |
|----|-------|------------------------|---------------|
| R-MOBILE-OVERFLOW | mobile overflow | HORIZONTAL_OVERFLOW=0 | mobile_shell_geometry_proof |
| R-DOCK-COLLISION | content behind dock | DOCK_COLLISION=0 | mobile_shell_geometry_proof |
| R-GRAPH-SCROLL | Graph scroll reachability | last row reachable | mobile_shell + graphs |
| R-GRAPH-CLIP | Graph right clipping | GRAPH_STATUS_PILL_CLIPPED=0 | CSS + geometry proof |
| R-NT-COLLISION | Next Together collision | no sticky/text bleed | thread layout |
| R-ATTN-BADGE | Attention badge physical visibility | readable digit | a61 proof |
| R-ATTN-DEEPLINK | Attention deep-link | opens Accept/Keep | a61 proof |
| R-VIEW-RESOLVE | view ≠ resolve | badge survives open/seen | a61 proof |
| R-UNREAD-CANON | unread badge canonicality | HARDCODED_9_PLUS=0; matches server | dockUnreadDisplay + hygiene |
| R-TEST-RESIDUE | test residue isolation | TEST_ARTIFACT_VISIBLE_IN_FOUNDER_UI=0 | fixture reset + hygiene |
| R-PAST-NT | past plan Next Together exclusion | PAST_PLAN_AS_NEXT_TOGETHER=0 | temporal arbitration + time-travel |
| R-PAST-READY | past plan Ready exclusion | PAST_PLAN_AS_UPCOMING_READY=0 | temporal + graph list |
| R-PAST-EXEC | past plan execution exclusion | PAST_PLAN_FUTURE_EXECUTION_CTA=0 | temporal + SurfaceProjection |
| R-CUR-PEND | current vs pending | proposal vs committed distinct | A8 / ConversationAlignment |
| R-EXEC-VER | execution plan-version validity | stale auth blocked | A3 PlanExecution |
| R-PROP-RESP | proposer/responder divergence | PROPOSER_GETS_APPROVAL_PROMPT=0 | Attention + A8 |
| R-MUTE | mute | mute suppresses interrupt not truth | AttentionAuthority |
| R-ATTN-DEDUPE | Attention dedupe | one identity coalesce | AttentionAuthority |
| R-TEMP-SUPER | temporal supersession | superseded not actionable | TemporalFollowThrough |
| R-XSURFACE | cross-surface convergence | one canonical action | a8_cross_surface_proof |
| R-MEM-PRIV | memory privacy | PRIVATE_MEMORY_RENDERED_AS_SOCIAL_POST=0 | memory audit + tests |
| R-CALL-HIST | call history semantics | genuine vs lab residue | Track B isolation |
| R-CALL-B | call Track B isolation | CALL_TRANSPORT_COMMIT=NO in Track A | untracked call* |
| R-STATE-THRASH | state-thrash protection | casual msg ≠ erase unresolved | CSO hysteresis |
| R-IMPOSSIBLE | impossible state combinations | see PRODUCT_INVARIANTS | conversation_state suite |
| R-TIME-TRAVEL | Fort Oak clock matrix | Sep28/29/30/Oct2 lifecycle | injectable Clock |
| R-FOUNDER-E2E | founder-fixture E2E | same truth across surfaces | founder fixture automation |
| R-PAST-PROMINENT | past demoted on current surfaces | PAST_IS_ACCESSIBLE_NOT_PROMINENT; Fort Oak not first/Ready/Action | GraphsHome rank + surface relevance |
| R-PAST-FILTER | Graphs Past filter served | PAST_FILTER_VISIBLE on mobile native host | GraphsHome + screenshot contract |
| R-PAST-TRAVEL | past Graph Detail travel noise | PAST_DETAIL_FOREGROUNDS_CURRENT_TRAVEL=0 | GraphDetailSheet |
| R-FIND-TIME-PAST | Find a time dominant on past strand | PAST_STRAND_FIND_A_TIME_DOMINANT=0 | OpalApp / CSO |
| R-DEST-ID | destination identity unresolved | KNOWN_REAL_PLACE_STAYS_UNRESOLVED_WITHOUT_ATTEMPT=0 | PlaceIdentity + provider |
| R-RUNTIME-PROV | founder URL unknown runtime | FOUNDER_TESTS_UNKNOWN_RUNTIME=0 | /api/dev/runtime-authority |
| R-SHELL-GEO | shell-geo residue on Fort Oak | TEST_ARTIFACT_VISIBLE_IN_FOUNDER_UI=0 | fixture reset + shell proof cleanup |

## Founder physical evidence 2026-10-02 (authoritative contradiction)

| Evidence | Status |
|----------|--------|
| Phone Graphs showed All/Action/Ready only (no Past) while handoff claimed Past | **WAS RED** → automation GREEN via served Past filter + runtime provenance (`physical_contradiction_contract.mjs`, 5+ loops) |
| Chats Walk A preview `shell-geo unread 1791002354775` | **WAS RED** → shell-geo deleted; Walk A/B detached from automation convos; UI residue filter |
| Thread oversized cyan Find a time on historical Fort Oak | **WAS RED** → past strand Find-a-time suppressed |
| Graph Detail “Travel time unavailable” / North Park for past Fort Oak | **WAS RED** → past travel card suppressed; PlaceIdentity → Mission Hills / 1011 Fort Stockton Dr |

## P0 status (recovery)

| ID | Symptom | Status |
|----|---------|--------|
| R-PAST-NT | Fort Oak Sep 29 still Next Together on Oct 2 | **AUTOMATION_GREEN** — PlanStateArbitration + client gates |
| R-PAST-READY | Graph Ready for past plan | **AUTOMATION_GREEN** |
| R-PAST-EXEC | Execution approval live for past plan | **AUTOMATION_GREEN** |
| R-LAYER-COLLAPSE | Plan set + Your approval without distinction | **PARTIAL** — physical confirm pending |
| R-GRAPH-CLIP | Status pills clip right edge | **AUTOMATION_GREEN claimed** — physical confirm pending |
| R-TEST-RESIDUE | shell-geo / P046gate / lab calls visible | **AUTOMATION_GREEN** — DB detach + client filter; FOUNDER_FIXTURE_RESET_DB=1 |
| R-MEM-PRIV | Published Memory from Opal Graph on Home | **PARTIAL** — physical confirm pending |
| R-PAST-FILTER | Past chip missing on phone | **AUTOMATION_GREEN** — Past visible 390/393/430; SERVED_RUNTIME_PROVEN |
| R-PAST-PROMINENT | Fort Oak first in Graphs All | **AUTOMATION_GREEN** — past ranks last; Past lens |
| R-PAST-TRAVEL | Travel card on past detail | **AUTOMATION_GREEN** |
| R-DEST-ID | Fort Oak · North Park / no coords | **AUTOMATION_GREEN** — PlaceIdentity Mission Hills + coords |
| R-RUNTIME-PROV | HEAD SHA alone ≠ served dirty code | **AUTOMATION_GREEN** — `/api/dev/runtime-authority` + `__opalRuntimeAuthority` |

Physical iPhone remains authoritative for FOUNDER_GREEN. A8_COMMIT=NO / MERGE=NO / LIVE=NO. One founder walk only after SERVED_RUNTIME_PROVEN on the handed URL.
