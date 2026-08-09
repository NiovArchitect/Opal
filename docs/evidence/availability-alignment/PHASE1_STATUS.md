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
| Authority | Soft rate limits; share idempotent; `authorizes_set?/1 == false` |
| HTTP | conversation-nested share/overlap + private windows |
| Realtime | `availability:shared` / `availability:revoked` shared-safe only |
| Tests | 24 availability-focused + full Elixir **318 / 0** |
| Web client | productClient helpers only — **no shell redesign** |
| Find-a-time presentation | **hold** for Claude handoff |

## Hardening complete (parallel to Claude design)

- Lifecycle: update / delete / revoke (+ wrong-conversation forbid)  
- Block empties overlap / blocks new share  
- DST-boundary UTC intersection pure tests  
- Share+overlap alone **never** Set; message agreement still reaches Set  
- Two-user HTTP journey  
- No private leakage keys in shared payloads  
- No domain Logger of private schedules  

## Explicit non-changes

- No Home / Chats / Plans / You restructure  
- No Availability tab  
- No parallel Set  
- No calendar OAuth  
- No location learning  
- No Twilio  
- Conversations valid with zero availability rows  
- No final motion / ambient Technicolor / Opal Moment chrome yet  

## Intelligence note (for dual-AI converge)

Pipes are intentional primitives. Full Alignment Context / gap detector / minimum-question / collective fit engines are **not** implemented in this commit — they are the next design handoff from Claude and must feed the **existing** Set authority, not replace it.

## Next

1. Read `docs/coordination/CLAUDE_TO_GROK_AVAILABILITY_ALIGNMENT_HANDOFF.md` when present.  
2. Port only approved UI/motion/copy into Controlled Technicolor conversation moment.  
3. Draft PR CI green; hold deploy until intelligence+presentation slice is coherent.  
