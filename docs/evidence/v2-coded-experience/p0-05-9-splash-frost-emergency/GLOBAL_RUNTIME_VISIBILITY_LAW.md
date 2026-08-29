# GLOBAL RUNTIME VISIBILITY LAW

**HOLD. DO NOT MERGE. permissionToStartLive = NO. NO LIVE.**

## Checkpoints

- P0-05.9 Splash repair base: `73f0462e1401901d26da8fb7a52af5537e3602fc`
- P0-05.9A: runtime identity durability (see `HOLD_RETURN_P0_05_9A.md` for exact HEAD)

## Law

> Ambient/background rendering is never proof that a screen rendered.

## Dual gates

**STRUCTURAL** — route, owner, geometry, assets, navigation

**SEMANTIC VISIBILITY** — primary content + screen-specific objects + actionable control visible; no ambient/frost hiding content

## Permanent First Run architecture

TOP-LEVEL Splash `618:19` → TOP-LEVEL Promise `646:2` → Phone `773:27` → Verify `773:52` → Profile `773:80` → Find People `773:113` → Home

## Founder URL equality law

```
URL_RUNTIME_PARAM
== DOM data-runtime-checkpoint
== DOM data-git-head
== git rev-parse --short=7 HEAD (Vite cwd at process start)
```

A git commit cannot contain its own hash under amend. Therefore:

1. Tree must be clean.
2. Vite restarted from that HEAD.
3. Founder URL `runtime=` uses that live HEAD prefix (printed after restart).
4. Do not stamp an ancestor SHA onto a descendant working tree.
