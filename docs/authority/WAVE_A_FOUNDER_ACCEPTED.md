# WAVE A — FOUNDER ACCEPTED / FROZEN

```yaml
accepted_date: "2026-08-29"
status: FOUNDER_ACCEPTED
frozen: true
law: DO_NOT_REOPEN_WITHOUT_PROVEN_REGRESSION
WAVE_A_FOUNDER_ACCEPTED: YES
WAVE_A_FROZEN: YES
checkpoint_before_wave_b: "3b4c000e0dedd2cc0c8e852917b5328eca48b536"
```

## Founder words (verbatim intent)

COMPLETE · FANTASTIC · WELL STRUCTURED · WELL LAID OUT · GOOD FOR THE DEMO VERSION

## Accepted surfaces (current authority)

| Surface | Figma node | Notes |
|---------|------------|--------|
| Splash | `618:19` | Spectral stroke; top-level mount |
| Promise | canonical `646:2` + presentation `710:8` | Frozen raster + native CTAs |
| Phone | `773:27` | International E.164; text-only Skip |
| Verify | `773:52` | No Preview code in product UI |
| Profile | `773:80` | Add photo ACTION |
| Find People | `773:113` | → Home |

## Founder demo auth (local / review only)

| Field | Value |
|-------|--------|
| E.164 | `+12025550101` |
| OTP | `111111` |
| Gate | `?opal_founder_seed=1` only |
| Authority | `docs/dev/FOUNDER_AUTH_FIXTURE.md` |

**Not production. Isolated fixture.**

## Law

1. Do **not** reopen Wave A merely because Wave B shares CSS/components.
2. Visual redesign of accepted First Run/Auth is forbidden without proven regression.
3. Brand V4 on auth = colors + logo only; geometry preserved.
4. Wave B work must not regress Splash / Promise / Phone / Verify / Profile / Find People.

## Status flags for commits

```
WAVE_A_FOUNDER_ACCEPTED = YES
WAVE_A_FROZEN = YES
MERGE_AUTHORIZED = NO
LIVE_AUTHORIZED = NO
permissionToStartLive = NO
```
