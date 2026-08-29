# POST_73F0462_DELTA — P0-05.9A runtime identity durability

**HOLD. DO NOT MERGE. permissionToStartLive = NO. NO LIVE.**

## Starting HEAD (P0-05.9 Splash repair)

`73f0462e1401901d26da8fb7a52af5537e3602fc`

Contains:

- top-level `FirstRunSplashPage`
- no legacy `.fr-void` / `.app-ambient` parent on Splash path
- top-level Splash → Promise transition
- `?opal_force_splash=1` isolation probe

## Classification of uncommitted delta (pre-commit)

| Path | Class | Notes |
|------|-------|-------|
| `apps/opal_web/src/runtime/founderRuntimeCheckpoint.ts` | RUNTIME_IDENTITY | NEW — `runtime=` mismatch clear + one-shot reload |
| `apps/opal_web/src/runtime/founderRuntimeCheckpoint.test.ts` | RUNTIME_IDENTITY / TEST | NEW |
| `apps/opal_web/src/main.tsx` | RUNTIME_IDENTITY | apply checkpoint before React; stamp DOM; skip mount on reload |
| `apps/opal_web/src/OpalApp.tsx` | RUNTIME_IDENTITY | share `FORCED_FIRST_RUN_KEY`; never strip `runtime=` |
| `apps/opal_web/src/onboarding/founderSplashVisibility.test.ts` | SEMANTIC_VISIBILITY / TEST | top-level FR law + runtime bust guard |
| `docs/authority/OPAL_CURRENT_AUTHORITY.yaml` | AUTHORITY | dual gates + first-run architecture law |
| `docs/authority/FIGMA_RUNTIME_LEDGER.yaml` | AUTHORITY | Splash/Promise owners → top-level pages |
| `docs/evidence/.../GLOBAL_RUNTIME_VISIBILITY_LAW.md` | EVIDENCE | ambient ≠ screen proof |
| `docs/evidence/.../HOLD_RETURN_P0_05_9.md` | EVIDENCE | versioned founder URL |
| `docs/evidence/.../*PROOF*.json/png` | EVIDENCE | forensic re-proofs |
| `docs/evidence/.../EMBLEM_RUNTIME_DIRECT.png` | EVIDENCE | emblem byte open |

**UNKNOWN = 0**

**No unrelated product changes** (Splash/Promise/Auth/Home/Chats/Graphs/Opal/Dock visuals untouched).

## Intent of this delta

Make founder `runtime=` identify exact committed bytes running in Vite — not stamp `73f0462` onto uncommitted descendant code.
