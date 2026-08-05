# Production Technicolor system

**Founder decision:** Full Technicolor walkthrough · Controlled Technicolor activation + member product  
**Branch:** `feat/opal-technicolor-production-system`  
**Base:** `main` @ Phase 3 merge (`2957334`)  
**PR #53:** Remains open as experiment evidence — **not merged**

## Visual state boundary

| Product state | Intensity | Purpose |
|---------------|-----------|---------|
| Pre-membership walkthrough (screens 1–5) | **Full** | Cinematic invitation to Join |
| Activation | **Controlled** | Focused trust after Join/Skip |
| Authenticated member product | **Controlled** | Sustainable long-session use |

Transition intent: cinematic invitation → focused trust → calm intelligent product.

## Implementation

| Piece | Path |
|-------|------|
| Tokens / phase map | `apps/opal_web/src/theme/technicolorProduction.ts` |
| Styles | `apps/opal_web/src/theme/technicolorProduction.css` |
| Shell attributes | `data-technicolor` + `data-visual-phase` on walkthrough / activation / member shells |
| Walkthrough scene mood | `data-scene` on first-run panels |
| Opal moment semantics | `data-state` + existing `signal-*` classes |

## Rollout / rollback

`VITE_OPAL_TECHNICOLOR=false` disables production Technicolor attributes (`data-technicolor="off"`).

Default: enabled.

## Preserved product truth

- Walkthrough copy screens 1–5 unchanged  
- Skip on 1–4; Join on 5; no Skip on 5  
- No member nav pre-auth  
- Join/Skip → activation  
- Human conversation stays calm  
- Opal moments: not human bubbles, not identity subtitles  
- Phase 3 / SF18 / Foundation / Kafka untouched  

## Semantic palette (starting hex)

| Role | Color |
|------|-------|
| Recognition | luminous cyan |
| Participation | golden amber |
| Private | deep violet |
| Execution | electric royal blue |
| Completion | rich emerald |
| Urgency | saturated ruby |
| Human clarity | warm ivory |

## Accessibility

- Labels + marks on Opal moments  
- `prefers-reduced-motion` disables mesh animation and heavy bloom  
- Full intensity limited to short walkthrough  

## Non-goals

- Experiment mode selector / founder chrome  
- Merging PR #53 wholesale  
- Full Technicolor ambient on member shell  
- Permanent user theme picker  
- Google multi-color navigation  
