# Dual-AI file ownership — Real People vertical

**Author:** Grok (lead)  
**Updated:** 2026-08-06

## Active Grok worktree

| Field | Value |
|-------|--------|
| Path | `/Users/genghishameha/Developer/NIOVI-Architect/worktrees/opal-grok-real-people` |
| Branch | `build/real-people-first-alignment` |
| Base | `origin/main` @ `c6d972c` |

## Claude worktree (do not edit for this vertical)

| Path | Branch |
|------|--------|
| `.../worktrees/opal-claude-alignment` | `architecture/speed-to-alignment-and-complete-journey` |

Claude reviews via GitHub/docs only. No concurrent edits to Grok-owned runtime files below.

## Grok-owned (Real People vertical)

- `apps/opal_core/lib/opal_core/social_flow/onboarding.ex`
- `apps/opal_core/lib/opal_core/social_flow/phone_verification/**` (new)
- `apps/opal_core/lib/opal_core/social_flow/relationship_invitation.ex`
- `apps/opal_core/lib/opal_core_web/controllers/activation_controller.ex`
- `apps/opal_core/lib/opal_core_web/controllers/invitation_controller.ex`
- `apps/opal_web/src/ActivationFlow.tsx`
- `apps/opal_web/src/people/**`
- `apps/opal_mobile/src/screens/ActivationScreen.tsx`
- `apps/opal_mobile/src/socialFlow/**`
- `docs/evidence/real-people/**`
- `docs/security/REAL_PHONE_IDENTITY_THREAT_MODEL.md`
- Runtime env wiring for verification mode (server-side only)

## Shared read-only foundations (extend carefully)

- `ProductSession`, `DeviceSession`, `Messages`, `ConversationChannel`, `TrustSafety`, `ProductSignals`
- Walkthrough branding already shipped on main (PR #60) — no reopening peak-brand work in this vertical unless it blocks activation

## Rules

1. Grok executes continuously; Claude does not block.  
2. No secrets in git, client bundle, logs, or evidence.  
3. No silent production → synthetic SMS fallback.  
4. Label `Author: Grok (lead)` / `Author: Claude (independent)`.  
