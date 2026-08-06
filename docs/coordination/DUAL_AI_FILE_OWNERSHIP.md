# Dual-AI File Ownership Ledger

**Updated:** 2026-08-06  
**Rule:** Do not edit files owned by the other agent while that agent is active.

## Claude

| Field | Value |
|-------|--------|
| Worktree | `/Users/genghishameha/Developer/NIOVI-Architect/worktrees/opal-claude-alignment` |
| Branch | `architecture/speed-to-alignment-and-complete-journey` |
| Base | `origin/main` @ `c177ba6` |
| Status | **Active independent session required** — founder confirmed Claude open |

### Claude-owned paths (do not edit while Claude active)

```
docs/coordination/CLAUDE_REPOSITORY_UNDERSTANDING.md
docs/product/OPAL_SPEED_TO_ALIGNMENT.md
docs/product/OPAL_COMPLETE_SOCIAL_JOURNEY.md
docs/product/OPAL_AGE_12_COPY_SYSTEM.md
docs/product/OPAL_AUTHENTIC_ALIGNMENT.md
docs/product/OPAL_SOLO_AND_GROUP_ALIGNMENT.md
docs/product/OPAL_NETWORK_EFFECT_JOURNEYS.md
docs/architecture/ALIGNMENT_GAP_MODEL.md
docs/architecture/MINIMUM_QUESTION_ENGINE.md
docs/architecture/PERMISSIONED_RELATIONSHIP_KNOWLEDGE.md
docs/architecture/LOCATION_ALIGNMENT_ENGINE.md
docs/product/OPAL_HUMAN_AND_AI_STATE_MATRIX.md
docs/coordination/CLAUDE_TO_GROK_ALIGNMENT_HANDOFF.md
```

Claude may also create related architecture/product docs **only inside this worktree/branch**.

## Grok

| Field | Value |
|-------|--------|
| Worktree | `/Users/genghishameha/Developer/NIOVI-Architect/Opal` |
| Branches | `design/opal-peak-brand-prototypes` (Peak Brand Phase 0, Grok-authored); `docs/speed-to-alignment-grok-phase0` (Grok gap audits) |
| Lead | Release authority, live UI, Brave, deploy, merge |

### Grok-owned paths

```
docs/coordination/DUAL_AI_FILE_OWNERSHIP.md
docs/coordination/GROK_CLAUDE_HANDOFF.md
docs/coordination/GROK_TO_CLAUDE_* 
docs/evidence/product/SPEED_TO_ALIGNMENT_CURRENT_GAP.md
docs/evidence/location/SOLO_AND_GROUP_LOCATION_ALIGNMENT_GAP.md
docs/evidence/metrics/SPEED_TO_ALIGNMENT_MEASUREMENT_PLAN.md
docs/build/SPEED_TO_ALIGNMENT_VERTICAL_SLICE.md
docs/evidence/peak-brand-first-five-seconds/*
apps/opal_web/public/experiments/peak-brand-review.html
live / deploy / gh-pages / production PRs
```

## Peak Brand Phase 0 labeling

| Package | Attribution |
|---------|-------------|
| Draft PR #57 / `design/opal-peak-brand-prototypes` | **Grok-authored Phase 0 brand package awaiting independent Claude review** |
| Not dual-AI reviewed | Until Claude commits independent critique |

## Forbidden while dual-AI active

- Grok writing Claude-owned product/architecture docs
- Claude editing Grok worktree or deploying
- Claiming dual-AI without Claude commit hashes
