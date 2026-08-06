# Location Alignment Engine

**Status:** ARCHITECTURE (PROPOSED) — design phase, not an implementation claim. Location is explicitly "not live" per `docs/product/OPAL_DYNAMIC_SOCIAL_EXPERIENCE_INTELLIGENCE_PHASE0.md`
**Authority:** Specializes `docs/product/LOCATION_COLLECTIVE_FIT.md`'s rules into a component boundary; introduces no new authority
**Last updated:** 2026-08-05

---

## 1. What this is for

Dynamic proximity, group travel, and local discovery — helping people who are near each other, or planning to be, align on what to do — is one of the relationship shapes named in this work's scope. `LOCATION_COLLECTIVE_FIT.md` already sets the product rules for this. This document gives those rules a component shape, so a future build slice has an actual boundary to implement against.

## 2. The hard constraint this inherits unchanged

Location is the single most sensitive signal in the product's threat model — it appears as its own asset class in `THREAT_MODEL.md` and is explicitly named as a stalking/coercive-control vector in `CHILD_SAFETY_THREAT_MODEL.md` and `SOCIAL_FLOW_CONTACT_SECURITY.md`. Every rule below is inherited, not proposed:

opt-in only · purpose-specific, never general · approximate unless precision is genuinely required · temporary, not persistent · explainable (the person can always see why it was used) · revocable instantly · never silently shared · never continuous background collection by default.

## 3. Component boundary

Reusing the exact authority split already specified in `LOCATION_COLLECTIVE_FIT.md` §architecture — this document only names the pieces:

| Component | Responsibility | Authority |
|---|---|---|
| **User consent grant** | Records a specific, scoped, expiring permission ("share approximate location with this group, for this plan, until 9pm") | Elixir — authoritative, same pattern as `CONSENT_MODEL.md` L3 |
| **Python (proposal only)** | Given already-granted, already-scoped location signals, proposes options consistent with them — e.g., "these three places are roughly equidistant" | Never sees ungated raw location; never decides who sees what |
| **Elixir (enforcement)** | Checks eligibility, privacy scope, and expiry before any location-derived content reaches a screen; the only writer of grant state | Authoritative, same pattern as every other Social Flow boundary |
| **Client (display only)** | Renders what Elixir has already approved for display | Never authoritative, same as every other client surface (`SYSTEM_CONTEXT.md`) |

## 4. Scopes (inherited, not new)

`LOCATION_COLLECTIVE_FIT.md` already defines a six-level scope table (from "no location" through "precise, time-boxed, purpose-bound"). This document does not add scopes — it specifies that every location-derived output from this engine must carry the scope it was computed under, so downstream consumers (the alignment gap model, the minimum question engine) can reason about what's safe to say out loud versus what must stay internal.

## 5. Where this connects to the rest of this handoff

- **Solo case:** a single person discovering something local uses this engine with a group of one — no consensus step needed, but every rule in §2 still applies unchanged (`OPAL_SOLO_AND_GROUP_ALIGNMENT.md` §2).
- **Group case:** "collective fit, not average fit" applies here exactly as it does to any group recommendation — a suggested meeting point may say "central for everyone," never "close to where Jordan is right now" (`OPAL_SOLO_AND_GROUP_ALIGNMENT.md` §3a, `OPAL_AUTHENTIC_ALIGNMENT.md` §3).
- **Alignment gap model:** a location-based gap ("you two think you're meeting at different entrances") is a legitimate `topic` type for `ALIGNMENT_GAP_MODEL.md` — this engine is a data source for that model, not a separate alignment mechanism.
- **State matrix:** any location-derived suggestion is state 3 ("what Opal suggested") until acted on, and any location-derived confirmation from a real place (a venue, a provider) is state 5, never state 6 until the person confirms arrival or attendance themselves (`OPAL_HUMAN_AND_AI_STATE_MATRIX.md`).

## 6. What this must never become

Restating existing rejected patterns because this is precisely where they'd be tempting to add: no persistent map of where friends are, no passive/continuous location sharing, no location-derived relationship inference ("they've been near each other a lot lately"), no location data sold or shared with providers beyond what a specific, consented booking requires, no location feature that operates without an active, visible, revocable grant.

## 7. Status and dependencies

**DOCUMENTED-ONLY.** No location capability exists anywhere in the codebase today — confirmed in `CLAUDE_REPOSITORY_UNDERSTANDING.md` §4. This document depends on `LOCATION_COLLECTIVE_FIT.md` remaining the product-rules source of truth and on any future provider integration (mapping, places, booking) going through the same founder-approval gate already established for all external providers (`SYSTEM_CONTEXT.md`).
