# PASS 25 Live Product Organism — Results

Generated: 2026-08-15T02:55:36.018Z  
Updated: 2026-08-15 (auth browser + soak partial)

## Summary

| Metric | Value |
|--------|-------|
| PASS (API harness) | 21 |
| PRODUCT_FAIL (API harness) | 0 |
| SKIP (API harness) | 2 |
| Auth browser login 375/390/430 | PASS |
| Realtime channel joins (6 clients) | **PRODUCT_FAIL** |
| H-24-01 | **PARTIAL** (HTTP+viewport; socket open) |

See **PASS25_EXECUTIVE.md** for full scorecard.

## Episodes (API harness)

- **PASS** `api_health` — API up (404)
- **PASS** `cast_activation` — 15 personas activated
- **PASS** `morning_coffee` — coffee path no dinner bleed; silent pad member
- **PASS** `brunch_group` — brunch multi-time; silence not consent; no forced set
- **PASS** `afternoon_museum` — afternoon early-leave path recorded
- **PASS** `date_private_leadership` — private prep did not inflate peer messages until explicit share
- **PASS** `chaotic_user` — chaos did not force Set
- **PASS** `messy_group_8` — 8-member messy group coherent delivery; stranger denied; no forced set
- **PASS** `remote_facetime` — remote path no set leak
- **PASS** `night_fixed_concert` — fixed event conversation recorded
- **PASS** `family_organizer` — family organizer path recorded
- **PASS** `solo_product_day` — solo day timeline recorded without forced group set
- **PASS** `private_selection_not_send` — no accidental messages during private selection pause
- **PASS** `malicious_closed` — unauthorized access fail-closed
- **SKIP** `creator_follower_api` — follow product API not exposed — domain durable FollowGraph only
- **PASS** `creator_moment_boundary` — stranger denied friends Moment; creator path exercised
- **PASS** `multi_client_message_matrix` — 6 members see message; stranger denied
- **PASS** `multi_day_personal_curation` — domain MultiDayPersonalCuration.simulate covered by pass25_product_organism_test.exs
- **PASS** `browser_390` — captured 390×844 frames
- **PASS** `browser_375` — captured 375×812 frames
- **PASS** `browser_430` — captured 430×932 frames
- **PASS** `browser_token_inject` — token inject frame captured (app ignores LS keys → still first-run)
- **SKIP** `socket_soak` — embedded; separate soak run partially executed

## Authenticated browser (`pass25_browser_authenticated.mjs`)

- **PASS** OTP login → member shell on 375 / 390 / 430
- Home primary: “Tonight needs you.” + dinner place CTA (one consequence)
- Plans: Dinner · Saturday · 7 · Choose a place
- Tab model: Home · People · Plans · You
- Conversation open by `data-conversation-id`: SKIP

## Six-client soak (SOAK_MINUTES=5) — partial

- browser_login ×6 PASS
- sam membership PASS
- **PRODUCT_FAIL** `sam_post_membership_rejoin` channel_joined=false
- **PRODUCT_FAIL** `pre_matrix_channel_joins` all false
- Matrix thrash → soak aborted (~27m); full 20-min **NOT_RUN**

## Honesty

- Product group API requires **≥3 members** (including creator). Dyad-intent episodes pad with silent member.
- Domain FollowGraph may be durable while product `/follows` API is still SKIP.
- HTTP multi-client ≠ Phoenix realtime multi-client.
- Multi-day personal curation closed at **domain** level only.

## Pass 24 hold

Pass 24 domain organism (f4dda8e) remains HOLD / accepted as domain proof only.

HOLD. DO NOT MERGE.
