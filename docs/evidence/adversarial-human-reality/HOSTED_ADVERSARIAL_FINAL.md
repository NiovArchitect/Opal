# Hosted Adversarial Final — READY FOR SMALL PILOT

**Date:** 2026-08-10  
**Live image:** `ghcr.io/niovarchitect/opal-api-runtime:hosted-adv-finish-e6eec0a`  
**Digest:** `sha256:8be39feb2dd1550…` (full: from deploy `hosted-adv-finish-e6eec0a`)  
**Source SHA:** `e6eec0a` (PR #107 block P1 + harness)

## EXECUTIVE STATE

Hosted adversarial matrix **closed** against live product (HTTP + Phoenix WS).  
P1 block messaging gap **found on hosted → fixed → redeployed → replayed**.  
No new architecture.

## Families (live)

| Family | Result |
|--------|--------|
| Privacy (outsider, shared availability, schedule oracle, block, private alignment shared_safe) | PASS |
| Availability (create/share/overlap/intervention/revoke; authorizes_set false) | PASS |
| Authority (one aff ≠ Set; mutual → Set) | PASS |
| Realtime WS (ticket, connect, join, outsider denied, live msg/reply, reconnect, signout) | PASS |
| Memory Plan1 history + Plan2 cross-rel isolation + current correction | PASS |
| Compound (partial / outsider force deny) | PASS |
| Readiness / quiet / execution honesty | PASS |
| Combined chaos (late join denied, revision) | PASS |
| Seeded soak batch | PASS (same deploy) |

## P0 / P1

| Severity | Discovered | Fixed | Open |
|----------|------------|-------|------|
| P0 | 0 | 0 | **0** |
| P1 | 1 (block did not freeze messages) | 1 (#107) | **0** |
| P2 | residual fixture block contamination (01/02; after intentional blocks) | ops only — use clean pairs / 04+ | bounded |

## PILOT

# **READY FOR SMALL PILOT**

### Cohort
1. Founder + one trusted dyad participant  
2. Then one trusted 3–4 person friend group  

### Goal
Measure **Human Coordination Residue** in real life — not growth, not engagement.

### Still optional / non-blocking
Places / Ticketmaster credential-gated; booking REAL HANDOFF; reminders CLIENT CONTRACT.

## NEXT
Begin Phase 1 pilot with founder + one trusted person. Log residue after each real episode.
