# Restraint — Phase 3

## Required no-op cases

| Case | Expected | Status |
|------|----------|--------|
| No meaningful learning (`low_learning_value`) | No reflection surface | PASS |
| Ambiguous / suppressed reflection | Quiet payload, no prompt | PASS |
| Recent reflection already shown | Suppress | PASS (24h window) |
| Ordinary quiet conversation | Phase 2 silence | PASS |
| Negative outcome without safe shared interpretation | No forced shared story beyond safe summary | By design |
| Suppressed path UI | No placeholder, no glow, no suggestion count | Product rule; quiet API |

## Silence is a pass

Suppressed reflection returns:

```json
{ "quiet": true, "status": "suppressed", "prompt": null, "actions": [] }
```

No repeated ask until eligibility rules allow again.
