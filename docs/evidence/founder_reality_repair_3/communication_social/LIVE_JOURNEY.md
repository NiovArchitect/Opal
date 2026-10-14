# LIVE_* — Normal-user Live journey (Paste K)

**Status:** PROVEN (machine) · FOUNDER ACCEPTED = PENDING  
**Pass 2:** LOCKED · **Freeze:** HOLD  
**Opal Live meaning:** current social presence / immediacy / real-world context — **not** a TikTok livestream clone.

## Caps

| Cap | Result | Proof |
|---|---|---|
| `LIVE_NORMAL_USER_START` | **YES** | YOU → Go live (ungated) → venue confirm → audience + location precision → `POST /lives/go-live` 201 |
| `LIVE_ACTIVE_STATE` | **YES** | `GET /lives/mine` active; panel `lives-active-pill`; room `status=live` |
| `LIVE_END` | **YES** | `POST /lives/:id/end` → `ended`; mine inactive |
| `LIVE_OTHER_USER_FIXTURE` | **YES** | Walk B Live at TEST VENUE · Maya Spot visible to Walk A via `GET /lives/visible` |

Evidence machine file: [`LIVE_JOURNEY_VERIFY.json`](./LIVE_JOURNEY_VERIFY.json)  
Screens: `live_active_overlay.png`, `live_home_after.png`  
Fixture helper: `scripts/seed_other_user_live.exs` → `/tmp/opal_other_user_live.json`

## Journey exercised

1. Entry — member YOU hub `you-go-live` (normal user; not seed-gated)
2. Choose/verify place — Places search or local testing provisional TEST VENUE
3. Audience — Friends / Close circle (privacy metadata)
4. Location precision — Venue name / Area only (**no GPS**)
5. Start — durable `live_rooms` row `status=live`
6. Visibly Live — overlay active pill + consequence copy
7. Appears on Home — `getLivesVisible` → `visibleLiveCards` / `liveEligibility` feed cards (`live-room-*`)
8. Friends can see — RelationshipGraph friend edge + audience filter
9. Stop Live — End Live → `status=ended`
10. State ends — mine inactive; room no longer in visible list

## How founder sees other-user Live

1. Ensure Walk A/B friend edge (already true on local fixture DB).
2. From `apps/opal_core`: `mix run ../../scripts/seed_other_user_live.exs`
3. Boot founder seed: `/?opal_founder_seed=1` as Walk A (minted session).
4. Home hydrates Paste K cards with id `live-room-<uuid>` for Walk B (“Walk B is Live” at TEST VENUE · Maya Spot).
5. Opening the card uses Full Live destination with **presence** copy (`videoLive=false`) — not a fake stream.

## What was fixed

- Backend: audience + location_precision metadata; `list_visible_lives/1`; `active_live_for/1`; `GET /lives/visible` + `/lives/mine`; one active Live per host
- FE: audience/precision chips; active Live state + End Live; productClient end/visible/mine; Home injects real LiveRooms; local overlay testing fallback when Places empty
- Fixture: `scripts/seed_other_user_live.exs`

## Story composer (adjacent)

Noted only: Add Story remains adjacent on Home. Live prioritized; any founder-seed story composer breakage is **not** claimed fixed here.

## Payments honesty

Stickers / Opal Pay remain test-mode (`Stickers use test credits for now.`). No fake live money claimed.

## Remaining blockers

- Founder phone ACCEPTED walk still PENDING
- Production Places key may be required for non-test venues (provisional TEST VENUE is local/testing only)
- Seed visual `FOUNDER_LIVE_FEED` (Sabrina rooftop) remains a separate Rare Live fixture from Paste K LiveRooms — do not conflate
- Center dedicated Live strip not added (Home + YOU + Full Live destination cover permitted surfaces)
- Pass 2 stays LOCKED; freeze HOLD
