# Phase RU-2 report

## Product

`trust_tiers` table + `OpalCore.TrustTiers` (get/grant/can_access/maybe_promote).
OC-2 gates taste/temporal/social/relationships by tier and adds `trust_tier` key.
OC-4 answers above-tier asks warmly ("as we get to know each other").
API GET/POST under `/api/v1/product/trust/`. You hub Trust & Privacy subsection.

## Verification

- TrustTiers + API tests: 41/41
- Related context/relationships/conversations: 64/64
- WhatOpalRemembersSection vitest: 7/7
- Manual: new user empty taste; trusted includes quiet vibe; inner_circle unlocks intimate
