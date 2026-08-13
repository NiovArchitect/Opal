# Intelligence Change Evidence Template

**Status:** ACTIVE  
**Use:** Copy into PR description or `docs/intelligence/evidence/YYYY-MM-DD-<slug>.md`  
**Law:** No greenwashing. No “all intelligence improved.”

---

## Header

| Field | Value |
|-------|-------|
| Date | |
| Author / agent | |
| Branch | |
| Base SHA | |
| Constitution version | (must match `config/intelligence_manifest.json`) |
| Change ID | INT-CHG-… |

---

## Capability added/modified

| | ID | Name |
|--|----|------|
| **Added** | | |
| **Modified** | | |
| **Unchanged (explicit)** | | |

**Why (human problem, not feature list):**


---

## Evidence sources

What humans said/did or system facts this change relies on:

-

**Not evidence (do not treat as truth):** model guesses, UI convenience, fixture pressure

---

## Dependencies

From ledger / `node scripts/intelligence_impact.mjs`:

| Depends on | Why |
|------------|-----|
| | |

---

## Existing capabilities affected

| Capability | How affected | Expected: IMPROVED / UNCHANGED / at risk |
|------------|--------------|------------------------------------------|
| | | |

---

## Invariants

| Invariant | Must remain true? | Suite |
|-----------|-------------------|-------|
| INV-… | yes | `mix test test/intelligence/` |

If an invariant is intentionally broken: **STOP** — require SUPERSEDE ADR + evidence.

---

## Golden episodes

| Episode | Baseline | After | Result |
|---------|----------|-------|--------|
| EP-00N | | | IMPROVED / UNCHANGED / REGRESSED |

Any REGRESSED without SUPERSEDE → change fails.

Commands:

```bash
./scripts/intelligence_check.sh --with-tests
# or targeted:
cd apps/opal_core && mix test test/intelligence/
```

---

## Authority impact

| Question | Answer |
|----------|--------|
| Does this treat inference as settlement? | |
| Does SocialReality still have `authorizes_set: false`? | |
| New shared write / calendar write / booking authority? | |

---

## Privacy impact

| Question | Answer |
|----------|--------|
| Private calendar detail ever cross boundary? | |
| Private selection send to peers? | |
| New shared presentation of private assistance? | |

---

## Presentation impact

| Question | Answer |
|----------|--------|
| Smallest useful human output? | |
| Four surfaces still agree on core truth? | |
| One fact once preserved? | |
| next_gap CTA still single primary when applicable? | |

---

## Regression result

```text
INTELLIGENCE DIFF
Capabilities added: …
Capabilities modified: …
Capabilities unchanged: …
Invariants: PASS | FAIL
Golden episodes: IMPROVED | UNCHANGED | REGRESSED (list)
Privacy impact: …
Authority impact: …
Coordination residue impact: …
Known unknowns: …
```

Paste `./scripts/intelligence_check.sh --with-tests` output summary.

---

## Human coordination residue impact

Does this change how people actually coordinate (draft vs send, leave-around, group add, time flip)?

-

---

## Supersession (only if replacing law)

| Field | Value |
|-------|-------|
| From capability/invariant/episode | |
| Replacement | |
| ADR | ADR-INT-… |
| Reason | |
| Evidence path | |

Empty supersessions section = nothing was removed.

---

## Test / episode removal guard

If any intelligence test, invariant, or golden episode was deleted or `@tag :skip`:

| Item | Why removed | SUPERSEDE reference |
|------|-------------|---------------------|
| | | |

“No longer relevant” without reason is **not** accepted.

---

## Unknowns

-

---

## Pre-implementation block (must exist before coding)

```text
INTELLIGENCE CONTEXT LOADED
TARGET CAPABILITY: …
CURRENT BEHAVIOR: …
PROPOSED DELTA: …
DEPENDENCIES: …
INVARIANTS TO PRESERVE: …
EPISODES TO REPLAY: …
EXPECTED NON-CHANGES: …
AUTHORITY BOUNDARIES: …
PRIVACY BOUNDARIES: …
```

Absent block → intelligence change is **not authorized**.
