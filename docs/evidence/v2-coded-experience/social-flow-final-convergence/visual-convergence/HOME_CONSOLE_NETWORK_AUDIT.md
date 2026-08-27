# HOME CONSOLE / NETWORK AUDIT

**Date:** 2026-08-20

## React duplicate keys

**Before:** dozens of “Encountered two children with the same key”  
**After craftsmanship pass:** **0**

Fixes:

- Home feed dedupe by entity id in `homeHydration.ts`
- Entity-grounded keys on conversation turns/steps, carousel slides/dots, Graph nodes

## First-run `/api/v1/product/session` 401

**Before:** treated as “expected race”  
**Root cause:** boot called `fetchSession()` with no bearer after `opal_reset_first_run=1` cleared local session, producing avoidable 401 network noise.

**Fix:** skip session probe when reset-first-run consumed or session is null (activation owns next step). Cookie-only recovery still probes when a remembered profile exists without bearer.

**After:** session401Count = **0** in craftsmanship proof.

## CSP warning

**Exact message:**  
`The Content Security Policy directive 'frame-ancestors' is ignored when delivered via a <meta> element.`

**Source:** `apps/opal_web/index.html` meta CSP included `frame-ancestors 'none'`.

**Behavior:** Browsers ignore `frame-ancestors` in meta CSP (header-only directive). Warning is accurate, not a blocked resource.

**Production relevance:** HTTP CSP headers (covered by `security.test.ts`) still enforce `frame-ancestors 'none'`.

**Repair:** Removed `frame-ancestors` from meta CSP; left header enforcement intact.

## Craftsmanship proof totals

| Metric | Count |
| --- | --- |
| Duplicate key warnings | 0 |
| Session 401 | 0 |
| Unexplained product network failures | 0 |
| Console errors remaining (pre-meta fix run) | 2× CSP meta warning |
