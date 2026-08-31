# B3.1 — Region isolation + closure

**Starting HEAD:** `e49e2c9` · **Threshold:** `0.12` · **B3_COMPLETE:** YES

## Before (dominant mismatch)

| Screen | Full ratio | Dominant region | Share | Notes |
|--------|------------|-----------------|-------|-------|
| Privacy | 0.1295 | rows | 0.769 | toggles_col 0.145; dock 0.068 |
| Calls | 0.1389 | rows | 0.772 | toggles_col 0.188; lede 0.121 |
| Feed | 0.1328 | rows | 0.799 | toggles_col 0.173; note 0.204 |
| Engagement | 0.1253 | rows | 0.803 | toggles_col 0.182; note 0.208 |
| Edit Profile | 0.1401 | rows+note | 0.612+0.481 | avatar/fields rhythm |

## Root cause (proven, not guessed)

1. **Stage offset:** nested pane lived inside `main.pane` under `.topbar` (y+68). Absolute Figma rhythm (title@76) rendered at ~144.
2. **Dock clearance scroll:** `.app[data-member-nav="true"] .scroll { padding-bottom: var(--dock-clearance) !important }` beat nested `padding:0`, leaving `scrollTop≈63` on Calls (and similar).
3. **Toggle x:** trail padding placed toggles at x=266; Figma requires **314×48×28**.
4. **Copy drift:** Feed / Engagement / Edit Profile / Delete / Calls note text did not match live Figma nodes (design-context).
5. **Delete structure:** warning card 154px + confirm@354 + dual actions — not generic 74px rows.

## Figma measured rhythm (authority)

| Family | Title | Lede | Row1 label | Pitch | Toggle |
|--------|-------|------|------------|-------|--------|
| Privacy / Calls / Location… | 20,76 h34 | 20,116 | 172 | 74 | 314,y 48×28 |
| Feed / Engagement | 20,76 h42 (30px) | 20,116 h40 | 180 | 74 | 314,184… |
| Edit Profile | 20,76 h38 | 20,116 | fields@310/388/466 | — | avatar 145,160 100×100 |
| Delete | 20,76 | 20,116 | warning@172 h154 | — | confirm@354; actions@456/518 |

## After (B3.1 formal)

| Surface | Node | After diff | Status |
|---------|------|------------|--------|
| You hub | 618:1344 | 0.1016 | GREEN |
| Privacy | 618:1524 | 0.0975 | GREEN |
| Location | 618:1591 | 0.0954 | GREEN |
| Spending | 618:1662 | 0.1043 | GREEN |
| Calls | 618:1733 | 0.1012 | GREEN |
| Feed | 618:1801 | 0.0936 | GREEN |
| Engagement | 618:1868 | 0.0885 | GREEN |
| Notifications | 618:1935 | 0.1146 | GREEN |
| Linked Devices | 618:2003 | 0.0759 | GREEN |
| Safety | 618:2060 | 0.0981 | GREEN |
| Edit Profile | 618:2123 | 0.1018 | GREEN |
| Account | 618:2180 | 0.0992 | GREEN |
| Delete | 618:2243 | 0.0729 | GREEN |

**Responsive matrix:** 375 / 390 / 393 / 430 × 13 surfaces = all OK (`B3_1_RESPONSIVE_MATRIX.json`).

**Shared component changes:** Section 06 stage CSS (fixed full-phone stage, toggle@314, 74px pitch) + screen-specific Feed/Engagement/Edit/Delete/Calls overrides. GREEN screens re-proven GREEN after shared fix.
