# Opal Alignment Loop (canonical behavioral OS)

**The AI should do more work; the user should experience less software.**

Not a wizard. Continuously revisable intelligence under normal conversation.

```
KNOW WHAT HAPPENED
  → KNOW WHAT IS STILL POSSIBLE
  → NOTICE WHAT JUST BECAME EASY
  → COMPRESS THE WORLD
  → HUMANS MAKE ONE MEANINGFUL CHOICE
  → EXECUTE OR GET OUT OF THE WAY
  → QUIET → REMEMBER NEW REALITY
```

## Human job vs Opal job

| Opal | Humans |
|------|--------|
| remember, compare, filter, conflict-check, overlap, travel, rank, recover, suppress stale | yes / no / maybe / not that one / book it / invite / pay auth |

## Output law

**0–3** visible options. Often **1**. Default **nothing**.

SmallestOutput: opportunity | minimum question | nothing.

## Protected infrastructure (do not reopen without failing test)

Freshness, TrustFact, PlanVersion, FailureRadius, GroupRecovery, RecoveryPreservation,
ExecutionReadiness, SmallestOutput, hard constraints, stale suppression, Silence≠Decline,
ChaosHarness, CAPABILITY_LEDGER, path-aware CI.

## Code entry

`OpalCore.SocialFlow.Ambient.AlignmentLoop.step/1`  
`OpalCore.SocialFlow.Ambient.OpportunityFormation.form/1`

## Layers (separated)

1. **Social Opening** — room for these people to do something  
2. **World Opportunity** — something exists  
3. **Actionable Opportunity** — worth interrupting now  

World without social opening → stay quiet.

## Full behavioral OS

See [`ALIGNMENT_LOOP_BEHAVIORAL_OS.md`](./ALIGNMENT_LOOP_BEHAVIORAL_OS.md) for Parts 1–16, final canonical loop, and product law.

## Judgment quality (campaign)

- **Interruption debt:** every proactive moment must repay attention cost
- **Opening quality:** valid ≠ good ≠ strong ≠ actionable; solid+ for proactive only
- **Zone fidelity:** now/tonight/future location weights; optional-far ignored; required must reach
- **Provider tiers:** low → medium → higher → transactional; escalate only when user can act soon
- **Question value:** high-leverage unknowns only; no wizard chains
- **Humans solved / topic shift:** suppress competing computation; kill stale domain

## World acquisition (under judgment)

Acquire carefully → normalize with provenance → hard-filter → CollectiveFit → debt/opening quality → SmallestOutput.

See `WORLD_SOURCE_RESEARCH.md`. Sources exist to **eliminate decisions**, not fill catalogs.

## Execution composition

After human meaningful choice: reuse ExecutionContext for leave-by, navigation, booking inquiry, and remember_new_reality. No re-entry. Truthful claims only.

## Just-in-time execution

One plan, one moment, one action (or nothing). Booking/reminder/navigation are not separate features—they become relevant only when lifecycle phase + interruption debt allow. See `PlanMoment.evaluate/1`.

## Shared Reality, delegated curation, Extend (canonical)

Three paths to a usable Shared Reality: known intent · known vibe · **explicit delegated curation**.  
Delegation is authority — never infer control. Curate ≠ recommendation feed. Extend may return nothing.  
Human UI: reality speaks; internal stages (`set`, etc.) are not product copy.  
Opal actions live **chronologically in conversation**. Social authorship ≠ payment ≠ decision authority.

**Full laws:** [`SHARED_REALITY_CURATION_AND_PRESENTATION_LAWS.md`](./SHARED_REALITY_CURATION_AND_PRESENTATION_LAWS.md)  
**UI journey audit:** `docs/evidence/shared-reality-closure/CAPABILITY_MAP_AND_UI_JOURNEY_AUDIT.md`  
**PR #112:** presentation/legibility only — do not stuff full Curate/Extend into that PR.

