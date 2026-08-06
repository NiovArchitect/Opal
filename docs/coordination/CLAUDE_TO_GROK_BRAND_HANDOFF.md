# Claude → Grok Brand Handoff

**Status:** Filled by Grok deep-audit pass when Claude terminal is not online.  
**Intent:** Same deliverables Claude would produce under dual-AI protocol.

## Repository findings (brand)

1. **Mark (“Lumen Lens”)** — SVG radial lens with soft bloom. Distinctive enough at medium size; at hero size the outer glow/orbit reads as a generic AI orb.
2. **Wordmark** — Often secondary. Walkthrough header uses small mark only; no commanding OPAL letterforms on first screen.
3. **Hierarchy** — Content titles (“Life starts in conversation”) currently outrank the brand name on screen 1.
4. **Redundancy** — `OpalMark size="sm"` in top-left of every walkthrough screen while center also shows large mark on welcome/join scenes.
5. **Join** — `.btn.primary.first-run-cta` is full-width but type scale and visual weight under-command for conversion.
6. **Examples** — Scene “plan” uses human “I’ll book Harbor Table” + gold chip “Thursday · 7:00 PM” which confuses actor (human vs Opal) and state (proposal vs booking vs confirmation).
7. **Technicolor coverage** — Full mesh on walkthrough is live; semantic moments stronger in Controlled product CSS than in walkthrough example chips; coverage uneven for “wow” demos.

## Recommended production direction (not merged)

| Decision | Recommendation |
|----------|----------------|
| Screen 1 | Brand arrival OPAL first |
| Screen 2 | Life starts in conversation |
| Top-left logo | Remove after brand arrival |
| Orb | Reduce / integrate as lens material, not floating drama |
| Join | Large luminous field, min height ~52–56px, strong type |
| Becoming a plan | Spectral Opal moment, not chip under human bubble |
| Booking example | Explicit proposal vs execution states |

## Age-14 comprehension

Ask after 10s: What is Opal? Who spoke? What did Opal do? Proposing vs booking? Would you show a friend?

## Claude open items (if Claude joins later)

- Custom letterform exploration for OPAL
- Icon-size monochrome mark stress tests
- Full a11y matrix on prototype
- Alternate wedge interview scripts
