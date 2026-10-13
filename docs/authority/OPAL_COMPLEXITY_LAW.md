# Opal Complexity Law

**Status:** CURRENT AUTHORITY — experience vs engine separation  
**Synced:** 2026-10-13  
**Pass 2:** LOCKED  

```yaml
authority_class: OPAL_COMPLEXITY_LAW
algorithm_knobs_on_you: FORBIDDEN
```

## Law

> Internal intelligence complexity must increase capability without increasing user cognitive burden.  
> Users control permissions and boundaries; Opal manages interpretation, alignment, and assistance.

The consumer should feel:

> “Opal gets us.”

Not:

> “Opal calculated us.”

## Two products inside one product

### 1. User-facing Opal (human experience)

Warm, simple, understandable.

Examples of what users see:

- “Opal found something you both might enjoy.”  
- “Based on your shared experiences…”  
- “You usually enjoy quieter places together.”  
- “This works well because it fits both schedules.”  
- “You and your friends have different preferences tonight. Here are three options.”

Humans still choose. Opal increases alignment probability — it does not “solve” people.

### 2. Alignment Engine (backend)

Complex, improving, invisible:

```text
Signals → Context extraction → Permission validation → Relationship scope
→ Preference modeling → Constraint analysis → Alignment → Recommendation / assistance
```

Users never manage:

- preference weighting percentages  
- novelty factors as dials  
- “emotional context sensitivity: High”  

Those are engineering — not YOU.

## What YOU exposes vs what it must not

| YOU exposes (Control) | YOU must not expose |
|-----------------------|---------------------|
| Allow calendar / location / conversation understanding | Relationship algorithm settings |
| Allow relationship assistance | Preference weighting knobs |
| Corrections · revoke · visibility scopes | Personality scores · confidence dashboards as product UI |

User teaches Opal through permissions, corrections, and interactions.  
Opal does the hard work and returns a human experience.

## Intelligence stack (engine layers)

```text
Human Reality Layer
        ↓
Permission Layer
        ↓
Context Layer
        ↓
Alignment Engine
        ↓
Action Layer
        ↓
Human Experience
```

Users interact with the top (reality + permissions on YOU) and the bottom (experience).  
The middle is Opal’s responsibility — after founder unlock and Understanding Candidates.

## Blind spots the engine must honor (when built)

1. **Current state** — long-term pattern + today’s energy/grief/stress  
2. **Alignment ≠ similarity** — generosity / “their turn” matters  
3. **Novelty** — known enjoyment + relationship value + new experience  
4. **Dynamic consent** — boundaries can tighten without damaging the product story  
5. **Group as entity** — constraints + opportunity, not preference average  
6. **Age as constraint** — legal/safety eligibility, not personality stereotype  

## Required zeros

- `ALGORITHM_WEIGHT_KNOBS_ON_YOU = 0`  
- `USER_MANAGES_ALIGNMENT_MATH = 0`  
- `OPAL_SOLVED_IT_WITHOUT_CHOICE = 0` (default)  
- `CONFIDENT_MISUNDERSTANDING_SHIPPED_AS_FACT = 0`

## Related

- `USER_VS_CONTROL_LAW.md`  
- `YOU_TRUST_MODEL.md`  
- `OPAL_UNDERSTANDING_LAW.md`  
- `RELATIONSHIP_CONTEXT_MODEL.md`  
- `OPAL_TEMPORAL_CONTEXT_ALIGNMENT_FOUNDATION.md` — time/place/context + gyroscope alignment (architecture only)  
- Product sequence: finish YOU wiring → permission/action → unlock → Understanding Candidates → context engine → alignment engine  
