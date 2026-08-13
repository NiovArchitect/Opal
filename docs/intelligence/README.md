# Opal Intelligence Canon

**Purpose:** Durable, executable product intelligence so agents compound capability instead of replacing it.

| Layer | Path | Role |
|-------|------|------|
| Constitution | [OPAL_INTELLIGENCE_CONSTITUTION.md](./OPAL_INTELLIGENCE_CONSTITUTION.md) | Human-readable durable laws |
| Capability ledger | [INTELLIGENCE_CAPABILITY_LEDGER.md](./INTELLIGENCE_CAPABILITY_LEDGER.md) | Named capabilities + owners + deps |
| Change protocol | [INTELLIGENCE_CHANGE_PROTOCOL.md](./INTELLIGENCE_CHANGE_PROTOCOL.md) | Additive change checklist |
| Evaluation standard | [INTELLIGENCE_EVALUATION_STANDARD.md](./INTELLIGENCE_EVALUATION_STANDARD.md) | How to score IMPROVED / REGRESSED |
| Decisions | [decisions/](./decisions/) | ADR-INT-* product philosophy locks |
| Golden episodes | [golden-episodes/](./golden-episodes/) | Non-regression human scenarios |
| Evidence | [evidence/](./evidence/) | Evaluation reports |
| Machine manifest | [`config/intelligence_manifest.json`](../../config/intelligence_manifest.json) | Discovery for agents/CI |

## Primary law

**Intelligence must compound.** New work may add evidence, inference, authority, privacy, presentation — it must not silently delete or bypass existing intelligence without an intentional SUPERSEDED decision.

## Four truth layers (never collapse)

1. **Evidence** — what humans said/did and system facts  
2. **Inference** — what Opal believes that implies  
3. **Authority** — what Opal may conclude or act on  
4. **Presentation** — smallest useful human-facing consequence  

## Agent pre-flight

Before substantial intelligence work, read:

1. This README  
2. Constitution  
3. Capability ledger (capabilities at risk)  
4. Relevant ADR-INT decisions  
5. Golden episodes tagged for those capabilities  
6. Domain modules listed in the ledger  

Then report:

```text
INTELLIGENCE CONTEXT LOADED
CAPABILITIES AT RISK: ...
INVARIANTS TO PRESERVE: ...
EPISODES TO REPLAY: ...
```

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
