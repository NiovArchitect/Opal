# Opal Intelligence Canon

**Purpose:** Durable, executable product intelligence so agents compound capability instead of replacing it.

| Layer | Path | Role |
|-------|------|------|
| Constitution | [OPAL_INTELLIGENCE_CONSTITUTION.md](./OPAL_INTELLIGENCE_CONSTITUTION.md) | Human-readable durable laws |
| Capability ledger | [INTELLIGENCE_CAPABILITY_LEDGER.md](./INTELLIGENCE_CAPABILITY_LEDGER.md) | Named capabilities + owners + deps |
| Change protocol | [INTELLIGENCE_CHANGE_PROTOCOL.md](./INTELLIGENCE_CHANGE_PROTOCOL.md) | Additive change checklist |
| Change template | [INTELLIGENCE_CHANGE_TEMPLATE.md](./INTELLIGENCE_CHANGE_TEMPLATE.md) | PR/evidence form (no greenwashing) |
| Evaluation standard | [INTELLIGENCE_EVALUATION_STANDARD.md](./INTELLIGENCE_EVALUATION_STANDARD.md) | How to score IMPROVED / REGRESSED |
| Enforcement | [ENFORCEMENT.md](./ENFORCEMENT.md) | Preflight, CI scope, supersession, guards |
| Decisions | [decisions/](./decisions/) | ADR-INT-* product philosophy locks |
| Golden episodes | [golden-episodes/](./golden-episodes/) | Non-regression human scenarios |
| Evidence | [evidence/](./evidence/) | Evaluation reports |
| Machine manifest | [`config/intelligence_manifest.json`](../../config/intelligence_manifest.json) | Discovery for agents/CI |
| Enforcement config | [`config/intelligence_enforcement.json`](../../config/intelligence_enforcement.json) | Triggers, deps, episode bridge, supersessions |
| Local command | [`./scripts/intelligence_check.sh`](../../scripts/intelligence_check.sh) | One check for agents/developers |

## Primary law

**Intelligence must compound.** New work may add evidence, inference, authority, privacy, presentation — it must not silently delete or bypass existing intelligence without an intentional SUPERSEDED decision.

## Four truth layers (never collapse)

1. **Evidence** — what humans said/did and system facts  
2. **Inference** — what Opal believes that implies  
3. **Authority** — what Opal may conclude or act on  
4. **Presentation** — smallest useful human-facing consequence  

## One-command entry

| Mode | Command |
|------|---------|
| **FAST** (preflight + validate) | `./scripts/intelligence_check.sh` |
| **IMPACT** (git blast radius) | `./scripts/intelligence_check.sh --impact` |
| **INTELLIGENCE CHANGE** | `./scripts/intelligence_check.sh --impact --with-tests` |
| **FULL** (availability + web opalUi) | `./scripts/intelligence_check.sh --full` |
| **LIVE** (Jordan browser) | optional / manual only — not required CI |

Related: `node scripts/intelligence_preflight.mjs`, `node scripts/intelligence_validate.mjs`, `node scripts/intelligence_impact.mjs`, `node scripts/intelligence_negative_prove.mjs` (fail-closed proof).

CI: `.github/workflows/intelligence.yml` (path-filtered; model-neutral).

## Agent pre-flight (required)

```bash
./scripts/intelligence_check.sh
./scripts/intelligence_check.sh --impact
```

Before substantial intelligence work, read:

1. This README  
2. Constitution  
3. Capability ledger (capabilities at risk)  
4. [ENFORCEMENT.md](./ENFORCEMENT.md)  
5. Relevant ADR-INT decisions  
6. Golden episodes tagged for those capabilities  
7. Domain modules listed in the ledger  

Then report (**absent = not authorized**):

```text
INTELLIGENCE CONTEXT LOADED
CONSTITUTION VERSION: …
CAPABILITIES TOUCHED: …
DEPENDENCIES: …
INVARIANTS AT RISK: …
GOLDEN EPISODES TO REPLAY: …
AUTHORITY BOUNDARIES: …
PRIVACY BOUNDARIES: …
EXPECTED INTELLIGENCE DELTA: …
```

Pre-implementation (before edits):

```text
TARGET CAPABILITY / CURRENT BEHAVIOR / PROPOSED DELTA
INVARIANTS TO PRESERVE / EPISODES TO REPLAY / EXPECTED NON-CHANGES
```

Post-implementation: Intelligence DIFF via [INTELLIGENCE_CHANGE_TEMPLATE.md](./INTELLIGENCE_CHANGE_TEMPLATE.md).

Only then modify code.

## What this is not

- Not a brand workstream (93:* still INVALID until pixels land)  
- Not a proof-harness rewrite (`scripts/founder_proof_fixture.mjs` is INT-PROOF-*)  
- Not V2 merge authorization (HOLD remains for founder visual/brand gates)  
- Not SF15 reimplementation (historical foundation freeze)  

## Related existing canon (do not delete)

| Source | Notes |
|--------|-------|
| `docs/product/CAPABILITY_LEDGER.md` | Merge/PR vertical ledger — complementary |
| `docs/product/SHARED_REALITY_CURATION_AND_PRESENTATION_LAWS.md` | Presentation laws |
| `docs/architecture/SOCIAL_FLOW_*.md` | Authority/privacy/inference boundaries |
| `docs/evidence/v2-coded-experience/` | V2 live proof history |
| `docs/evidence/social-flow-15/` | SF15 closed foundation |

GitHub is durable memory. Conversation is not.
