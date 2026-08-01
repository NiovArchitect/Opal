# Social Flow 4 — Privacy & Consensus Proofs

## Consensus rules

| Situation | Result |
|-----------|--------|
| Required participants silent | Plan **not** created; copy notes silence is not consent |
| Any required tentative | Plan **not** created |
| Majority accept, minority silent | **Not** consensus; `majority_is_not_consensus: true` |
| All required accept, no tentative | Plan created (`status: agreed`) |
| Organizer alone accepts | Insufficient |
| Revision partial approvals | Plan time unchanged until all required approvers accept |

Rule type default: `unanimous_required_participants` with `tentative_allowed: false`.

## Private constraint

- Default visibility: `private`.
- Non-owner sync sees minimized `shared_summary` (e.g. “One participant has a location requirement.”).
- Owner sync sees full `normalized_value`.
- Direct get by non-owner on private constraint: forbidden.

## Availability

- Grant mode: `free_busy` windows only.
- Peer `get_availability_for_user`: forbidden.
- Intersect returns minimized envelopes with user_id **hash**, not raw calendars or titles.
- Revoke sets status `revoked`.

## Unauthorized participant

Taylor is not a member of the four-person trusted friends conversation.

| Action | Result |
|--------|--------|
| `sync_group` | `:not_a_member` |
| `get_plan_for_user` | `:forbidden` |
| `respond_group_revision` | `:not_a_member` |

## Prohibited product language

Mobile and summary design forbid:

- holding the group back
- unreliable / less committed
- contributes the most
- cooperation score / social score
- N% complete

## Residual risk

Prompt-injection and adversarial membership abuse are covered by membership checks and deterministic fixtures. This is **not** a full adversarial red-team campaign (same residual class as Social Flow 3).
