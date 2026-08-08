# Hosted negative matrix — checklist (do not run until P0 CLOSED)

Deterministic checks against **synthetic** hosted API + web. Record pass/fail only.

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| N1 | Private not_this_time blocks Set | A+B plan messages → mutual ready → B POST private `not_this_time` on active `proposal_id` → GET signals | Shared label ≠ Set; still open / becoming a plan; no raw private fields |
| N2 | One affirmative only | Plan + only A “I'm in” | Still open; not Set |
| N3 | Wrong user continuation | Resume continuation token under wrong session | Rejected; no relationship |
| N4 | Expired continuation | Resume past-expiry continuation | Rejected / expired |
| N5 | Used continuation | Accept once; resume/accept again | Idempotent or rejected; no second relationship |
| N6 | Blocked relationship | A blocks B before Set | Signals ≠ Set; no new authority from B |
| N7 | Revoked session | Sign out / revoke; call auth’d API | 401; continuation cleared per product rules |
| N8 | User C isolation | C not member; history/signals/socket | 403 / unauthorized; no leak |

## Assertions common

- Response JSON must not contain: `response_key`, private reason, raw OTP, raw invite token after strip, peer’s private answer
- No duplicate Set labels for single state (one shared Set surface)
