# Intelligence Canon Remote Durability + CI Enforcement Closure

**Date:** 2026-08-13  
**Branch:** `build/v2-coded-experience-closure`  
**Prior canon:** `fbaabed` (constitution), `3b6ca9b` (enforcement)  
**V2 merge:** **HOLD**

## Jobs completed

1. Remote durability of governance commits (push committed history only)  
2. Minimal path-filtered GitHub Actions intelligence gate  
3. Negative prove A–E (broken canon fails closed)

## One-command entry

| Mode | Command |
|------|---------|
| FAST | `./scripts/intelligence_check.sh` |
| IMPACT | `./scripts/intelligence_check.sh --impact` |
| INTELLIGENCE CHANGE | `./scripts/intelligence_check.sh --impact --with-tests` |
| FULL | `./scripts/intelligence_check.sh --full` |
| LIVE | optional/manual only |

## CI

- Workflow: `.github/workflows/intelligence.yml`
- Classifier: `scripts/intelligence_ci_classify.mjs`
- Fail-closed: `scripts/intelligence_negative_prove.mjs`

## Negative prove (fail-closed)

| ID | Violation | Exit | Restored |
|----|-----------|------|----------|
| A | version mismatch | 1 | yes |
| B | unknown dependency | 1 | yes |
| C | missing episode path | 1 | yes |
| D | removed invariants test | 1 | yes |
| E | incomplete supersession | 1 | yes |

`node scripts/intelligence_negative_prove.mjs` → **PASS**

## Dirty V2 product work

Left uncommitted and unpushed as working tree only — not part of governance durability.
