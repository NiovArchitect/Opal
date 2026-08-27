# HOME DESTINATION VISUAL MATRIX

**Date:** 2026-08-20  
**HOLD. Home action destination fidelity = MAJOR_DIFF. Home interaction gate = NOT CLOSED.**

Markers (`data-figma-node`) are **not** visual proof. Statuses below are from Figma screenshot vs runtime screenshot + measured geometry.

| Destination | Figma node | Reference | Runtime | Dock (Figma) | Visual status | Functional status |
| --- | --- | --- | --- | --- | --- | --- |
| Memory Detail | 437:3 | `references/FIGMA_437_3.png` | `runtime/VISUAL_RUNTIME_437_3.png` | Visible | **MAJOR_DIFF** | Routes + entity id |
| Comments | 437:69 | `references/FIGMA_437_69.png` | `runtime/VISUAL_RUNTIME_437_69.png` | Visible under sheet | **MAJOR_DIFF** | Sheet Close + composer |
| Forward / Send to | 437:133 | `references/FIGMA_437_133.png` | `runtime/VISUAL_RUNTIME_437_133.png` | Visible | **MAJOR_DIFF** | Separately/Together |
| Discovery Detail | 437:200 | `references/FIGMA_437_200.png` | `runtime/VISUAL_RUNTIME_437_200.png` | Visible | **MAJOR_DIFF** | Save idea / Graph this |
| Graph Ready Detail | 373:385 | `references/FIGMA_373_385_GRAPH.png` | `runtime/VISUAL_RUNTIME_GRAPH_DETAIL.png` | Visible | **MAJOR_DIFF** | Ready card + directions CTA |
| Story viewer | 357:418 | `references/FIGMA_357_418_STORY.png` | `runtime/VISUAL_RUNTIME_STORY.png` | Hidden (immersive) | **MAJOR_DIFF** | Opens / dismiss |
| Profile / person | 201:10 | `references/FIGMA_201_10_PROFILE.png` | (avatar tap path) | Visible | **MAJOR_DIFF** | Not visually closed |
| Search | 373:261 | `references/FIGMA_373_261_SEARCH.png` | — | Visible | **NOT_IMPLEMENTED** from Home | FIGMA NAVIGATION GAP |

## Measured Figma targets (390 viewport)

### 437:3 Memory
- Brand y≈18; title “Memory” y=76 h=44; lede y=116  
- Avatar 42×42 at y=170; media 350×330 at y=228  
- Engagement circles 34×34 at y=620; dock at y=758  

### 437:69 Comments
- Brand + title/lede page; modal sheet 366×560 at (12,164)  
- Sheet-local Close text; composer at sheet bottom  

### 437:133 Forward
- Brand + “Send to” + lede; people 68×68 grid  
- Separately/Together at y=466; Continue 342×56 at y=540  
- **No Cancel** in Figma; dock is exit  

### 437:200 Discovery
- Experience title (Figma sample “Rooftop Jazz”); media 350×292  
- Save idea + Graph this 52px CTAs; dock visible  

### 373:385 Graph
- “Juniper & Ivy” + Ready pill; Leave by execution card  
- Open directions CTA; dock visible — **not** marker+Close only  

## Pass repairs applied (still MAJOR_DIFF)

- Removed invent visible Close/Cancel chrome from Memory / Forward / Discovery (hooks retained for automation)  
- Graph detail rewritten toward Ready execution card (373:385), not segment-list-only shell  
- Option B dock z-index raised to 70 so destinations do not bury the dock  
- Forward avatar grid 68px; Memory media height 330; Discovery media 292; engagement icon circles 34  

Honest classification remains **MAJOR_DIFF** until founder accepts screenshots.
