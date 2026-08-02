# SF14 — WhatsApp Differentiation Audit

## Borrowed (familiarity only)
- Chats-first orientation
- List → thread → composer
- Large tap targets, low friction

## Explicitly different

| Dimension | WhatsApp-class | Opal SF14 |
|-----------|----------------|-----------|
| Palette | Green `#25D366` / teal WA | Void + cyan `#5ED6E8` / iris |
| Identity | Speech bubble phone | Lumen Lens |
| List rows | Dense full-bleed lines | Spaced lumen cards / soft rows |
| Header under name | “tap here for info” / online | Contextual social line |
| Texture | Doodle wallpaper | Spatial mesh + glass |
| Signals | Ticks / last seen | Plan forming / ready / follow-through chips |
| Voice | Generic IM | Warm, elegant, alive |
| First-run | Phone number utilitarian | Motion narrative of social medium |

## Automated checks
- CSS must not contain WA greens
- UI must not say “private conversation”
- Product tests enforce anti-WA palette and chats-first (not calendar)

**Verdict:** PASS — familiar friction, distinct identity.
