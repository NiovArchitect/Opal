# Claude Motion + UI/UX Agent Stack (Opal)

**Author:** Grok (lead)  
**Status:** Ready for Claude sessions  
**Purpose:** Claude owns motion + UI/UX Pro Max research; Grok executes production.

## Operating model

```text
Founder intent + FOUNDER_NUANCE_PACK.md
        ↓
Claude (research) + subagents
  • opal-ui-ux-pro-max     ← peak hierarchy / Join / spectral UI
  • opal-motion-director   ← choreography / timing / reduced-motion
  • opal-alignment-researcher
  • Agency design MDs (Brand Guardian, UX Architect, UI Designer, Finish Gate, …)
  • skill: .claude/skills/frontend-design
        ↓
docs/design/ui-ux/*  +  docs/design/motion/*
        ↓
Grok validates → implements → Brave → deploy
```

If Claude is slow: **Grok implements from latest Claude proposal** and Claude stays research.

## Where agents live

| Path | Contents |
|------|----------|
| `.claude/agents/opal-ui-ux-pro-max.md` | Peak UI/UX agent |
| `.claude/agents/opal-motion-director.md` | Motion director agent |
| `.claude/agents/opal-alignment-researcher.md` | Alignment Q&A |
| `.claude/skills/frontend-design/` | Anti-templated frontend skill |
| `docs/coordination/agency-agents-design/` | Agency design personas |
| `docs/coordination/FOUNDER_NUANCE_PACK.md` | Founder nuance |
| `docs/coordination/CLAUDE_FIRST_PASS_MOTION_UIUX.md` | **Start-here brief** |
| `CLAUDE.md` | Session rules |

## Best Claude passes (Peak Brand)

1. **opal-ui-ux-pro-max** — logo/orb hierarchy, Join, wordmark authority, state chips  
2. **opal-motion-director** — brand arrival Concept B, Join bloom, amber breath vs settle  
3. **Brand Guardian** — Full vs Controlled Technicolor boundary  
4. **UX Architect** — token/layout systems for Grok  
5. **UI Finish Gate** — ship-readiness before Grok ports  
6. **Whimsy Injector** — restrained only  

## How Claude should start

```text
Read docs/coordination/FOUNDER_NUANCE_PACK.md
Follow docs/coordination/CLAUDE_FIRST_PASS_MOTION_UIUX.md
Use agent opal-ui-ux-pro-max then opal-motion-director
Write under docs/design/ui-ux/ and docs/design/motion/
```

## Grok obligation

- Read Claude agent outputs before shipping visual PRs  
- Label **simulated** vs **Claude session** honestly  
- Keep booking-state honesty in production while Claude designs peak motion  

## Communication

GitHub-only for Grok↔Claude. No live agent named Grok.
