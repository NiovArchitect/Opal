# Quiet state — Phase 1

## Fixture

```text
Hey, how are you?
Doing well. Long day.
```

## Expected

- No opportunity
- No suggestion
- No summary
- No glow placeholder
- No generated plan

## Implementation

- `Context.detect` → `ordinary` / non-forming
- `Restraint.decide` → silence
- Web `quietExperienceState()` → `null`
- Mobile contract test expects null moment
