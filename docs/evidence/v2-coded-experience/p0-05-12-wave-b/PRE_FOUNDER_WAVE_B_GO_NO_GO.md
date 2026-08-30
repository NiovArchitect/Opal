# PRE_FOUNDER_WAVE_B_GO_NO_GO

```yaml
FOUNDER_WALK_READY: NO
as_of: "2026-08-30"
b7_pass: "P0-05.12B7"
starting_checkpoint: "c9c5c92005e711ce9b9979304556b284a3a0ad1e"
WAVE_A_FOUNDER_ACCEPTED: YES
WAVE_A_FROZEN: YES
WAVE_B_FOUNDER_ACCEPTED: NO
MERGE_AUTHORIZED: NO
LIVE_AUTHORIZED: NO
permissionToStartLive: NO
```

## Gate matrix (objective)

| Gate | Status | Evidence |
|------|--------|----------|
| VISUAL_MATRIX | **PARTIAL** | Home/Chats/Graphs/Opal/You/Live Figma+Runtime+Overlay/Diff present; not all 863/Section06 pairs complete |
| PAINT_MATRIX | **PARTIAL** | Home timeline/Live GREEN; Chats chrome GREEN; Section06 notes GREEN; You sparse GREEN; Graphs content GREEN |
| ACTION_DESTINATION_MATRIX | **PARTIAL** | Open Live→863:2, Chats New→618:2299 PEOPLE, Graph Detail 618:758, Create 863:284→863:338 GREEN; Journey Manage/Can't/Add **not browser-proven** (no provisioned Journey surface in fresh founder skip path) |
| MOBILE_MATRIX | **GREEN** | 375/390/393/430 no overflow, no dock hangoff (`B7_PROOF.json`) |
| ASSET_DPR_MATRIX | **PARTIAL** | Key home/center assets exist with SHA; full natural/rendered/DPR3 table incomplete |
| SECTION06_DEEP_PAINT | **GREEN** | Law notes match Figma accents; hub sparse accents applied (`waveBSection06Paint.test.ts` + browser) |
| FULL_LIVE | **PARTIAL** | Destination stamp 863:2 + host≠broadcaster GREEN; pixel depth vs current 863:2 (Juniper Live viewer) still incomplete |
| CREATE_FLOW | **PARTIAL** | 863:284→863:338 stamps GREEN; camera/library permission + caption polish not fully e2e |
| JOURNEY_ACTIONS | **RED** | Journey surface not present after founder skip→Home; Manage/Can't/Add People browser proofs blocked |
| CONSOLE_NETWORK | **GREEN** | 0 console errors; 0 local 4xx/5xx in proof run |
| AUTHORITY_GUARD | **GREEN** | `node scripts/opal-authority-check.mjs` |
| TREE_CLEAN | pending commit | B7 evidence + Section06 surgical paint |

## Critical green from B7 harness

- HOME_TIMELINE
- HOME_MEDIA (blankMedia=0)
- HOME_LIVE_PAINT
- OPEN_LIVE_863_2
- CHATS_NEW_PEOPLE
- GRAPHS_CONTENT
- GRAPH_CREATE_STAMP (+ add step 863:338)
- GLOBAL_OPAL_FULLSCREEN
- SECTION06_NOTES
- YOU_SPARSE
- MOBILE_NO_OVERFLOW
- ASSETS_EXIST
- CONSOLE_CLEAN
- NETWORK_OK

## Why FOUNDER_WALK_READY = NO

1. **JOURNEY_ACTIONS = RED** — founder cannot exercise Manage / Can't Make It / Add People without a provisioned SharedPlan/Journey entry in the fresh skip path.
2. **FULL_LIVE pixel depth incomplete** vs current 863:2 viewer grammar (destination routing works).
3. **VISUAL_MATRIX incomplete** for all required B7 targets (Direct/Group/Group Info/Manage/Can't/all 12 settings with full overlay packages).
4. **Chats row paint matrix** depends on conversation list data; fresh founder may land empty Chats (chrome paints still exact).
5. Do not make the founder discover mechanical Journey/Live-depth defects.

## Required before YES

1. Provision/find legitimate Journey path for founder seed and prove 863:88 / 863:195 / 863:394 browser e2e.
2. Complete remaining Figma↔Runtime↔Overlay↔Diff packages for all B7 nodes.
3. Close Full Live 863:2 visual depth (or document accepted fixture ceiling with founder decision).
4. Direct/Group smoke + nav-active/Center Opal matrices recorded GREEN.
5. Flip this file only when every required gate is GREEN — no "looks close."

## Evidence

- `B7_PROOF.json`
- `runtime/`
- `figma/`
- `overlay/`
- `diff/`
- `prove_b7.mjs`
