# HOLD RETURN — HOME DESTINATION VISUAL CLOSURE

**August 20, 2026**

## A. CURRENT BYTE IDENTITY

| Field | Value |
| --- | --- |
| Branch | `build/v2-coded-experience-closure` |
| HEAD | `cb1bd4382d73fb7a83b29658ec3a48942801219e` |
| Last stamped Journey candidate | `7078cd7` (not current working bytes) |
| Working tree | Dirty — intended pre-Live repairs + Home nav/destination visual work + evidence |
| SHA/CI | Not stabilized / **DO NOT MERGE** |

## B. HOME INTERACTION INVENTORY

**33** visible controls inventoried (browser proof).

Kinds: **24** nav · **8** inline · **1** conditional.

## C. DESTINATION AUTHORITY MATRIX

| Control | Destination | Status |
| --- | --- | --- |
| Memory media | 437:3 | MAJOR_DIFF visual · route OK |
| Comment | 437:69 | MAJOR_DIFF visual · route OK |
| Forward | 437:133 | MAJOR_DIFF visual · route OK |
| See experience | 437:200 | MAJOR_DIFF visual · route OK |
| Open Graph | 373:385 | MAJOR_DIFF visual · Ready card rewritten · route OK |
| Story cell | 357:418 | MAJOR_DIFF visual · route OK |
| Avatar/person | 201:10 | MAJOR_DIFF · not visually closed |
| Search on Home | 373:261 | **NOT_IMPLEMENTED** — FIGMA NAVIGATION GAP |

Correct Figma destinations routed this pass: **6/6** attempted Home destinations (Search excluded as gap).

## D. INLINE ACTION MATRIX

Like · Save · Follow · Interested · Repost — laws EXACT; visual iconography still MAJOR_DIFF vs Figma.

## E. SEARCH AUTHORITY FINDING

**Where Search is entered (approved Figma):**

1. **476:53** New chat → SEARCH-00 people mode on **CHATS-00**  
2. **476:51** Search chats = local Chats filter  
3. Law **155:98** — contextual, not a tab  

**Home 287:6 / Header 287:7:** brand + wordmark + tagline only. **No Search control exists in Figma on Home.**

Verdict: **FIGMA NAVIGATION GAP** (not “Header frozen”).

**Memory/post search:**

**B.** No approved Memory/post mode in SEARCH-00.  
**DESIGN/PRODUCT GAP — FOUNDER DECISION REQUIRED**

Evidence: `HOME_SEARCH_AUTHORITY_AUDIT.md`, `HOME_SEARCH_CONTENT_GAP.md`

## F. DESTINATION VISUAL RESULTS

| Node | Ref | Runtime | Status |
| --- | --- | --- | --- |
| 437:3 | FIGMA_437_3.png | VISUAL_RUNTIME_437_3.png | **MAJOR_DIFF** |
| 437:69 | FIGMA_437_69.png | VISUAL_RUNTIME_437_69.png | **MAJOR_DIFF** |
| 437:133 | FIGMA_437_133.png | VISUAL_RUNTIME_437_133.png | **MAJOR_DIFF** |
| 437:200 | FIGMA_437_200.png | VISUAL_RUNTIME_437_200.png | **MAJOR_DIFF** |
| 373:385 | FIGMA_373_385_GRAPH.png | VISUAL_RUNTIME_GRAPH_DETAIL.png | **MAJOR_DIFF** |
| 357:418 | FIGMA_357_418_STORY.png | VISUAL_RUNTIME_STORY.png | **MAJOR_DIFF** |
| 201:10 | FIGMA_201_10_PROFILE.png | — | **MAJOR_DIFF** |
| 373:261 | FIGMA_373_261_SEARCH.png | — | **NOT_IMPLEMENTED** from Home |

Structural visual assertions (title/brand/CTAs present): **14/14** — these are **not** EXACT classifications.

Dock: Figma requires Option B visible on 437:* / 373:385 — runtime dock z-index **70**, visible over Memory.

## G. ENTITY CORRECTNESS

| Case | contentId | OK |
| --- | --- | --- |
| Juniper Graph | seed-consequence-chanelle | yes |
| Memory A | seed-nina-hike | yes |
| Comments from A | seed-nina-hike | yes |
| Forward A | seed-nina-hike | yes |
| Discovery | seed-near-rooftop / Rooftop jazz | yes |
| Comment create UI | unicode/café | yes |

## H. FORWARD SOAK

| Case | OK |
| --- | --- |
| Select one | yes |
| Cancel no send | **no** (sr-dismiss / overlay race — gap remains) |
| Multi Separately/Together server | incomplete |
| Double Continue | incomplete |

## I. STORY REATTACK

ExUnit outsider denial + deleted eligibility **PASS**. Viewer opens **357:418**. Rail **287:20 FROZEN**.

## J. PRIVACY / ZERO-TRUST

ExUnit `pre_live_zero_trust_test.exs`: **5/5 PASS**

- friends Story outsider denied  
- deleted Story eligibility  
- Journey revision stale denied  
- withdrawn invitation denied  
- blocked peer Journey-add denied  

## K. NAVIGATION TORTURE

Graph close → Home; Home root clears overlays (proven after Forward nest). Full browser Back/Forward matrix not exhaustive — gate remains open.

## L. REGRESSION

| Suite | Result |
| --- | --- |
| Vitest homeSocialActions + graphSocialHome + extend.private | **22/22 PASS** |
| ExUnit pre_live_zero_trust | **5/5 PASS** |

## M. CONSOLE / NETWORK

| Metric | Count | Notes |
| --- | --- | --- |
| Console error lines (capped log) | 40 logged / 796 probe tally | Dominated by React duplicate-key warnings |
| Unique console classes | 3 | duplicate key · 401 · CSP frame-ancestors |
| Failed network | **2** | `/api/v1/product/session` **401** during first-run — expected auth race, not product API failure |

## N. SHA / CI

Not stamped. **DO NOT MERGE.**

## O. FOUNDER WALK

`http://127.0.0.1:5173/?opal_reset_first_run=1`

1. Home → Open Graph → Juniper Ready card (373:385 structure) → Close / Home  
2. Memory media → Memory detail (437:3) → Comment → Close → Forward Send to → Home tab  
3. Discovery See experience → Save idea / Graph this  
4. Story cell → viewer → dismiss  
5. Confirm **no Search** on Home header (by design in Figma)  
6. Chats tab: Search chats / New chat are the contextual Search entries  

## P. EXIT VERDICT

**Home overall = MAJOR_DIFF**  
**Home action destination fidelity = MAJOR_DIFF**  
**Home interaction gate = NOT CLOSED**  

**STOP.**  
**HOLD.**  
**DO NOT MERGE.**  
**permissionToStartLive = NO.**

Do not begin Chats / Graphs / Opal / Journey / Live.
