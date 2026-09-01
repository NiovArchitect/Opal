# B5.4 STOP REPORT — Cast-safe Home + Global Opal structured pixel

**Square:** B5.4 FINAL CAST-SAFE HOME RECONCILIATION + GLOBAL OPAL STRUCTURED PIXEL CLOSURE  
**Starting HEAD:** `f37b000`  
**Authority:** Figma `618:2` · Home `618:44` · Global Opal `618:902`

---

## A. HOLD

```
HOLD.
DO NOT MERGE.
permissionToStartLive = NO.
NO LIVE.
FOUNDER_WALK_READY = NO.
Activity = FOUNDER_REVIEW.
DO NOT BEGIN B6.
DO NOT BEGIN B7.
```

---

## E. Founder authorization recorded

| Decision | Value |
|----------|-------|
| HOME_FIXTURE_CAST_ALIGNMENT_TO_618_44 | **YES** |
| WAVE_A_REOPEN | **NO** |
| ACTIVITY_ICON_RESOLUTION | **NO** |

---

## F–I. Global Opal

| Metric | Result |
|--------|--------|
| Mode | **A. STRUCTURED_UI_WITH_DECORATIVE_UNDERLAY** (no raster regression) |
| Integrity | **GREEN** |
| Formal before | 0.1291 |
| Formal after | **PARTIAL 0.1261–0.1274** |
| Gate | ≤0.12 |
| Complete | **NO** |

### Regional residuals (dominant)

| Region | ~diffRatio |
|--------|------------|
| Header | 0.046 |
| Neural field | 0.055 |
| Context | 0.081 |
| Idea cards | 0.17–0.19 |
| Refine | 0.14 |
| Composer | 0.095 |
| Dock | 0.165 |

Surgical work done: Figma context/refine icons, exact idea geometry, wordmark cyan/violet, neural-field decorative only.  
Integrity regression: dynamic/controls/composer/graph mutation/responsive still GREEN.  
Remaining ~0.006–0.007 is idea-card paint + shared dock AA — **not** screenshot/hotspot debt.

---

## J–T. Home fixture/cast

### Domain owners used

| Owner | Role |
|-------|------|
| `composeHomeFeed` / `homeHydration.ts` | Authority feed order 01→07 |
| `FOUNDER_HOME_FEED` / `FOUNDER_LIVE_FEED` | Cast content |
| `FOUNDER_STORIES` | Stories rail |
| `BRAND_ASSETS.headerActivity` → `705:2` PNG | Activity icon asset only (still FOUNDER_REVIEW) |

### Authority order (proven)

1. `seed-consequence-chanelle` (618:84)  
2. `seed-maya-fletcher` (618:124)  
3. `seed-jordan-market` (618:149)  
4. `seed-discovery-nina-ceramics` (618:182)  
5. `seed-alex-carousel` (618:194)  
6. `seed-live-sabrina` (618:211)  
7. `seed-riley-memory-voice` (618:226)  
→ then fill cards for continuous scroll  

Stories: Your Story · Chanelle 1h · Maya 3h · Jordan 6h · Sabrina 11h · Alex 18h  

### Geometry locks (no Wave A reopen)

- Consequence card: **exact 366×366 @ y194** (was 372 — fixed shift)  
- Maya memory: **500h @ y576**; media **338×286** locked (was flex-shrunk)  
- Corrected Figma reference: top-844 of native **390×3040** frame (prior scaled capture invalidated)

### Live copy alignment

`Rooftop jazz · Downtown` / `Live by Sabrina · hosted by Jordan` / `Maya 8 min away · Sadeil + 3 are here`

### Wave A

No Story geometry rewrite. No Live semantics change. No dock redesign. No component replacement.

---

## V. Activity diagnostic (FOUNDER_REVIEW)

| Field | Value |
|-------|-------|
| Bounds | x338–380, y8–50 (`618:54` / icon `705:2`) |
| Regional diffRatio | ~0.29 |
| Hot-pixel share of full frame | **~0.0016** |
| Runtime icon | people+pulse PNG (`705:2`) |
| Figma icon | people+pulse FOUNDER_REVIEW_REQUIRED |
| Status | **FOUNDER_REVIEW** |

Activity is **not** the Home blocker (share &lt; 0.2% of frame).

---

## W–Y. Home formal

| Metric | Value |
|--------|-------|
| HOME_FULL_DIFF_RATIO | **PARTIAL ~0.181** |
| HOME_NON_ACTIVITY_RESIDUAL | **~0.180** |
| HOME_IMPLEMENTATION_EX_ACTIVITY | PARTIAL |
| HOME_AUTHORITY_CONFLICT | **YES — residual beyond Activity** (Maya photo paint/offset, stories rings, dock) |

Upper feed (consequence) ~0.07 — strong. Lower residual dominated by Maya photo region paint + dock.

---

## AW. Final statuses

```
GLOBAL_OPAL_FORMAL_PARITY = PARTIAL (~0.126)
GLOBAL_OPAL_IMPLEMENTATION_INTEGRITY = GREEN
GLOBAL_OPAL_COMPLETE = NO

HOME_FORMAL_PARITY = PARTIAL (~0.181)
HOME_IMPLEMENTATION_EX_ACTIVITY = PARTIAL
HOME_AUTHORITY_CONFLICT = YES — residual beyond Activity
ACTIVITY_ICON = FOUNDER_REVIEW

PERSON_PROFILE_FORMAL_PARITY = GREEN
CALLS_FORMAL_STATUS = GREEN
B5_RUNTIME_PARTIALS_REMAINING = Home + Global Opal formal
MISSING_FIGMA_AUTHORITY = 0
FOUNDER_REVIEW = Activity icon (705:2)
B6_ONLY = legacy/proof infrastructure debt
B5_COMPLETE = NO
```

---

## AZ. Remaining map

**B5 not complete.** Do not begin B6.

Next options for founder:

1. Continue structured Opal pixel polish (~0.006 to gate) + Maya photo/stories paint without Wave A reopen  
2. Accept near-gate Opal + Home PARTIAL with Activity FOUNDER_REVIEW  
3. Explicit Activity icon decision (separate from Home cast)

---

## AL. ABSOLUTE STOP

```
STOP AFTER B5.4.
HOLD.
DO NOT MERGE.
permissionToStartLive = NO.
NO LIVE.
FOUNDER_WALK_READY = NO.
PRESERVE → EXTEND → COMPOUND.
ALIGN REAL FIXTURES.
PROTECT WAVE A.
KEEP AI STRUCTURED.
```

Evidence: `B5_4_CLOSURE_PROOF.json`, `B5_4_OPAL_REGION_DIFF.json`, runtime/diff/overlay captures.
