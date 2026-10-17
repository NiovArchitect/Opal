# Repair #16-W2 - Onboarding decisions (worker W2)

Base: 0abf24a4. Branch: muse/repair-16-w2. All decisions made under the
founder order "fix everything you can except video" and existing product law
(every-asset law, 60-second law, progressive disclosure, no fake success).

## D1. fr06 "Skip for now" - gated to founder-seed builds; no deferred path exists
Investigated the session model (productClient + OpalApp): a ProductSession is
created ONLY by verifyChallenge (phone OTP), or restored from a previously
verified session (fetchSession / loadProfile of a saved verified session).
There is no guest, anonymous, or deferred-verification session constructor
anywhere in the client. founderSkipForNow on seed builds already runs a real
fixture startChallenge + verifyChallenge, i.e. it is a real verification,
not a skip of verification.
Decision: render "Skip for now" ONLY when isFounderSeedEnabled() (where it
performs that real verification); delete the non-seed branch that merely
displayed "Phone verification is required to continue." A control that
cannot perform its advertised operation must not be presented (every-asset
law), and inventing an unverified session would be fake auth. The handler
keeps a defensive seed guard. fr06 now states plainly, in a non-pressure
line, that the phone number is the account key and is verified before
continuing, and that there is no guest sign-in.

## D2. fr08 / fr09 / fr10 - REMOVED (coordinator decision, verified in code)
Live-path trace of every setStep into the removed steps:
- L493 founderSkipForNow setStep("fr08"): LIVE on seed builds (the handler
  does not consult onAfterPhoneVerify). REROUTED to the standard post-verify
  handoff: onAfterPhoneVerify(session) if the parent handles it, else
  finishToHome(session).
- L618 verify() setStep("fr08"): fallback only. OpalApp's
  handleAfterPhoneVerify always returns true in production, so this line
  was unreachable in production; as a fallback it now calls
  finishToHome(session) (the verified session IS the completion).
- L652 saveProfileAndContinue setStep("fr09"): reachable only from the
  fr08 render block. Function deleted with fr08; the real profile save is
  owned by MeetOpalConversation (updateProfile, handle_taken handling),
  which is where users actually land.
- L1585/1601/1618 fr09-internal setStep("fr10") calls: inside the removed
  fr09 block only. Deleted with it.
- OpalApp resume plumbing: frResumeStep state existed only to resume at
  fr08; its setter setFrResumeStep is NEVER called anywhere. Removed the
  state and the prop pass. FirstRunExperience keeps an optional resumeStep
  prop and now sanitizes it: lawfulResumeStep() drops removed/unknown
  values, so any persisted state pointing at fr08/fr09/fr10 lands on the
  lawful first step (fr06 in sign_in mode), never a blank screen.
Removed: fr08/fr09/fr10 render blocks, FIRST_RUN_ROUTE_ORDER entries,
FirstRunStepId union members, AUTH_STEPS entries, saveProfileAndContinue,
fr08-only state (photo preview/persistence-gap, photo input ref,
initialsFromName, assistChoice), and ActOnBehalfOptInStep.tsx - its only
importer was the fr10 block (Settings has its own independent
ACT_ON_BEHALF_CAPABILITIES implementation in YouSettingsDestination, which
is untouched; the moment-of-need settings gates from Repair #13 stand).
Rationale: fr08 duplicates Meet Opal's name/handle ask and its photo
affordance promised a durable upload that does not exist (fake-success
risk); fr09 (Assist) and fr10 (act-on-behalf) duplicate each other and the
Settings gates; restoring them would add ~3 screens and break the
60-second law. CSS rules for the removed screens were left in styles.css
(unused selectors are inert; touching the shared stylesheet is higher
risk than leaving them, and several fr-* classes are shared).

## D3. Legacy fr01-fr05 demo blocks - LEFT in place, noted
fr01 is provably dead ({false && ...}); fr02-fr05 render only if the step
state is set to them, which no production path does (route order no longer
contains them; advanceFrom cannot reach them; lawfulResumeStep still
permits them as explicit resume values for historical tests). They carry
a large block of source-assertion tests (figmaAlignment, firstRun,
preMemberShell, s1Adversarial WHO) and the founder's demo copy. Removal is
safe-looking but not zero-risk, and the task allows leave + note: LEFT.

## D4. ActivationFlow.tsx (web orphan) - DELETED
Verified zero importers in src (only tests referenced it: activation.test
em-dash file list and otpAutofill parity cases; both updated). The native
fallback is mobile's ActivationScreen, a different file, untouched in
behavior. otpAutofill.test.ts keeps all fr07 contract cases green; its
fr07 block extraction was re-anchored from the removed fr08 marker to the
end-of-render marker.

## D5. PermissionBootstrapPage - Continue enabled from the start
Progressive law: the gate (disabled until all three rows decided)
front-loaded three decisions before any payoff. Now Continue is always
enabled; handleContinue persists undecided rows as "skipped" (Not now)
via the same saveMeetOpalPermissions snapshot, keeps decided rows at
their real per-row-persisted choice, and only then calls onContinue.
Nothing undecided or denied can persist as "allowed": allowed is only
ever written by markPerm after a real grant result. No copy pressure was
added; the page and its founder-directed placement are unchanged.

## D6. Native ActivationScreen - plain user copy only
"Real verification through Opal. No founder seed. No synthetic shortcut
on production SMS." -> "We will text you a code to verify that this number
is yours." "Phone (E.164)" -> "Phone number". "Development code
available." -> "Your code is filled in for you." Fallback errors ->
"We could not send a code. Try again." / "That code did not work. Try
again." The raw provider diagnostic line ("Provider: {provider}") now
renders the plain line "Your code was sent securely." when a provider is
present. No behavior, attribute, or flow change (OTP contract tests
unchanged and green).

## D7. Test updates vs deletions
Deleted with the removed screens: ActOnBehalfOptInStep.test.tsx (covered
only the removed fr10 component). Updated (same test names, new lawful
assertions): activation.test.ts, firstRun.test.ts, preMemberShell.test.ts,
founderAuthRestore.test.ts, founderSplashVisibility.test.ts (one case for
the deleted component removed), s1Adversarial.test.ts (four cases that
asserted removed-screen seams now assert the Meet Opal seams / the
removal), authErrorArbitration.test.ts (its skip case asserted the
removed dead branch; now asserts the seed gate + error-before-status
arbitration on the real path), otpAutofill.test.ts, otpVerifyLayout.test.ts.
New: repair16W2.test.tsx, 19 tests (multi-way + adversarial, see report).
No baseline failure was fixed or altered: the two onboarding baseline
failures (firstRun em-dash scan, s1Adversarial opposing-arcs) still fail
identically.
