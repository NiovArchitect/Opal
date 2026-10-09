# Paste W — Brand tokens + plan color code

## Composer source of truth
Opal Center day-view bottom bar (`.opal-composer.opal-center-v2-composer`):
"Ask Opal about your day" / + / mic.

Shared file: `apps/opal_web/src/theme/opalComposerTokens.css`

| Token | Value |
|-------|-------|
| Fill | `#080d1e` |
| Gradient border | `90deg #00e5ff → #ffc86b → #d946ff` |
| Radius | `27px` |
| Height | `54px` |
| Glow | soft black + cyan luminous `0 0 20px rgba(0,229,255,0.16)` |
| Mic | cyan fill/border; listening → magenta |

## Plan state color code (Amendment L2)
File: `apps/opal_web/src/theme/planStateColors.ts`

| State | Color | Hex |
|-------|-------|-----|
| Confirmed / locked / happening | Electric teal | `#00E5FF` |
| Pending / waiting | Bright amber/gold | `#FFC86B` |
| Idea / forming / unconfirmed | Violet | `#8B5CF6` |

Lifecycle (L6): idea → forming → pending → locked → happening → past.

## Muddy purge
Replaced `#c4a574`, `#d4b483`, `#ffe0a8` with `#ffc86b` in walked CSS.
