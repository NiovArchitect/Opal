# Phase OC-3 — Opal Center intent taxonomy

Rule-based classifier: exactly one of 8 intents per message.
Stored on Opal reply as `metadata.intent`. OC-1 placeholder unchanged.

## Files

| File | Purpose |
|------|---------|
| `mix_test.log` | OpalIntentTest 45/45 |
| `sample_intents.json` | Live POST × 8 intents (one each) |
| `REPORT.md` | Short product + verify summary |
| `VERIFY.json` | GREEN gate + SHAs |

## Taxonomy

`plan_create` · `plan_modify` · `remember` · `recall` · `recommend` · `coordinate` · `check_status` · `chat`
