# Opal — Human and AI State Matrix

**Status:** ACCEPTED PRODUCT TRUTH (naming/labeling standard) — backbone document
**Authority:** Governs all public copy, all UI moments, and every document in this handoff that describes a journey
**Last updated:** 2026-08-05

---

## 1. Why this document exists

Every screen in Opal must let a person instantly answer one question: **who is talking, and how sure are we?** A person reading a chat should never have to guess whether a line came from a friend, from Opal noticing something, from Opal suggesting something, from Opal doing something, or from a real business confirming something. Blurring these is not a cosmetic bug — it is a trust bug. It is also, independently, a violation of Opal's own uncertainty doctrine (`Opal_PRODUCT_TRUTH.md`) and its rule that "Opal must never place AI text inside ordinary human bubbles as if it were a person" (`EXPERIENCE_COLLABORATION_AND_NUANCE.md`).

This document names the six states every piece of Opal-adjacent content must belong to, and gives the rule for telling them apart in copy. It is the standard that `OPAL_AGE_12_COPY_SYSTEM.md` writes to, that `OPAL_AUTHENTIC_ALIGNMENT.md` protects, and that the recommended first vertical slice (see `CLAUDE_TO_GROK_ALIGNMENT_HANDOFF.md`) exists to bring the live product into compliance with.

## 2. The six states

| # | State | Plain description | Who produces it | Confidence a reader should have |
|---|---|---|---|---|
| 1 | **What a person said** | An actual message from a real human in the conversation | The person | Certain — it's a quote |
| 2 | **What Opal noticed** | A pattern Opal spotted in the conversation (a plan forming, a question left open) | Opal, from conversation content | A possibility, offered gently, never asserted as fact |
| 3 | **What Opal suggested** | A specific option Opal is offering, not yet acted on | Opal | An offer, dismissible, not binding |
| 4 | **What Opal is doing** | An action in progress that a person approved | Opal, after explicit consent | In progress, reversible where possible, never silent |
| 5 | **What an outside provider confirmed** | A real fact from a real third party (a restaurant confirmed a table, a calendar accepted an invite) | An external system, relayed by Opal | Certain, but sourced — never presented as if Opal decided it |
| 6 | **What is complete** | A finished, real-world outcome | Confirmed by state 5, or by a person | Certain and final |

States 2–4 are proposals or in-progress actions; only 1, 5, and 6 are facts. Nothing in states 2–4 may visually resemble a fact.

## 3. The rule in one line

**If a reader can't tell which of the six states a line belongs to within one glance, the line fails, no matter how good the underlying feature is.**

This maps directly onto the existing content-class rule in `EXPERIENCE_COLLABORATION_AND_NUANCE.md` (human message / shared Opal moment / private Opal guidance / system confirmation) — this document adds two states that content-class rule left implicit: a proposal (state 3) is not the same as an in-progress action (state 4), and an outside provider's word (state 5) is not the same as Opal's own word.

## 4. The live counterexample

Confirmed firsthand at `apps/opal_web/src/onboarding/FirstRunExperience.tsx:201-203`, currently shipping on the public walkthrough:

> `"After 6:30 works for me."` (human bubble)
> `"I'll book Harbor Table."` (human bubble)
> `"Thursday · 7:00 PM"` (gold chip, unattributed)

Walk it through the six states: the first two lines are genuinely state 1 (a person speaking). The chip that follows reads as state 5 or 6 — a confirmed reservation — but no reservation exists anywhere in the system; nothing has been proposed, approved, or executed. There is no state 3 or 4 in this scene at all. A reader has no way to know that "Thursday · 7:00 PM" is decoration, not a real booking. This is the single clearest, live violation of this matrix in the product today, and it costs nothing but copy and attribution to fix — see the recommended first slice.

## 5. What each state looks like in copy (examples, not final strings)

| State | Bad (ambiguous) | Better (attributed) |
|---|---|---|
| Noticed | *(a chip appears with no label)* | "Opal noticed — this could be turning into a plan." |
| Suggested | "Harbor Table, Thursday 7:00 PM" | "Want Opal to try Harbor Table for Thursday at 7?" |
| Doing | "Thursday · 7:00 PM" | "Opal is checking with Harbor Table…" |
| Provider-confirmed | "Thursday · 7:00 PM" | "Harbor Table confirmed your table for 7:00 PM Thursday." |
| Complete | *(same chip, different color, no text change)* | "Booked. See you there Thursday at 7." |

The specific wording is not locked by this document — `OPAL_AGE_12_COPY_SYSTEM.md` owns final copy voice. What is locked is that **five visibly different things must never share one visual treatment.**

## 6. What this document does not decide

Visual system (color, glyph, motion per state) is a design decision, not a product-truth decision — the existing `technicolorProduction.ts`/`.css` semantic-state mapping (`semanticStateForSignal`) is the right place to extend, not replace. This document also does not authorize any new capability (booking, provider integration, location) — it only governs how any such capability, once real, must be represented. Provider integrations remain founder-gated per `docs/architecture/SYSTEM_CONTEXT.md`.

## 7. Where this applies

Every surface that renders Opal-adjacent text: the pre-membership walkthrough, the member product's `.opal-moment` chips, Social Flow proposal/negotiation UI, Dynamic Social Intelligence surfaces (once live), and any future group/network-effect UI described in `OPAL_SOLO_AND_GROUP_ALIGNMENT.md` and `OPAL_NETWORK_EFFECT_JOURNEYS.md`.
