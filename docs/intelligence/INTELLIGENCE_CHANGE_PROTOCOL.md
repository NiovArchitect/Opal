# Intelligence Change Protocol

**Status:** ACTIVE  
**Pairs with:** Constitution §24, Capability Ledger, golden episodes, `config/intelligence_manifest.json`

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

Also report:

```text
INTELLIGENCE CONTEXT LOADED
CAPABILITIES AT RISK: ...
INVARIANTS TO PRESERVE: ...
EPISODES TO REPLAY: ...
```

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

1. Invariants suite (`mix test test/intelligence/` + related social_flow)  
2. Golden episodes listed in impact analysis  
3. Capability-specific unit/scenario tests  
4. If UI presentation: composeHumanReality / grammar / liveJourneyProof as applicable  
5. Intelligence DIFF (before/after conceptual snapshot)

Do not accept “overall suite passes” if a previously green capability becomes weaker without explanation.

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

---

## Commit / merge discipline

- Governance docs may commit on the active branch.  
- **Committing the Constitution is not V2 product merge.**  
- V2 remains HOLD until founder visual + brand pixel gates close.  
- Do not reset main to SF15; compose on top of frozen foundations.
