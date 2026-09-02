# P2.3 Calls Home `928:9` Region Analysis

**Before edits. Source:** P2.2 Figma/runtime/diff pair + fresh Figma `928:9` design context.  
**Full-frame before ratio:** `0.1378` (threshold `0.12`).

## Band residuals (approx contribution to full-frame)

| Region | Bounds | Band ratio | Full contrib | Likely cause | Classification |
|--------|--------|------------|--------------|--------------|----------------|
| row2 Juniper | 0,375 390×110 | 0.1808 | 0.0236 | Vertical shift + signal/fixture text + coral border missing | GEOMETRY + FIXTURE + PAINT |
| row4 Jordan | 0,595 390×110 | 0.1745 | 0.0227 | Vertical shift + signal label mismatch | GEOMETRY + FIXTURE |
| row3 Maya | 0,485 390×110 | 0.1737 | 0.0226 | Vertical shift + row chrome | GEOMETRY + PAINT |
| header title | 0,70 390×50 | 0.3229 | 0.0191 | Title/plus paint + ambient | PAINT + AA_ONLY mix |
| row1 Chanelle | 0,265 390×110 | 0.1317 | 0.0172 | Signal text + Open Graph link extra + phone glyph | FIXTURE + GEOMETRY |
| dock | 0,750 390×94 | 0.0944 | 0.0105 | Shared dock vs Figma Option B raster | SHARED_COMPONENT |
| mode switch | 0,140 390×50 | 0.0904 | 0.0054 | Pill metrics close; minor | GEOMETRY |
| filters | 0,190 390×45 | 0.0775 | 0.0041 | Missed lacks bordered pill chrome | GEOMETRY + PAINT |
| section label | 0,235 390×30 | 0.0559 | 0.0020 | Runtime UPPERCASE vs Figma “Recent” | TYPOGRAPHY |
| mid gap | 0,700 390×50 | 0.0231 | 0.0014 | Downstream of list shift | GEOMETRY |

## Dominant residual (ordered)

1. **Calls-mode search field present in runtime but absent in CURRENT `928:9`**  
   Shifts entire relationship list downward → multi-row GEOMETRY residual.  
   **Classification:** GEOMETRY (layout owner).  
   **Fix:** Hide search tools when `surface === "calls"` (New Call retains search).

2. **Signal / metadata copy not matching CURRENT Figma cast**  
   Figma: Chanelle `Sat 7:30 · Ready`; Juniper `Call back` + coral missed meta; Jordan `Graph updated`.  
   Runtime used longer / different labels + inline `Open Graph →` (not in Figma home row).  
   **Classification:** FIXTURE (align to CURRENT authority cast — not domain invention).

3. **Row chrome / phone control**  
   Figma: 104×350 cards, radius 20, border `#242e42`, phone 42px + exact SVG icon.  
   Runtime: emoji ☎, slightly different padding/radius.  
   **Classification:** GEOMETRY + ASSET.

4. **Filter pills**  
   Figma All/Missed are bordered rounded pills; runtime Missed is borderless text.  
   **Classification:** PAINT / GEOMETRY.

5. **Dock**  
   Shared product dock vs Figma proposal dock raster — expect residual; do not replace frozen dock.  
   **Classification:** SHARED_COMPONENT (document; do not reopen Wave B dock).

## Explicit non-fixes

- Do not remove people / invent people  
- Do not change Maya zero-signal truth  
- Do not alter Call / Story / Missed semantics  
- Do not replace member dock with Figma proposal raster  
- Do not lower 0.12  

## Planned owner corrections (smallest)

1. Hide `.chats-home-tools` on Calls surface  
2. Align filter/mode/row/phone CSS to Figma metrics locally under `.calls-continuity-home`  
3. Align `callsContinuitySeed` labels to CURRENT `928:9` cast text  
4. Remove inline `Open Graph →` from Calls Home signal row (Continuity retains Open Graph)  
5. Use exact callback icon asset from Figma  
