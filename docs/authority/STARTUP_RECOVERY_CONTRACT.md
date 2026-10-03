# STARTUP RECOVERY CONTRACT

**Status:** PERMANENT — every future AI agent session  
**Required:** `FRESH_AGENT_NEEDS_OLD_CHAT_TO_CONTINUE = 0`

## Procedure (do in order)

1. **Verify worktree path**  
   Expected: `/Users/genghishameha/Developer/NIOVI-Architect/worktrees/opal-grok-real-people`  
   `pwd`

2. **Verify branch**  
   Expected: `build/v2-coded-experience-closure`  
   `git branch --show-current`  
   If different: STOP · REPORT · DO NOT GUESS

3. **Verify HEAD**  
   `git rev-parse HEAD`  
   Compare to `CURRENT_OPAL_STATE` frozen baselines

4. **Inspect dirty tree**  
   `git status --short --branch`  
   `git diff --stat`  
   `git ls-files --others --exclude-standard`  
   Preserve dirty A8/shell/founder work. Never reset/clean/checkout over dirty work.  
   Track B call files may remain untracked — isolate; do not commit as Track A green.

5. **Read CURRENT_OPAL_STATE**  
   `docs/authority/CURRENT_OPAL_STATE.md`  
   Restore MISSION ledger (COMPLETED / REMAINING / NEXT)

6. **Read PRODUCT_INVARIANTS**  
   `docs/authority/PRODUCT_INVARIANTS.md`

7. **Read latest STOP / founder ledger**  
   `docs/authority/FOUNDER_VALIDATION_LEDGER.md`  
   `docs/authority/REGRESSION_LEDGER.md`  
   Latest evidence under `docs/evidence/v2-coded-experience/`

8. **Reconcile code owners**  
   Do not invent parallel SharedPlan / Attention / Memory / Execution engines.  
   Reuse: ConversationAlignment, SurfaceProjection, AttentionAuthority, Clock, PlanLifecycle, HomeProjection, nextPlan/graphReality.

9. **Run minimum authority preflight**  
   - Phoenix `/health` if changing server  
   - Confirm Track B remains RED / uncommitted  
   - Confirm MERGE=NO · LIVE=NO  
   - Confirm Journey blocked until A8 whole-app freeze

10. **Only then modify code**  
    Follow `AI_AUTONOMOUS_EXECUTION_CONTRACT.md`. Continue REMAINING_PHASES. Checkpoint when coherent. Push safe checkpoints. Stop only for real HUMAN_BLOCKER or mission complete.

## Git safety (permanent)

NO reset · NO clean · NO checkout over dirty founder work · NO rebase · NO merge · NO public live · NO branch switch unless explicitly required and explained · NO silent discard
