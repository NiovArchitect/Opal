# Functionality Reality Audit — Final (Onboarding + Experience Integrity)

**Date:** 2026-10-13  
**Branch:** `muse/packet-b-batch-2`  
**Base tip before this tranche:** `bce4a905`  
**Mission:** Preserve the organism. Restore missing front-door experience. Prove runtime. No Pass 2 unlock.  

Companion UI/UX report: `OPAL_UI_UX_REALITY_AUDIT.md`  
Prior YOU/consumer five-layer audit: `FUNCTIONALITY_REALITY_AUDIT.md` (17/17 GREEN @ `bce4a905`)

---

## Executive summary

The clean-install front door had drifted: Splash 2 (Promise) still existed as a canonical PNG but was skipped on Tap to begin, and Meet asked for permissions before the first relationship seed. This pass **restored** Splash 1 → Splash 2 → Phone and Meet order **name → first connection → permissions**, with username auto-suggest + collision Accept/Try another. Chats, Calls, Center, Home, and YOU foundations were **verified preserved**, not rewritten.

Runtime onboarding audit: **12 GREEN / 0 YELLOW / 0 RED**.

---

## Required flags

```
ONBOARDING_RUNTIME_MATCH = YES
SPLASH_2_PRESENT = YES
SPLASH_COMPLETE = YES
NAME_TO_USERNAME = YES
FIRST_CONNECTION_FLOW = YES
FIRST_CONNECTION_COMPLETE = YES
PERMISSIONS_SEQUENCE = YES
PERMISSIONS_REAL = YES
CHATS_VISUAL_MATCH = YES
CALLS_VISUAL_MATCH = YES
OPAL_THREAD_VISUAL_MATCH = YES
DEAD_ACTIONS = 0
FAKE_SUCCESS = 0
PASS2_UNLOCKED = NO
```

```
PASS1 = COMPLETE
PASS2_UNLOCKED = NO
TRACK_B = UNTOUCHED
CONSUMER_READY = YES
```

```
NO EXISTING FEATURES REMOVED
NO AUTHORITY LAWS BROKEN
NO MEMORY IMPLEMENTATION
NO RELATIONSHIP INFERENCE
NO SCORING
```

---

## Runtime status

| Probe | Status |
|-------|--------|
| Splash 1 brand arrival | GREEN |
| Splash 2 after Tap to begin | GREEN |
| Phone after Splash 2 | GREEN |
| Meet Opal surface | GREEN |
| Name → @username auto | GREEN |
| First connection before permissions | GREEN |
| Connect Chanelle → permissions | GREEN |
| Rejected permissions (Not now) honest | GREEN |
| Chats visual | GREEN |
| Calls visual | GREEN |
| Opal Center | GREEN |
| Home social | GREEN |

Evidence: `shots/onboarding_reality_audit/`  
JSON: `ONBOARDING_REALITY_AUDIT_RUNTIME.json`  
Vitest onboarding suites: **33/33 passed**

---

## Fixed regressions (restored intent)

1. **Splash 2 off primary path** — `advanceSplashToPromise` restored; Tap to begin opens Promise; Skip intro still skips to Phone.  
2. **Meet permission-before-people order** — turns are now name → friend → permissions → ready.  
3. **First-connection copy** — social bridge language restored.  
4. **Username collision** — Meet continue surfaces taken handle + Accept / Try another (no silent fail).  
5. **Em-dash hygiene** in FirstRunExperience comments (copy law).

---

## Remaining limitations

- Full OTP→Meet→Home with live SMS not re-burned this pass (`production_sms`); Meet proven via `opal_force_meet_opal` + Splash path proven unauthenticated through Phone.  
- Conversations list cold-boot latency (~22s on Walk A fixture) remains ops debt (native-session inject used for member visuals).  
- Calendar / mic contextual asks beyond Meet’s three rows remain deferred.  
- Character mood→expression productization beyond existing living-character states remains deferred.  
- Founder iPhone physical feel walk not re-run this pass (Playwright 390×844 + API).

---

## Screens tested

Splash 1 · Splash 2/Promise · Phone · Meet greeting · Name/username · First connection · Permissions · Chats · Calls · Center · Home  

---

## Evidence locations

| Artifact | Path |
|----------|------|
| Onboarding harness | `apps/opal_web/scripts/_onboarding_reality_audit.mjs` |
| Runtime JSON | `shots/onboarding_reality_audit/ONBOARDING_REALITY_AUDIT_RUNTIME.json` |
| Screenshots | `shots/onboarding_reality_audit/*.png` |
| UI/UX report | `docs/evidence/founder_staging_walk_correction/OPAL_UI_UX_REALITY_AUDIT.md` |
| Prior YOU audit | `docs/evidence/founder_staging_walk_correction/FUNCTIONALITY_REALITY_AUDIT.md` |

---

## Preserved / Restored / Improved / Deferred

### Preserved
Pass 1 reality · Consumer Reality Gate · YOU control plane · Access/Action · ConsentProof ladder · Alignment architecture docs · Chats/Calls visual system · Center companion scale · Home social-first · Pass 2 lock

### Restored
Splash 2 on Tap to begin · First connection before contacts · Contextual permission why-copy · Username collision confirm UX

### Improved
Onboarding reality harness · Meet social-guide copy · Handle alternative suggestions

### Deferred
Pass 2 · Memory · Inference · Scoring · Track B · Calendar-on-Meet · Full Live presence productization

---

## Commit / push

See git history on `muse/packet-b-batch-2` for this tranche commit (onboarding restore + evidence). Push only; no merge to main.

---

## Closing statement

All repairs were additive. No previously completed consumer functionality, authority law, or Pass 2 boundary was removed or weakened.

The front door again answers: **“I am bringing my people into a smarter social world.”**
