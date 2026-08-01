# Relationship Safety Rules

**Status:** Phase 0 — mandatory product law  
**Audience:** Product, design, AI, backend, QA, trust & safety

---

## Principles

1. **Intimate data is radioactive.** Message content, voice, location of feelings, and relationship context require higher care than ordinary SaaS data.  
2. **Consent is continuous**, not a one-time checkbox.  
3. **Uncertainty is mandatory** for inferences about another person’s mind or feelings.  
4. **Private ≠ shared.** One user’s reflection never becomes the other’s truth without explicit dual process.  
5. **Circles are blast radius.** Context must not leak across relationship boundaries.  
6. **Opal assists; the human decides.** No send, call, or impersonation without approval.  
7. **Safety includes protecting users from Opal** (overreach, certainty theater, emotional exploitation).  
8. **Safety includes protecting users from each other** (block, report, stalking/coercive-control patterns)—without turning Opal into a courtroom.

---

## Forbidden product behaviors

| Forbidden | Why |
|-----------|-----|
| Claiming certainty about another’s private intent | Unknowable; harmful if wrong |
| Relationship “health” scores / grades | Manipulative; alarmist |
| Always-on analysis without informed consent | Surveillance |
| Auto-send of drafted messages | Agency violation |
| Voice cloning or speaking as user by default | Impersonation risk |
| Using romantic context in family/work circles | Context boundary violation |
| Monetizing crisis moments with dark patterns | Exploitation |
| Hiding that a message was translated or AI-assisted (where material) | Transparency |
| Training public models on private chats without clear legal basis + consent | Privacy |

---

## Uncertainty language standard

**Allowed patterns**

- “This may suggest…”
- “One possible reading is…”
- “This still might need an answer.”
- “You said you would… Want to keep that?”

**Disallowed patterns**

- “He is definitely…”
- “She doesn’t love you.”
- “This relationship is failing (72%).”
- “We detected narcissism / attachment disorder” (clinical diagnosis theater)

Clinical or legal advice is out of scope. Opal is not a therapist or court.

---

## Coercive control and abuse

Opal must not become a tool for:

- Monitoring a partner without their knowledge  
- Pressuring someone via AI “proof” of disloyalty  
- Stalking via presence or delivery receipts beyond normal messenger norms  
- Circumventing blocks  

**Requirements (design + eng):**

- Robust **block** and **report**  
- Careful presence/last-seen defaults (founder decision on exact model)  
- AI features that could enable surveillance require **per-feature consent** and clear copy  
- Safety agent reviews for harmful drafting (threats, coercion, self-harm adjacent)  
- Do not generate “evidence packs” to weaponize against a partner  

Exact policies: LEGAL_OR_POLICY blockers before public launch.

---

## Minors and family

Age requirements and jurisdiction-specific minor rules remain **LEGAL_OR_POLICY** (see `OPAL_OPEN_DECISIONS_RELATIONSHIP_UNIVERSE.md`, `OPAL_AGE_AUTHORITY_TIERS.md`).

**Product law (accepted design track):**

1. **Parents and children are first-class Social Flow contexts**, not edge cases.  
2. **Child-to-child** is first-class in the product model and **ship-gated** until safety/legal gates pass.  
3. Minors **must not** receive the adult system with only a parental-control screen on top.  
4. Authority, consent, visibility, identity, and contact rules are **age- and capability-tiered**.  
5. **Not surveillance by default.** Guardians may have elevated logistics/safety tools; children retain dignity and, where tier-appropriate, legitimate private space.  
6. **Adult-stranger ↔ child** contact is default-deny with restricted discovery.  
7. No Social Score, no behavioral scoring of children, no ads on intimate/child data, no hidden emotional profiling.  
8. MVP / first engineering populations remain **adult-only** until legal and child-safety gates close for any youth path.  
9. A **narrow parent + older child family plan** path may be specified for a later slice only behind explicit safety gates (`BUILD_SLICE_SOCIAL_FLOW_1.md` Journey B).  
10. Governing docs: age tiers, guardian boundaries, child-to-child, child-safety threat model, minor/family privacy, contact security.

---

## Voice and telephony

| Capability | Rule |
|------------|------|
| Voice notes | Normal messenger; user-generated |
| STT / TTS | Consent for AI processing |
| Voice model / clone | GOVERNED; explicit multi-step consent; deferred from MVP |
| Outbound call as user | GOVERNED; event-specific approval; disclosure; audit log |
| Call recording | Explicit consent model; jurisdictional review |

---

## Memory safety

- **Private memory:** visible only to the owning user; used only under their AI consent.  
- **Shared relationship memory:** only with explicit dual consent when that product surface exists.  
- **Deletion:** relationship context deletion must be testable and complete within defined scope.  
- **Revocation:** turning AI off stops new processing; retention of artifacts follows policy (open decision).

---

## Notification safety

- Prefer **relevance** over volume.  
- No fear-based push (“Your relationship is at risk”).  
- Commitment reminders only for **confirmed** or user-accepted candidates.  
- Night/quiet and per-conversation mute are first-class.

---

## Drafting safety

Before offering a draft, Safety checks should reduce:

- Threats, harassment, hate  
- Self-harm encouragement  
- Attempts to manipulate underage scenarios (when age policy exists)  
- Impersonation of third parties  

User remains free to type anything themselves; Opal must not **help** produce clear abuse content.

---

## Incident and evidence mindset

Every safety-critical claim needs tests:

- blocked-user enforcement  
- shared-vs-private isolation  
- consent revocation  
- harmful drafting refusal  
- coercive-control scenario suites (synthetic)  

See `docs/evidence/` and testing standard in bootstrap brief.
