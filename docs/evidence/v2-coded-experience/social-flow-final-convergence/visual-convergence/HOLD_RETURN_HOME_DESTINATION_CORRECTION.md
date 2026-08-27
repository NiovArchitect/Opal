# HOLD RETURN — Home action destination correction

**HOLD. DO NOT MERGE. permissionToStartLive = NO.**

**Home overall: MAJOR_DIFF**  
**Home action destination fidelity: MAJOR_DIFF**  
**Home interaction gate: NOT CLOSED**  
**Dock/nav mechanics: improved (preserved) — pending founder confirmation**

Stopped. Did not start Chats / Graphs / Opal / Journey / Live.

---

## A. Repo state

| Item | Value |
|---|---|
| Branch | `build/v2-coded-experience-closure` |
| HEAD tip | `cb1bd43` |
| Functional baseline | `7078cd7` |
| Dirty | Pre-Live repairs + Home visual/nav/destination work uncommitted |
| Product SHA | still baseline `7078cd7` (no merge SHA) |

---

## B. Wrong-destination root causes

1. Shared `social-sheet-close` × chrome erased Figma-distinct dismiss patterns.
2. Forward used list/“Forward” title instead of **Send to** grid + Separately/Together + Continue.
3. Comments needed sheet-local **Close** + modal sheet, not header ×.
4. Memory Detail needed **Memory** title/lede + brand-only header; Close is bottom dismiss, not giant Back.
5. Discovery needed experience title + Save idea / Graph this per 437:200.
6. Graph detail still legacy layout (marker → 373:385; visual not EXACT).
7. Search entry on Home Header is **NOT_IMPLEMENTED** (287:7 frozen; 373:261 has no designed Home entry).

---

## C. Tap → Figma matrix

See `HOME_TAP_DESTINATION_MATRIX.md` (exhaustive).

---

## D. Repairs by control

| Destination | Repair |
|---|---|
| 437:3 Memory Detail | Rewrote to brand + Memory title/lede + media + actions + lineage + Close dismiss; `data-screen=social-memory-detail` |
| 437:69 Comments | Brand + title/lede + modal sheet with count + **Close** + Send composer; `data-screen=social-comments` |
| 437:133 Forward | **Send to** + people grid + Separately/Together + Continue + Cancel; `data-screen=social-forward` |
| 437:200 Discovery | Experience title + media + Save idea / Graph this + Follow law; `data-screen=social-discovery-detail` |
| Graph detail | Identity markers `data-figma-node=373:385`; Close instead of giant Back |
| Story | `data-figma-node=357:418` identity |

Nav repairs (active dock, transparency, clearance, Home-root vs Back) **preserved**.

---

## E–G. Evidence counts

From `HOME_DESTINATION_ROUTING_PROOF.json`:

| Suite | Total | Passed / Correct | Failed |
|---|---:|---:|---:|
| Home tap routing | **8** | **7** | **1** (Search NOT_IMPLEMENTED) |
| Destination visual identity | **11** | **11** | **0** |
| Back restoration | **2** | **2** | **0** |
| Home-root return | **2** | **2** | **0** |

Vitest (homeSocialActions + graphSocialHome): **16 passed**  
ExUnit pre-Live zero-trust: **5 passed**

References: `references/FIGMA_437_3.png`, `_69`, `_133`, `_200`  
Runtime: `runtime/RUNTIME_437_*`, `RUNTIME_GRAPH_DETAIL.png`

---

## H. Privacy / zero-trust

Pre-Live zero-trust suite still green (5/5). No fixture-production leakage introduced. Follow ≠ Connection / Interested ≠ Going laws retained.

---

## I–J. SHA / CI

No new product SHA. No CI push. HOLD.

---

## K. Founder walk

`http://127.0.0.1:5173/?opal_reset_first_run=1`

1. Home  
2. Conversation Open Graph → expect Graph detail identity  
3. Close / Back → feed  
4. Memory media → **Memory** title (437:3)  
5. Close  
6. Comments → sheet **Close** (437:69)  
7. Close  
8. Forward → **Send to** + Separately/Together  
9. Cancel  
10. Discovery → Save idea / Graph this  
11. Home tab from nested → root feed  
12. Dock active coherence still  
13. Search — still missing (honest gap)

---

## L. Verdict

**Home remains MAJOR_DIFF.**  
Destination **identity wiring** improved (correct `data-figma-node` / screen contracts per tap).  
Destination **visual EXACTNESS** vs Figma is **not** claimed.

**Home interaction gate: NOT CLOSED.**

**STOP.**

**HOLD. DO NOT MERGE. permissionToStartLive = NO.**
