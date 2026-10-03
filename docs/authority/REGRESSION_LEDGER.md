# WHOLE-APP REGRESSION LEDGER

**Status:** CURRENT — every founder-discovered class must appear here  
**Synced:** whole-application coherence recovery 2026-10-02

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
| Phone Graphs showed All/Action/Ready only (no Past) while handoff claimed Past | **RED** — runtime/report contradiction |
| Chats Walk A preview `shell-geo unread 1791002354775` | **RED** — reseeded by mobile_shell_geometry_proof after fixture reset |
| Thread oversized cyan Find a time on historical Fort Oak | **RED** |
| Graph Detail “Travel time unavailable” / North Park for past Fort Oak | **RED** — travel foreground + wrong place identity (real: Mission Hills / 1011 Fort Stockton Dr) |

## P0 status (recovery)

| ID | Symptom | Status |
|----|---------|--------|
| R-PAST-NT | Fort Oak Sep 29 still Next Together on Oct 2 | **CODE_GREEN** — PlanStateArbitration + client gates; E2E `coherence_recovery_e2e.mjs` |
| R-PAST-READY | Graph Ready for past plan | **CODE_GREEN** — upcoming_ready / planSurfaceState past |
| R-PAST-EXEC | Execution approval live for past plan | **CODE_GREEN** — reservation_authorizable gated; E2E approve=0 |
| R-LAYER-COLLAPSE | Plan set + Your approval without distinction | **PARTIAL** — server prompt distinguishes reservation; physical confirm pending |
| R-GRAPH-CLIP | Status pills clip right edge | **CODE_GREEN claimed** — CSS bounds; physical confirm pending |
| R-TEST-RESIDUE | shell-geo / P046gate / lab calls visible | **IN PROGRESS** — DB reset deleted shell-geo; shell proof must stop permanent Fort Oak pollution |
| R-MEM-PRIV | Published Memory from Opal Graph on Home | **PARTIAL** — demo auto-publish stopped; audit doc; physical confirm pending |
| R-PAST-FILTER | Past chip missing on phone | **IN PROGRESS** — dirty WT has Past; must prove served runtime + mobile visibility |
| R-PAST-PROMINENT | Fort Oak first in Graphs All | **IN PROGRESS** — demote past in All ranking |
| R-PAST-TRAVEL | Travel card on past detail | **IN PROGRESS** |
| R-DEST-ID | Fort Oak · North Park / no coords | **IN PROGRESS** — PlaceIdentity provider resolution |
| R-RUNTIME-PROV | HEAD SHA alone ≠ served dirty code | **IN PROGRESS** |

Physical iPhone still authoritative for FOUNDER_GREEN. A8_COMMIT=NO. FOUNDER_WALK=HOLD until SERVED_RUNTIME_PROVEN + fixture clean + past demoted + destination resolved.
