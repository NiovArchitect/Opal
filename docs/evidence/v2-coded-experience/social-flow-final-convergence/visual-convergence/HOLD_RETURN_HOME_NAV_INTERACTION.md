# HOLD RETURN — Home social-surface navigation + interaction

**HOLD. DO NOT MERGE. permissionToStartLive = NO.**

Stopped after Home social-surface pass. Did **not** start Chats / Graphs / Opal / Journey / Live.

---

## Laws implemented

### 1. Dock active coherence (one source of truth)

- Icon + label share `currentColor` via CSS mask icons (Home no longer baked `#6EE8F5`).
- Only the active primary tab is cyan; leaving Home deactivates Home icon.
- Proof: Chats/Graphs/You active ⇒ Home inactive icon color `rgb(145, 158, 178)`.

### 2. No black rectangular plate under Option B

- Root cause: `[data-technicolor="controlled"] .tabbar { background: rgba(5,6,10,0.94) }` in `technicolorProduction.css`.
- Fix: exempt `.tabbar-option-b` → `background: transparent !important`.
- Dock container computed transparent.

### 3. Bottom content clears floating dock

- `--dock-clearance: calc(108px + safe-area)` on Home / Chats / Graphs / social sheets.
- Absolute scroll bottom: final card bottom ≤ dock top.

### 4. Home tab = root Home; Back = prior context

- `goToHomeRoot()` / `selectPrimaryTab("home")` dismisses Home children (Comments, Memory detail, Forward, Discovery, Story, Graph detail, Journey sheets, Live surface, Opal ambient, profile).
- `scrollTopToken` scrolls root feed to top on Home destination.
- Contextual Close/Back still bumps `homeScrollToken` to restore prior scroll.

### 5. Compact Close (not giant Back)

- Comments / Memory detail / Forward / Discovery use `.social-sheet-close` (×) per Figma 437:* grammar.
- Comments lede: “Stay on the post…”

### Frozen

- Stories `287:20` EXACT — re-asserted one row.
- Header `287:7` EXACT — untouched.

---

## Browser proof

`scripts/visual_home_nav_interaction_proof.mjs` → **`HOLD_HOME_NAV_INTERACTION_PASS`** (failed: 0)

Evidence:

- `15_BROWSER_NAV_INTERACTION_PROOF.json`
- `runtime/RUNTIME_NAV_HOME_DOCK.png`
- `runtime/RUNTIME_NAV_CHATS_ACTIVE.png`

Vitest: graphSocialHome + homeSocialActions **16 passed**  
Pre-Live zero-trust ExUnit: **5 passed** (preserved)

---

## Honest Home exit status

| Gate | Status |
|---|---|
| Stories / Header | EXACT — FROZEN |
| Dock active coherence | **PASS** |
| Dock transparency | **PASS** |
| Bottom clearance | **PASS** |
| Home-root vs Back | **PASS** |
| Compact Comments chrome | **PASS** |
| Feed object EXACT vs Figma | still **CONVERGING / MAJOR_DIFF overall** |
| Carousel fully social-native | still **PARTIAL** |
| Full social-destination visual EXACT (437:*) | not fully EXACT |

**Home overall remains MAJOR_DIFF** until object grammars are founder-accepted EXACT/MINOR.

This pass closes the founder-blocking **navigation/interaction** defects, not the full visual object EXACT gate.

---

## Founder walk

`http://127.0.0.1:5173/?opal_reset_first_run=1`

1. Home → Stories still one row  
2. Chats: Chats icon+label cyan; Home house **not** cyan  
3. Graphs / You: same coherence  
4. Open Comments → compact × Close (no giant Back)  
5. Tap Home → returns to root feed  
6. Scroll Home to bottom → last card clears dock; region around dock transparent  

---

**STOP.** Do not start Chats visual tranche.
