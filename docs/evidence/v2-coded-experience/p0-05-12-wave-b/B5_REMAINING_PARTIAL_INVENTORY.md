# B5 — Remaining PARTIAL + implied-state inventory

**Starting evidence HEAD:** `9685d90`  
**HOLD.** Do not invent missing Figma. Activity = FOUNDER_REVIEW. Do not begin B6.

Threshold unchanged: **0.12**

## Law

| If | Then |
|----|------|
| Exact current Figma exists | Reconcile / prove |
| Clearly derivable (904:10/15 + owner + Brand V4) | Smallest derivation + document chain |
| Design judgment required | **MISSING_FIGMA_AUTHORITY** — stop & flag |
| Founder-only | **FOUNDER_REVIEW** |
| Stale proof scripts / tooling | **B6_ONLY** |
| Additive 902:* / future signals | **OUT_OF_SCOPE** unless explicitly authorized |

## Remainder matrix (reconciled vs B1–B4 evidence)

| Item | Owner | Figma | Prev audit | Defect class | Bucket | Action | Final (target) |
|------|-------|-------|------------|--------------|--------|--------|----------------|
| Home | GraphSocialHome | 618:44 | PARTIAL aged package | PROOF_GAP / possible visual drift (aged ratio ~0.40) | **B5** | Fresh Figma+runtime+O/D; fix only if still PARTIAL with clear Figma | TBD |
| Home Rare Live card | GraphSocialHome | 618:211 | GREEN | — | closed | none | GREEN |
| Soft interest / lock-in / Going | Home Graph | 618:149/738:* | GREEN | — | closed | none | GREEN |
| Chats Home | ChatsHome | 618:271 | PARTIAL aged | PROOF_GAP — aged package already **0.0917 GREEN** | **B5** | Refresh package; mark GREEN | GREEN |
| Chats empty | ChatsHome | 618:271 + 904:10 | implemented | EMPTY microstate; copy present | **B5** | Smoke + record; no invent | GREEN (derivable) |
| Search PEOPLE | SearchDestination | 618:2299 | PARTIAL no O/D | PROOF_GAP — **EXPLICIT_FIGMA** | **B5** | Capture formal package; measure; fix if needed | TBD |
| Direct / Group / Group Info | thread owners | 618:348/451/521 | GREEN B2 | — | closed frozen | none | GREEN |
| Graphs overview | GraphsHome | 618:674 | PARTIAL | PROOF_GAP (~0.136 aged) | **B5** | Refresh + measured fix if still >0.12 | TBD |
| Graphs empty lens | GraphsHome | 618:674 + 904:10 | implemented | EMPTY microstate | **B5** | Smoke; no invent | GREEN (derivable) |
| Graph Detail | GraphDetailSheet | 618:758 | PARTIAL no O/D | PROOF_GAP — **EXPLICIT_FIGMA** | **B5** | Capture formal package | TBD |
| Create / Add | GraphCreateFlow | 863:284/338 | GREEN B4 | — | closed frozen | none | GREEN |
| Journey + Manage/Can't/Add | Journey* | 618:816 / 863:88/195/394 | GREEN E2E; O/D incomplete | PROOF_GAP | **B5** | Optional formal refresh if routable; else note E2E GREEN | GREEN E2E / O/D refresh |
| Full Live | GraphLivePanel | 863:2 | GREEN B1 | — | closed frozen | none | GREEN |
| Global Opal | OpalAmbient | 618:902 | PARTIAL | PROOF_GAP (~0.167 aged) | **B5** | Refresh + measured fix if needed | TBD |
| Person Profile | GraphProfilePage | 618:1257 | PARTIAL no O/D | PROOF_GAP — **EXPLICIT_FIGMA** | **B5** | Capture formal package | TBD |
| You + Section 06 ×12 | YouSettings* | 618:1344… | GREEN B3.1 | Notifications 0.1146 near-gate | closed frozen | **Do not reopen** (B7 note) | GREEN |
| Activity icon | ActivityDestination | 618:2384 | FOUNDER_REVIEW | founder visual judgment | **FOUNDER_REVIEW** | Record only | FOUNDER_REVIEW |
| Calls surfaces (Incoming/Audio/Video/Group) | CallSurfaces | 618:581/599/620/642 | PARTIAL formal | **8th B5 runtime PARTIAL (ledger A)** — not proof-only, not covered by Settings Calls 618:1733, not B6_ONLY; runtime owner CallSurfaces.tsx; Wave B formal F/R/O/D incomplete | **B5** | Capture formal F/R/O/D; reconcile to ≤0.12 | PARTIAL (Incoming ~0.1422 first capture) |
| Camera path | Create | 863:284 | DEPENDENCY | truthful system capture | closed B4 | none | DEPENDENCY |
| DPR3 asset table | evidence | various | table exists | incomplete SHA compute notes | **B5** or **B6** | Compute SHAs where files exist | hygiene |
| Legacy Create 149:31 markers | proof scripts | lineage | stale | tooling truth | **B6_ONLY** | Do not distort product | B6 |
| 902:2 / 902:345 / 902:688 | additive | 902:* | authority exist | not auto-implement | **OUT_OF_SCOPE** | Flag only | OUT_OF_SCOPE |
| Future signals | — | — | — | speculative | **OUT_OF_SCOPE** | none | OUT_OF_SCOPE |

## Already closed by B1–B4 (do not reopen)

B1 Full Live · B2 Direct/Group/Group Info · B3 You+12 settings · B4 Create/Add · Journey browser actions GREEN · Wave A frozen

## B5 worklist (implementation / proof)

1. Chats 618:271 — refresh formal → expect GREEN  
2. Home 618:44 — refresh; fix only with Figma if still PARTIAL  
3. Graphs 618:674 — refresh; fix if still PARTIAL  
4. Global Opal 618:902 — refresh; fix if still PARTIAL  
5. Search 618:2299 — first formal package  
6. Graph Detail 618:758 — first formal package  
7. Person Profile 618:1257 — first formal package  
8. Calls formal packages (if capacity)  
9. Empty/loading smoke documentation  
10. Ledger sync  

## Explicit non-goals

- Activity icon resolution  
- Inventing empty/loading screens beyond 904:* + owner  
- Implementing 902:* AI states  
- B6 legacy proof rewrite  
- Reopening Notifications / frozen greens  

## Post-refresh formal ratios (B5 inventory)

| Surface | Node | Fresh diffRatio | Status | Notes |
|---------|------|-----------------|--------|-------|
| Home | 618:44 | 0.1853 | PARTIAL | Tall feed; chrome/content residual |
| Chats | 618:271 | 0.1211 | PARTIAL | Near-gate; founder-seed cast ≠ Figma demo cast |
| Search | 618:2299 | 0.1331 | PARTIAL | First formal package captured |
| Graphs | 618:674 | 0.1263 | PARTIAL | Near-gate |
| Graph Detail | 618:758 | 0.1345 | PARTIAL | First formal package |
| Global Opal | 618:902 | 0.2246 | PARTIAL | Mount exists; visual residual |
| Person Profile | 618:1257 | 0.3064 | PARTIAL | Entry/capture path may have hit wrong surface |
| Calls Incoming | 618:581 | ~0.1422 | PARTIAL | **8th B5 runtime PARTIAL** — first formal Incoming capture |

## B5.1 measured reconciliation (after)

| Surface | Node | Before | After | Status | Notes |
|---------|------|--------|-------|--------|-------|
| Chats | 618:271 | 0.1211 | **0.1184** | **GREEN** | Shared topbar hide |
| Search | 618:2299 | 0.1331 | **0.1129** | **GREEN** | Shared topbar hide |
| Graphs | 618:674 | 0.1263 | **0.1181** | **GREEN** | Vertical timeline to exact 618:674 |
| Graph Detail | 618:758 | 0.1345 | **0.0884** | **GREEN** | Juniper Ready Detail + stage |
| Calls Incoming | 618:581 | 0.1422 | **0.0988** | **GREEN** | Circular avatar + outlined rails |
| Person Profile | 618:1257 | 0.3064† | **0.1706** | PARTIAL | †invalidated wrong Direct; route GREEN |
| Global Opal | 618:902 | 0.2246† | **0.2159** | PARTIAL | †wrong Home+listening mount invalidated |
| Home | 618:44 | 0.1853 | **0.1853** | PARTIAL | Lower-feed residual; Wave A freeze respected |
| Calls Audio/Video/Group | 618:599/620/642 | — | — | PARTIAL | Formal packages still incomplete |

**No inventing:** Figma exists for all of the above — residual is implementation/content, not MISSING_FIGMA. Activity remains FOUNDER_REVIEW. 902:* OUT_OF_SCOPE. Legacy 149:31 → B6_ONLY.

## Calls ledger resolution (B5.1A — authoritative)

| Question | Answer |
|----------|--------|
| Classification | **A — eighth B5 runtime PARTIAL family** |
| Not | proof-only / covered by another surface / B6_ONLY |
| Owner | `CallSurfaces.tsx` |
| Nodes | 618:581 Incoming · 618:599 Audio · 618:620 Video · 618:642 Group |
| Distinct from | Settings Calls assist 618:1733 (B3 GREEN frozen) |
| Incoming | **GREEN 0.0988** |
| Audio/Video/Group | Formal packages still incomplete → family remains on remaining ledger |

## Counts (post-B5.1 measured pass)

| Bucket | Count |
|--------|-------|
| B5 runtime PARTIAL remaining | **4** (Home / Global Opal / Person / Calls Audio·Video·Group packages) |
| B5 newly GREEN this pass | **5** (Chats / Search / Graphs / Graph Detail / Calls Incoming) |
| FOUNDER_REVIEW | 1 (Activity) |
| B6_ONLY | ≥1 (legacy Create markers) |
| OUT_OF_SCOPE | 902:* + future signals |
| Already GREEN closed | B1–B4 set + Chats/Search/Graphs/Detail/Calls Incoming |
| MISSING_FIGMA_AUTHORITY | **0** |
| **B5_COMPLETE** | **NO** |

## B5.2 final remaining closure

| Surface | Node | Before | After | Status |
|---------|------|--------|-------|--------|
| Person Profile | 618:1257 | 0.1706 | **0.0769** | **GREEN** |
| Calls Incoming | 618:581 | 0.0988 | **0.0396** | **GREEN** |
| Calls Audio | 618:599 | unproven | **0.0422** | **GREEN** |
| Calls Video | 618:620 | unproven | **0.0206** | **GREEN** |
| Calls Group | 618:642 | unproven | **0.0286** | **GREEN** |
| Global Opal | 618:902 | 0.2159 | **0.0171** | **GREEN** |
| Home | 618:44 | 0.1853 | **0.1854** | PARTIAL |

### Home Wave A classification (B5.2)

| Region | Residual | Classification |
|--------|----------|----------------|
| Header 0–58 | ~0.086 | Wave B shell — 618:48 NO wordmark CSS restored |
| Stories 58–180 | ~0.169 | Current authority layout + cast/rings |
| Feed upper 180–360 | ~0.037 | Aligned |
| Feed mid/lower | ~0.12–0.28 | FOUNDER_CAST / Wave A feed objects |
| Pre-dock 700–758 | ~0.633 | Wave A feed tail / Live treatment — freeze respected |
| Dock | ~0.238 | Shared dock (frozen greens unaffected) |

**Decision:** Home remains PARTIAL. Further reduction would reopen frozen Wave A feed objects or invent cast. No MISSING_FIGMA.

## Counts (post-B5.2)

| Bucket | Count |
|--------|-------|
| B5 runtime PARTIAL remaining | **1** (Home 618:44) |
| CALLS_FORMAL_STATUS | **GREEN** (Incoming+Audio+Video+Group) |
| FOUNDER_REVIEW | 1 (Activity) |
| B6_ONLY | ≥1 |
| MISSING_FIGMA_AUTHORITY | **0** |
| **B5_COMPLETE** | **NO** |
