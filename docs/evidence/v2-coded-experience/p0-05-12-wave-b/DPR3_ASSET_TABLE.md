# DPR3 / asset provenance table (founder-visible key rasters)

| Slot | Figma node | imageHash | Runtime path | SHA256 | Natural | Rendered target | DPR3 | Notes |
|------|------------|-----------|--------------|--------|---------|-----------------|------|-------|
| Home Live / Full Live media | 618:217 / 863:10 | `1fd39e009e4f6e8f17bcbb4f4bc07e69fccd9190` | `/figma-v2/home-201/media-live-city-1728.png` | `6acd2034…` | 1728-class source | Home ~338×244; Full Live 350×300 | YES | B5 computed; SAME media lineage |
| Home Memory | 618:130 | `875c241dd61e89cc7e7f12c39cb9fc907f67f783` | `/figma-v2/home-201/media-memory-friends-1728.png` | `5b317246…` | 1728-class | card media | YES | B5 computed |
| Home Discovery | 618:188 | `1fd39e009e4f6e8f17bcbb4f4bc07e69fccd9190` | `/figma-v2/home-201/media-live-city-1728.png` (seed) | `6acd2034…` | 1728-class | card media | YES | shared with Live |
| Travel carousel | 618:200 | `a753605454ef677efa14a97635abdbacc2cd452e` | `/figma-v2/home-201/media-travel-carousel-1728.png` | `c7f89131…` | 1728-class | carousel | YES | B5 computed |
| Direct Juniper | 618:376 | (MCP asset) | `/figma-v2/direct/opal-direct-juniper-618-376.png` | `7e3d10eb…` | 864×1152 | 108×86 cover | YES | B5 computed |
| Center Opal | 645:3 | n/a art | `/brand/opal-graph/opal-center-opal-645-3-rest-512.png` | `1ddbbe1b…` | 512×512 | 86×64 | YES | |
| Create Add media | 863:341 | (MCP asset) | `/figma-v2/create/add-to-graph-media-863-338.jpg` | `b42d60d8…` | 864×1152 | 346×300 cover | YES | B4/B5 |

Policy: no silent thumbnail upscale. Record `SOURCE_DENSITY_GAP` only if Figma source itself is underspecified.
