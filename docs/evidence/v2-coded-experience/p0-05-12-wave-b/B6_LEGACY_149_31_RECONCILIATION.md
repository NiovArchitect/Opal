# B6 — Legacy 149:31 Reconciliation

**Law:** Current Figma wins. Do not reintroduce 149:31 as visual authority.  
**Current Create authorities:** `863:284` Create Media · `863:338` Add to Graph  
**Lineage attrs on product (retain):** `data-figma-create-lineage="149:31"|"145:216"`

---

## Classification key

| Code | Meaning |
|------|---------|
| **A** | SAFE TO UPDATE TO CURRENT AUTHORITY |
| **B** | HISTORICAL PROOF ONLY — RETAIN BUT DO NOT RUN AS CURRENT |
| **C** | DELETE / RETIRE BECAUSE IT ASSERTS REJECTED PRODUCT |
| **D** | STILL REQUIRED FOR LINEAGE |

---

## Findings

| Asset | Kind | Expects | Classification | Action taken in B6 |
|-------|------|---------|----------------|--------------------|
| `scripts/ogx_chats_create_browser_proof.mjs` | Executable | `figma149 === "149:31"` and `145:216` as **current** pass gate | **B** (was acting as current → retire) | Banner + early exit unless `OPAL_RUN_HISTORICAL=1`. Current Create proof = `prove_b4_create.mjs` |
| `scripts/ogx_home_social_closure_proof.mjs` | Executable | `data-figma-create === "149:31"` | **B** | Same retire pattern; Create assert path not current |
| `apps/opal_web/src/opalUi/GraphCreateFlow.tsx` | Product | `data-figma-create` = 863:* ; lineage = 149:31/145:216 | **D** for lineage attrs; current stamps already correct | **NO PRODUCT CHANGE** |
| `docs/evidence/.../BROWSER_PROOF_CHATS_CREATE_HOME.json` | Historical evidence | records `figma149: "149:31"` | **D** / immutable historical | **PRESERVE** — do not mutate to 863:* |
| `docs/evidence/.../CREATE_GRAPH_RECONCILIATION.md` | Historical doc | maps 149:31 → choose_media | **D** | PRESERVE; superseded by B4 intent lock |
| `docs/evidence/.../DEAD_TAP_AUDIT_CHATS_HOME.md` | Historical | Create → 149:31 | **D** | PRESERVE |
| `docs/evidence/.../V2_3_1_HOLISTIC_RECONCILIATION.md` | Historical | lists 149:* family | **D** | PRESERVE |
| `B5_REMAINING_PARTIAL_*` | Inventory | labels 149:31 as **B6_ONLY** | **D** | PRESERVE; debt closed by this recon |
| `prove_b4_create.mjs` | Current executable | 863:284 / 863:338 | already current | KEEP |

---

## Explicit non-actions

- Do **not** change product `data-figma-create` back to 149:31 to satisfy ogx scripts.
- Do **not** rewrite historical evidence JSON/MD node IDs.
- Do **not** delete lineage attributes from GraphCreateFlow.
- Do **not** treat 149:31 as CURRENT presentation comparison target.

---

## Result

| Metric | Value |
|--------|-------|
| Executable scripts still asserting 149:31 as current (post-B6) | **0** (retired) |
| Historical records retaining 149:31 | preserved |
| Current Create formal proof | `B4_CREATE_PROOF.json` @ 863:284 / 863:338 |
