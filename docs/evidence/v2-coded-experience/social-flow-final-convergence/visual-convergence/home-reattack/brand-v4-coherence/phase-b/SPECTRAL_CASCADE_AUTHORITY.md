# SPECTRAL_CASCADE_AUTHORITY.md

Governing: **570:7** · **528:25** · **562:162**

## Import order (`main.tsx`)

1. `styles.css` — base product + layout geometry
2. `theme/technicolorProduction.css` — Living Void / motion compatibility (legacy)
3. `theme/spectralTokens.css` — Brand V4 last

## CSS `@layer` structure inside `spectralTokens.css`

Declared order (later wins on conflict within Brand V4 file):

1. `brand-v4-primitives` — exact hex (`#00E5FF` … `#050816`)
2. `brand-v4-semantic` — signal / motion / aligned / lived / memory / possibility bridges
3. `brand-v4-components` — feed accents, story rings, header, splash/promise helpers

## Law

- Future stylesheets **must** opt into a named layer or stay below Brand V4 intentionally.
- A silent import after `spectralTokens.css` that redefines `--accent` / `--bg` without a layer is a regression.
- Geometry/layout remains owned by `styles.css` and component CSS — Brand V4 does not redesign screens.

## Invalid screen authorities (do not restyle toward)

`539:5` `539:9` `539:11` `539:13` `540:2` `540:14` `541:8` `554:5`

## Critical CSS cascade fact (Phase B hardening)

In CSS Cascade Levels 4/5, **unlayered** style rules beat **any** `@layer` rule.

Therefore Brand V4 `:root` primitives/bridges are declared **unlayered at the end of `spectralTokens.css`** (authority hammer). Component accents may use `@layer brand-v4-components`.

This is intentional structural protection: importing another unlayered sheet *after* spectralTokens would still be a regression — do not do that.
