# Privacy proof — Phase 3

| Proof | Status |
|-------|--------|
| Private budget never in completion shared summary | Asserted + tested |
| Shared summary uses only group-safe language | PASS |
| Reflection prompt has no private constraint text | PASS |
| Learning stores dimension tokens, not budget values | PASS |
| Forbidden shared substrings blocked at write | `assert_shared_safe!/1` |
| Outsider cannot complete | PASS |
| User A / User B projections not expanded with private reasons | Phase 2 projection rules retained |
| Forbidden explanation: “worked because one participant needed a lower price” | Not generatable via completion path |

## Allowed future explanation

> This kind of place worked well for this group.

## Forbidden

> This worked because one participant needed a lower price.
