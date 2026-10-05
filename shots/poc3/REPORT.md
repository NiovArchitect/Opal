# Phase OC-3 report

## Product

After OC-2 context assembly, `OpalCore.OpalIntent.classify/2` assigns exactly
one intent from the 8-intent taxonomy (rule-based, no ML). The result is stored
on the Opal reply as `metadata.intent`. The OC-1 placeholder body is unchanged.

## Verification

- OpalIntentTest: 45/45 (8×3 positive + negatives + ambiguous + fallback + shape)
- Manual POST × 8: all_match true; placeholder unchanged
- Conversations integration test: intent on metadata
