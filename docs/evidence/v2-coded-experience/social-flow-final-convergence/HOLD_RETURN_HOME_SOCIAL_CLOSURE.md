# OPAL GRAPH — Home production hydration + social action closure

**HOLD. DO NOT MERGE.**

## SHAs

| Item | Value |
|------|-------|
| Pre-change product SHA | `9070609` (docs tip; feature baseline `3349f4e`) |
| Branch | `build/v2-coded-experience-closure`
| New product SHA | `e00e20f07a4a28b16821df0cc42d74f99b192f2b` |
| Exact founder reset URL | `http://127.0.0.1:5173/?opal_reset_first_run=1` |

Start Vite separately with `VITE_OPAL_API_URL=http://127.0.0.1:4000` (env is not a URL).

## Acceptance question

> When I open Home, does Opal Graph feel like a living social world… every primary social interaction take me somewhere truthful…?

**Directionally YES** for founder fixture + destinations + scroll restore + Follow/engagement authorization seam.  
**Not absolute production-complete:** durable BEAM Memory/Comment/Repost APIs still absent (client engagement store + FollowGraph HTTP). Social Moments remain `not_home_feed`.

## Exact local tests

Vitest (this tranche suites):

```
6 files / 36 passed
- founderFixture.test.ts (5)
- homeSocialActions.test.ts (6)
- graphSocialHome.test.ts (10)
- chatsHome.test.ts (3)
- homeHydration.test.ts (9)
- graphCreateFlow.test.ts (3)
```

Browser assertions: **20 passed / 0 failed** (`HOLD_HOME_SOCIAL_PASS`).

## Evidence

- `BROWSER_PROOF_HOME_SOCIAL_CLOSURE.json`
- `shots/home-social-closure/` (A–M)
- `DEAD_TAP_AUDIT_HOME_SOCIAL.md`
- `VITEST_HOME_SOCIAL_COUNTS.txt`
