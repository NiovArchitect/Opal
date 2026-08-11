# Visible Signal Principles

**Authority:** ACCEPTED PRODUCT TRUTH (UX differentiator)  
**Status:** Locked design law for Social Flow surfaces  
**Related:** `EXPERIENCE_PRINCIPLES.md`, `NOISE_REMOVAL_AUDIT.md`, `OPAL_SOCIAL_FLOW_PRODUCT_TRUTH.md`, `RELATIONSHIP_SAFETY_RULES.md`, `docs/product/SHARED_REALITY_CURATION_AND_PRESENTATION_LAWS.md`  
**Owner (this phase):** UX Architect

---

## Human-facing status language (2026-08-10 lock)

Internal stages (`forming`, `set`, `ready`, …) stay precise in backend.

**When reality can speak for itself, do not show status.**

- Not “Set” → **Dinner · Thursday · 7 PM · place**  
- Not “Needs you” → the **actual decision** (Harbor Table or Campfire?)  
- Not “Open” as product meaning → unresolved fact only when useful, or quiet  

See `SHARED_REALITY_CURATION_AND_PRESENTATION_LAWS.md` § human language.

## Opal in the thread (chronology + scale)

- Socially relevant Opal actions belong **chronologically in conversation history** (human-friendly timestamps; no ISO).  
- **Humans occupy space; Opal changes the space** — moments smaller/quieter/richer than human bubbles; not a third participant.  
- Every asset: **Reveal · Resolve · Execute · Recall**.  
- **Delegated curation** and **Extend** (when shipped): composition not feeds; Extend may stay quiet.

---

## Strongest differentiator

> **All useful signal must become visible enough for “aha” — without becoming noise.**

Users open a familiar messenger. Over time they realize:

> “This understands the social structure of my life.”

They should **not** realize:

> “This is a dashboard wearing chat clothes.”  
> “This is watching me and scoring my relationships.”  
> “I have to hunt settings to find what changed.”

Visible signal is **relationship-aware coordination made plain in the thread** — not analytics theater.

---

## The aha contract

If Opal knows something that would help a human keep a promise, resolve a plan, protect privacy, or notice a change that affects real life — **that knowledge must be able to surface** as short, human language, at the moment it is actionable.

If the knowledge is speculative, low-relevance, private-to-someone-else, or already dismissed — **it must stay silent**.

### Users must be able to experience lines like these

These are **target lived experiences**, not mandatory always-on banners. Each must be achievable when the underlying truth and consent exist:

| Signal | What “aha” means |
|--------|------------------|
| “You both appear free after 6:30.” | Availability grants became a shared option without calendar homework |
| “Your daughter’s practice moved to 5:00.” | Family plan revision is visible where the parent lives (conversation / plan card) |
| “You offered to pick him up.” | Commitment ownership is visible and claimable |
| “This still needs an answer.” | Soft unresolved state — not a guilt score |
| “Three people agreed on Saturday; one person is still unsure.” | Group participation without call-out cruelty |
| “This gift reminder is private.” | Private care work clearly labeled; partner cannot see it |
| “Your son asked whether his friend can come.” | Youth/family proposal with guardian-visible boundary (when allowed) |
| “The reservation deadline is tomorrow.” | Commitment + deadline, not spam |
| “You and your partner discussed this trip twice but never chose dates.” | Pattern of unfinished coordination — gentle, factual, no health score |
| “The plan changed while you were offline.” | Offline reconcile as signal, not silent overwrite |
| “This may affect school pickup.” | Cross-plan impact in family context (uncertainty language) |
| “Do you want to turn this conversation into a shared family plan?” | One-tap path from chat → coordination consent |

**Copy rule:** Prefer possibility and ownership over verdicts. Align with `RELATIONSHIP_SAFETY_RULES.md` uncertainty language.

---

## Interface posture

| Familiar | Progressive realization |
|----------|-------------------------|
| Messaging thread is home | Plans form *inside* messages |
| Composer, taps, cards | Cards are coordination objects, not ads |
| Notifications | Only when relevance policy says “actionable” |
| Lightweight Plans / Flow view | Summary of living agreements — not a second product |

Opal feels like messaging first. Social Flow intelligence is **earned presence**: sparse, correct, dismissible.

---

## Noise-control rules (non-negotiable)

### 1. Progressive disclosure

- Default: one short line + optional one primary action.  
- Expand for options, participants, history, grants.  
- Never dump the full plan lifecycle UI into the first suggestion.

### 2. Dismissible without guilt

- Every suggestion can vanish: **Not a plan · Not now · Don’t help with this**.  
- Dismiss is not a relationship failure. No confetti reverse-psychology.  
- “Don’t help with this conversation” must stick until user reverses.

### 3. No dashboard theater

Forbidden as primary Social Flow UI:

- Relationship health meters  
- Social scores / reliability grades  
- Agent names, workflow states, embedding labels  
- Sentiment rainbows  
- Empty “AI home” that replaces conversations  
- Confetti for intimacy milestones  
- Always-on “Opal is thinking about your life” chrome  

See `NOISE_REMOVAL_AUDIT.md`.

### 4. Relevance policy

Surface a signal only when **all** of the following hold:

| Gate | Question |
|------|----------|
| **Truth** | Is there consented, in-scope state or a bounded proposal behind this? |
| **Actionability** | Can the user do something useful in under ~5 seconds? |
| **Timing** | Is now better than later (deadline, change, offline catch-up)? |
| **Audience** | Is this visible only to people who should see it (private vs shared)? |
| **Freshness** | Is this new or still unresolved — not a repeat of dismissed noise? |
| **Calm** | Would this feel invasive if a partner or child saw the *wrong* copy? |

If any gate fails → do not show (or show only in user-opened Plans detail).

### 5. One primary signal per moment

When multiple truths compete, rank:

1. Safety / block / privacy violation  
2. Plan changed while offline  
3. Needs answer (blocking others)  
4. Deadline within user-relevant window  
5. Soft opportunity (free after 6:30)  
6. Gentle pattern recall (discussed twice, no dates)

Collapse secondary items into “More about this plan.”

### 6. Private vs shared must be visually unmistakable

Private gift / hold / prep signals **must** carry private language and private chrome.  
Shared plan signals **must not** include private prep fields.

Leakage of private care work into shared cards is a **product defect**, not a polish issue.

### 7. Uncertainty is kindness

Prefer:

- “You both **appear** free…”  
- “This **may** affect school pickup.”  
- “One person is **still unsure**.”

Avoid:

- “Jordan is free.” (false certainty without grant)  
- “Your relationship is stalled.”  
- Percentage reliability of people  

---

## Placement law

| Signal type | Primary placement | Secondary |
|-------------|-------------------|-----------|
| Proposal / “turn into plan” | In-thread card | — |
| Free/busy option | In-thread under proposal | Plans detail |
| Needs answer | Thread + subtle list badge | Plans “needs response” |
| Private reminder | Private sheet / private card only | Personal Flow |
| Plan changed offline | Reconnect banner in thread/plan | Plans “changed” |
| Group agreement state | Compact participant line on plan card | Expanded roster |
| Family impact | Thread for the relevant family conversation | Family coordination surface |

**Not primary:** global social feed, public event discovery, gamified progress.

---

## Relationship to experience principles

This document specializes `EXPERIENCE_PRINCIPLES.md` for Social Flow:

1. Conversation is the product → signal lives in conversation.  
2. Signal over spectacle → this file is the definition of signal.  
3. Warm premium → calm cards, not tech demo.  
4. Uncertainty is kindness → enforced in every example line.  
5. Consent is part of the experience → coordinate consent before shared options.  
6. Speed is respect → signal never blocks sending a normal message.  
7. Dismissibility → hard rule.  
8. No engineering dialect → “Shared plan,” not “PotentialPlan v3.”  
9. Circles are emotional architecture → blast radius of signal.  
10. Harm reduction over engagement → relevance policy beats retention hacks.

---

## Anti-patterns (reject)

| Anti-pattern | Why it fails aha |
|--------------|------------------|
| Silent calendar write | No aha; trust damage |
| Spammy free/busy nag every message | Noise; user mutes everything |
| Scoring “who cancels more” | Surveillance theater |
| Dashboard of all friendships | Spectacle, not coordination |
| Child/family signal without age authority | Safety failure |
| Private gift line on shared trip card | Boundary failure |
| Making users open three apps to see a plan change | Invisible signal |

---

## Success test (design review)

Before shipping any Social Flow surface, walk a real scenario and answer:

1. What is the single most useful true sentence Opal could show?  
2. Where does that sentence appear without leaving chat (or with one intentional step)?  
3. How does the user dismiss it forever for this thread?  
4. Who must **not** see it?  
5. Does it still feel like messaging?

If (1)–(4) are clear and (5) is yes → visible signal is working.

---

## Summary lock

| Statement | Label |
|-----------|--------|
| Useful signal must be visible enough for aha without noise | **ACCEPTED PRODUCT TRUTH** |
| Familiar messaging; progressive social-structure understanding | **ACCEPTED PRODUCT TRUTH** |
| Progressive disclosure, dismissible, no dashboard theater, relevance policy | **ACCEPTED PRODUCT TRUTH** |
| Private vs shared visually unmistakable | **ACCEPTED PRODUCT TRUTH** |
| Example aha lines are target lived experiences | **ACCEPTED PRODUCT TRUTH** (templates) |
