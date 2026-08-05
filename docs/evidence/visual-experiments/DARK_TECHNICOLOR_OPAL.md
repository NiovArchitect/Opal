# Dark Technicolor Opal — visual experiment (not production)

**Branch:** `experiment/dark-technicolor-opal`  
**Status:** Design experiment for founder review. **Do not deploy to production.**  
**Does not alter walkthrough copy, pre-member shell, or Phase 3.**

---

## Principle

Classic Technicolor inspires **rich color separation and cinematic contrast**, not vintage-film cosplay or rainbow chrome.

Humans stay calm. Opal intelligence and real-world movement become luminous.

```text
Human conversation = calm depth
Opal moments = semantic Technicolor light
```

---

## Semantic color map (hypothesis)

| Meaning | Color role | Example moments |
|---------|------------|-----------------|
| Recognition | Saturated cyan | Becoming a plan |
| Participation / pending | Warm amber | Still open, Will know later |
| Ready / secured | Deep emerald | Ready, Table held, Booked |
| Private / reflective | Electric violet | Private guidance |
| Time-sensitive risk | Controlled red | Failure / urgent only |
| Human-neutral system | Warm white on charcoal | Brief confirmations |
| Shell depth | Near-black / charcoal | App foundation |

Color is never the only signal: always pair with label, mark, or shape.

---

## Three variants

### Variant A — Controlled cinematic (recommended baseline)

- Current dark shell mostly preserved  
- Technicolor mainly on **Opal moments** and primary actions  
- Lowest noise; highest long-session comfort  
- **Strengths:** Premium, distinct, safe  
- **Risks:** May feel too subtle if under-applied  

### Variant B — Social spectrum

- Soft color on nav active states, journey chips, and identity accents  
- Stronger moment palette than A  
- **Strengths:** Social energy, memorability  
- **Risks:** Identity color can compete with content  

### Variant C — Full cinematic future

- Rich dark color across major surfaces  
- Upper-bound experiment for where noise begins  
- **Strengths:** Maximum cinematic expression  
- **Risks:** Fatigue, gaming/neon misread, accessibility pressure  

**Do not assume C is best.** Prefer A as production candidate; borrow selective B elements after founder review.

---

## Surfaces explored (experiment scope)

Walkthrough final screen · member Home · Chats list · one conversation · quiet human exchange · Becoming a plan · Reservation requested · Booked · private moment · Plans · You

---

## Accessibility gates

- WCAG contrast on text/labels  
- Color-blind simulation  
- Reduced motion  
- Large text / small width  
- No color-only state  

---

## Recommendation

| Item | Recommendation |
|------|----------------|
| Production path | Start from **Variant A** |
| Borrow from B | Active tab glow, journey amber only |
| Avoid from C | Full-surface rainbow fills |
| Human bubbles | Primary, low saturation |
| Opal moments | Semantic cyan / amber / emerald / violet |

Founder review required before any production theme merge.

Token stubs: `apps/opal_web/src/experiments/technicolorTokens.ts`  
Opt-in CSS: `apps/opal_web/src/experiments/technicolor.css`
