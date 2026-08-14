# ADR-INT-007 — Attention / Intervention boundary

**Status:** Accepted  
**Date:** 2026-08-13  
**Pass:** 10

## Context

Backend intelligence compounds (SocialReality, chronology, ProductSignals, collective fit).  
Founder review: product sometimes **shows the machinery** — Home/Chat feel like feeds of Opal reasoning.

## Decision

Add a fifth decision boundary after Evidence → Inference → Authority → Presentation candidates:

**ATTENTION / INTERVENTION**

Owned by `OpalCore.SocialFlow.AttentionAuthority` (domain) and `opalUi/attentionAuthority.ts` (client projection).

Primary law:

> THE SMARTER OPAL BECOMES, THE LESS SOFTWARE THE HUMAN SHOULD HAVE TO MANAGE.

Silence is a first-class outcome.

Builds on existing `AttentionTier`, `InterventionResolution`, `InterruptionDebt` — does not replace them.

## Consequences

- Chronology remains durable history; not auto Home/notification feed.
- ProductSignals remain data; attention decides surface consequence.
- Home uses sparse NOW/LATER/QUIET compression.
- Notifications (policy only this pass) dedupe/supersede by consequence id.
