# W6 Amendment 3 — Wordmark headers + Opal Center tab mark

**Branch:** `muse/packet-b-batch-2`

## Tasks

| Item | Result |
|------|--------|
| Register `opalWordmark` + `opalCenterMark` in `BRAND_ASSETS` | PASS |
| `OpalWordmark` renders `opal-wordmark.png` at height prop (default 28; headers 22) | PASS |
| Brand row / topbar consumers pick up wordmark | PASS — `V2BrandRow` + non-home `topbar-brand` |
| Center tab globe → `opal-center-mark.png` at sibling icon size (46) | PASS — `w6a3_dock_center_mark.png` |
| Living character circle untouched by this amendment | PASS — A1 owns that button |

## Evidence

- Header wordmark at natural size: `w6a3_header_wordmark.png` (Center aside, ~51×17 after scale)
- Bottom nav center mark: `w6a3_dock_center_mark.png`

## Note

Native-host CSS hides the global `.topbar` on chats/graphs/you destinations; wordmark still mounts there for non-native and for surfaces that show the topbar. Center rest header uses the same `OpalWordmark` component at text cap-height.
