# R0 Release Reality Intent Lock

**Date:** 2026-09-06  
**Starting HEAD:** `e52d095`  
**Branch:** `build/v2-coded-experience-closure` · tracking `origin/build/v2-coded-experience-closure`  
**Tree:** clean at start  
**Square:** `R0_RELEASE_REALITY_LOCK` **ONLY**

```
P4_COMPLETE = YES · FROZEN (do not reopen)
STORE_READY = NO
R0_AUTHORIZED = YES
R0_COMPLETE = NO (until STOP)
R1…R7_AUTHORIZED = NO
PRODUCT_CODE_CHANGED = NO
INFRASTRUCTURE_PROVISIONED = NO
EXTERNAL_COST_INCURRED = NO
MERGE = NO · LIVE = NO · STORE_SUBMISSION = NO
```

## Purpose

P4 answered: **Can Opal think?** → YES (converged DI).

R0 asks: **What must happen, in what order, for a new human to install Opal on a real phone and use the real product safely?**

R0 **defines** the release program. R0 **does not build** it.

## Scope (authority / audit / program only)

**May change:** authority docs, program docs, release ledgers, blocker/dependency maps, audit-only scripts.

**Must not change:** product backend/UI/native implementation, infrastructure provisioning, external account signup, paid services, P4/P2/P3 reopen, P5 intelligence, auto-start R1+.

**Exception:** SECURITY_EMERGENCY if live production secrets committed — stop and report (no secret values in docs).

## Consumes (does not redo)

- `P4_6_CONVERGENCE_STOP_REPORT.md`
- `p4/P4_6_RELEASE_BLOCKER_MAP.md`
- `p4/P4_6_COLD_START_PROOF.md`
- `OPAL_CURRENT_AUTHORITY.yaml` / Reality Readiness Matrix
- Telephony / Observability / release runbooks / mobile EAS state

Missing named P4.6 scorecards (e.g. `P4_6_WEBRTC_REALITY_AUDIT.md`) are treated as **NOT authored as separate files** — content lives in STOP + RELEASE_BLOCKER_MAP + architecture docs. R0 does not invent fake GREEN.

## Release vocabulary (finite)

| Term | Meaning |
|------|---------|
| **Release Candidate (RC)** | Two real users on two real devices can: install (or internal RC binary) → real phone identity → find each other → chat → **real WebRTC call** → consequence → DI → Graph path works without founder fixture; security P0s closed or explicitly waived in writing |
| **Production-ready ops** | Prod Postgres TLS verified · secrets managed · observability · durable Kafka/Python as claimed · recovery runbooks |
| **Store-ready** | Apple + Google submission packages, privacy nutrition, production SMS, push if claimed, CallKit/media if Calls claimed, signing, crash reporting — **all** release-critical categories Green |
| **Launch** | Founder-authorized Store submission after Founder Production Walk |

Vague “MVP / beta / production-ready” without the above = forbidden.

## Critical-path method

1. List release-critical capabilities for the north-star loop.  
2. Draw **hard dependencies** (A blocks B).  
3. Prefer earlier placement when others depend on it.  
4. Parallelize only when no hard dependency and no shared founder credential conflict.  
5. Optimize for **path to two real phones calling**, not ticket count.

## Severity vocabulary

| Sev | Meaning |
|-----|---------|
| **P0** | Blocks RC / trust / security — must sequence early |
| **P1** | Blocks Store or production claims for advertised capability |
| **P2** | Important depth (providers, polish) — after RC spine |
| **P3** | Deferred / optional for first Store claim |

## Phase vocabulary

`R0` authority → `R1…R7` execution phases (exact order locked by R0 program doc) → `FOUNDER_PRODUCTION_WALK` → `STORE_SUBMISSION_AUTHORIZED` (separate GO).

## Founder decisions / cost boundary

R0 **lists** what requires founder money, Apple/Google accounts, Twilio/10DLC, TURN vendor, device hardware, legal copy.  
R0 **does not** purchase, sign up, or provision.

## Rollback / proof / STOP law

- Each later R-phase needs explicit founder GO.  
- One approval is not a blank check.  
- R0 proof = committed program authority + dependency map + critical path + P0 order.  
- **STOP after commit/push. Do not begin R1.**

## North star (unchanged)

```
REAL INSTALL → REAL IDENTITY → REAL PEOPLE → REAL COMMUNICATION
→ REAL CALL → REAL CONTEXT → REAL DECISION → REAL GRAPH → REAL JOURNEY
→ REALTIME CONSEQUENCE → BETTER NEXT INTERACTION
```

Cold start: zero friends / Memory / Graph / founder fixture must still get real Opal value.  
Network compounds value; network is not required for first value.  
Productionization must not re-add steps intelligence already deleted.
