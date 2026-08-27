# RUNTIME_LEGACY_BRAND_LEAK_CLASSIFICATION.md

**HOLD · Phase B.2 B2-02**

Source hex audited: `#6ee8f5` / `#6EE8F5` in `apps/opal_web/src/styles.css`.

Classes:
- **A** true production Brand V4 leak → repaired to semantic/primitive token
- **B** intentional non-brand/status semantic
- **C** historical/evidence only
- **D** unused/dead CSS
- **E** dynamically superseded compatibility rule

**Before count:** 46  
**After remaining hardcode `#6ee8f5`:** 0  
**PRODUCTION_LEGACY_BRAND_LEAKS:** 0

| Line | Class | Selector | Replacement | Rationale |
|---|---|---|---|---|
| 20 | A | `:root` | `#00e5ff` | Brand V4 primitive cyan — fix token source (not hardcode old Living Void) |
| 2395 | A | `.tab.active` | `var(--accent)` | Interactive/signal accent formerly Living Void #6ee8f5 → Brand V4 accent/signal |
| 2401 | A | `.tab.active svg` | `var(--accent)` | Interactive/signal accent formerly Living Void #6ee8f5 → Brand V4 accent/signal |
| 3548 | A | `.home-awaken-bar` | `var(--color-signal)` | Awaken/signal energy → cyan |
| 3554 | A | `.home-awaken-kicker` | `var(--color-signal)` | Awaken/signal energy → cyan |
| 3640 | A | `.presence-title.tone-awaken` | `var(--color-signal)` | Awaken/signal energy → cyan |
| 3740 | A | `.opal-moment.filament .filament-bar` | `var(--color-motion)` | Journey / filament motion → aqua |
| 3871 | A | `.sr-signature .sr-when-where` | `var(--accent)` | Interactive/signal accent formerly Living Void #6ee8f5 → Brand V4 accent/signal |
| 4061 | A | `.curate-arc` | `var(--accent)` | Interactive/signal accent formerly Living Void #6ee8f5 → Brand V4 accent/signal |
| 4083 | A | `.curate-looks-good` | `var(--accent)` | Interactive/signal accent formerly Living Void #6ee8f5 → Brand V4 accent/signal |
| 4119 | A | `.tab.active` | `var(--accent)` | Interactive/signal accent formerly Living Void #6ee8f5 → Brand V4 accent/signal |
| 4201 | A | `.sr-signature .sr-when-where` | `var(--accent)` | Interactive/signal accent formerly Living Void #6ee8f5 → Brand V4 accent/signal |
| 4305 | A | `.journey-cta[aria-expanded="true"]` | `var(--color-motion)` | Journey / filament motion → aqua |
| 4422 | A | `.social-moment-rel.is-event` | `var(--accent)` | Interactive/signal accent formerly Living Void #6ee8f5 → Brand V4 accent/signal |
| 4467 | A | `.social-moment-cta` | `var(--accent)` | Interactive/signal accent formerly Living Void #6ee8f5 → Brand V4 accent/signal |
| 4483 | A | `.social-moment-cta.is-inline` | `var(--accent)` | Interactive/signal accent formerly Living Void #6ee8f5 → Brand V4 accent/signal |
| 4530 | A | `.moment-fork-kicker` | `var(--accent)` | Interactive/signal accent formerly Living Void #6ee8f5 → Brand V4 accent/signal |
| 4541 | A | `.moment-people-option.is-active` | `var(--accent)` | Interactive/signal accent formerly Living Void #6ee8f5 → Brand V4 accent/signal |
| 4691 | A | `.reality-forming-question:focus-visible` | `var(--accent)` | Interactive/signal accent formerly Living Void #6ee8f5 → Brand V4 accent/signal |
| 6539 | A | `.social-dest-373-385 .graph-execution-card .graph-ready-time` | `var(--accent)` | Interactive/signal accent formerly Living Void #6ee8f5 → Brand V4 accent/signal |
| 6553 | A | `.social-dest-373-385 .graph-leave-law` | `var(--accent)` | Interactive/signal accent formerly Living Void #6ee8f5 → Brand V4 accent/signal |
| 6565 | A | `.social-dest-373-385 .graph-open-directions` | `var(--accent)` | Interactive/signal accent formerly Living Void #6ee8f5 → Brand V4 accent/signal |
| 6686 | A | `.tabbar-option-b .dock-tab.is-active` | `var(--accent)` | Interactive/signal accent formerly Living Void #6ee8f5 → Brand V4 accent/signal |
| 7056 | A | `.gsh-cx-rail` | `var(--accent)` | Interactive/signal accent formerly Living Void #6ee8f5 → Brand V4 accent/signal |
| 7145 | A | `.gsh-cx-became` | `var(--accent)` | Interactive/signal accent formerly Living Void #6ee8f5 → Brand V4 accent/signal |
| 7155 | A | `.gsh-cx-open` | `var(--accent)` | Interactive/signal accent formerly Living Void #6ee8f5 → Brand V4 accent/signal |
| 7172 | A | `.gsh-mem-badge` | `var(--color-memory)` | Memory surface → semantic memory (magenta) |
| 7225 | A | `.gsh-gr-countdown` | `var(--accent)` | Interactive/signal accent formerly Living Void #6ee8f5 → Brand V4 accent/signal |
| 7233 | A | `.gsh-gr-dot` | `var(--accent)` | Interactive/signal accent formerly Living Void #6ee8f5 → Brand V4 accent/signal |
| 7244 | A | `.gsh-gr-interested, .gsh-gr-open` | `var(--color-possibility)` | Graph possibility / follow-into-Graph → violet |
| 7272 | A | `.gsh-dx-see, .gsh-dx-follow` | `var(--color-possibility)` | Graph possibility / follow-into-Graph → violet |
| 7607 | A | `.social-dest-437-69 .comments-sheet-close` | `var(--accent)` | Interactive/signal accent formerly Living Void #6ee8f5 → Brand V4 accent/signal |
| 7677 | A | `.social-dest-437-69 .comments-send` | `var(--accent)` | Interactive/signal accent formerly Living Void #6ee8f5 → Brand V4 accent/signal |
| 7735 | A | `.social-dest-437-133 .forward-person.is-selected .forward-avatar` | `var(--accent)` | Interactive/signal accent formerly Living Void #6ee8f5 → Brand V4 accent/signal |
| 7744 | A | `.social-dest-437-133 .forward-check` | `var(--color-signal)` | Forward selection signal → cyan |
| 7785 | A | `.social-dest-437-133 .forward-mode-btn.is-on` | `var(--accent)` | Interactive/signal accent formerly Living Void #6ee8f5 → Brand V4 accent/signal |
| 7791 | A | `.social-dest-437-133 .forward-continue` | `var(--accent)` | Interactive/signal accent formerly Living Void #6ee8f5 → Brand V4 accent/signal |
| 7859 | A | `.social-dest-437-200 .dx437-distance` | `var(--accent)` | Interactive/signal accent formerly Living Void #6ee8f5 → Brand V4 accent/signal |
| 7894 | A | `.social-dest-437-200 .dx437-graph` | `var(--color-possibility)` | Graph possibility / follow-into-Graph → violet |
| 7920 | A | `.social-dest-437-200 .dx437-follow-visible` | `var(--color-possibility)` | Graph possibility / follow-into-Graph → violet |
| 8005 | A | `.story-viewer-357-418 .story-viewer-temp` | `var(--accent)` | Interactive/signal accent formerly Living Void #6ee8f5 → Brand V4 accent/signal |
| 8163 | A | `.opal-promise-bubble.self .who` | `var(--accent)` | Interactive/signal accent formerly Living Void #6ee8f5 → Brand V4 accent/signal |
| 8173 | A | `.opal-promise-chip` | `var(--accent)` | Interactive/signal accent formerly Living Void #6ee8f5 → Brand V4 accent/signal |
| 8190 | A | `.opal-promise-beats span.is-on:nth-child(2)` | `var(--accent)` | Interactive/signal accent formerly Living Void #6ee8f5 → Brand V4 accent/signal |
| 8208 | A | `.opal-promise-graph-kicker` | `var(--accent)` | Interactive/signal accent formerly Living Void #6ee8f5 → Brand V4 accent/signal |
| 8226 | A | `.opal-promise-avatars span:nth-child(3)` | `var(--accent)` | Interactive/signal accent formerly Living Void #6ee8f5 → Brand V4 accent/signal |

## Summary

- A repaired: 46
- B: 0
- C: 0
- D: 0
- E: 0

No global blind replace across the repo. Human-media colors untouched.
Brand V4 unlayered hammer retained; components now consume semantic variables / corrected `--accent`.

## Additional production source

| File | Class | Replacement | Rationale |
|---|---|---|---|
| `OpalApp.tsx` moment-people-confirm inline style | A | `var(--color-signal)` | Inline Living Void accent → signal |

**PRODUCTION_LEGACY_BRAND_LEAKS after OpalApp fix:** see live grep.
