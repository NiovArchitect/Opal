# Proof Harness Stabilization

**Date:** 2026-08-13  
**Branch:** `build/v2-coded-experience-closure`  
**Command:** `node scripts/live_jordan_foundation_proof.mjs --repeat 3`

## Result

**ALL PASS** — 3/3 independent episodes

| Run | Conversation | Product fails | Fixture fails | Env fails |
|-----|--------------|---------------|---------------|-----------|
| r1 | `47a25cc7-…` | 0 | 0 | 0 |
| r2 | `08ff3db3-…` | 0 | 0 | 0 |
| r3 | `cabd7fcc-…` | 0 | 0 | 0 |

Each run creates a **new namespaced** Jordan dinner episode at place-open. No mature-thread contamination.

## Fixture strategy

`scripts/founder_proof_fixture.mjs`

- Owns: founder + jordan user ids, conversation_id, invitation_id, episode_id  
- Invite key: `proof-inv-jordan-t2p-{episode}`  
- Seeds fixed message script once  
- Asserts precondition: `next_gap=place` before UI  
- Classification: `PASS | FIXTURE_FAIL | PRODUCT_FAIL | ENVIRONMENT_FAIL`

## Brand chrome

Home: topbar `OpalLockup` suppressed; single `V2BrandRow` field mark.  
`mark_img_count=1` on all three runs.  
**Not brand closure** — 93:* still empty.

## Founder command

```bash
# One-shot clean Jordan place-open proof (3×)
node scripts/live_jordan_foundation_proof.mjs --repeat 3

# Or prepare fixture only
node scripts/founder_proof_fixture.mjs
```

URL: http://127.0.0.1:5173 · +12025550101 / 111111
