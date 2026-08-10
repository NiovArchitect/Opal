# Shared Reality / Experience Lineage — bounded architecture + UX audit

**Status:** Audit only — **NOT** production build  
**Constraint:** Additive only. **Do not disturb** accepted chat shell or live Phase 1 pilot.  
**Central law:** *The social post is not the destination; it is potentially the beginning of another Shared Reality.*

---

## Master product discovery (locked conceptually)

Opal is **temporally continuous**, not exclusively future-facing:

```text
conversation → possibility → alignment → Set → anticipation
  → experience → memory → Social Moment (share)
  → inspiration → intent → compose → align → execute → experience again
```

Ordinary social media:

```text
SEE → LIKE → COMMENT → (maybe DM) → END
```

Opal’s differentiator:

```text
SEE → WANT → BRING MY PEOPLE → ALIGN → RESERVE/EXECUTE → GO
```

**The world is the destination. The feed is a bridge.**

---

## Four dimensions (Person × Relationship × Time × World)

| Dimension | Already strong in Opal | Gap for Social Moments |
|-----------|------------------------|-------------------------|
| **Person** | Memory kinds, scopes, admissions, private participation | Captured media of *my* experience; audience control |
| **Relationship** | Relational memory, private non-leak, block/revoke | Who may *see* a moment vs who may *plan from* it |
| **Time** | Plan lifecycle, supersession, readiness, calendar commitments | Explicit **lineage** across past→future Shared Realities |
| **World** | OpportunitySource, hard filter, providers (often synthetic) | Place/merchant identity as **shared-safe provenance**, not ad unit |

---

## A. Existing primitives that already support Shared Reality / lineage

These compose **without** a second Set authority:

| Primitive | Role in Shared Reality continuum |
|-----------|----------------------------------|
| **Conversation** | Origin surface; human command stream |
| **AlignmentAuthority / PrivateParticipation** | Sole path to Set; mutual authority |
| **SharedPlan / GroupSharedPlan + revisions** | Versioned “what we decided” |
| **OpalCalendar commitment** | Anticipation / native schedule projection after Set |
| **Opportunity / OpeningQuality / Readiness** | Possibility + prepared≠ready≠execution_ready≠confirmed |
| **ExecutionContext + booking/nav handoffs** | Execute without re-entry; honest handoff truth |
| **MemoryStore / MemoryCompose / CompoundAlignment** | After-experience learning; Plan1→Plan2 consumption |
| **MemoryScope (user / relationship / plan)** | Prevents globalizing compromise or cross-rel leak |
| **QuestionLedger / CorrectionLedger** | Why we asked; what we got wrong |
| **CoordinationResidue** | Pilot KPI taxonomy already matches residue law |
| **RuntimeTruth** | Keeps provider/device claims honest |
| **TrustSafety block/revoke** | Audience and access boundaries |
| **Ambient SmallestOutput / quiet law** | Know more ≠ show more |

**Implication:** The *coordination engine* for “Do this with my people” **already exists**. What is missing is mostly **capture → share → intentional inspiration → handoff into alignment**, not another intelligence layer.

---

## B. Smallest missing data primitives (additive)

Do **not** invent a parallel plan engine. Add **thin lineage + moment** types:

### B1. `SharedReality` (logical identity)

Stable ID spanning lifecycle stages (conversation/plan/commitment/experience/moment).  
May start as a **label over existing IDs** (e.g. `shared_reality_id` on plan + commitment + future moment).

### B2. `SocialMoment` (human-facing capture)

| Field (conceptual) | Notes |
|--------------------|--------|
| `id` | |
| `shared_reality_id` | Optional — moment may stand alone |
| `author_user_id` | |
| `media_refs[]` | Storage later; audit only now |
| `caption` | User text |
| `audience` | Explicit policy object (see E) |
| `place_ref` | **Shared-safe** only if user tags |
| `experience_at` | Optional time of experience |
| `participants_visible[]` | Consent-gated |
| `lineage` | See B3 |

### B3. `ExperienceLineage` (edge)

Directed, auditable edge:

```text
from_ref → to_ref
kind: inspired_by | planned_from | executed_as | captured_as | attributed_to
```

Examples:

- SocialMoment → new Alignment intent (`inspired_by`)  
- Alignment Set → Commitment (`planned_from`)  
- Commitment → SocialMoment (`captured_as`)  
- Transaction (future) → lineage (`attributed_to`)

### B4. `InspirationIntent` (ephemeral compose seed)

When user taps **Do this**:

- does **not** Set  
- does **not** book  
- seeds AlignmentContext with **shared-safe** place/vibe/time-of-day hints  
- requires **new** circle selection (independent Shared Reality)

**No second AlignmentAuthority.**

---

## C. Can lineage be added without a second plan/authority system?

**Yes.**

| Action | Authority |
|--------|-----------|
| “Do this” | Creates **intent seed** only |
| Who / when / whether | Existing Alignment + private participation |
| Set | **Only** AlignmentAuthority |
| Book | REAL HANDOFF until provider-confirmed |
| Share moment | Author + audience policy |

Lineage is **provenance**, not authority.

---

## D. Media / social infrastructure eventually required

| System | When |
|--------|------|
| Upload + CDN + transcoding | Before real multi-user media |
| Moderation / report / delete | Before open audience |
| Copyright / abuse tooling | Before growth |
| Audience graph + feed ranking | **Optional** — default may be relationship-first, not algorithmic feed |
| Attribution ledger (non-payout) | Before any reward experiment |

**Do not sneak these into dyad pilot.**

---

## E. Permission separations (hard)

| Layer | Rule |
|-------|------|
| **See moment** | Audience policy of poster only |
| **Plan from moment** | Viewer + *their* people; **not** original circle entitlement |
| **Private causes** | Schedule/memory/budget/location never ride along as oracle |
| **Merchant identity** | Secondary to human author; never dominate UI |
| **Downstream pressure** | “Do this” must create **independent** Shared Reality, not socially force original participants |
| **Block/revoke** | Existing TrustSafety continues to cut paths |

---

## F. “Do this with your people” → existing Alignment

Composition sketch (no production code):

1. User views SocialMoment (shared-safe place + vibe).  
2. Subtle Opal action: **Do this** (not “Book now”).  
3. Pick circle (existing people/relationship surfaces).  
4. Open / create conversation with those people.  
5. Seed AlignmentContext:
   - `inspiration_lineage_id`  
   - optional place_ref (shared-safe)  
   - optional experience_kind (dinner / hike / …)  
6. Existing Compound Alignment + readiness + quiet law run.  
7. Humans retain yes/no/preference/Set.  
8. Execution handoffs as today.

**Critical product feel:** social first, actionality secondary, never affiliate-card energy.

---

## G. Attribution without payouts

Preserve **lineage records** only:

| Option | Pros | Cons |
|--------|------|------|
| Single-poster attribution | Simple | Undervalues co-experiencers |
| Shared Reality attribution | Fairer multi-party | Harder identity/consent |
| Multi-touch lineage | Accurate funnel | Complex; fraud-prone |
| Merchant-funded reward (future) | Aligns commerce | Disclosure, authenticity risk |
| Opal-funded acquisition (future) | Cold start | Cost; abuse |

**Now:** store lineage edges with privacy-safe refs.  
**Not now:** tax, payout formulas, merchant agreements.

---

## H. Current UI that could host Social Moments later (without destroying chat)

**Preserve:** conversation-primary shell, OpalInsightField / Possibility / Resolution grammar, Technicolor, quiet one-surface law.

| Placement (conceptual) | Risk |
|------------------------|------|
| **Separate “Moments” tab as peer to chat** | High — splits product into IG clone |
| **Conversation-adjacent “shared album / afterglow” for a Set** | Medium — natural continuum |
| **Relationship profile strip (not global feed)** | Medium — social without algorithm hole |
| **Opal moment that *is* the post surface only when user shares** | Low if rare and causal |
| **Global infinite feed** | Highest authenticity/noise risk — defer |

**Recommendation:** If ever shipped, start **relationship- and Shared-Reality-scoped**, not a global feed destination.

---

## I. Isolated prototype (built)

**Location:** `docs/evidence/shared-reality-prototype/index.html`  

**Not wired** into `App.tsx` / production shell.

Shows:

1. Beautiful Social Moment (friend’s dinner)  
2. Normal social acts (like / comment energy)  
3. Subtle **Do this with your people**  
4. Circle selection  
5. Handoff into **existing alignment language** (preview only)  
6. Optional “new Shared Reality forming” preview  

**Success test:** Feels like *inspiration → coordination*, **not** Instagram + Book button.

---

## J. Explicitly do NOT build yet

- Production Social Moments feed  
- Media pipeline / CDN / moderation  
- Merchant marketplace UI  
- Payouts / rewards / affiliate disclosure  
- Second Set authority or parallel booking engine  
- Algorithmic engagement ranking  
- Redesign of accepted chat shell  
- Anything that delays founder + one trusted dyad pilot  

---

## Economic review (policy options only)

See G. **Authenticity before commerce. Fit before monetization. Relationship before marketplace.**

---

## Cold / noise / trust review checklist (for prototype reviewers)

| Review | Pass criteria |
|--------|----------------|
| Cold | Unprimed: “friend’s life → my plan” not “ad” |
| Noise | Merchant/booking doesn’t dominate human story |
| Trust | See ≠ entitled to original circle; Do this is independent |

---

## Relation to Phase 1 pilot

| Track | Status |
|-------|--------|
| Live dyad pilot | **ACTIVE** — residue is the KPI |
| Shared Reality vision | **LOCKED conceptually** |
| Production Moments | **NOT STARTED** |
| This audit + prototype | **COMPLETE for review** |

Pilot evidence writes the next coordination roadmap.  
This audit preserves optionality so inspiration→alignment can be added **later** without rewriting AlignmentAuthority.

---

## One sentence for all future decisions

> **A picture can remain a picture; when someone genuinely wants to do that, Opal’s job is to turn inspiration into alignment—not into more scroll.**
