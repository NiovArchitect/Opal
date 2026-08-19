# Dead-tap audit — Home social closure

**HOLD.** Modes: ACTIVE | INFO | GESTURE | CONDITIONAL | DEPENDENCY

## Counts (this tranche)

| Mode | Approx count | Notes |
|------|--------------|-------|
| ACTIVE | 18+ | Memory author/detail/like/comment/forward/save/repost, Graph author/detail/I'd go, Live open, Story viewer/create, Discovery detail/Follow, Profile, Dock |
| INFO | 6+ | timestamps, interested/going counts, Follow≠Connection copy, Story law |
| GESTURE | 2 | People Pulse scroll, Stories rail scroll |
| CONDITIONAL | 2 | Forward confirm disabled until selection; Calls gated |
| DEPENDENCY | 1 | Camera capture on web create (not Home primary) |

## Expected ACTIVE — closed

| Control | Status |
|---------|--------|
| Memory author | ACTIVE → Profile |
| Memory detail | ACTIVE → 437:3 |
| Like | ACTIVE → engagement store |
| Comment | ACTIVE → 437:69 |
| Forward | ACTIVE → 437:133 |
| Save | ACTIVE → private save |
| Repost | ACTIVE → engagement store (eligible only) |
| Graph author | ACTIVE → Profile |
| Graph detail | ACTIVE → GraphDetailSheet |
| Interested | ACTIVE soft interest (≠ going) |
| Live open | ACTIVE → Live overlay |
| Story viewer | ACTIVE → 357:418 |
| Story create | ACTIVE → 476:92 |
| Discovery detail | ACTIVE → 437:200 |
| Follow | ACTIVE → FollowGraph semantics |
| Profile | ACTIVE → 201:10 |
| Dock | ACTIVE Option B |

## Remaining DEPENDENCY (honest backend reason)

| Control | Exact reason |
|---------|--------------|
| Durable BEAM social Memory/Comment/Repost HTTP | No product engagement tables/API yet — client engagement store persists locally; authorization enforced in store. FollowGraph HTTP exists and is used when peer id resolvable. |
| Social Moments → Home ranking | Elixir list exists with `not_home_feed: true` — not yet mapped as OGX Memory owner |
| Camera on Story/Graph create | Web MediaDevices capability not productized |

## No dead route to Home

Missing destinations previously routed Memory → You. Fixed: Memory opens 437:3.
