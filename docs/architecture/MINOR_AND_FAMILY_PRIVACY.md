# Minor and Family Privacy

**Authority:** ARCHITECTURE (CURRENT)  
**Status:** Design boundary for future family / minor programs — **not** an implementation claim  
**Related:** `SOCIAL_FLOW_PRIVACY_BOUNDARIES.md`, `RELATIONSHIP_SAFETY_RULES.md`, `CONSENT_MODEL.md`, `OPAL_SOCIAL_FLOW_PRODUCT_TRUTH.md`, SF-D011 (minors deferred)

---

## Purpose

Define privacy law for **family plans** and **minors** when those product surfaces exist.  
MVP / first Social Flow slice remains **adult users only**; this document is the dedicated safety–privacy track, not a simple age toggle on adult Social Flow.

Minors are **not** a product variant of adult coordination. They require stricter defaults, separate consent paths, and explicit legal policy (G052).

---

## Continuity modes: private / shared / surprise

Family and multi-household coordination reuse the Personal Context Boundary model. Three continuity modes must remain distinguishable forever:

| Mode | Visibility | Who may see | Typical family examples |
|------|------------|-------------|-------------------------|
| **Private** | Only the owning user (or owning guardian account side) | Owner only | Gift prep, personal budget, private reminder “pick up cake”, adult-only logistics |
| **Shared** | Plan participants under membership + grants | Confirmed participants | Family dinner Saturday 6pm, school pickup swap both adults accepted |
| **Restricted surprise** | Organizer + approved helpers; **excludes guest** | Explicit surprise roster | Birthday party plan hidden from the birthday child; gift coordination among parents |

### Continuity rules

1. **Mode is first-class state** on proposals and shared plans — not a UI filter that can be forgotten.  
2. **Surprise leakage is a hard defect.** Guest must never receive plan fields, helper lists, gift commitments, or AI drafts that reveal surprise context.  
3. **Private care work never auto-promotes** into shared plan context (SF-D005).  
4. **Mode changes are governed:** e.g. surprise → shared after the event requires organizer action (and product policy for residual private notes).  
5. **Cross-household plans** (two parents, grandparents) inherit the same modes; household membership ≠ automatic full schedule visibility.

User-facing language stays plain (no “sandbox” jargon): keep private · share with this plan · surprise mode hide from [guest].

---

## Child data minimization

When a minor account or minor-linked participation exists:

| Principle | Requirement |
|-----------|-------------|
| **Collect less** | Only data necessary for consented coordination (who, when, where at coarsest useful level, participation state). |
| **Process less** | No always-on analysis of child messages; no interest profiling for ads or “engagement.” |
| **Retain less** | Prefer shorter retention for child-linked AI artifacts and derived insights (exact windows: LEGAL + FOUNDER — G033). |
| **Share less** | Default visibility is tighter than adult peer graphs; discovery and invitations are gated (see contact security). |
| **Derive less** | No Social Score, reliability grades, mood models, or developmental/clinical inferences (SF-D007, SF-D008). |

### Explicitly forbidden for minors

- Advertising targeting from messages, plans, moods, or interests (SF-D009 — and **stronger** for children: no ad product on child intimate data).  
- Data “staking,” interest marketplaces, or monetization of child behavioral signals (historic source rejected as mechanism).  
- Public or semi-public discovery of children.  
- Training public models on minor chat/content without clear legal basis + guardian-governed consent (LEGAL).  
- Covert parental or third-party surveillance features framed as “insights.”

---

## Guardian access boundaries (not total surveillance)

Guardian control is **safety and consent authority**, not a panopticon.

### Guardians **may** (design intent)

- Establish and link minor participation under legal/policy rules.  
- Approve **connections**, invitations, and plan participation where policy requires.  
- Set **capability defaults** (AI off, location off, discovery restricted).  
- Receive **safety-relevant** notices (e.g. new contact request, blocked interaction attempts) — not a live feed of every keystroke.  
- Export / delete **within legal rights** for the minor’s account data (scoped; see retention).  
- Override or revoke **feature consents** that process the minor’s content.

### Guardians **must not** get by default

| Overreach | Why it is wrong |
|-----------|-----------------|
| Full real-time message surveillance of all child chats as product default | Turns Opal into domestic monitoring; harms trust and safety design |
| Partner-style private reflections about the child packaged as “insights” | Emotional profiling; forbidden certainty theater |
| Covert monitoring of the child’s contacts without clear, lawful, disclosed model | Coercive-control adjacent |
| Access to **another adult’s** private care work or partner context via the child link | Cross-relationship isolation violation |
| Unlimited historical AI reconstruction of the child’s “personality” | Minimization + anti-scoring |

### Design stance

- Prefer **approval gates** and **scoped summaries** over raw always-on message mirrors.  
- Where law requires parental access rights, implement with **transparency to the child** appropriate to age policy (LEGAL copy), not silent wiretapping.  
- Multi-guardian households need **role clarity** (e.g. co-parent vs emergency contact) — open product decision; neither role inherits partner-circle context.

---

## Cross-relationship isolation

Circles are blast radius. Family features must not weaken isolation.

| Isolation | Rule |
|-----------|------|
| **Partner ↔ parent-child** | Romantic / partner private memory, gift prep, couple plans, and intimate reflections **never** appear in parent-child or family-circle AI context. |
| **Family ↔ work / community** | Family schedule intelligence does not feed professional circles. |
| **Sibling / multi-child** | One child’s private notes and restricted surprises do not leak to siblings unless intentionally shared. |
| **Co-parent ↔ new partner** | Co-parenting plan context is not automatically visible to a parent’s new partner; requires explicit membership/grants. |
| **Surprise helpers** | Helpers see only surprise-scoped fields; not the guest’s private messages elsewhere. |
| **Guardian dashboard** | Must not become a join key across unrelated relationships of adults in the household. |

**Test themes (mandatory when built):** partner context never in family AI jobs; surprise guest exclusion; co-parent boundary; multi-child isolation. Aligns with threat model “context bleed.”

---

## Retention, export, deletion (placeholders)

Exact timelines and legal bases are **LEGAL_OR_POLICY + FOUNDER** (G033, G034). Architecture placeholders:

| Action | Expected architectural behavior |
|--------|--------------------------------|
| **Feature revoke (AI / coordination)** | Stops **future** jobs and processing for that capability/scope immediately. |
| **Conversation AI off** | No new minor- or family-scoped AI jobs for that conversation. |
| **Delete relationship / family context** | Removes stored relationship memory and derived plan-intelligence artifacts **in scope**; chat messages follow message-delete policy. |
| **Delete plan** | Tombstones authoritative plan + revisions per product rules; private holds owned by others remain owner-private. |
| **Guardian-initiated minor export** | Portable export of data the guardian is legally entitled to; format and scope TBD with counsel. |
| **Guardian- or user-initiated deletion** | Orchestrated erasure job; verify completeness with isolation tests. |
| **Account delete (minor or adult)** | Full erasure path; timeline TBD with legal. |
| **Surprise archives** | After reveal or cancel, residual private notes stay private; shared residue follows plan deletion rules. |

Revocation ≠ silent indefinite retention of AI transcripts. Retention of artifacts after revoke remains an open policy decision — document user-visible expectations before ship.

---

## AI context minimization for minors

When AI is permitted at all for a minor-linked conversation or plan:

1. **Consent path is stricter** than adult L1/L2 — guardian-governed feature enablement; no dark-pattern soft-on.  
2. **Purpose-bound jobs only** — e.g. plan field extraction for an approved coordination session; not ambient relationship coaching.  
3. **Bounded windows** — minimum messages/ids; redaction of unnecessary third-party content.  
4. **No emotional profiling** of the child; no clinical, diagnostic, or “attachment” language.  
5. **No reliability / social scores** visible or hidden.  
6. **Uncertainty mandatory** on any inference; Python returns proposals only.  
7. **Adult private context excluded** from child-scoped jobs (and vice versa except explicit shared plan fields).  
8. **Providers:** contractual no-training on customer data; prefer strongest minimization (on-device later where feasible).  
9. **`refused` is first-class** for underage-unsafe or over-scoped requests.

See `SOCIAL_FLOW_INFERENCE_BOUNDARIES.md` for child-safe inference detail.

---

## No advertising from intimate data

**Locked (SF-D009), reinforced for family/minors:**

- No ad targeting from messages, plans, commitments, free/busy, location grants, or mood/interest inferences.  
- No “child-safe ads,” reward ads, or interest-insight products derived from minor activity (historic kids-calendar advertising model is **rejected**).  
- No selling or bartering family graph or plan participation for marketing.  
- Monetization, if any, must not exploit crisis, family conflict, or child attention (G060).

---

## Mapping: historic “kids calendar” → Opal

| Historic source idea | Opal stance |
|----------------------|-------------|
| Full parental dashboard over all activity | Replace with **scoped guardian authority** + safety notices; not total surveillance |
| Data staking for personalization | **Rejected** as dependency; use consented preference memory with guardian control |
| Child-safe / reward advertising | **Rejected** for intimate + child data |
| Parent-approved connections | **Preserve** as contact / invitation gates |
| Private by default profiles | **Preserve** and strengthen |
| Fun UX for children | Deferred product design; safety/privacy architecture first |

**Principle:** Preserve **safety and consent capability**; reject surveillance and ad mechanisms.

---

## Ownership

| Concern | Owner |
|---------|--------|
| Authoritative family/minor membership, guardian links, plan visibility modes | Elixir / OTP |
| Consent proofs, grants, audit | Elixir |
| Child-safe / minimized inference proposals | Python workers under Elixir dispatch |
| Legal age, COPPA/GDPR-K and jurisdictional rules | LEGAL_OR_POLICY |
| UX copy for guardian vs child transparency | Product + Legal |

---

## Non-goals (this document)

- Shipping minor accounts in the first Social Flow build slice  
- Country-by-country compliance matrix  
- Full parental-control product UI  
- School / institutional roster integrations  

---

## Open questions

See summary section in the documentation PR notes / G052, G033, multi-guardian roles, age bands, and child-visible transparency of guardian actions.
