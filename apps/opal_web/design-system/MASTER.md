# Opal Design System — SF14 Futuristic Identity

**Source:** UI/UX Pro Max design intelligence (Chat & Messaging + Dark OLED)  
**Filter:** Opal product truth + futuristic luminous social medium  
**Motion:** Motion for React on web only; Reanimated reserved for native mobile

## Product feel
Premium, calm, **futuristic** AI-native social medium — not WhatsApp, not a calendar, not cyberpunk neon.

## Style (adopted)
- **Deep void OLED** + soft cyan/iris luminescence
- Glass surfaces, restrained bloom, mesh ambient light
- Keywords: spatial, luminous, human, quiet magic, signal
- **Rejected:** Orbitron/cyber type, neon overload, WA green, messenger pure blue clone, calendar chrome, streaks/scores

## Colors
| Role | Hex | Notes |
|------|-----|--------|
| Void bg | `#05060A` | Near-black depth |
| Surface | `#0E1118` | Glass base |
| Accent | `#5ED6E8` | Opal cyan — futuristic signal |
| Iris | `#8B9CFF` | Secondary light |
| Pearl | `#E8D5C4` | Warm human note |
| Bubble out | `#1A4A5C` | Soft teal glow, not WA green |
| Text | `#F2F6FA` | High contrast |
| Muted | `#7E8FA3` | Previews |

## Typography
- **Inter** 400/500/600/700
- Wordmark: tight tracking, gradient light on lockup
- No mono/cyber fonts in chrome

## Logo — Lumen Lens
- Soft luminous circle with iridescent sheen
- Open connection arcs (not speech bubble)
- Spark highlight = moment of understanding
- Assets: `public/brand/*`, React `OpalMark` / `OpalLockup`

## Layout
1. **Chats** primary
2. Thread with contextual subtitle (never “private conversation”)
3. Inline **signal chips** (plan forming, ready, follow-through)
4. Bottom tabs: Home · Chats · Plans · You
5. First-run Motion experience (skippable, replayable)

## Motion
- Motion for React onboarding + scene presence
- 200–280ms product transitions, ease `cubic-bezier(0.16, 1, 0.3, 1)`
- `prefers-reduced-motion: reduce` kills motion
- No gimmick loops, no fake AI scan theatrics

## Anti-patterns
- Demo language in UI
- “Private conversation” under names
- Relationship/social scores, streaks
- WhatsApp green / identical row density
- Calendar dashboard identity
- Engagement guilt copy
