# Opal Color Taxonomy

**Status:** CURRENT durable authority (P3 Signal Grammar)  
**Date:** 2026-09-03  
**Companion:** `OPAL_SIGNAL_GRAMMAR.md` · `FIGMA_BRAND_V4_AUTHORITY.md`

> Same hex may appear in multiple roles. **Meaning depends on role.**  
> Future agents must not derive behavioral state from hex alone.

## Layers

| # | Layer | Role | Example |
|---|-------|------|---------|
| 1 | **BRAND / ATMOSPHERE** | Identity, depth, spectral fields | Ambient cyan/violet washes, Opal orb |
| 2 | **IDENTITY / RELATIONSHIP** | Person presence stays primary | Avatar chrome; never dim the human when signals settle |
| 3 | **CATEGORY / DOMAIN** | Settings / domain accents | Section 06 Privacy violet, Spending gold, Location aqua |
| 4 | **CONTENT / MEDIA** | Art, photos, live media frames | Live card border paints |
| 5 | **INTERACTIVE ACTION** | Controls that execute | Call / Open / Follow → often CYAN when DO NOW |
| 6 | **BEHAVIORAL SIGNAL** | Dynamic consequence state | `--signal-*` tokens · Figma `965:2` |

## Behavioral Signal tokens (runtime)

| State | CSS var | Hex | Meaning |
|-------|---------|-----|---------|
| `active` | `--signal-active` | `#00E5FF` | DO NOW |
| `changed` | `--signal-changed` | `#00F0D1` | Meaningful context/alignment changed |
| `confirmed` | `--signal-confirmed` | `#FFC86B` | Earned ready / reserved / confirmed / shared truth |
| `needs_attention` | `--signal-needs-attention` | `#FF6B9D` | Needs you (scarce) |
| `provisional` | `--signal-provisional` | `#8B5CF6` | Possibility / review / unconfirmed |
| `settled` | `--signal-settled` | `#94A1B8` | History / nothing required |

Owner: `apps/opal_web/src/theme/signalGrammar.ts`

## Critical distinctions

- **Section 06 Spending gold** = CATEGORY accent ≠ confirmed Graph state  
- **Graphs status Ready/Aligned gold** = CURRENT Graphs surface paint for participant alignment / ready-to-execute (earned domain labels — not AI confidence rank)  
- **Set / completion emerald** = legacy completion chrome ≠ Signal Grammar Gold  
- **Recommendation rank** = provisional (violet) — never Gold, never ACTIVE cyan  

## Laws

Confidence ≠ confirmation. Gold must be earned. Coral must be scarce. Zero signal is valid. COLOR + PLAIN LANGUAGE. Never dim the human. State belongs to Reality.
