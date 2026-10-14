# CENTER PHYSICAL P0 — Dock exclusion / hit ownership

**Status:** engineering PROVEN · **FOUNDER_ACCEPTED = NO**  
**FREEZE = HOLD · PASS2_UNLOCKED = NO**

## Root cause

`.opal-ambient-destination` declared dock-excluding edges, then cancelled them with:

```css
inset: auto !important;
```

That shorthand resets `top/right/bottom/left`. Center filled the viewport under the dock (z≈10050). Composer taps hit the tabbar. `:focus-within` dock hide could not help because focus required a successful tap first.

## Fix

One authoritative inset (no trailing `inset: auto` on the mobile rule):

```css
inset: 0 0 var(--opal-primary-viewport-inset, …) 0 !important;
```

Desktop ≥520 still uses `inset: auto` **first**, then sets `left/top` after.

`:focus-within` dock hide remains keyboard-open behavior only.

## Proof law

Bounding boxes alone are insufficient. Required:

`elementFromPoint(center of input/send)` → composer targets · `DOCK_INTERCEPTS_* = NO` · real POST · user+opal bubbles · follow-up send.

Artifacts: `CENTER_PHYSICAL_P0_VERIFY.json`, `verify_center_physical_p0.mjs`.

## Caps return

See `CENTER_PHYSICAL_P0_VERIFY.json` top-level fields.
