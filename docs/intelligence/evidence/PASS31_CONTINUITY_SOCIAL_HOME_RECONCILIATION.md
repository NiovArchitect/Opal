# Pass 31 — Continuity + Social Home Reconciliation

**Date:** 2026-08-16  
**Branch:** `build/v2-coded-experience-closure`  
**HEAD (evidence/docs may lag product):** see git  
**Product SHA (P30R2 live):** `b8194a6`  
**Product remote CI:** run `31931561801` GREEN (`with_tests`)  
**Verdict:** **HOLD — DO NOT MERGE**  
**Mode:** Plan accepted with founder corrections. **P0-31-01 implemented separately** (see `PASS31_P0_31_01_EXACT_PLACE_CONTINUITY.md`).  

### Founder plan corrections (absorbed)

- Continuous exploration is **not** locked to a separate future Explore product; Home may orient then continue fluidly.  
- ExperienceField **ranking discipline** ≠ immutable 3–5 **discovery ceiling**.  
- Weak local social graph must not create weak Opal; local context expands discovery not authority.  
- Density is a **signal**; relevance decides.  
- Ranking target ≈ lived-experience potential, not consumption.  
- Budget: financial_fit ≠ whole-journey value allocation; private non-leak.  
- Figma not a blocker for P0-31-01.

---

## Core invariant (Pass 31 law)

> **Every human action may reduce uncertainty. It may not silently re-open already-resolved truth unless new evidence contradicts it.**

| Action | Uncertainty that must fall |
|--------|----------------------------|
| Moment intent (“this” / “like this”) | WHAT / WHERE / experience identity |
| Solo / With person | WHO |
| Time selection | WHEN |
| Reservation confirm (provider-true) | EXECUTION |

**Intelligence-loss defect:** Opal asks again for a dimension already grounded without contradiction.

---

## Founder live defects that override “journey complete”

| ID | Symptom | Root seam (repo) |
|----|---------|------------------|
| P0-31-01 | Juniper & Ivy → Solo → “Where should dinner be?” / generic “Dinner” | `seedRealityFromMoment` keeps `providerPlaceId` but **when open + place as candidate only**; `realityFormingTitle` hard-codes **Dinner**; forming always opens place question |
| P0-31-02 | Time taps feel dead | Web time UX / reservation slots not always bound to same Reality update path |
| P0-31-03 | Reservation not felt in same chat/SR | ReservationExecution partially wired; chat consequence not same lineage narrative |
| P0-31-04 | Group chat authorship ambiguous | Message has `sender_user_id`; client maps to me/them only — **no multi-peer identity chrome** |
| Home | Planning block first impression | `selectHomeAwaken` / `AwakenSurface` dominate over social living |
| Continuity | Place known but Curate/place sheet reopens | SPA treats place as always open gap after fork |

---

## Ownership map (existing modules)

| Concern | Own |
|---------|-----|
| Uncertainty / next_gap | `SocialReality`, `PlaceGap`, `product_signals`, client `socialReality.ts` (server gap wins) |
| Moment → Reality seed | `SocialMoment`, `MomentRealityBridge`, `ExperienceGraph`, client `liveSocialMomentLoop.ts` |
| Exact place identity | `placeRef.provider_place_id` on Moment; must **ground WHERE** when intent is THIS |
| Translation / Curate | `place_option_composition`, `ProviderVertical`, Curate UI in `OpalApp` |
| Attention vs discovery | `attention_authority` / client `attentionAuthority.ts` vs `ExperienceField` |
| Follow | `follow_graph`, `follow_edge` |
| Reservation | `reservation_execution*`, productClient reservation APIs |
| Messaging authorship | `messaging/message.ex` sender_user_id → **UI must show peers** |
| Budget private fit | `financial_fit.ex` (does **not** authorize payment) |
| Private prep | `private_preparation`, private select before share |

---

## What not to build yet

- Full WebRTC calling product  
- Public discovery marketplace / doomscroll feed  
- Payouts / scoreboards  
- Auto-friend from QR  
- Automatic call transcription  
- Second ranking engine  
- Replacing ExperienceField with infinite low-value scroll  

---

## Implementation order (after founder accepts plan)

1. **INV-NO-REOPEN-TRUTH** + seed continuity (P0-31-01)  
2. Time selection consequence (P0-31-02)  
3. Reservation → same Reality + chat consequence (P0-31-03)  
4. Group authorship chrome (P0-31-04)  
5. Home hierarchy: social living first; awaken **earns** interrupt  
6. Figma IA states (no new aesthetic)  
7. Founder social dataset (diverse Moments)  
8. Only then: call/QR/delegated capability studies  

HOLD.
