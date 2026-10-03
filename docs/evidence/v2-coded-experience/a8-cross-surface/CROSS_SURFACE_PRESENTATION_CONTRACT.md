# Track A8 — Cross-Surface Presentation Contract

**FOUNDATIONAL LAW:** ONE TRUTH. ONE CANONICAL ACTION. MULTIPLE COHERENT PROJECTIONS. NO DUPLICATE PRESSURE.

Owner: `OpalCore.SocialFlow.SurfaceProjection`  
Does not own SharedPlan, ConversationAlignment, or AttentionAuthority. Does not create a second action implementation.

## Semantic state → surface treatment

| Semantic state | Role / condition | Thread | Attention | Graph detail | Graph list | Chats | Home | Banner | Prominent action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| TIME_PROPOSAL_PENDING | RESPONDER | **action** (Accept / Keep) | review_link → canonical proposal | pending_status (`8:00 PM proposed`) | compact_status | compact_consequence (`8:00 PM proposed`) | **none** (default); quiet_status only if `home_relevance` | suppress if active thread or muted; else allow | **1** (thread owns CTA) |
| TIME_PROPOSAL_PENDING | PROPOSER | waiting_status | waiting | pending_status | compact_status | compact_consequence | none / quiet | **suppress** | **0** (no approval CTA) |
| RESERVATION_AUTH | blocked by pending proposal / `upstream_unsettled` / `pending_change` | proposal owns action; reservation CTA suppressed | review/waiting on **proposal**, not auth | pending_status (proposal) | compact | compact (proposal label) | none / quiet | suppress | prominent is **not** reservation; `downstream_suppressed: [reservation_auth]` |
| PROVIDER_FAILURE | required actor | action if conversation owns it; else none | review_link | execution_failed | compact | compact_consequence (no giant failure card) | none unless home_relevance | suppress if active/mute | 1 when actor owns repair |
| COMMITMENT_DUE | commitment_owner | none (no duplicate action card) | review_link | commitment_visible | compact | compact / none (no action card) | relevant **only** if home_relevance | suppress if active/mute | 1 via attention → graph |
| RECOMMENDATION | any | none | none | current_only | compact | none | none | suppress | 0 — no cross-surface spam |
| MUTED + pending proposal | responder | action still available in thread | review_link (truth preserved) | pending_status | compact | compact | **none** (must not recreate interruption) | **suppress** | 1 in thread; home_bypasses_mute_attention = false |
| ACTIVE_THREAD + pending proposal | responder | **action** (canonical) | review_link | pending_status | compact | compact | none / quiet | **suppress** (no duplicate banner) | 1; active_context_duplicate_action = false |

## Law zeros (always false)

| Law | Meaning |
| --- | --- |
| `MULTIPLE_CANONICAL_ACTION_IMPLEMENTATIONS` | One Accept/Keep / auth path — not reimplemented per surface |
| `ACTIVE_CONTEXT_DUPLICATE_ACTION` | Open thread does not also banner the same CTA |
| `PROPOSER_CROSS_SURFACE_ACTION_CTA` | Proposer never gets an approval prompt on any surface |
| `DOWNSTREAM_ACTION_COMPETES_WITH_UNSETTLED_UPSTREAM` | Reservation auth never competes with pending time proposal |
| `RECOMMENDATION_CROSS_SURFACE_SPAM` | Recommendations stay silent across surfaces by default |
| `EVERY_ATTENTION_ITEM_APPEARS_ON_HOME` | Attention ≠ Home dump |
| `HOME_BYPASSES_MUTE_ATTENTION` | Mute suppresses interruption on Home too |
| `BANNER_WHILE_CANONICAL_ACTION_VISIBLE` | No banner when the user is already on the action surface |
| `DISMISS_BANNER_RESOLVES_ACTION` | Dismissing a banner never resolves the underlying action |

## Projection vocabulary

| Surface key | Allowed treatments |
| --- | --- |
| `thread` | `action` \| `waiting_status` \| `settled` \| `none` |
| `attention` | `review_link` \| `waiting` \| `updated` \| `none` |
| `graph_detail` | `pending_status` \| `current_only` \| `execution_failed` \| `commitment_visible` |
| `graph_list` | `compact_status` |
| `chats` | `compact_consequence` \| `none` |
| `home` | `none` \| `quiet_status` \| `relevant` |
| `banner` | `allow` \| `suppress` |

## Notes

- Attention Center remains the For-you / Waiting / Updated projection of AttentionAuthority; SurfaceProjection decides **coherence across** thread, graph, chats, home, and banner.
- Canonical action target for TIME_PROPOSAL_PENDING is always the thread change-proposal focus (`Accept change` / `Keep current`).
- Home may show quiet status for a pending proposal only when explicitly `home_relevance: true` and not muted — never a second action CTA.

## Next (not this tranche)

**CURRENT PRIORITY = mobile shell.** After physical shell GREEN + A8 commit, next authority is Conversation State Orchestration (per-strand / per-participant UI mode) — **before** Journey intelligence. Document only; do not implement now.

- Pointer: `docs/evidence/v2-coded-experience/a8-cross-surface/NEXT_CONVERSATION_STATE_ORCHESTRATION.md`
- Authority: `docs/authority/CONVERSATION_STATE_ORCHESTRATION.md`
