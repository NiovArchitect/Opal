# P4.5 Commitment Recomposition Policy

**Version:** `p4.5.commitment.v1`  
**Law:** Before commitment, optimize. After commitment, protect the agreement.

| Stage | `truth_state` / domain | Auto-adapt provisional answer? | Threshold |
|-------|------------------------|--------------------------------|-----------|
| Pre-accept provisional | `provisional` | YES if High alternative clear | low |
| User saw answer | provisional + presented | prefer stability; change if invalid or materially better | medium |
| Accepted into Graph | accepted / graph proposal | NO silent place swap; may mark Needs you | high |
| Participants Going | shared commitment | protect; material disruption only | higher |
| Provider reserved / confirmed | provider confirmed | disruption only; organizer/user confirm for place change | highest |
| Journey underway | execution | only real-world impossibilities | maximum |

## Classifications

`AUTO_ADAPTED` · `USER_CONFIRMATION_REQUIRED` · `ORGANIZER_CONFIRMATION_REQUIRED` · `PARTICIPANT_CONFIRMATION_REQUIRED` · `PROVIDER_ACTION_REQUIRED` · `FAILURE`

Trivial score improvements after acceptance → **silence** (not a recommendation feed).
