# PR #62 visual smoke (D-003)

**Author:** Grok (lead)  
**Head under test:** `9ee6129` (and prior visual commits on `fix/walkthrough-no-halo-aha`)  
**Route:** `http://127.0.0.1:5190/?visual-review=1`  
**Method:** Playwright Chromium, viewport 390×844 frame (`data-viewport="390x844"`)  
**Artifacts:** `docs/evidence/visual-experiments/pr62-screens/smoke-*.png`, `smoke-measures.json`

## Journey / Status

| Journey | Status | Notes |
|---------|--------|-------|
| B · Screen 1 · 390×844 | **PASS** | Exactly one wordmark `Opal`; kicker empty; mark 96×96; `data-halo=off`; `filter:none`; no `.scene-orbit` in DOM; Skip present |
| C · Join · 390×844 | **PASS** | Zero OPAL wordmarks; zero kickers; mark 96×96 (same token); Join button inside frame; Skip absent |
| A · Rejected halo demo · 390×844 | **PASS (contrast)** | `scene-orbit--rejected-demo` **display:block** only on panel A; product B/C still clean |
| B · reduced-motion | **PASS** | Same end-state: one wordmark, 96×96, no orbit, clean filter |
| C · reduced-motion | **PASS** | Same end-state: no wordmark, Join in frame, Skip absent |

## Founder checklist (rendered)

| Requirement | Result |
|-------------|--------|
| Screen 1: one OPAL wordmark | PASS (`words: ["Opal"]`, `kickers: []`) |
| Join: no OPAL name / no duplicate Join label | PASS (`words: []`, `kickers: []`, only CTA Join) |
| Same mark size both screens | PASS (96×96 both) |
| No halo / ring / orbit / bloom filter | PASS on B/C (`glow:false`, `clean:true`, `filter:none`, orbits empty) |
| Join button fully visible in 390×844 phone frame | PASS (`joinVisibleInFrame: true`) |
| Final Skip absent | PASS (`skipCount: 0` on C) |

## Measures (excerpt)

```json
{"name":"smoke-B-screen1-390","words":["Opal"],"kickers":[],"marks":[{"w":96,"h":96}],"orbits":[],"glows":[{"glow":false,"clean":true,"halo":"off","filter":"none"}],"skipCount":1}
{"name":"smoke-C-join-390","words":[],"kickers":[],"marks":[{"w":96,"h":96}],"orbits":[],"glows":[{"glow":false,"clean":true,"halo":"off","filter":"none"}],"joinVisibleInFrame":true,"skipCount":0}
```

## Merge recommendation

**Do not merge** until founder visual sign-off on panels B and C. Smoke is automated + measure-backed, not a substitute for founder approval.

## D-001 note

CI Public web previously failed because tests expected CSS tokens not present on `2191da9`. Fixed in `9ee6129` by adding `--walkthrough-logo-mark: 96px` and `[data-logo-size="walkthrough-hero"]` selectors without changing rendered size.

## D-004 evidence hygiene

Stale numbered captures `01-screen1-*.png` … `08-join-*.png` (taken before Join wordmark/kicker removal) were **deleted** so the folder only contains current `smoke-*` assets. Those old files showed the rejected Join layout (OPAL wordmark + JOIN kicker) and must not be used for founder sign-off.
