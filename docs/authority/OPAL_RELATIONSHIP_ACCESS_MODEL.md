# Opal Relationship Access Model

**Status:** ARCHITECTURE AUTHORITY + SUBSTRATE IMPLEMENTATION  
**Synced:** 2026-10-13  
**Pass 2:** LOCKED (`UNDERSTANDING_CANDIDATES_ACTIVE = NO`, `RELATIONSHIP_INFERENCE_ACTIVE = NO`)  
**Composes with:** `OPAL_DYNAMIC_RELATIONSHIP_CLARIFICATION.md` · `OPAL_PERMISSION_ARCHITECTURE.md` · `YOU_TRUST_MODEL.md` · `RELATIONSHIP_CONTEXT_MODEL.md` · `OPAL_UNDERSTANDING_LAW.md` · `FACT_OWNERSHIP_VISIBILITY_LAW.md`

```yaml
authority_class: OPAL_RELATIONSHIP_ACCESS_MODEL
pass_2: LOCKED
implementation: PERMISSION_SUBSTRATE_AUTHORIZED
purpose: relationship_is_permission_boundary_not_blanket_grant
```

## Person-agnostic law

Founder conversation names are **examples only**. They are not hardcoded users, fixed edges, or permission defaults. See `OPAL_DYNAMIC_RELATIONSHIP_CLARIFICATION.md`.

The substrate must work identically for every Opal user: any Person ↔ Person or Person ↔ Group, with dynamic context, time, and user-controlled permission — never “Person = preference list.”

## Core law

**Relationship context is a permission boundary.**

Not:

```text
User → Everything
```

But:

```text
User → Relationship / Group Context → Allowed Understanding → Allowed Action
```

A relationship **label** (partner, coworker, church group) never automatically grants sensitive information.

Relationship templates are **starting policies / suggested boundaries**, not blanket access grants.

## Continuous Permission Law (standing capabilities)

> Opal permissions are persistent, user-granted capabilities — not repeated interruptions. A permission grants a bounded capability within defined scope, visibility, expiration, and revocation controls.

Principles:

1. Permission should reduce friction, not create friction.
2. The user controls capability boundaries.
3. Opal must disclose active sensitive capabilities (e.g. **Opal Graphing** indicator).
4. Opal must never silently expand scope.
5. Users can pause / revoke instantly.
6. Different relationships may have different permissions.
7. Global pause overrides relationship grants.
8. Platform / legal other-party consent cannot be overridden by one user's standing grant.

### Standing Graphing modes (required)

| Mode | Meaning |
|------|---------|
| `never` | Do not Graph calls/chats |
| `ask_each` | Ask each eligible interaction |
| `auto_eligible` | Automatically Graph interactions that pass eligibility + relationship grants |
| `selected_only` | Only Graph relationships/groups explicitly opted in |

A user who chose `auto_eligible` or `selected_only` must **not** be interrupted on every call.

When Graphing is active: visible **Opal Graphing** with Pause · Resume · Stop · Manage permission.

## Use permission ≠ disclosure permission (mandatory)

Opal may be allowed to **use** a signal privately for alignment without **disclosing** the underlying signal to another person.

Example:

> Sadeil tells Chanelle: “I don't really have money today.”

With permission, Opal may **use** a financial constraint to avoid proposing an expensive date.

Opal must **not** disclose to friends or unrelated people that “Sadeil has financial problems.”

| Capability | Meaning |
|------------|---------|
| **use** | Internally shape Suggest/Prepare for the owner (and optionally scoped counterparties who already share that context) |
| **disclose** | Reveal the underlying signal / fact / candidate to another person or surface |

Sensitive categories (financial, health/fit, family/private, emotional/current-state, gifts, work-confidential) default to **use without disclose** unless the user explicitly expands disclosure.

## Permission dimensions (not a boolean)

Every relationship access grant MUST be able to express:

| Dimension | Meaning |
|-----------|---------|
| `subject` / `owner` | Who owns the grant (usually the granting user) |
| `relationship` or `group` scope | Contact edge, group, or global-self |
| `data_category` | What kind of signal |
| `access_level` | `none` · `observe` · `use` · `disclose` |
| `action_ceiling` | `none` · `suggest` · `prepare` · `execute` |
| `visibility` | Who may see derived objects (`private` · `relationship` · `group` · `self_only`) |
| `source` | `explicit` · `template` · `provisional` |
| `granted_at` | When granted |
| `expires_at` / persistent | Optional expiry; null = standing |
| `revoked_at` | Soft revoke timestamp |
| `correction` / review path | How user corrects |
| `audit` / provenance | Why this grant exists |

### Data categories (minimum)

- `plans_commitments`
- `calendar_availability`
- `location_live`
- `shared_experiences`
- `preferences_interests`
- `conversation_signals`
- `call_signals`
- `financial_context`
- `health_fitness`
- `family_private`
- `gifts_favorites`
- `understanding_candidates` (schema-ready; **activation locked**)

### Action ceiling (Suggest → Prepare → Execute)

Center and Assist must never offer an action above the current ceiling.

| Ceiling | Allowed |
|---------|---------|
| `none` | Explain only |
| `suggest` | Propose options |
| `prepare` | Draft / stage |
| `execute` | Mutate / book / send when also provider + ConsentProof allow |

## Relationship templates (suggested scopes only)

Templates seed **suggested** grants. Users expand or contract. Type change never silently escalates.

| Template | Suggested use (typical) | Default disclose | Notes |
|----------|-------------------------|------------------|-------|
| Romantic partner / spouse | plans, preferences, shared experiences, calendar (if linked), conversation/call signals | relationship-scoped for shared planning | Financial/health remain use-without-disclose unless expanded |
| Parent → child | safety/location, schedule, important events | limited | Not private romantic conversations |
| Child → parent | schedule, safety signals child opts into | limited | Child agency respected |
| Sibling | plans, family events | relationship | Not automatic finances |
| Family | family-scoped plans / events | family/group | No outsider 1:1 bleed |
| Close friend | activities, shared interests, plans | relationship | Finances/health restricted |
| Friend | plans, activities | relationship | Narrower than close friend |
| Acquaintance / new connection | almost nothing | none | Explicit share only |
| Coworker | work schedules / meetings | work | Personal life blocked |
| Manager / professional | work schedules / projects | work | No personal/emotional |
| Business partner | shared work plans | work/business | No personal finance unless expanded |
| Church / community | events, volunteering, group activities | group | Personal struggles restricted |
| Group | group-scoped shared intent only | group | **Does not inherit** members' private contexts |
| Custom | user-defined | user-defined | Still requires dimensions |

### Evolution rule

```text
Stranger → Acquaintance → Friend → Close Friend → Partner
```

does **not** mean automatic permission escalation.

When relationship type changes, Opal may **offer** a template diff for review. It must not apply sensitive expansions silently.

### Relationship season (architected)

Same people, different season (first date · engaged · newly married · parenting · hardship). Seasons may modulate *suggestions* for templates; they do not silently raise ceilings. Productization of seasons is Pass 2+; schema must leave room (`season_key` optional on grants / context).

## Graphing output boundary (not dump-to-memory)

Forbidden:

```text
call → dump transcript into permanent memory
```

Required boundary:

```text
interaction
  → permitted Graphing
  → signals
  → scoped candidate objects later (LOCKED)
  → contextual use
  → relationship alignment
```

Raw interaction data and derived understanding remain distinguishable.

Signal kinds the schema must represent (activation locked):

- Saturday dinner mentioned  
- restaurant preference  
- important date/event  
- future commitment  
- financial constraint  
- gift/favorite signal  
- location/timing requirement  
- temporary emotional / current-state context  

## Understanding Pipeline (architected; not activated)

```text
Raw Interaction
      ↓
Conversation / Event Ingest
      ↓
Signal Extraction
      ↓
Candidate Understanding   ← LOCKED
      ↓
Permission Check (this model)
      ↓
Confidence Evaluation
      ↓
Relationship Scope
      ↓
Graph Object
      ↓
Action Opportunity (ceiling-bound)
```

## Unit of intelligence

The unit of intelligence is **not** the person alone.

The unit is:

> **relationship + context** (people · moment · season · place · history · permissions)

Opal does not ask only “What does this person like?”  
Opal asks “What is relevant **in this relationship, right now**, under current permissions?”

## Hard boundaries (this tranche)

```text
PASS2_UNLOCKED = NO
UNDERSTANDING_CANDIDATES_ACTIVE = NO
RELATIONSHIP_INFERENCE_ACTIVE = NO
SCORING = NO
FAKE_SUCCESS = 0
```

Permission substrate implementation is **authorized** as the prerequisite for Pass 2. Intelligence activation is not.

## Related

- Continuous Permission Law also mirrored in `OPAL_PERMISSION_ARCHITECTURE.md`
- Substrate: `OpalCore.RelationshipAccess` (+ migrations / product API)
- Evidence: `docs/evidence/relationship_access/`
