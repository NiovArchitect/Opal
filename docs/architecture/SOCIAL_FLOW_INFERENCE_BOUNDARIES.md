# Social Flow Inference Boundaries

**Authority:** ARCHITECTURE (CURRENT)  
**Status:** Python AI boundaries for Social Flow interpretation — **not** an implementation claim  
**Related:** `PYTHON_AI_BOUNDARY.md`, `SOCIAL_FLOW_ARCHITECTURE.md`, `SOCIAL_FLOW_AUTHORITY_BOUNDARIES.md`, `SOCIAL_FLOW_PRIVACY_BOUNDARIES.md`, `MINOR_AND_FAMILY_PRIVACY.md`, `OPAL_RELATIONSHIP_INTELLIGENCE_PRINCIPLES.md`, SF-D003–D009

---

## Locked rule

> **Python performs bounded communication interpretation and returns proposals.**  
> **Elixir alone commits plans, RSVPs, grants, labels, and reminders that imply obligation.**  
> **Uncertainty is mandatory. Silent commitments are forbidden.**

Service name (Phase 0): `services/Opal_ai` — worker, not social OS runtime.

---

## What Python may do (Social Flow)

| Capability | Output nature |
|------------|---------------|
| Detect possible plan language in a bounded message window | `PotentialPlan` **proposal** |
| Extract activity, mentioned participants, time candidates, location hints | Candidates + missing fields |
| Score confidence / list uncertainties | Required metadata |
| Suggest a lightweight in-thread prompt | Copy proposal |
| Suggest relationship **labels** for user confirmation | Suggestion only |
| Draft coordination messages | Draft; user sends |
| Safety / policy classification on drafts and contact-risk content | `allowed` / flags / `refused` |
| Fill structured fields for polls/options **as suggestions** | Non-authoritative |

All of the above are **evidence and affordances**, never side-effecting social truth.

---

## What Python must not do

| Forbidden | Why |
|-----------|-----|
| Create authoritative `SharedPlan` | Elixir ownership |
| Auto RSVP / set participation | SF-D013 |
| Write availability grants | Permission truth |
| Force or persist relationship labels without user confirm | Agency + isolation |
| Silent calendar writes or invite fan-out | No silent commitments |
| Claim certainty about another’s private intent or feelings | Safety law |
| Emit Social Score or reliability grades | SF-D007 |
| Default mood / emotional surveillance of contacts | SF-D008 |
| Use intimate content for advertising features | SF-D009 |
| Expand context beyond purpose-bound consent window | Minimization |
| Treat consent token as forgeable authority | Opaque proof only; Elixir already gated |
| Clinical / diagnostic claims | Out of scope |

---

## Bounded communication interpretation

### Input expectations (from Elixir)

Elixir should send only:

- Minimum message window (ids + text needed for the job)  
- Redacted fields when possible  
- Purpose-bound `consent_token` / proof correlation id  
- Schema version, job id, idempotency key, trace id  
- Feature/capability type (e.g. plan understanding)  
- Explicit **scope flags** (adult vs minor-safe profile, surprise-safe redaction already applied upstream when required)

Avoid “send entire user history every time.”

### Interpretation rules

1. **Single approved capability** per job — no piggyback multi-purpose mining.  
2. **Conversation-scoped** by default; do not pull other circles.  
3. **Partner / romantic memory must not influence family jobs** and vice versa — Elixir context selector enforces; Python must not request cross-scope fetches.  
4. Prefer **span of messages that mention the plan**, not full biography.  
5. On insufficient context: return high uncertainty + `missing[]`, not guesses presented as fact.

---

## Uncertainty required

Every Social Flow inference result that describes the world or another person must include uncertainty metadata.

```json
"uncertainty": {
  "level": "low|medium|high",
  "notes": ["time_ambiguous", "participant_unclear"]
}
```

### Language standard (product-facing copy derived from model output)

**Allowed:** “This may suggest…”, “One possible reading…”, “Still might need an answer.”  
**Disallowed:** “They definitely…”, clinical labels, failure percentages on relationships.

Insights about others are **never** facts about their inner state.  
Factual private recall of user-visible events is allowed only within consent and truthfulness norms (“Jordan cancelled the last two Thursday plans”) — not scored character judgments.

If uncertainty is missing or schema-invalid, Elixir treats the job as **failed** (`schema_invalid_response`), not as a plan.

---

## Plan detection: proposals only

### Conceptual `PotentialPlan` shape

```text
PotentialPlan
- activity
- participants (mentioned)
- time_candidates[]
- location (may be unresolved)
- source_message_ids[]
- confidence / uncertainty
- missing[]
- recommended_prompt
- evidence only (no side effects)
```

### Rules

- Detection may run only under consent + capability.  
- Stored by Elixir as **proposal**, not event.  
- User must **consent to coordinate** before negotiation machinery.  
- Dismissible UX: “Not a plan” is first-class.  
- **No** silent binding event, RSVP, or hold creation from a detection hit.

---

## Relationship-sensitive extraction

### Allowed

- Suggest a label: “You talk with Jordan often. Coordinate plans in this conversation?”  
- Extract **mentioned** roles for a plan (“ask Michelle”) as participant candidates.  
- Propose circle-appropriate tone for **drafts** under drafting consent.

### Forbidden

- Auto-assign “partner”, “ex”, “best friend”, “high value contact” as durable truth.  
- Rank people by intimacy or importance scores.  
- Propagate labels or preferences across circles.  
- Infer sexual/romantic state for third parties as fact.  
- Build hidden graphs of “true relationships” for ranking or ads.

**User confirms labels.** Expansion order for relationship intelligence remains gradual and confirm-driven (relationship intelligence principles).

---

## Child-safe inference boundaries

When job scope indicates minor-linked content or minor participation (stricter than adult path):

| Boundary | Requirement |
|----------|-------------|
| **Minimization** | Smaller windows; fewer derived fields; no interest/ad profiles |
| **No emotional profiling** | No mood, personality, or “wellbeing scores” of the child |
| **No clinical claims** | No diagnosis, attachment, developmental pathology language |
| **No social scoring** | Visible or hidden |
| **Plan help only under guardian-governed consent** | Purpose: coordination fields, not ambient coaching |
| **No grooming assistance** | Safety refuse contact circumvention, sexual content involving minors, secrecy-from-guardian patterns as policy dictates |
| **No cross-relationship bleed** | Adult partner context excluded from child-scoped jobs |
| **Uncertainty floor** | Prefer higher caution; refuse over confident personal inference |
| **Advertising features** | Not a valid job purpose |

If adult and minor contexts are mixed incorrectly in a payload, Python should **refuse** rather than best-effort interpret.

Guardian-facing “insights” products that profile the child’s psyche are **out of scope**; see `MINOR_AND_FAMILY_PRIVACY.md`.

---

## Schema contracts

### Request (provisional, aligns Python AI boundary)

```json
{
  "job_id": "uuid",
  "idempotency_key": "string",
  "type": "understand | commitment_candidates | draft | safety_check | ...",
  "schema_version": 1,
  "consent_token": "opaque-proof-from-core",
  "payload": {}
}
```

Social Flow types may specialize `payload` (message window, plan_proposal_extract, etc.) under versioned contracts in `packages/contracts`.

### Response (provisional)

```json
{
  "job_id": "uuid",
  "status": "ok | error | refused",
  "schema_version": 1,
  "result": {},
  "uncertainty": {"level": "low|medium|high", "notes": []},
  "safety": {"allowed": true, "flags": []},
  "error": null
}
```

### Contract enforcement

| Rule | Owner |
|------|--------|
| Validate request before Python call | Elixir |
| Validate response before persist | Elixir |
| job_id / trace_id / idempotency_key match | Elixir |
| Unknown fields / version skew | Fail closed for authority-adjacent results |
| `refused` vs `error` | `refused` = policy/safety; not only transport failure |

Python must not rely on side channels (extra HTTP headers with raw authority decisions) to bypass schema.

---

## No silent commitments

**Silent commitment** means any path where interpretation alone produces obligation, invite, or calendar truth.

| Bad path | Required path |
|----------|----------------|
| Detect dinner → create event | Detect → proposal → user consent to coordinate → negotiate → Elixir agreement |
| Detect “I’ll bring dessert” → Commitment row | Candidate → user confirm → Elixir Commitment |
| Detect “we’re free Thursday” → share free/busy | AvailabilityGrant must already exist or user approves share |
| Detect gift idea → show partner | Private hold only until user shares |
| Safety-borderline draft → auto-send | User send only |

Commitment reminders in product copy may only follow **confirmed** or user-accepted candidates.

---

## Safety channel

- Drafting runs through safety check (inline or chained job).  
- Flags for harassment, threats, self-harm adjacent, underage sexual content, coercive patterns.  
- User may still type freely themselves; Opal must not **help** produce clear abuse content.  
- No generation of “evidence packs” against a partner or child.

---

## Provider and data handling

- Provider adapters remain abstract (`providers/…`); no single vendor in domain logic.  
- Prefer vendors with **no training on customer data** (G035).  
- Ephemeral processing preferred; retention follows policy.  
- Minor-linked payloads: strongest contractual + technical minimization available.

---

## Evaluation and tests (AI)

When Social Flow inference is built, required evaluation themes:

- Uncertainty present on relationship-sensitive outputs  
- No forced labels in result schemas that Elixir could wrongly treat as truth  
- Cross-circle prompt injection / context bleed attempts  
- Surprise-related content not “helpfully” revealed in guest-scoped drafts  
- Child-safe profile refuses emotional profiling jobs  
- Schema reject on missing uncertainty for plan detection  
- Idempotent job handling does not double-emit different commitments  

---

## Ownership summary

| Layer | Role |
|-------|------|
| **Python** | Bounded interpretation, proposals, drafts, safety flags |
| **Elixir** | Consent, context selection, contract validation, authority commits |
| **Mobile** | Present proposals; capture user confirmation |
| **Legal** | Age, retention, provider terms |

---

## Non-goals

- Shipping plan-extraction models in this documentation phase  
- Final model selection or GPU topology  
- On-device inference design (future privacy phase)  

---

## Open questions

- Exact Social Flow job `type` enum and payload schemas in `packages/contracts`  
- Default confidence thresholds for surfacing vs suppressing affordances (product)  
- Whether commitment_candidates and plan detection are one job or chained  
- On-device vs server for minor-linked interpretation (G022)  
