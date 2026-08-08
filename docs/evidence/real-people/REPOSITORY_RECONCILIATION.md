# Repository reconciliation — Real People vertical

**Author:** Grok (lead)  
**Date:** 2026-08-06

## Confirmed

| Check | Result |
|-------|--------|
| Root | `/Users/genghishameha/Developer/NIOVI-Architect/Opal` |
| Remote | `origin` → `https://github.com/NiovArchitect/Opal.git` |
| `origin/main` | `c6d972c` — includes PR #60 walkthrough peak brand + booking honesty |
| Local main | Matches `origin/main` |
| Production branding | Deployed gh-pages `59d4b34` |
| Claude worktree | Isolated at `worktrees/opal-claude-alignment` (`a4a7af0`) — not used for runtime edits |
| Grok worktree | `worktrees/opal-grok-real-people` branch `build/real-people-first-alignment` from `origin/main` |
| Open draft PRs | #57 peak brand design, #58 Claude alignment, #59 Grok docs — not blocking this vertical |
| SF17 | Not reopened |
| SF18 | Partially complete; not closed by this program name |

## Domain reuse map (authoritative)

See explore audit: Onboarding synthetic OTP, ProductSession, invitations, Messages, ConversationChannel, ProductSignals, TrustSafety.

**Hard gap:** B001 production SMS — no Twilio/Telnyx env or adapter prior to this branch.

## Non-claims preserved

No mass-consumer SMS, no Kafka backbone, no live booking providers, no complete physical Android/iOS matrix.
