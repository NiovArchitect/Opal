# Pass 1I — Attention empty copy authority

**Date:** 2026-10-13  
**Status:** SHIPPED (hold-period coherence)  
**Pass 2:** still LOCKED

## Law

One concept → one authority owner.

```text
attention_empty (PRODUCT_COPY)
        ↓
Nothing needs your attention right now.
```

## Changes

| Surface | Before | After |
|---------|--------|-------|
| `PRODUCT_COPY.emptyNeedsYou` | Nothing needs a decision right now. | **Nothing needs your attention right now.** |
| `PRODUCT_COPY.emptyAttention` | (new) | Same string — full Attention empty |
| `PRODUCT_COPY.emptyPresence` | (misused emptyNeedsYou) | **When people are around, they'll show up here.** |
| ActivityDestination fallbacks | Hardcoded “Nothing yet…” | `PRODUCT_COPY.emptyAttention` / `emptyNeedsYou` |
| Attention Center BE `empty_copy` | You're all caught up. | Same Attention empty string |
| FollowThrough / mobile NEEDS_YOU_EMPTY | Nothing needs you right now. | Aligned Attention empty string |

## Proof

- `pass1hPreferReal.test.ts` Pass 1I cases  
- `activityDestination.test.ts`  
- Elixir `attention_center_test` + `product_shell_test` — 27/27  

## Related

- `PASS1H_PREFER_REAL_REMEDIATION.md`  
- `SURFACE_FRAGMENTATION_REAUDIT.md`  
