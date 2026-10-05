# UI Polish §§2+4+5 (+glyphs/nudges) evidence

Branch: `muse/packet-b-batch-2`

## Verified

- Feed alive: 33 cards; Maya/Jordan/Sabrina/Chanelle/Alex/Nina present
- Feed Open Graph → graph detail
- Chat plan pill → graph detail → I'm on the way → pill shows `On the way · Arrives …`
- Shared Graph plate CSS `position: relative` (in-flow under header; no absolute overlay)
- Center plan surface: unit test `OpalCenterChat.planSurface.test.tsx` — Yes after plan ask emits `onPlanCreated`

## Screenshots

- `01_home_feed.png` — alive Memory posts
- `02_graph_from_feed.png` — Open Graph from feed
- `03_chats_pills.png` / `05_chats_on_the_way.png` — pill interop
- `04_on_the_way.png` — convoy ETA
- `06_shared_graph_group.png` — relative Shared Graph plate
- `07a_center_rest.png` — Center rest

## VERIFY.json

Browser harness + unit tests. Center browser path is covered by unit test when first-run flake blocks Talk to Opal automation.
