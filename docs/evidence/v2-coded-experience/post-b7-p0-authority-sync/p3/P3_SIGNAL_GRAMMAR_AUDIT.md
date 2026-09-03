# P3 Signal Grammar Audit

**Date:** 2026-09-03  
**Authority:** `965:2` / `OPAL_SIGNAL_GRAMMAR.md`  
**Starting HEAD:** `704d445`  
**P2 Calls:** FROZEN — preserve

## Classification key

`ALREADY_CONFORMING` · `OBJECTIVE_SEMANTIC_CONFLICT` · `CATEGORY_COLOR_NOT_SIGNAL` · `BRAND_ATMOSPHERE_NOT_SIGNAL` · `CONTENT_COLOR_NOT_SIGNAL` · `MISSING_BEHAVIOR` · `OUT_OF_P3_SCOPE`

## Surface audit

| Surface | Classification | Notes / P3 action |
|---------|----------------|-------------------|
| Calls Home / Continuity / New Call | ALREADY_CONFORMING | Gold/Aqua/Coral/Cyan/Neutral + plain language + zero-signal Maya. **PRESERVE** (P2 freeze). Retarget CSS to `--signal-*` without hex change. |
| Chats Home row context | OBJECTIVE_SEMANTIC_CONFLICT | Cyan/gold by kind alone on passive metadata. **FIX** → settled neutral; gold only for earned `is-group-going`. |
| Graphs Home status chips | ALREADY_CONFORMING / documented | Ready/Aligned gold + Forming/Idea violet match CURRENT Graphs Figma paints; Aligned = participant alignment toward shared plan (not AI confidence). **PRESERVE**. |
| Graph Detail / Going / Interested | ALREADY_CONFORMING | Commitment gold / interest violet. **PRESERVE**. |
| Home feed cards | BRAND_ATMOSPHERE / CONTENT | Decorative spectral fields. Timeline node accent rotation uses grammar hexes as decoration — **DEFER** if Figma-locked; do not invent new signals. |
| Journey | ALREADY_CONFORMING / OUT_OF_P3_SCOPE | No wholesale recolor; confirm/action paints largely correct. |
| Full Live | ALREADY_CONFORMING | Ready gold / On my way cyan where consequence-earned. **PRESERVE**. |
| Global Opal Ambient | OBJECTIVE_SEMANTIC_CONFLICT | Rank badges cyan + “top picks” read as ACTIVE/confidence. **FIX** → provisional violet + confirm language. |
| Activity `618:2384` | MISSING_BEHAVIOR → FIXED | Coral only on needs-you; provisional Memory lacked violet mark. **FIX** `data-signal-state`. Title remains Activity. Icon **1046:2 NOT implemented**. |
| Search | OUT_OF_P3_SCOPE | Routing frozen P2.2; no behavioral signal invent. |
| You / Section 06 | CATEGORY_COLOR_NOT_SIGNAL | Privacy violet / Spending gold / etc. **PRESERVE** — document taxonomy. |
| Create | OUT_OF_P3_SCOPE | No Signal Grammar invent. |
| Filament `.signal-ready` | OBJECTIVE_SEMANTIC_CONFLICT | Emerald for Ready. **FIX** → gold; Set keeps emerald. |
| Technicolor amber breath | OBJECTIVE_SEMANTIC_CONFLICT | Infinite gold “AI alive”. **FIX** → one-shot + reduced-motion off. |
| Discovery follow CTA | OBJECTIVE_SEMANTIC_CONFLICT | Violet on DO NOW. **FIX** → active cyan. |

## Counts (pre-fix)

| Class | Approx |
|-------|--------|
| ALREADY_CONFORMING | many (Calls family, Graphs status, Live, Going) |
| OBJECTIVE_SEMANTIC_CONFLICT | 5 primary (Chats context, Ambient rank, ready emerald, amber breath, discovery CTA) |
| CATEGORY_COLOR_NOT_SIGNAL | Section 06 |
| BRAND_ATMOSPHERE_NOT_SIGNAL | ambients, orb |
| MISSING_BEHAVIOR | Activity provisional channel; central `--signal-*` owner |
| OUT_OF_P3_SCOPE | P4 curation, Activity icon 1046:2 |

## Ideal result target

Many surfaces audited · few changed · no global recolor.
