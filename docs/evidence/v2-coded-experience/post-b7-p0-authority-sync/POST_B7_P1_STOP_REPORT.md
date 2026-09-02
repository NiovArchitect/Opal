# POST-B7 P1 STOP REPORT — Objective Founder-Walk Defect Closure

**Pass:** POST-B7 P1 · FW-D1 → FW-D4 ONLY  
**Starting HEAD:** `9727bc0`  
**Not P2/P3/P4.** No proposal promotion.

---

## A. HOLD

```
HOLD.
DO NOT MERGE.
permissionToStartLive = NO.
NO LIVE.
FOUNDER_ACCEPTED = NO.
FOUNDER_WALK_READY = NO   (recheck required after defect closure)
FOUNDER_RECHECK_READY = YES
```

## B–D. Start

Clean tree at `9727bc0`. P0 package present. No unexpected product drift before edits.

## E–C. Figma current

`618:2` unchanged. `928:3` / `965:2` / `975:2` / `902:*` **not promoted**.  
`NEW_CURRENT_SURFACES_PROMOTED = 0`

## Causes proved + fixes

### FW-D3 Graph spine (`618:674`)
- **Cause:** Nodes not on spine axis; glow gradient transparent through face.  
- **Fix:** `--graph-spine-x: 52px` (stage abs), pad-aware rail/card/dot math; opaque node core; rail z=0 / dots z=2.  
- **Proof:** spineCenter **52**, max node delta ≤1px, layering GREEN.

### FW-D4 Centered stage
- **Cause:** `.ogsn-graph-detail` forced `left: 0 !important` while `.app` is centered → destination pops left of phone shell on wide viewports; conflicting max-width 480 rules.  
- **Fix:** Stage-bound 390 + `left: 50%; translateX(-50%)` for Graph Detail and shared fixed destinations; spectralTokens aligned.  
- **Proof:** dx=0 at 375/390/393/430; Back → Graphs OK.

### FW-D1 Outgoing ≠ Incoming
- **Cause:** User `onCall` mounted `kind: "incoming"` (618:581 Answer/Decline).  
- **Fix:** User-initiated Call/Video → `direction: "outgoing"` + active `audio`/`video`/`group`. Incoming UI only when direction+kind incoming.  
- **Interim:** `OUTGOING_RINGING_UI = NOT_CURRENT_AUTHORITY / P2_AFTER_928_PROMOTION`; `AV_TRANSPORT = DEPENDENCY`.  
- **Proof:** Direct Call → audio/outgoing, no Answer/Decline, status ≠ “is calling”.

### FW-D2 Call copy overlap
- **Cause:** Wrong inbound surface + underlying Direct chrome could remain perceptible when stage misaligned.  
- **Fix:** D1 path correction + `body[data-call-surface-open]` hides gpt-header/dated-conv/composer/thread/tabbar while call owns viewport.  
- **Proof:** gptHeaderVisible=false; call stage aligned.

## Gates

```
FW_D1_OUTGOING_INCOMING = GREEN
FW_D2_CALL_COPY_OVERLAP = GREEN
FW_D3_GRAPH_SPINE_CENTERING = GREEN
FW_D3_GRAPH_SPINE_LAYERING = GREEN
FW_D4_CENTERED_STAGE = GREEN
FW_D4_DESTINATION_MOUNT_STABILITY = GREEN
RESPONSIVE_MATRIX = GREEN
GLOBAL_OPAL_INTEGRITY_GUARD = GREEN
POST_B7_P1_COMPLETE = YES
FOUNDER_RECHECK_READY = YES
FOUNDER_ACCEPTED = NO
NEW_CURRENT_SURFACES_PROMOTED = 0
CALLS_CONTINUITY_CURRENT = NO
SIGNAL_GRAMMAR_CURRENT = NO
DECISION_INTELLIGENCE_CURRENT = NO
MERGE = NO
LIVE = NO
permissionToStartLive = NO
```

## Product code changed

**YES** — only D1–D4 owners (`OpalApp.tsx`, `CallSurfaces.tsx`, `styles.css`, `spectralTokens.css`).

## Evidence

- `P1_DEFECT_CLOSURE_PROOF.json`  
- `p1/RUNTIME_GRAPHS_SPINE.png`  
- `p1/RUNTIME_GRAPH_DETAIL_STAGE.png`  
- `p1/RUNTIME_OUTGOING_CALL.png`  
- Harness: `apps/opal_web/scripts/prove_p1_defects.mjs`

## Founder verification URL

```
http://127.0.0.1:5173/?opal_reset_first_run=1&opal_founder_seed=1&runtime=ebb1c2d
```

### Recheck path
1. Graphs — spine on node centers, line behind glow  
2. Open Graph — stage stays in phone  
3. Back / reopen — no lateral jump  
4. Direct — Call  
5. No Answer/Decline on outbound  
6. No overlapping Direct chrome  
7. Video outbound  
8. Widths 375–430 if practical  

## Remaining map — DO NOT AUTO-START

- **P2** Calls Continuity — only after `928:3` promotion  
- **P3** Signal Grammar — only after `965:2` promotion  
- **P4** Decision Intelligence — only after `975:2` promotion  
- **P5** integration / learning / provenance  

```
STOP AFTER POST-B7 P1.
HOLD.
PRESERVE → EXTEND → COMPOUND.
CORRECT CURRENT PRODUCT FIRST.
THEN PROMOTE NEW AUTHORITY DELIBERATELY.
```
