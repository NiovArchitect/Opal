# Repair #15 (Worker BC) — Test Report

Branch: `muse/repair-15-bc` on repair-14 tip `025a0289`.

## Suite results

| Run | Tests | Failures |
|---|---|---|
| Baseline (repair-14 tip, per task brief) | 2,655 | 0 |
| Targeted: `repair15_family_profile_test.exs` + `repair14_relationship_journeys_test.exs` | 44 (20 new + 24 R14) | 0 |
| **Full backend suite (`mix test`)** | **2,675** | **0** |
| Targeted re-run after `mix format` | 44 | 0 |

2,675 = 2,655 baseline + 20 new Repair #15 tests. No existing test was
modified, replaced, or weakened; the R14 file is untouched.

## New tests (20) — `repair15_family_profile_test.exs`

Track B: B1 taxonomy shape (5), B2 coordination identical across all
8 subtypes + plain family (2), B3 subtype dials (4), B4 minor
restraint (2).
Track C: C1 ask-once / never-a-gate (2), C2 answer stored via memory
admission + Celebrations, reused silently (3), C3 skip path (1),
C4 no leakage across people/owners (1).

All participant-visible tests use fresh randomized accounts.

## Environment note

This worktree's first build hit a sandbox quirk: Erlang `File.cp!`
returns EPERM ("not owner") on this filesystem during the phoenix
dependency's template-copy compile step (shell/Python copies of the
same file succeed). Workaround applied to the **uncommitted, gitignored**
`deps/phoenix/mix.exs` only: skip the copy when the destination already
exists (verified byte-identical). No committed file is affected.
