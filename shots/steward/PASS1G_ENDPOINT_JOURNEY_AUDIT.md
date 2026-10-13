# Pass 1G — Endpoint journey audit

**Date:** 2026-10-13  
**Law:** Tap → navigation → data load → correct state → correct next action. No dead ends.

## Bell / Attention journey

```text
Notification / bell
        ↓
Attention (ActivityDestination)
        ↓
onOpenAttentionItem → deep_link
        ↓
openChat(conversationId) + plan detail focus   OR   openGraphDetail(planId)
        ↓
Accept / Keep / reservation auth on alignment surface
        ↓
Attention feed refresh → actionable_count → badge
```

| Step | Status | Evidence |
|------|--------|----------|
| Open Attention | GREEN | ActivityDestination + attention feed API |
| Deep-link to conversation | GREEN | `OpalApp` uses `void openChat(conversationId)` — comment guards against setActiveChatId-only dead end |
| Deep-link to plan | GREEN | `openGraphDetail(planId)` |
| Seen ≠ resolved | GREEN | Badge does **not** clear on open; clears when feed actionable_count drops after resolve |
| Physical push | GATED | TestFlight / APNs founder |

## Plan alignment journey

```text
Conversation
        ↓
Proposal (activity / time / place)
        ↓
Accept / Keep
        ↓
SharedPlan commitment
        ↓
Graph + Home + Chats projections
        ↓
Attention resolves for that signal
```

| Step | Status | Evidence |
|------|--------|----------|
| Propose without multi-plan crash | GREEN | `active_plan_for_conversation` |
| Duplicate lineages | GREEN | `reconcile_conversation_plans` |
| Fort Oak lifecycle fixture | GREEN | `restore_fort_oak_committed.exs` |
| Cross-surface agree | GREEN | A8 matrix failures=0 |
| Physical two-device | GATED | Founder |

## Dead-button scan (member shell)

| Control class | Finding |
|---------------|---------|
| Settings HONEST_GATE | Non-interactive + blockedReason (correct) |
| Settings GREEN | Wired to product APIs (1C) |
| Attention open without conversation/plan | Falls back to Home scroll — no silent crash |
| Seed plan pill with unknown seed id | Honest gate note ("Open the chat…") — not empty dump |

## Required zeros

- `ATTENTION_OPEN_WITHOUT_OPENCHAT = 0` (conversation path)
- `BADGE_CLEARS_ON_SEEN_ONLY = 0`
- `DEAD_BUTTON_LOOKS_LIVE = 0` (settings + seed pills)

## Verdict

Core endpoint journeys for Attention and Plan are **wired and coherent** in local product. Remaining gaps are founder-gated (push, two-device, prod API payment).
