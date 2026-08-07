# Hosted synthetic dress rehearsal — STATUS

**Date:** 2026-08-07  
**Source head (branch tip):** `61100ca`  
**CI green heads:** `8fc4c06`, `aee9e72` (Public web + Elixir full suite)  
**Set-authority wire:** `39d171a` (Claude P0 CLOSED)  
**Twilio:** OFF

## LEGAL

| URL | Status |
|-----|--------|
| https://opal.niovlabs.com/privacy | **200** |
| https://opal.niovlabs.com/terms | **200** |
| https://opal.niovlabs.com/ | **200** |

Copy: transactional OTP only; no legal identity claim; no placeholders.

## IMAGE (built, not yet live on Render)

| Field | Value |
|-------|--------|
| Tag | `ghcr.io/niovarchitect/opal-api-runtime:rp61-synthetic-61100ca` |
| Digest | `sha256:69a81bb9a64389001d216901e2e6f17e9f6ba06a3f72fef9dde7e0b1286b9b5c` |
| Prior tag | `rp61-synthetic-aee9e72` / `sha256:eb932fc1ae1483aebb5eb24b03a19bca1d894aaa661e28ba13115be74d6b8e09` |
| Render deploy | **BLOCKED** — `RENDER_API_KEY` returns 401 Unauthorized (local + GH Actions) |
| render CLI | token expired — needs `render login` |

Workflow updated to deploy via private registry credential even when public GHCR pull fails (`61100ca`).

## MIGRATION

Not applied — no authorized Render shell/API access until token renewed.

## LIVE API (still prior image)

| Check | Result |
|-------|--------|
| GET /health | 200 ok |
| Synthetic fixture-only | enforced (`number_not_enabled` for non-fixtures) |
| Activate A/B/C fixtures | pass |
| Invite (no phone in path) | pass `/invite/{id}` |
| Accept → relationship + conversation | pass |
| Plan / Still open signals | pass |
| Mutual ready → **Set** | **FAIL on current live image** |
| Private invalidation endpoint | errors on probe (route/member or pre-P0) |
| User C isolation | 403 not_a_member **PASS** |
| One-affirmative no Set | **PASS** |

## BLOCKER TO CLOSE REHEARSAL

1. Founder/operator: `render login` **or** replace GitHub secret `RENDER_API_KEY` with a valid API key.  
2. Re-run deploy workflow `Deploy Opal API (Render image)` on `build/real-people-first-alignment`.  
3. Confirm imagePath = `rp61-synthetic-61100ca` (or later green SHA).  
4. Migrate via release path.  
5. Re-run `scripts/hosted_synthetic_rehearsal.sh` + negative matrix.  
6. Only then merge PR #61.

## MERGE

**HOLD**
