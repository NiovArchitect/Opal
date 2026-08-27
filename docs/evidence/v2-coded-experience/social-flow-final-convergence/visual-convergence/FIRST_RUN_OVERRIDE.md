# FIRST-RUN OVERRIDE

**Date:** 2026-08-20  
**Additive founder-authorized design gap.**

## Old flow (superseded)

Splash → SFR-01 → SFR-02 → SFR-03 → SFR-04 → conversion → phone auth

## New production flow

1. **Splash** (fr00) — premium Opal identity  
2. **One promise screen** (frPromise) — `OpalPromiseScreen`  
3. **Real auth** (fr06+) — phone → OTP → profile → optional contacts  

## Promise screen layers

| Layer | Copy |
| --- | --- |
| Ambient thesis | Your social life, already in motion. |
| Kinetic mechanism | TALK. → ALIGN. → GO. |
| Human payoff | Less coordinating. More living. |

CTA: **Enter Opal**  
Returning: **I already have an account** → fr06

## Architecture note

Deterministic onboarding composition. Represents the same Opal (Conversation → Graph → life). Does not create a second intelligence owner.

## Legacy

fr01–fr05 remain in `FirstRunExperience.tsx` off-route for historical tests.
