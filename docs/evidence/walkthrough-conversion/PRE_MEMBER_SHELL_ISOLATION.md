# Pre-member shell isolation

**Status:** Implemented on `fix/pre-member-shell-and-join-flow`  
**Root cause:** `FirstRunExperience` overlaid the full authenticated-looking shell (tabbar Home/Chats/Plans/You + seeded panes) while nonmembers completed the walkthrough.

## Correction

| State | Shell |
|-------|--------|
| Walkthrough (`showFirstRun`) | Premember only: ambient + FirstRun. **No tabbar.** |
| Boot without session | Premember brand + “Preparing…” |
| Activation (`!authenticated`) | Premember brand + ActivationFlow. **No tabbar.** |
| Authenticated session | Member shell with primary nav |

Member navigation visibility requires authoritative `session.user_id`, not localStorage walkthrough completion alone.

## Tests

`apps/opal_web/src/onboarding/preMemberShell.test.ts`
