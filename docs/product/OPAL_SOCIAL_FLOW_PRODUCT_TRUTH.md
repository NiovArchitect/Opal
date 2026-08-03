# Opal Social Flow — Product Truth

**Authority:** ACCEPTED PRODUCT TRUTH  
**Status:** Foundation for future Social Flow build slices  
**Related:** `Opal_PRODUCT_TRUTH.md`, `OPAL_CONTEXT_AUTHORITY.md`, source `docs/source-material/original/NIOV-Social-Flow-Calendar.md`

---

## Locked product statement

> **Opal Social Flow turns ordinary conversation into consented, living coordination.**  
> It recognizes when people may be making plans, helps them resolve availability and details without leaving the conversation, preserves each person’s privacy, records agreement only when it is real, and quietly supports changes, commitments, reminders, preparation, and follow-through.

Social Flow is **not** “a smarter calendar.”  
It is the **relationship-aware coordination layer** of Opal.

- **Traditional calendar:** users maintain calendar records.  
- **Opal Social Flow:** Opal maintains the evolving **social agreement**.  
- The calendar record is an **implementation projection**, not the primary UX.

### Experience collaboration (Social Flow 17)

> **Opal helps people collaborate with one another’s experiences.**

People collaborate with interests, schedules, preferences, memories, hopes, comfort, social energy, traditions, and changing circumstances. An experience may begin as a thought, message, curiosity, joke, wish, place, meal, invitation, or moment someone wants to repeat.

This is product truth that shapes journeys and domain models. Full foundation: `OPAL_EXPERIENCE_COLLABORATION.md`.

---

## Communication-first rule

Users communicate naturally:

> “We should get dinner next week.”  
> “I’m free Thursday after work.”  
> “Ask Michelle whether she wants to come.”  
> “Actually, can we make it later?”  
> “Don’t let me forget to book it.”

Opal may surface a **lightweight, dismissible** affordance inside the conversation:

> **Dinner next week?**  
> Thursday after 6:30 looks possible for both of you.  
> **Check availability · Suggest another time · Not a plan**

Opal **does not** silently create a binding event.

---

## Foundational lifecycle

```text
Conversation
  → possible plan (proposal only)
  → consent to coordinate
  → shared options
  → agreement
  → commitment (authoritative plan state)
  → preparation
  → adaptation
  → follow-through
  → relationship memory (scoped, consented)
```

Scenarios (lunch, concert, trip, game night) are **behavioral templates**, not hard-coded products. Underlying patterns:

proposal · availability resolution · collaborative choice · commitment · change · cancellation · reminder · follow-through

---

## Domain primitives (not scenario hard-coding)

| Object | Meaning |
|--------|---------|
| **Plan proposal** | Something may happen; no commitment yet |
| **Availability grant** | What one person permits Opal to compute/reveal for a scope |
| **Time option** | Candidate time with supporting/conflicting signals |
| **Plan poll** | Temporary decision structure inside chat |
| **Shared plan** | Agreed social object (authoritative) |
| **Participation state** | invited / interested / tentative / accepted / declined / withdrawn / removed |
| **Commitment** | Person agreed to do something related to the plan |
| **Plan revision** | Change with lineage |
| **Personal hold** | Private reservation; not exposed as shared event |
| **Calendar projection** | How a plan appears in Flow view, grid, external calendar, reminders |

---

## Shared plan vs private care work (critical)

Opal must distinguish:

| Shared relationship plan | Private preparation |
|--------------------------|---------------------|
| “Dinner Saturday at 7” | “Order flowers” |
| Hotel reservation the couple agreed on | Personal budget limit |
| Trip dates both accepted | Gift / necklace reminder |
| Who is bringing dessert | Surprise party logistics hidden from guest |

Private care work must **never** leak into partner-visible plan context unless the user intentionally shares it.

---

## Primary surfaces

1. **Inside conversations** — where plans form and change  
2. **Lightweight Plans view** — settled / undecided / promises / needs response / changed / upcoming  
3. **Conventional calendar projection** — secondary  
4. **Personal daily flow** — human summary, not colored blocks only  

Not primary: social feed of public events, gamification dashboards, progress-bar productivity theater.

---

## Runtime ownership (locked)

| Layer | Owns |
|-------|------|
| **Python** | Bounded interpretation: potential plans, time candidates, missing fields, uncertainty, suggested prompts — **proposals only** |
| **Elixir/BEAM** | Consent, membership, plan authority, polls, RSVPs, holds, revisions, reminders scheduling, realtime fan-out, idempotency, audit |
| **Mobile** | Local projection, pending UX, offline continuity |

Python **never** creates authoritative social truth, availability grants, or RSVPs.

---

## Preserve from source material

Invisible scheduling from conversation · dynamic suggestions · group availability/polling · shared plans · adaptive revisions · collaborative preparation · contextual reminders · commitments · selective disclosure · circle visibility · gentle nudges · one-tap “turn into a plan” · follow-through memory  

## Do not lock from source material

Blockchain event records · DID staking · group staking · tokens · wallets · stake-weighted voting · immutable social interaction ledger · Social Score · covert mood surveillance · advertising on intimate data · automatic RSVP without authority · continuous precise location · minors as simple product variant  

**Principle:** Preserve the **capability**; reject the unnecessary **mechanism**.

| Historic mechanism | Opal translation |
|--------------------|------------------|
| Staked preferences | Consented preference memory |
| DID social sync | Relationship-scoped permissions |
| Blockchain voting | Authoritative poll/RSVP with audit history |
| Immutable social proof | Private, exportable history when needed |
| Wallet rewards | Future business decision, not scheduling dependency |
| Privacy “sandbox” | **Personal Context Boundary / Relationship Privacy Boundary** |

---

## First Social Flow build slice (not this documentation PR)

Prove one lifecycle only (two users):

discuss → proposal → consent → free/busy grants → options → agreement → shared plan → revision → private commitment → private reminder → reconnect reconcile → consent revoke stops AI context  

Out of that slice: public discovery, external calendars, location, children, ads, blockchain, broad relationship scoring.

---

## Explicit non-goals

- Replacing messaging with a calendar app  
- Social scoring or reliability grades  
- Covert emotional or location surveillance  
- Auto-accept invitations by default  
- Cross-circle leakage of plan intelligence  
