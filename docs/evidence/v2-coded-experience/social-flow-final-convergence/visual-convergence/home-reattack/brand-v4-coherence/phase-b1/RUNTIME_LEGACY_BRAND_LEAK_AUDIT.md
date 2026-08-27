# RUNTIME LEGACY BRAND LEAK AUDIT — Phase B.1

**RUNTIME_LEGACY_BRAND_LEAKS = 46** (target 0)

All 46 hits are `#6ee8f5` / `#6EE8F5` in `apps/opal_web/src/styles.css`.

Classification:

| Class | Count |
|---|---:|
| production legacy leak | 46 |
| historical/evidence | 0 in production src |
| intentional non-brand semantic | 0 for this hex |
| human-media colors | not touched |

Computed Brand V4 primitives still win for `--accent` via unlayered hammer (`#00e5ff`). Hardcoded selector colors bypass variables.

**Do not global search-replace.** Migrate via semantic roles / component tokens.
