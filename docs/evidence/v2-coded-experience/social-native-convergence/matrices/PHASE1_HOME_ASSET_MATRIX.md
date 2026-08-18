# Phase 1 Home asset matrix (OGSN-01/02/03)

**HOLD. DO NOT MERGE.**

| Screen | Asset | Mode | Meaning | Destination / mutation |
|--------|-------|------|---------|------------------------|
| OGSN-01 | Brand mark+wordmark | INFO | Identity | none |
| OGSN-01 | People Pulse cell | ACTIVE | Doorway by state | Memory→Profile; Graph→EXT-01; Live→OGSN-16 |
| OGSN-01 | Author avatar/name | ACTIVE | Person | EXT-02 Profile |
| OGSN-01 | Follow | ACTIVE | FollowGraph only | Local/seed follow; never Connection |
| OGSN-01 | Media | DEPENDENCY | Memory detail | Gate note; profile still available |
| OGSN-01 | Like | ACTIVE | Social engagement | Local like toggle |
| OGSN-01 | Comment | DEPENDENCY | Comments | Gate — no dummy |
| OGSN-01 | Repost | DEPENDENCY | Repost | Gate — no dummy |
| OGSN-01 | Forward | DEPENDENCY | Share | Gate — no dummy |
| OGSN-01 | Save | ACTIVE | Private save | Local save |
| OGSN-02 | Countdown | INFO | Happening in X from starts_at | Does not delete Graph |
| OGSN-02 | I'd go | ACTIVE | Soft Interested | In-feed soft interest (155:2) |
| OGSN-02 | Open Graph | ACTIVE | Graph detail | EXT-01 GraphDetailSheet |
| OGSN-03 | VIDEO LIVE | CONDITIONAL | Only if broadcasting | Info badge |
| OGSN-03 | Open Live | ACTIVE | Full Live | GraphLivePanel (OGSN-16 shell) |
| OGSN-03 | Host/broadcaster line | INFO | Live by X · hosted by Y | none |

Domain owners reused: FollowGraph APIs, soft interest in OpalApp, GraphLivePanel, GraphDetailSheet (new presentation), brand 160:2.
