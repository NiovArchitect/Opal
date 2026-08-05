# Walkthrough screen 5 source implementation

**Branch:** `fix/walkthrough-final-conversion-hook`  
**Decision:** `FOUNDER_DECISION_APPROVED.md`

## Before → after (screen 5)

| Field | Before | After |
|-------|--------|-------|
| Kicker | Private by design | Join |
| Title | Calm. Human. Yours. | More of what you talk about should actually happen. |
| Body | No ranking… quieter kind of magic | Opal understands what is taking shape and helps you and your people carry it forward. |
| CTA | Enter Opal | Continue with phone number |
| Secondary | (none) | Bring your people in after you join. |

Screens 1–4: unchanged.

## Files

- `apps/opal_web/src/onboarding/FirstRunExperience.tsx`
- `apps/opal_web/src/designTokens.ts`
- `apps/opal_web/src/ActivationFlow.tsx` (phone trust)
- `apps/opal_web/src/people/FindPeopleFlow.tsx` (contact trust)
- `apps/opal_web/src/styles.css` (secondary + trust styling)
- `apps/opal_web/src/experience/experienceMoment.ts` (authenticated moment defaults)
- Elixir headline defaults for group-of-three opportunity (aligned with moment copy)

## Simulated persona review (labeled, not external human validation)

| Persona | Can explain Opal? | Why friends? | Desire to continue? |
|---------|-------------------|--------------|---------------------|
| New user | Yes: talk → real shared experiences | Bring people so Opal can help together | Yes: clear unmet need |
| Age-14 proxy | Yes: more of what we talk about should happen | Friends make plans real | Yes |
| Privacy-conscious | Trust line at phone entry; not the climax | Selected-only invite | Yes if trust holds |
| Invited by friend | Screens 1–4 + join hook | Already motivated by invitee | Yes |
| Calendar assumption | Corrected by conversation-first arc | Not scheduling homework | Medium-high |
| Chatbot assumption | Corrected: not chat replacement alone | People + experiences | Medium-high |
| Therapist lens | Practical payoff present; dignity intact | Group work without ranking | Yes |

## Non-claims

- No Phase 3 runtime  
- No SF18 closure  
- No provider/location/payment changes  
