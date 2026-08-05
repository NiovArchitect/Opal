# Location and collective fit (boundaries)

**Status:** Product truth for Social Flow 17 continuation; compounded by Dynamic Social and Experience Intelligence Phase 0  
**Not implemented as a live recommendation feed.**  
**See also:** `OPAL_DYNAMIC_SOCIAL_EXPERIENCE_INTELLIGENCE_PHASE0.md`

## Intent

Location can support a **current social experience**, never silent surveillance.

Example:

Three friends discuss dinner. With permission, Opal may consider approximate location, travel comfort, quieter places, vegetarian needs, budget, prior group preferences, open hours, and wait times, then surface a small set of places that fit **everyone**.

That is collective social fit, not generic restaurant search.

Collective fit is **not average fit**. Hard constraints (quiet, vegetarian, budget) must be satisfied without exposing private reasons to the group.

## Rules

Location use must be:

- opt-in
- purpose-specific (tied to a current journey)
- approximate unless precision is required
- temporary where possible
- explainable
- easy to revoke
- never silently shared with friends
- never continuous background monitoring by default

## Location scopes (Phase 0)

| Scope | Meaning |
|-------|---------|
| Approximate area | Coarse only |
| While using Opal | Session-bound |
| For this experience only | Purpose-bound grant |
| Shared with selected people | Explicit audience |
| Used privately for option ranking | Never shown to others |
| Never shown directly to others | Default for ranking |

Opal may know a venue is centrally convenient without telling everyone exactly where each person is.

## Architecture

| Layer | Role |
|-------|------|
| User consent | Purpose-bound grant |
| Python | May propose candidate places or fit scores |
| Elixir | Eligibility, privacy, sharing, expiry |
| React | Display only authorized projections |

No noisy recommendation feed. No always-on map of friends. No selling location.

## Relation to experience collaboration

Collective fit is one expression of journey + nuance + participation state. It must respect surprise-sensitive privacy and the noise budget documented in `EXPERIENCE_COLLABORATION_AND_NUANCE.md`.
