# Repair #15-A - Onboarding Audit (Worker A: ONBOARDING)

Date: 2026-10-16. Branch: muse/repair-15-a, base 025a0289 (repair-14 tip).
Scope: web first-run (apps/opal_web/src/onboarding/, ActivationFlow.tsx), the mobile
WebView shells that host it, and the native fallback activation screen.
No backend changes (apps/opal_core untouched). No flow redesign, no product-law change.

## The production path (verified in code, OpalApp.tsx)

1. Splash - FirstRunSplashPage (top-level, not the FirstRunExperience fr00 copy)
2. Promise - FirstRunPromisePage (canonical PNG, live CTAs below the art)
3. Phone - FirstRunExperience fr06 (mode="sign_in"; the nested fr00 splash never renders)
4. Verify - FirstRunExperience fr07 (OTP)
5. Permission bootstrap - PermissionBootstrapPage (contacts / notifications / location)
6. Meet Opal - MeetOpalConversation (name + auto handle, then first person, both skippable in part)
7. Done - Meet Opal completion calls completeFirstRun() and lands on social Home.

Dead / off-path code found while walking: FirstRunExperience fr08 (profile),
fr09 (Assist), fr10 (act-on-behalf) are in FIRST_RUN_ROUTE_ORDER but unreachable
on the production path today - OpalApp never calls setFrResumeStep, and Meet Opal
completion finishes first-run before them. Legacy fr01-fr05 demo screens are
off-route ({false && ...} or unreachable steps). ActivationFlow.tsx has no
importer in src (orphan fallback surface). TrustContractCard.tsx and
OpalWorking.tsx are not on the first-run path. These are inventoried here, not
deleted (additive-only repair; deletion is a founder call).

## 1. OTP ROOT CAUSE (founder bug: code must be typed by hand, iOS never offers it)

Surface chain: the founder's phone runs the native host. App.tsx renders
NativeFirstRunSurface when PRODUCT_WEB_URL is set, which loads the WEB first-run
in a WKWebView (opal_native_host=1). So the OTP he sees is the web fr07 in
FirstRunExperience.tsx, not the native ActivationScreen (that is only a fallback
when no web URL is configured).

The attribute was never the problem. fr07 already had
autoComplete="one-time-code" and inputMode="numeric" on a single input.
The problem was WHERE that input sat:

- The real input was an invisible overlay: styles.css carried
  .fr-code-input-bridge { position: absolute; inset: 0; opacity: 0; }.
- What the user actually saw and tapped around was six decorative span cells
  (.fr-code-cells / .fr-code-cell, aria-hidden) that mirrored React state.
- iOS / WebKit Security Code AutoFill only offers the Messages one-time-code
  suggestion for a visible, rendered text input. A fully transparent
  (opacity: 0) overlay input is treated as hidden, so the QuickType suggestion
  never appeared, on this surface or in desktop Safari. The grep-visible
  "one-time-code" string made the code look correct while the CSS silently
  disabled the feature.

Fix (all surfaces):
- fr07: decorative cells and the bridge class removed. The code input IS the
  visible field now: type="text", autoComplete="one-time-code",
  inputMode="numeric", enterKeyHint="done", styled as a real boxed field
  (border, background, opacity: 1) at the same wrap geometry (320px max, 52px).
  One single input - per-digit split inputs were not introduced (they break
  one-time-code too).
- ActivationFlow.tsx (orphan fallback): same attribute lock made explicit
  (type="text" + enterKeyHint added; it was already visible with the right
  autocomplete), plus type="tel" on its phone input.
- fr06 phone input: type="tel" added (was defaulting to text; tel gives the
  correct keyboard and tel-national autofill semantics).
- Native ActivationScreen.tsx: textContentType="oneTimeCode" was already there;
  added autoComplete="sms-otp" (the Android half of the contract).
- Tests lock it: apps/opal_web/src/onboarding/otpAutofill.test.ts (8 tests:
  single visible input, attribute contract, no bridge class anywhere in tsx or
  css, no opacity:0 on any fr-code rule, ActivationFlow parity) and
  apps/opal_mobile/src/__tests__/activationOtpAutofill.test.ts (3 tests).

Residual phone-walk check for the founder (cannot be proven from the VM):
after this lands on the walk build, tap the code field on fr07 - the code
should appear above the keyboard as a one-tap suggestion. If it ever does
not, the next suspect is the SMS body format itself (domain-bound code
format), which is a backend/Twilio template question outside this track.

## 2. Per-screen disposition

### Splash - FirstRunSplashPage
- Purpose: brand moment, one decision (Continue, or I already have an account).
- Cost: ~2s, user-paced (no auto-advance, hold is indefinite by design).
- Findings: clean. One identity image, two live CTAs, no copy interrogation,
  no duplicate Enter Opal (Splash-2 boundary respected).
- Disposition: KEPT, unchanged.

### Promise - FirstRunPromisePage
- Purpose: the product promise (canonical founder PNG), then Enter Opal /
  I already have an account as live buttons below the art (baked CTA strip is
  masked, never duplicated).
- Cost: ~3-5s read, skippable by tapping Enter Opal immediately.
- Findings: honest load states (loading / PROMISE_ASSET_LOAD_FAILED), no
  overlay copy on the art, both CTAs work.
- Disposition: KEPT, unchanged.

### fr06 Phone - FirstRunExperience
- Purpose: phone number (the account key) + SMS consent.
- Cost: ~10-15s (type number, tick consent, Continue).
- Findings:
  - FIXED: phone input had no type; now type="tel".
  - Consent checkbox is required before Continue enables. It is one plain
    sentence ("only for signing in. Not for marketing") plus a rates line.
    This is the legal send-consent for the OTP text, asked at the only moment
    it is needed. KEPT by design.
  - "Skip for now" button: on founder-seed builds it runs the fixture OTP
    path; on any other build it only shows "Phone verification is required
    to continue." That is a dead asset for real users (a button whose only
    job is to say no). FLAGGED, not removed: the founder's own walks use the
    seed path, and removing or gating the button changes walk behavior.
    Recommendation (deferred, founder call): render it only when the
    founder seed is enabled.
  - Country dial select defaults to +1 with 10 options; national field
    strips a pasted E.164 prefix. No other data asked. Good progressive
    disclosure.
- Disposition: FIXED (tel type). One flag deferred (Skip for now gating).

### fr07 Verify - FirstRunExperience
- Purpose: enter the 6-digit code.
- Cost: ~5s with AutoFill (was ~20-30s manual: leave app, read Messages,
  memorize, return, type).
- Findings: the OTP bug above. Resend carries a 30s cooldown with the
  countdown in the label (honest, not noisy). Change number resets cleanly
  to fr06. Error copy is plain ("That code did not work. Try again.").
- Disposition: FIXED (visible AutoFill input; see section 1).

### Permission bootstrap - PermissionBootstrapPage
- Purpose: decide contacts / notifications / location before Meet Opal.
- Cost: up to 6 taps (Allow or Not now per row) plus Continue.
- Findings:
  - Copy is quiet and honest: one line of why per permission, "You can
    change this later", Not now always available, no pressure framing.
    Browser contacts honestly degrade to "type a name" (no fake access).
  - FRICTION FLAG: Continue stays disabled until ALL THREE rows are
    decided, so the user must touch every row before any payoff. That
    front-loads three decisions ahead of value and sits against the
    founder's moment-of-need direction for permissions. NOT changed in
    this repair: this page is itself a founder-directed correction
    (permissions decided here, before Meet Opal), so re-gating it is a
    product decision. Recommendation (deferred, founder call): enable
    Continue from the start and treat undecided rows as Not now
    (decisions already persist per row), or move location to its first
    moment of need (plan coordination), keeping contacts + notifications
    here.
- Disposition: KEPT. One gating flag deferred to founder.

### Meet Opal - MeetOpalConversation
- Purpose: the payoff - your name (handle auto-derived), then your first
  person (type a name, pick from contacts, or Skip), then Continue to Home.
- Cost: ~15-25s typical; name turn ~1.85s of staged reveal before the form
  (typing dots 650ms + greeting slide + 800ms pause; reduced-motion users
  get it instantly).
- Findings:
  - Skips exist at every level (top Skip, friend Skip, sticky Continue
    gating is honest: it requires a committed name and a resolved handle,
    and a taken handle offers Accept / Try another instead of a dead end).
  - The Matilda voice opening speaks the greeting when a bearer exists.
    It is one short line, once. QUIET-law note: it is delightful-once
    behavior, not repeated noise; KEPT, flagged here so it is a known
    choice rather than an accident.
  - Contacts picks go through the real native bridge / Contact Picker;
    unavailable contacts degrade honestly to typing. No fake success:
    a friend without a phone gets an explicit phone gate or
    continue-without-inviting.
  - Duplication check: Meet Opal asks name + handle, and the off-path fr08
    also asks name + username. Because fr08 is unreachable on the current
    path (see above), users never see the double ask today. If fr08 is
    ever restored to the path, seed it from the Meet Opal profile (it
    already reads resumeSession) or drop its username field.
- Disposition: KEPT, unchanged. Duplication risk inventoried.

### fr08 Profile / fr09 Assist / fr10 Act-on-behalf - FirstRunExperience (off-path)
- Purpose (historical): name + optional username + photo; Assist opt-in;
  act-on-behalf consent toggles (default OFF, Skip present, honest copy).
- Findings if they ever return to the path:
  - fr08 photo picker is a fake-success risk: choosing a photo shows
    "Preview ready. Durable profile photo upload is not available in this
    build." The honesty copy is good; the asset still invites an action
    that cannot complete. Do not restore fr08 until photo persistence
    exists, or restore it without the photo affordance.
  - fr08 heading flow says profile, fr09 then says "Almost there" and
    fr10 is one more full screen after that - the "Almost there" copy
    would be wrong on a restored path.
  - fr09 Assist and fr10 act-on-behalf ask overlapping agency questions
    on consecutive screens; on a restored path they should be one ask.
- Disposition: DEFERRED (unreachable today; notes filed for any restore).

### Native fallback - ActivationScreen (mobile, only when no web URL)
- Purpose: phone + code + optional display name, same Twilio authority.
- Findings: FIXED (sms-otp autocomplete added). Copy is developer-toned
  ("Real verification through Opal. No founder seed. No synthetic shortcut
  on production SMS.") - acceptable for a fallback that production users
  never reach, but it should not be the copy if this surface is ever
  promoted. Deferred (surface is not on the founder's path).
- Disposition: FIXED (OTP attributes). Copy flag deferred.

### ActivationFlow.tsx (web, orphan - no importer in src)
- Disposition: FIXED for attribute parity (in case a harness routes it).
  Recommend the founder decide: route it or delete it. Not deleted here
  (additive-only).

## 3. 60-second law scorecard (production path, typical user)

Splash ~2s + Promise ~4s + Phone ~12s + Verify ~5s (AutoFill) +
Permissions ~8s + Meet Opal ~20s = roughly 51s, inside the 60-second law
with the OTP fix. Before the fix, manual OTP entry alone could break the
budget. Largest remaining costs are Meet Opal (has the payoff, earns it)
and the permission gate (flagged above).

## 4. Test results vs baseline

Baseline (025a0289, measured twice before changes): web suite 2,618 passed /
15 failed / 2,633 total, with failures spread across 10 files, including two
in onboarding (firstRun.test.ts em-dash scan over pre-existing comment
dashes; s1Adversarial.test.ts opposing-arcs mark). Both onboarding failures
reproduce identically on the stashed pristine tree, so they are baseline,
not regressions. Mobile baseline: 101 passed / 1 failed (pushTokenBridge
app.json expo-notifications plugin - pre-existing, unrelated).

After changes:
- Web onboarding directory: 136 passed / 2 failed - the same 2 baseline
  failures, zero new; includes the 8 new otpAutofill tests, all green.
- Targeted web files (activation/first-run neighbors): green except the
  baseline em-dash failure above.
- Mobile: new activationOtpAutofill tests green (3/3); r1bNativeHost green.
- Full web suite after changes: 2,626 passed / 15 failed / 2,641 total -
  failure count and the 10 failing files are identical to baseline; the
  delta is exactly the 8 new otpAutofill tests, all passing.
- Full mobile suite after changes: 104 passed / 1 failed / 105 total -
  the same single pre-existing pushTokenBridge failure as baseline; the
  delta is exactly the 3 new activationOtpAutofill tests, all passing.
- TypeScript: no errors in any file touched by this repair (pre-existing
  errors exist elsewhere in both apps and were left alone).
- Backend: untouched, not run (other workers' track).

## 5. Blocked / needs founder

- Phone-walk proof of the AutoFill suggestion (device-only; see section 1).
- Permission gate relaxation (founder product call, section 2).
- Skip-for-now gating to founder-seed builds (founder call).
- fr08/fr09/fr10: restore-or-remove decision (founder call).
- ActivationFlow.tsx: route-or-delete decision (founder call).
