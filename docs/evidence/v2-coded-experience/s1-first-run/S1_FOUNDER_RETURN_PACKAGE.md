# S1 — FINAL FIRST RUN + INTEGRATED ADVERSARIAL CLOSURE

**HOLD. DO NOT MERGE.**

Founder return package after S1 technical implementation.

Baseline before S1: `1cec029` (S0.1 exact PNG 168:2)  
Remote CI S0.1: `32022796107` SUCCESS

---

## 1. What was implemented (scope = S1 only)

Exact route from Figma `217:2`:

| Step | Node | Surface | Authority |
|------|------|---------|-----------|
| FR00 | 217:5 | Splash — full Opal Graph + tagline | Brand 168:2 / 159:2 |
| FR01 | 217:18 | Your World demo | Illustrative only |
| FR02 | 217:82 | Who with? selection demo | Illustrative only (no server mutation) |
| FR03 | 217:123 | Human chat + ambient Opal consequence | Illustrative only |
| FR04 | 217:196 | Live / Happening Now preview | Product preview (not full Live production) |
| FR05 | 217:254 | Start with your people | Conversion |
| FR06 | 217:287 | Phone | Real `startChallenge` |
| FR07 | 217:307 | Verify | Real `verifyChallenge` |
| FR08 | 217:330 | Profile | Real `PATCH /session/profile` |
| FR09 | 217:354 | Find your people | Real FindPeopleFlow + Not now exit |
| Home | existing | Authenticated member Home | Not 201:5 continuum |

Visual grammar inherits `201:2` (deep void, steel, quiet cyan, green for confirmed truth).

---

## 2. Authority map (who owns truth)

| Concern | Owner | Persist | Authz |
|---------|-------|---------|-------|
| Walkthrough completed | Client localStorage `FIRST_RUN_STORAGE_KEY` | local | Device only |
| Phone challenge | Server activation | Server | OTP consent + provider |
| Session | ProductSession + DeviceSession | Server + memory bearer | Bearer/cookie |
| Display name / handle | `users` table | Server | Signed-in user PATCH |
| Profile photo | **GAP** session-local preview only | Not durable | N/A |
| Contacts invites | Invitation API selected-only | Server | Bearer |
| Walkthrough fixtures | Client fixtures | None | Demo only |

---

## 3. Files (product)

- `apps/opal_web/src/onboarding/FirstRunExperience.tsx` — full FR00-FR09
- `apps/opal_web/src/onboarding/firstRunCopy.ts` — copy law
- `apps/opal_web/src/onboarding/firstRun.test.ts` / `preMemberShell.test.ts` / `s1Adversarial.test.ts`
- `apps/opal_web/src/OpalApp.tsx` — premember wiring (full vs sign_in)
- `apps/opal_web/src/api/productClient.ts` — `updateProfile`
- `apps/opal_web/src/styles.css` — S1 visual grammar
- `apps/opal_core/.../session_controller.ex` — `update_profile`
- `apps/opal_core/.../product_session.ex` — profile update + uniqueness
- `apps/opal_core/.../router.ex` — `PATCH /session/profile`
- `apps/opal_core/test/.../product_profile_s1_test.exs`

Legacy `ActivationFlow.tsx` remains in tree but is not mounted by OpalApp (S1 owns phone/verify).

---

## 4. Evidence levels completed

| Level | Result |
|-------|--------|
| L1 Code inspection | Done |
| L2 Unit (Vitest) | **284+20 S1 adversarial = green** (full suite 35 files) |
| L3 Server (ExUnit profile) | **2/2 green** |
| L4 Browser automation | Partial / not fully automated this tranche (no Playwright in package scripts) |
| L5 Multi-session browser | **Founder required** |
| L6 Founder live walkthrough | **HOLD for founder** |

---

## 5. Adversarial checks covered (automated)

- Premember isolation (no member tabbar pre-auth)
- WHO demo no server mutators
- Double-submit locks on start/verify
- Phone normalize / preview fixtures
- Dev code only when not production SMS
- Profile server PATCH + handle uniqueness (ExUnit)
- FR09 Not now escape
- Returning user sign_in mode
- CREATE dock deferred
- Brand 168:2 assets non-zero
- Copy: no em dash in S1 strings
- Honest Live preview disclaimer
- P31 / WHO-FAST-PATH / messaging seams still present in OpalApp

---

## 6. Explicit gaps / NOT_YET_IMPLEMENTED

| Item | Status |
|------|--------|
| Full Graph create (S5) | Deferred — CREATE dock false |
| Home continuum 201:5 | Deferred — existing Home |
| Full Live production | Deferred — FR04 is preview |
| Journey redesign (S4) | Not started |
| Durable profile photo upload | **Gap** — initials fallback; local preview only |
| Native address book full sync | Web Contact Picker when available; else manual phone |
| Silent full address-book upload | **Not implemented** (correct) |
| Multi-session browser adversarial suite | Founder / later harness scripts |
| S2 People product | Not started |

---

## 7. Repairs during S1

1. Replaced legacy SF14 5-step walkthrough with founder-locked 217:2 route.
2. Avoided mid-auth mode flip (walkthrough mark persists without forcing sign_in remount before FR09).
3. Added real profile PATCH so FR08 is not localStorage-only identity.
4. Updated stale tests that asserted old “Join” / “Life starts in conversation” narrative.
5. Brand feel tests aligned to void/steel grammar (S0.1).

---

## 8. Founder walkthrough checklist

1. Cold start → FR00 splash (full Opal Graph + tagline; no Opal G crop).
2. FR01–FR04 demos; nothing should create server state.
3. FR05 → Continue with phone / I already have an account.
4. FR06 approved preview number + consent → code.
5. FR07 valid code → session; invalid code recoverable.
6. FR08 name required; initials if no photo; username unique if set.
7. FR09 Not now → existing authenticated Home (not 201:5 continuum).
8. Sign out → sign_in path (no forced walkthrough).
9. Replay intro under You still ends without re-auth if session exists.
10. Spot-check P31 path: direct chat / WHO sheet / Moments still live.
11. Asset: symbol is 168:2 exact, not 160:2 vector export.

---

## 9. Merge verdict

**HOLD. DO NOT MERGE.**

Technical S1 implementation is ready for founder validation.  
Do not start S2 until founder walks the first-run and existing member paths.

---

## 10. Product SHA / CI

- Product SHA: `bea863c` (implementation) · tip `e7e8a40` (docs SHA note)
- Remote CI: `32026907797` SUCCESS (Intelligence Gate on `build/v2-coded-experience-closure`)
- Local Vitest: 304 passed (36 files)
- Local ExUnit profile S1: 2 passed
- Dirty tree note: unrelated untracked brand/media evidence may remain outside S1 commit; S1 commit is scoped.
