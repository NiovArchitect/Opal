# Phase 11A report

## Product

Conversation place options can create a **tentative** SharedPlan via **Plan this**. Choose still only drafts a place share into the composer. Trip-leg create-plan remains a separate path.

## Blocking bug found and fixed

`GET /api/v1/product/conversations` 500'd with `Ecto.MultipleResultsError` once a conversation had more than one SharedPlan (lawful: history + new tentative). Root cause: `Messages.list_conversations/1` used `Repo.one()` on SharedPlan by `conversation_id`. Fix: select the newest active plan (`tentative|agreed|changed`) with `order_by` + `limit 1`. Same rule applied to `ConversationAlignment.lock_plan/1`. Regression test covers multi-plan list.

## Structured layout entry

Classic `opal-context-chip-wrap` remains `display:none` under `data-conversation-layout="structured"` (intentional since 46fabf5). Place gap now has a structured journey CTA (`place-gap-cta`) that opens the same place sheet.

## Verification

- Mix: 12/12 (create-plan + messages multi-plan)
- FE: 14/14 socialReality
- A8 SurfaceProjection: 13/13
- Browser @ 390/430: place sheet → Plan this → 201 + confirmation note
- Live API: tentative plan, stranger 404, missing title 422
