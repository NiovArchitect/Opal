# SF15 Historical Foundation Freeze

**Date:** 2026-08-13  
**Active branch:** `build/v2-coded-experience-closure`  
**Law:** SF15 is closed history. Do not reimplement. V2 sits on top.

## Closure language (locked)

**SOCIAL FLOW 15 CLOSED FOR SYNTHETIC AUTHORITATIVE DEVELOPMENT USE**

| | |
|--|--|
| PR | #20 |
| Merge | `2baf7d0a934d0c763e2af399d4dc327f76ec7c96` |
| Main reverify tip | `ad73429` |
| Evidence | `docs/evidence/social-flow-15/` (historical — do not rewrite as V2) |

## Freeze list

activation · session · device session · invitation · relationship · conversation persistence · message persistence · block · product socket auth · bounded ProductSignals transport

## Current layer (active)

V2 Social Reality · next_gap · place/time · calendar privacy · group · chronology · Curate · Extend · Plans · brand gate · Figma V2 fidelity

## Regression smoke (2026-08-13, V2 branch)

| Check | Result |
|-------|--------|
| Routes still present (`/api/v1/product/activation/*`, product_auth) | PASS |
| Live API health | PASS |
| Synthetic challenge start | PASS (`synthetic_development`, `not_production_sms`) |
| productClient + productRealtime in OpalApp | PASS (code path) |
| Seed not primary when authenticated | PASS (law in OpalApp) |

Do not re-run full SF15 suite unless a regression fails.
