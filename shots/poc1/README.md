# Phase OC-1 — Opal Center conversational shell

Text chat UI + history for Opal Center. Intelligence (context / intent / smart replies) arrives in OC-2 / OC-3 / OC-4.

## What shipped

- `opal_conversations` + `opal_messages` (one active conversation per user; messages immutable)
- `GET /api/v1/product/opal/conversation` — get-or-create + last 50 messages asc
- `POST /api/v1/product/opal/conversation/messages` — user message + OC-1 placeholder Opal reply
- Rest phase **Talk to Opal** → new `chat` phase (Life Graph `conversation` phase untouched)
- Chat: header, bubbles (reuse), Meridian Globe mark 24px, composer, empty chips, errors, typing pulse

## Evidence

| File | What |
|------|------|
| `mix_test.log` | Unit + API — 5/5 |
| `fe_test.log` | OpalCenterChat + LifeGraph OC-1 — 13/13 |
| `browser_VERIFY.json` | Live API + UI @390/430 |
| `rest_talk_390/430.png` | Talk to Opal above the fold |
| `empty_390/430.png` | Say hello + chips |
| `with_messages_390/430.png` | User + placeholder bubbles |
| `reload_persist_390/430.png` | History after reload |
| `send_error_390.png` | Couldn't send — tap to retry |
| `load_error_390.png` | Couldn't load + Retry |

## Laws held

- One continuous Opal conversation per user (not threads)
- OC-1 placeholder reply only (`# OC-1 PLACEHOLDER`)
- No intent / smart responses / markdown / voice
- Reuse bubbles, composer, C-01, B-04, dock globe — no new visual system
- Existing Life Graph `conversation` phase untouched
