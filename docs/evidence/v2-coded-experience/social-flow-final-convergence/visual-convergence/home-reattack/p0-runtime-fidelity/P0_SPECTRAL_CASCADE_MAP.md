# P0_SPECTRAL_CASCADE_MAP

Deterministic import order in `main.tsx`:

1. `styles.css` — base product + layout
2. `theme/technicolorProduction.css` — Living Void / motion compatibility
3. `theme/spectralTokens.css` — **LAST** founder Spectral tokens + semantic overrides

`data-spectral-authority="554:5"` · `data-brand-board="528:25"`

Rule: future CSS must not import after `spectralTokens.css` without an explicit brand layer comment.
