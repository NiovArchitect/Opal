# HOLD RETURN — FIGMA VISUAL CONVERGENCE GATE

**HOLD. DO NOT MERGE. DO NOT START LIVE.**

## Founder checklist (65)

1. **Branch:** `build/v2-coded-experience-closure`
2. **Functional baseline SHA:** `7078cd7`
3. **Pre-Live repair preservation:** still present on dirty tree (`product_session`, `journey_authority`, `temporary_story_publishing`, `user_socket`, `conversation_channel`, `pre_live_zero_trust_test.exs`) — **not discarded**
4. **Visual-convergence product SHA:** **uncommitted** (no new product SHA yet — HOLD)
5. **HEAD:** `cb1bd43` (docs tip) + dirty visual + pre-Live repairs
6. **Dirty tree:** yes (pre-Live repairs + visual Home/Stories work + unrelated prior WIP)
7. **Figma authorities audited:** `287:6`, `287:20`, `287:7` (+ design context for feed child nodes 289:*)
8. **Runtime screens audited:** 2 (Home shell, Stories)
9. **EXACT:** 1 primary (Stories one-row geometry) + header 58px/tagline
10. **MINOR_DIFF:** 1 (Home overall stream shell)
11. **MAJOR_DIFF:** Home feed object grammars + Option B dock
12. **NOT_IMPLEMENTED / not audited:** Chats, Direct, Graphs, Opal-00, Journey, You, Story viewer/create polish, Memory detail, Comments, Forward, Manage, Can't-make-it, Settings
13. **Home status:** MINOR_DIFF — structure converging; not pixel-closed
14. **Stories row status:** **FIXED — ONE ROW**
15. **Stories row count proof:** `data-stories-rows="1"`; rail `flex-wrap: nowrap`; height **122**; width **390**; children **5**; PeoplePulse **0** — see `15_BROWSER_VISUAL_PROOF.json` / `03_STORIES_ONE_ROW.md`
16. **Home header status:** 58px + tagline “your social world, in motion” (no location pill)
17. **Home Conversation card:** MAJOR_DIFF remaining
18. **Home Memory:** MAJOR_DIFF
19. **Home Graph:** MAJOR_DIFF
20. **Home Discovery:** MAJOR_DIFF
21. **Home carousel:** NOT_IMPLEMENTED as Figma carousel
22. **Home Live:** MAJOR_DIFF (also no longer falsely first in fixture order)
23. **Dock status:** MAJOR_DIFF
24–41. Remaining surfaces: **not closed this pass**
42. **Reference screenshots:** `visual-convergence/references/`
43. **Runtime screenshots:** `visual-convergence/runtime/`
44. **Diff images:** `visual-convergence/diffs/` (pillow/imagemagick unavailable locally — side-by-side refs captured)
45. **Visual browser assertions:** Stories proof suite (~12 asserts) — `HOLD_STORIES_ONE_ROW_PASS`
46. **Functional Vitest:** Home-related **19** passed (`graphSocialHome` + `homeHydration`); journey/social also run in parallel
47. **ExUnit:** pre-Live zero-trust **5** passed (preserved)
48. **Focused zero-trust regression:** **5 / 5**
49. **Browser proof count:** 1 dedicated Stories/Home visual proof script
50. **Console errors:** not fully audited this pass
51. **Responsive:** 390 locked for proofs; 375/430 not re-run
52. **Reduced-motion:** not re-audited
53. **V0 found/fixed/open:** Stories two-row (**fixed**); PeoplePulse second row (**fixed**); filter chips on Home (**removed**); fixture Live ranking dominating stream (**fixed** for FOUNDER_FIXTURE order)
54. **V1 open:** Conversation/Memory/Graph/Discovery/Live card visual grammars; dock physical dip
55. **V2 open:** carousel geometry; asset fidelity across feed
56. **V3 open:** other screens not started
57. **product SHA:** still **`7078cd7`** baseline; visual work uncommitted
58. **CI:** not pushed (HOLD / DO NOT MERGE)
59. **Evidence directory:** `docs/evidence/v2-coded-experience/social-flow-final-convergence/visual-convergence/`
60. **Founder reset URL:** `http://127.0.0.1:5173/?opal_reset_first_run=1`
61. **Founder visual walk:** Home first — confirm **one** Stories row under brand header; then remaining surfaces still fail exactness
62. **Remaining genuine visual differences:** feed object designs, dock, all non-Home primary screens
63. **Remaining functional deps:** LOCAL_DEV media; FOUNDER_FIXTURE engagement UUID gate; pre-Live repairs uncommitted
64. **HOLD verdict:** **HOLD — Stories V0 fixed; Home not visually closed; product not Figma-exact**
65. **explicit permission to start Live: NO**

---

## What was repaired (visual)

| Defect | Fix |
|---|---|
| Stories rendering as two rows (PeoplePulse + Stories) | Removed PeoplePulse from Home; Stories rail locked to **122px / nowrap / one row** |
| “Your story” cell + wrong create affordance | Corner **+** control per 287:20 |
| Wrong story media | Figma-exported circular assets under `/figma-v2/stories/` |
| Header vista pill / wrong mark size | 58px header, 30px mark, Figma tagline |
| Filter chips inventing non-Figma chrome | Hidden on Home |
| Fixture ranking putting Live first | FOUNDER_FIXTURE preserves authored stream order; consequence moved to FEED 01 position |

## Absolute stop

**DO NOT START LIVE.**

Visual convergence is **not** complete. Only the founder-blocking Stories one-row failure is proven fixed. Continue screen-by-screen until Figma beside runtime is the same product.
