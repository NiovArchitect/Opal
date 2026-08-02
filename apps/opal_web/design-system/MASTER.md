# Opal Design System (UI/UX Pro Max + Opal Product Truth)

**Source:** [UI/UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) design intelligence  
**Filter:** Opal product truth (private Social OS, no scores, no ads, no public network)

## Product type
Chat & Messaging App (WhatsApp / private IM class) — relationship-aware, not a feed.

## Style (adopted)
- **Dark Mode (OLED)** + **Modern Dark Cinema Mobile**
- Keywords: deep black/grey, high contrast, calm, premium utility, micro-interactions
- **Rejected from raw Pro Max suggestions:** Orbitron/cyberpunk type, neumorphism-only, App Store download landing as primary UX, AI purple/pink gradients, engagement dashboards

## Colors
| Role | Hex | Notes |
|------|-----|--------|
| Background deep | `#0B0F14` | OLED-friendly, not pure #000 smear |
| Surface elevated | `#121A24` | Chat rows, panels |
| Chat pane | `#0E141C` | Thread background |
| Bubble out | `#1D4ED8` | Sender (Opal blue) |
| Bubble in | `#1A2332` | Received |
| Primary / accent | `#2563EB` | Messenger blue (Pro Max messenger palette) |
| Online / success | `#059669` | Presence, completed |
| Text | `#F8FAFC` | Primary |
| Muted | `#8B9CB3` | Previews, timestamps |
| Border | `rgba(255,255,255,0.08)` | Hairline only |
| Danger | `#DC2626` | Block / destructive |

## Typography
- **Inter** 400/500/600/700 (Pro Max: Modern Dark Cinema / Flat Design Mobile)
- Body 15–16px, preview 13–14px, labels 11–12px uppercase tracking
- No mono/cyber fonts in product chrome

## Layout pattern
1. **Chats** is the primary surface (WhatsApp-class inbox)
2. Open chat → full thread with composer
3. Bottom tabs: Home · Chats · Plans · You
4. No marketing “Product / Demo / Architecture” chrome in the product shell
5. Settings & privacy live under **You**

## Effects
- Transitions 150–250ms, ease `cubic-bezier(0.16, 1, 0.3, 1)`
- Press scale ~0.98 on rows/buttons
- `prefers-reduced-motion: reduce` disables motion
- No emoji-as-icons; SVG marks only
- cursor-pointer on interactive controls
- Touch targets ≥ 44px

## Anti-patterns (Opal + Pro Max)
- Demo / synthetic / fixture language in UI
- Relationship or social scores
- Streaks, engagement counts
- Dashboard analytics chrome
- Neon overload / AI purple gradients
- Horizontal scroll for normal copy
