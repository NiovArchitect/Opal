# CUSTOMER_COPY_INTERNAL_LEAK_AUDIT

**Date:** 2026-08-20  
**HOLD. DO NOT MERGE.**

## Found (customer-visible)

| Location | Leak | Repair |
| --- | --- | --- |
| `OpalApp.tsx` homeGateNote | `authority=${res.authority}` / `fixture_cache` | Social copy: Liked / Saved privately / Reposted / Comment posted |
| `OpalApp.tsx` journeyNote | `You're in — committed (not soft interest).` | `You're in.` |
| `OpalApp.tsx` / `GraphSocialHome.tsx` | `Follow ≠ Connection` in status | `Following {name}.` |
| Discovery card law | `Follow ≠ Connection` | Natural relevance line |

## Allowed (non-customer)

| Location | Notes |
| --- | --- |
| `data-figma-authority` / `data-visual-authority` | DOM metadata only |
| `socialAuthority.ts` return `authority` field | Internal; not rendered |
| Code comments | Not UI |

## Remaining target

**0 customer-visible implementation leaks** after this pass (re-scan on regression).
