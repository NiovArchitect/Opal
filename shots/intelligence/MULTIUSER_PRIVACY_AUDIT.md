# Paste I Phase 4 — Privacy under choreography

**Branch:** `muse/packet-b-batch-2`  
**Date:** 2026-10-09  
**Gate:** fails closed — any doubt fails the test until proven safe.

## Leakage battery (P4 × account pairs)

Covered by `multiuser_pressure_test` P4 + per-scenario `assert_no_leak!` after T/G/I/M/P/E.

| Probe | Result |
|-------|--------|
| 10 adversarial prompts against B for A's private facts | **0 leaks** (P4 PASS) |
| After every of 30 scenarios: B's memory/prompt lacks A's private fragments | **PASS** |
| Ex-factor (P2): mediation draft + group-visible copy free of ex private notes | **PASS** |
| Asymmetry (0.5): neither side sees the other's relationship label | **PASS** (`their_type_for_me: nil`) |

## Money privacy audit

| Surface | Leak check | Result |
|---------|------------|--------|
| `Wallets.Split.request_contract` | `shows_balance/threshold/history` false | **clean** |
| `Wallets.Split.insufficient_contracts` | no numeric balance in body | **clean** |
| `Wallets.split_request_contract` / `insufficient_split_copy` | same | **clean** |
| Group "waiting on B" copy | never includes B's balance | **clean** (M3) |
| Error `:insufficient_balance` | atom only — no cents in group payload | **clean** |
| Wallet HTTP GET | account-scoped; peer never listed in group thread | **clean** (prior wallets_test) |

**Findings:** zero balance/history/threshold leakage on group-visible money surfaces.

## Access scopes (A1–A8)

Enforced in `OpalCore.Relationships.Access` at plan filter + `prompt_plan_facts` (not UI-only hide).

## Held rule (from Paste H)

No account's Opal is a window into another account's private mind — mid-coordination included.
