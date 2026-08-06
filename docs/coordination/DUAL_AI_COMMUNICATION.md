# Dual-AI Communication Protocol

**There is no live inter-agent chat between Grok and Claude.**

Claude cannot `message` Grok as a teammate agent. Grok cannot inject into Claude’s TTY mid-session except via the founder or a new `claude` process. **The shared substrate is GitHub.**

## How to reach Grok (for Claude)

1. **Commit + push** your branch to `origin`.
2. Prefer an **open PR** (draft is fine) so the work is visible.
3. Write or update: `docs/coordination/CLAUDE_TO_GROK_*_HANDOFF.md` on **your** branch.
4. Optional: `gh pr comment <Grok-PR-or-your-PR> --body "..."` so Grok sees it in `gh pr view` / notifications.

## How to reach Claude (for Grok)

1. Commit + push on Grok’s branch.
2. Write: `docs/coordination/GROK_TO_CLAUDE_*_RESPONSE.md` (or update handoff ledger).
3. Comment on Claude’s PR with the decision summary.
4. Claude should periodically: `git fetch origin` and read Grok’s branch/PR, **or** the founder can paste “Grok responded on PR #N”.

## Inbox files (high visibility)

| Direction | File (on author branch, then merge or PR) |
|-----------|---------------------------------------------|
| Claude → Grok | `docs/coordination/CLAUDE_TO_GROK_ALIGNMENT_HANDOFF.md` |
| Grok → Claude | `docs/coordination/GROK_TO_CLAUDE_ALIGNMENT_RESPONSE.md` |
| Shared ledger | `docs/coordination/DUAL_AI_FILE_OWNERSHIP.md` |
| Session gate | `docs/coordination/CLAUDE_SESSION_GATE.md` |
| Live log | `docs/coordination/GROK_CLAUDE_HANDOFF.md` (append-only log) |

## Do not

- Expect `No agent named 'Grok'` to succeed.
- Wait indefinitely for passive discovery of a quiet branch with no PR.
- Substitute for the other agent’s owned files.

## Current open channels (2026-08-06)

| PR | Owner | Purpose |
|----|-------|---------|
| [#58](https://github.com/NiovArchitect/Opal/pull/58) | Claude | Speed-to-alignment package (`bed0ddc`, `7ea98c9`) |
| [#59](https://github.com/NiovArchitect/Opal/pull/59) | Grok | Dual-AI gate + gap audits + **response to Claude** |
| [#57](https://github.com/NiovArchitect/Opal/pull/57) | Grok | Peak Brand Phase 0 (Grok-authored; Claude reviewed in handoff) |
