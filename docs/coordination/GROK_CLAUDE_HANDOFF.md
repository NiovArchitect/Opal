# Grok ↔ Claude Handoff Ledger

**Program:** OPAL PEAK BRAND AND FIRST-FIVE-SECONDS  
**Lead:** Grok (release authority, live browser, merge/deploy)  
**Partner:** Claude (deep brand/copy audit, isolated prototypes)  
**Coordinator:** Agent Zero / Grok operating as dual-track lead when Claude terminal unavailable  

## Rules

1. Grok is lead operator. Claude does not deploy or merge to production.
2. Separate branches and worktrees. No simultaneous edits to the same file.
3. Claude may implement only in assigned design branches.
4. Primary coordination: Git commits + this handoff file.
5. Runtime programs (SMS, Kafka, SF18, Phase 3 host, location) stay active and non-blocking of brand prototypes.

## File ownership (this program)

| Owner | Paths |
|-------|--------|
| Grok | Live evidence, Brave captures, production PRs, gh-pages, `docs/evidence/peak-brand-first-five-seconds/*` live proofs |
| Claude (or Grok acting as deep auditor when Claude offline) | `docs/coordination/CLAUDE_*`, brand copy matrices, design-system critique docs |
| Shared read-only | Production `main` theme files — **do not concurrent-edit** |
| Design branch only | `apps/opal_web/public/experiments/peak-brand-*.html`, prototype assets |

## Active branches

| Branch | Purpose | Owner |
|--------|---------|--------|
| `main` | Production (Technicolor Full walkthrough / Controlled product live) | Grok release |
| `design/opal-peak-brand-prototypes` | Isolated peak-brand review surfaces | Design track |
| `experiment/dark-technicolor-opal` | Historical experiment (PR #53 closed unmerged) | Archive |

## Handoff log

| When (UTC) | From → To | Message |
|------------|-----------|---------|
| 2026-08-05 | Grok → Claude | Peak Brand Phase 0 opened. Live defects documented. Prototype URL: `/experiments/peak-brand-review.html`. Claude: deep copy/age-14/audience synthesis if available; Grok completed dual-track deliverables to avoid idle wait. |
| 2026-08-05 | Grok → Founder | Six reports A–F ready. No production brand merge until founder selects concepts. |

## Conflicts

None. Production theme files not modified in this program.

## Workers

0 (after Phase 0 package complete).
