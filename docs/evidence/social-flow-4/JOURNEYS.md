# Social Flow 4 — Journeys A–E (synthetic)

Users: **Alex, Jordan, Maya, Chris** (members). **Taylor** (unauthorized).  
Conversation: `conv_group_friends` (4 members).

## Journey A — Small-group dinner

1. Alex creates group proposal: activity dinner; options Saturday after 7 / Friday 7:00; Maya private accessibility constraint.
2. Proposal status `visible`; all four required.
3. Alex coordinates → `coordinating`.
4. Alex, Jordan, Chris accept Saturday → summary shows not everyone agreed.
5. Maya responds `tentative` → still no plan; tentative_count ≥ 1.
6. Maya accepts → plan `agreed`.
7. Taylor denied sync/plan; Jordan sees redacted constraint; Maya sees full value.

## Journey B — Availability envelopes

1. Maya grants free/busy Saturday 19:00–21:00.
2. Alex cannot read Maya’s grant.
3. Maya can read own grant.
4. Alex also grants overlapping free/busy.
5. Intersect: label for shared window; `no_private_titles: true`.
6. Maya revokes → status `revoked`.

## Journey C — Silence / false consensus

1. Proposal with three time options.
2. Alex, Jordan, Chris accept first option; Maya silent.
3. `silent_required_count ≥ 1`, `everyone_agreed` false.
4. Silence copy present; majority is not consensus.

## Journey D — Revision

1. All four accept 7:30 → plan agreed.
2. Maya proposes revision to 8:00 with shared reason (accessible restaurant).
3. Alex accepts alone → plan still 7:30.
4. Jordan + Chris accept → plan time 8:00; revision `accepted`.
5. Taylor cannot accept.

## Journey E — Responsibilities / readiness

1. Plan agreed for 8:00.
2. Alex assigns Chris “provide restaurant options” → proposed.
3. Chris accepts.
4. Alex assigns self “make reservation” and accepts.
5. Chris completes → readiness factual; pending remains; no `%`.
6. Alex completes → “Everything needed…” / pending 0.

## Primary feeling target

“Opal helped all of us get on the same page without making planning feel like work.”
