# Availability Alignment Engine (Phase 1)

**Status:** Phase 1 architecture — **composable SocialFlow capability**  
**Owner:** Elixir/BEAM  
**Not required:** Python intersection, Kafka sync path, AVP²  

## Placement (additive)

```text
OpalCore.SocialFlow.Availability
        │
        │  shared-safe ranges / overlap evidence
        ▼
OpalCore.SocialFlow.AlignmentAuthority / ProductSignals
        │
        ▼
existing conversation journey (Becoming a plan → Still open → Set)
```

- **Does not** replace `SocialFlow`, messaging, invitations, Real People, discovery, or DSI moments.  
- **Does not** create a parallel final agreement state.  
- SF4 `AvailabilityGrant` remains the **group free/busy** primitive; Phase 1 windows + shares are intentional 1:1 (and small-N) alignment—do not conflate the tables.  
- No availability record is required to create or use a conversation.

## Concepts

| Concept | Role |
|---------|------|
| `AvailabilityWindow` | Owner-private interval (manual source in Phase 1) |
| `AvailabilityShare` | Intentional share of one window into one conversation |
| Overlap (read-time) | Deterministic intersection of active shares from ≥2 members |

## Authority

| Action | Who |
|--------|-----|
| Create/update/delete window | Owner only |
| Share window into conversation | Owner + conversation member + not blocked |
| See private windows | Owner only |
| See shared-safe peer windows | Conversation members (active shares only) |
| Compute overlap | Any member; uses only active shared windows |
| Revoke share | Owner of the share |
| Elevate to Set | Existing `AlignmentAuthority` after real agreement—not automatic on overlap |

## Deterministic intersection

Given shared ranges for members A and B:

1. Drop revoked shares, deleted windows, expired windows (`expires_at` ≤ now, or `end_at` ≤ now if policy treats end as expiry).
2. Normalize to UTC for computation; retain original `timezone` for display.
3. Pairwise interval intersection (half-open or closed consistently).
4. Merge adjacent/overlapping results.
5. Project shared-safe labels only (no private metadata).

Timezone correctness is mandatory. Partial overlaps are valid. No probabilistic scoring.

## Realtime

On intentional share/revoke, broadcast shared-safe only:

```text
availability:shared
{
  "schema_version": "0.1.0",
  "conversation_id": "...",
  "share_id": "...",
  "display_start": "...",
  "display_end": "...",
  "timezone": "America/Los_Angeles",
  "owner_user_id": "..."   // optional; may be omitted if product wants softer presence
}
```

Never broadcast raw `AvailabilityWindow` rows or private notes.

## Future plugs (interfaces only)

- `source: calendar_free_busy`  
- `source: device_inference`  
- Location fit ranking (private intelligence ranks; shared output shows benefit only)  
- Experience options 2–4 after time is Set-bound  
- Per-user reminders after Set  

## Explicit non-goals (Phase 1)

- External calendar OAuth  
- Location services  
- Python ranking  
- Production Kafka event emission (optional outbox later: `availability.shared`, `availability.overlap_found`)  
