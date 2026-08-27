# CSS CASCADE AUDIT — Phase B.1

**CASCADE_CONFLICTS_FOUND = 0** (no later unlayered sheet undoing Brand V4 primitives)

Import order (`main.tsx`):

1. `styles.css`
2. `theme/technicolorProduction.css`
3. `theme/spectralTokens.css` (Brand V4 last)

Inside spectralTokens:

- `@layer brand-v4-primitives → semantic → components`
- Unlayered `:root` hammer at file end (required because unlayered beats `@layer`)

Desired hierarchy holds for CSS variables:

Brand V4 PRIMITIVES → semantic roles → component consumption

Computed proof: `--accent=#00e5ff`, `--opal-cyan=#00e5ff`, all board primitives exact.

Hardcoded `#6ee8f5` in styles.css is a **value leak**, not a cascade-order conflict.
