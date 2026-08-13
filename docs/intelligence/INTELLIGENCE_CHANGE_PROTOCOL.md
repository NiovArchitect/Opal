# Intelligence Change Protocol

**Status:** ACTIVE  
**Pairs with:** Constitution §24, Capability Ledger, golden episodes, `config/intelligence_manifest.json`, [ENFORCEMENT.md](./ENFORCEMENT.md)

---

## Before writing code

Agent must answer:

1. **What capability is being added or extended?** (ledger ID or new draft ID)  
2. **What existing capabilities does it depend on?**  
3. **What existing capabilities could it affect?**  
4. **Which invariants must remain true?**  
5. **Which golden episodes must be replayed?**  
6. **What new episode (if any) is added?**  
7. **What evidence will prove no regression?**  

**No answer = do not implement yet.**

Also report (**required; absent = not authorized**):

```text
INTELLIGENCE CONTEXT LOADED
CONSTITUTION VERSION: ...
CAPABILITIES TOUCHED: ...
DEPENDENCIES: ...
INVARIANTS AT RISK: ...
GOLDEN EPISODES TO REPLAY: ...
AUTHORITY BOUNDARIES: ...
PRIVACY BOUNDARIES: ...
EXPECTED INTELLIGENCE DELTA: ...
```

Pre-implementation:

```text
TARGET CAPABILITY / CURRENT BEHAVIOR / PROPOSED DELTA
INVARIANTS TO PRESERVE / EPISODES TO REPLAY / EXPECTED NON-CHANGES
```

Run:

```bash
./scripts/intelligence_check.sh --impact
node scripts/intelligence_impact.mjs --modified INT-… --files path/a,path/b
```

Fill [INTELLIGENCE_CHANGE_TEMPLATE.md](./INTELLIGENCE_CHANGE_TEMPLATE.md).

---

## Allowed change shapes

| Shape | Allowed |
|-------|---------|
| Additive evidence/inference/authority/privacy/presentation | Yes |
| New dimension or action that composes through SocialReality | Yes |
| Explicit SUPERSEDE of a wrong prior law with ADR + evidence | Yes |
| Silent simplification “for the new feature” | **No** |
| Second messaging/auth/friends schema “for intelligence” | **No** |
| Changing SocialReality to satisfy a dirty fixture | **No** |
| Brand implementation while 93:* empty | **No** |
| Proof harness rewrite / second founder-proof system | **No** |

---

## Required regression package

Minimum for intelligence PRs:

1. `./scripts/intelligence_check.sh` (manifest + constitution version + integrity)  
2. `./scripts/intelligence_check.sh --with-tests` (invariants + golden bridge + social_reality)  
3. Golden episodes listed in impact analysis (IMPROVED / UNCHANGED / REGRESSED)  
4. Capability-specific unit/scenario tests  
5. If UI presentation: `--full` or `npm test -- --run src/opalUi/`  
6. Intelligence DIFF (template) — no blanket “all improved”

Do not accept “overall suite passes” if a previously green capability becomes weaker without explanation.

### Supersession / removal

Deleting or disabling an invariant, golden episode, or intelligence test requires:

- `supersessions[]` entry in `config/intelligence_enforcement.json`  
- ADR-INT + evidence  
- ledger SUPERSEDED status  

“Test no longer relevant” without reason is rejected.

---

## Intelligence DIFF (required in PR description)

```text
BEFORE:
  KNOWN: ...
  INFERRED: ...
  NEXT_GAP: ...
  ALLOWED_ACTIONS: ...
  PRIVATE: ...
  SHARED: ...

AFTER:
  (same fields)

CHANGED:
  ADDED: ...
  PRESERVED: ...
  SUPERSEDED: ... (with ADR-INT-*)

REGRESSION:
  EPISODES: IMPROVED | UNCHANGED | REGRESSED
```

Post-implementation also requires:

```text
INTELLIGENCE DIFF
Capabilities added / modified / unchanged
Invariants pass/fail
Golden episodes improved|unchanged|regressed
Privacy impact
Authority impact
Coordination residue impact
Known unknowns
```

---

## Commit / merge discipline

- Governance docs may commit on the active branch.  
- **Committing the Constitution or Enforcement is not V2 product merge.**  
- V2 remains HOLD until founder visual + brand pixel gates close.  
- Do not reset main to SF15; compose on top of frozen foundations.
