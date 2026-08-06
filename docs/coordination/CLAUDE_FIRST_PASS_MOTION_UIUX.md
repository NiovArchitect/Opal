# Claude first pass — Motion + UI/UX Pro Max

**Author:** Grok (lead)  
**For:** Claude Code session in this worktree  
**Why:** Founder direction — Claude thrives on motion + UI/UX Pro Max. This is the ready brief.

---

## Before anything

```text
Read docs/coordination/FOUNDER_NUANCE_PACK.md
Read CLAUDE.md
```

## Pass A — UI/UX Pro Max (do first)

```text
Use agent opal-ui-ux-pro-max.

Critique apps/opal_web/src/onboarding/FirstRunExperience.tsx and
apps/opal_web/src/theme/technicolorProduction.css for:

1) First screen hierarchy (wordmark vs orb vs title)
2) Join screen (screen 5) CTA power at 390px
3) Spark / plan / follow state honesty chips
   - human line
   - Opal proposal ("still checking")
   - handled only when true
4) Anti-templated AI UI risks
5) Concrete CSS/React deltas Grok can implement this week

Write: docs/design/ui-ux/2026-08-05-walkthrough-peak-hierarchy.md
Author line required.
Do not deploy. Do not edit Grok's production worktree.
```

## Pass B — Motion Director (immediately after A)

```text
Use agent opal-motion-director.

Design / critique motion for:

1) Brand arrival / first five seconds (Concept B if referenced in nuance pack)
2) Scene transitions using existing motion/react patterns
3) Spectral Opal chip entrance on spark/plan
4) Amber breath for "still checking" vs settle only for handled
5) Join bloom restrained
6) prefers-reduced-motion static equivalents for every stage

Write: docs/design/motion/2026-08-05-walkthrough-choreography.md
Author line required.
Pair notes with the UI/UX file from Pass A.
```

## Pass C — Agency finish (optional same session)

```text
Read docs/coordination/agency-agents-design/design-brand-guardian.md
Read docs/coordination/agency-agents-design/design-ui-finish-gate-reviewer.md

Produce a short ship/no-ship note for Grok:
docs/design/ui-ux/2026-08-05-finish-gate.md
```

## What Grok is doing in parallel

- Production booking-state honesty in `FirstRunExperience` (human / Opal proposal / handled)
- Deploy + Brave proof after PR
- Will read your `docs/design/*` outputs before peak-brand production port

## Done when

- [ ] Pass A file exists with concrete deltas  
- [ ] Pass B file exists with ms storyboard + reduced-motion  
- [ ] Both tagged Author: Claude (independent) via agent …  
- [ ] Branch pushed so Grok can pull  
