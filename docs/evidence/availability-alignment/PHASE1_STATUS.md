# Availability Alignment Phase 1 — status

**Branch:** `build/relationship-availability-alignment`  
**Worktree:** `opal-availability-alignment`  
**Base:** `origin/main` @ post-PR #61  
**Scope:** **additive** SocialFlow capability — not a product makeover  

## Standing rule

Opal remains conversation-first. Availability is one more alignment signal.  
Existing Set authority, Real People, signals, invitations, shells, and moments are unchanged.

## Implemented

| Layer | Status |
|-------|--------|
| Product truth (additive) | `OPAL_RELATIONSHIP_ALIGNMENT.md` + product truth pointer |
| Architecture | `AVAILABILITY_ALIGNMENT_ENGINE.md`, location interface doc |
| Schema | `availability_windows`, `availability_shares` (separate from SF4 grants) |
| Domain | `OpalCore.SocialFlow.Availability` |
| HTTP | conversation-nested share/overlap + private windows |
| Realtime | `availability:shared` / `availability:revoked` shared-safe only |
| Tests | 15 domain+HTTP tests, all green locally |
| Web client | productClient helpers only — **no shell redesign** |

## Explicit non-changes

- No Home / Chats / Plans / You restructure  
- No Availability tab  
- No parallel Set  
- No calendar OAuth  
- No location learning  
- No Twilio  
- Conversations valid with zero availability rows  

## Test matrix (Phase 1)

See `availability_alignment_test.exs` + `availability_api_test.exs`.

## Next

1. Minimal conversation-scoped **Find a time** Opal-moment UI (Controlled Technicolor language).  
2. Claude independent review: privacy / pressure / projection.  
3. CI on branch.  
4. Hold deploy until slice is independently coherent.  
