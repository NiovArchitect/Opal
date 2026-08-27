# HOME_EXHAUSTIVE_INTERACTION_MATRIX

**Date:** 2026-08-20  
**HOLD. Home interaction gate = NOT CLOSED. Home overall = MAJOR_DIFF.**

Statuses only: EXACT | MINOR_DIFF | MAJOR_DIFF | NOT_IMPLEMENTED | CONDITIONAL

| Figma source node | Object | Visible control | Expected behavior | Exact destination node | Domain/server owner | Runtime behavior | Visual status | Functional status | Privacy concern | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 287:7 | Header | brand mark | Brand only | — | Brand | Renders | EXACT | EXACT | none | Frozen header |
| 287:7 | Header | wordmark | Brand only | — | Brand | Renders | EXACT | EXACT | none | Frozen header |
| 287:7 | Header | tagline | Brand only | — | Brand | Renders | EXACT | EXACT | none | Frozen header |
| 287:20 | Stories | label STORIES | Label | — | TemporaryStory | Renders | EXACT | EXACT | none | Frozen rail |
| 287:20 | Stories | create + | Open Story create | 476:92 | TemporaryStory | Opens create flow | MAJOR_DIFF | MAJOR_DIFF | owner only | STORY reattack |
| 287:20 | Stories | story cell | Open Story viewer | 357:418 | TemporaryStory | Opens viewer | MAJOR_DIFF | MAJOR_DIFF | friends gate | VISUAL_RUNTIME_STORY |
| 289:2 | Conversation | avatar | Person profile | 201:10 | Profile | Routes person | MAJOR_DIFF | MAJOR_DIFF | relationship | PROFILE visual |
| 289:2 | Conversation | Open Graph | Same Reality Graph detail | 373:385 | SharedPlan/Graph | Opens Ready detail | MAJOR_DIFF | MAJOR_DIFF | Reality lineage | GRAPH visual |
| 289:24 | Memory | avatar/author | Person profile | 201:10 | Profile | Routes person | MAJOR_DIFF | MAJOR_DIFF | relationship | PROFILE |
| 289:24 | Memory | media | Memory detail | 437:3 | SocialMoment | Opens detail | MAJOR_DIFF | MAJOR_DIFF | owner truth | MEMORY visual |
| 289:24 | Memory | Like | Inline toggle | — | SocialMomentEngagement | Inline | MAJOR_DIFF | EXACT | none | INLINE proof |
| 289:24 | Memory | Comment | Comments sheet | 437:69 | SocialMomentComment | Opens sheet | MAJOR_DIFF | MAJOR_DIFF | moment scoped | COMMENTS visual |
| 289:24 | Memory | Repost | Inline (≠ Forward) | — | SocialMomentEngagement | Inline | MAJOR_DIFF | EXACT | none | INLINE |
| 289:24 | Memory | Forward | Send to picker | 437:133 | Forward/messaging | Opens picker | MAJOR_DIFF | MAJOR_DIFF | audience law | FORWARD visual |
| 289:24 | Memory | Save | Inline private | — | Save | Inline | MAJOR_DIFF | EXACT | private | INLINE |
| 289:39 | Graph | avatar | Person profile | 201:10 | Profile | Routes | MAJOR_DIFF | MAJOR_DIFF | relationship | PROFILE |
| 289:39 | Graph | I'm interested | Soft interest | — | Interest | Inline | MAJOR_DIFF | EXACT | ≠ Going | INLINE |
| 289:39 | Graph | Open Graph | Graph detail same Reality | 373:385 / Graph auth | SharedPlan | Opens detail | MAJOR_DIFF | MAJOR_DIFF | Reality lineage | GRAPH |
| 289:72 | Discovery | Follow | Inline FollowGraph | — | FollowGraph | Inline | MAJOR_DIFF | EXACT | ≠ Connection | INLINE |
| 289:72 | Discovery | See experience | Discovery detail | 437:200 | Discovery | Opens detail | MAJOR_DIFF | MAJOR_DIFF | no exact location leak | DISCOVERY visual |
| 289:72 | Discovery | media/card | Discovery detail | 437:200 | Discovery | Opens | MAJOR_DIFF | MAJOR_DIFF | relevance only | DISCOVERY |
| 289:84 | Carousel | swipe | Inline scroll | — | UI | Swipe | MAJOR_DIFF | MAJOR_DIFF | none | object pass |
| 289:84 | Carousel | item / actions | Memory destinations | 437:* | SocialMoment | Mixed | MAJOR_DIFF | MAJOR_DIFF | same as Memory | object pass |
| 289:97 | Live | Open Live | Live surface | Live auth | Live | Conditional | CONDITIONAL | CONDITIONAL | permissionToStartLive=NO | rare Live |
| 289:112 | Next peek | continuation | Feed continues | — | Feed | Visual object | MAJOR_DIFF | MAJOR_DIFF | none | object pass |
| 433:2 | Dock | Home | Home root / reselect top | Home | Nav | Works | MINOR_DIFF | EXACT | none | nav proof |
| 433:2 | Dock | Chats | Chats tab | CHATS-00 | Nav | Works | MAJOR_DIFF | EXACT tab | none | out of scope |
| 433:2 | Dock | Opal | Opal ambient | OPAL | Nav | Works | MAJOR_DIFF | EXACT tab | none | out of scope |
| 433:2 | Dock | Graphs | Graphs tab | GRAPHS | Nav | Works | MAJOR_DIFF | EXACT tab | none | out of scope |
| 433:2 | Dock | You | You / settings | YOU | Nav | Works | MAJOR_DIFF | EXACT tab | self only | out of scope |
| — | Search | (none on Home) | Would open SEARCH-00 | 373:261 | Search | **No Home entry** | NOT_IMPLEMENTED | NOT_IMPLEMENTED | eligibility first | SEARCH audit |

## Counts (inventory)

From `HOME_DESTINATION_BROWSER_PROOF.json` (2026-08-20T23:29:20Z):

| Metric | Count |
| --- | --- |
| Home visible controls inventoried | **33** |
| Navigation targets | **24** |
| Inline authoritative actions | **8** |
| Conditional actions | **1** |
| Correct Figma destinations routed | **6** (Memory/Comments/Forward/Discovery/Graph/Story) |
| Search from Home | **0** — FIGMA NAVIGATION GAP |
| Visual destination assertions (structural) | **14/14** |
| Visual EXACT claims | **0** |

Seven-route summaries are **insufficient**; this matrix is the Home interaction ledger.
