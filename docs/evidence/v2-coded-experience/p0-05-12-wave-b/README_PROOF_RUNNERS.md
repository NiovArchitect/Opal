# Wave B proof runners — canonical paths (B6)

**Canonical executable proves live in:**

`apps/opal_web/scripts/prove_b*.mjs`

Run from `apps/opal_web`:

```bash
node scripts/prove_b1_full_live.mjs
node scripts/prove_b2_communication.mjs
node scripts/prove_b21_direct.mjs
node scripts/prove_b3_section06.mjs
node scripts/prove_b4_create.mjs
node scripts/prove_b51_reconcile.mjs
node scripts/prove_b52_closure.mjs
node scripts/prove_b53_integrity.mjs
node scripts/prove_b6_guards.mjs
```

Evidence output always writes here:

`docs/evidence/v2-coded-experience/p0-05-12-wave-b/`

## Mirrors in this directory

`prove_b1_full_live.mjs`, `prove_b2_communication.mjs`, `prove_b3_section06.mjs`, `prove_b4_create.mjs` may exist as **lineage mirrors**. Prefer the apps copies.

## Do not run as current B6 proof

| Script | Why |
|--------|-----|
| `prove_b7.mjs` | B7 HOLD — do not auto-start |
| `prove_12a_closure.mjs` | Pre-Wave-B historical |
| `scripts/ogx_*` | Retired; legacy 149:31 asserts |

## Historical evidence

Do not edit old `*_PROOF.json` to retroactively change status. New truth goes in new packages + `OPAL_CURRENT_AUTHORITY.yaml`.
