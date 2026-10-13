# Pass 1F — Empty state quality

**Date:** 2026-10-13  
**Why:** After seed separation, empty is honest — and must invite creation of reality.

## Law

Empty ≠ broken. Empty ≠ inventory dump. Empty = **ready to build your world**.

## Shipped copy (`PRODUCT_COPY`)

| Surface | Before | After |
|---------|--------|-------|
| Home | Your people will show up here. | **Your world starts here.** / Connect people and moments that matter. |
| Graphs (true empty) | No Graphs in this lens yet. | **Shared experiences will appear here.** |
| Graphs (lens filter) | No Graphs in this lens yet. | Nothing in this view right now. |
| Chats | No conversations yet. Start with… | **Your conversations will live here.** Start with someone you know. |
| Calls | No recent / missed calls. | Same (honest quiet) via PRODUCT_COPY |
| Attention | Nothing needs a decision right now. | Unchanged (correct quiet) |

## Implementation

- `designTokens.ts` — empty* keys
- `GraphSocialHome` — `data-testid="home-empty"`
- `GraphsHome` — `data-testid="graphs-home-empty"` + mode-aware copy
- `ChatsHome` — chats/calls empty via PRODUCT_COPY
- `GraphsTemporalTimeline` — invitation empty when live

## Required zeros

- `EMPTY_COPY_NO_POSTS = 0`
- `EMPTY_COPY_NO_GRAPHS_FOUND = 0`
- `EMPTY_HIDDEN_BY_SEED_WHEN_SEED_OFF = 0` (from 1D)
