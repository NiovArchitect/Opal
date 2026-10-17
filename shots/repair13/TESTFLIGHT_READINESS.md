# TESTFLIGHT READINESS — Repair #13

**Date:** 2026-10-17 · **Branch:** `muse/repair-13` (from R12 tip `5f170ead`)
**Scope note:** the EAS build + upload + install stays the founder's (Expo account, credentials, App Store Connect). This checklist is everything he needs to do it right the first time.

## 1. Build from the right branch
- Build from **`muse/repair-13`** tip (final SHA in `VERIFY.json`). NOT `main`, NOT `muse/repair-11`, NOT any `muse/repair-12-*` track branch.
- Before building: `git fetch origin && git checkout muse/repair-13` and confirm `git rev-parse HEAD` matches the `VERIFY.json` tip. (The R11 walk failed this exact check — the phone served a build 188 commits behind. Never skip the badge check.)
- Build profiles available in `apps/opal_mobile/eas.json`: `development`, `development_simulator`, `internal_rc`, `production`. For the TestFlight walk: `internal_rc` or `production` (decide per his release process — no merge has happened; the frozen build is still `b261237`).

## 2. Environment keys the build/backend needs
The backend reads these at runtime (never committed to the repo — `.env.example` lists names only; real values live in `~/.opal/r1a1.env` on the founder's Mac):
- **Required for the walk's headline flows:** `DEEPSEEK_API_KEY` (chat/NL), `GEOAPIFY_API_KEY` (venue search + near-me; live provider results were NEVER tested in the VM — first live run happens on his walk), `DATABASE_URL`, `SECRET_KEY_BASE`.
- **Required for calls/push:** `DEEPGRAM_API_KEY`, `ELEVENLABS_API_KEY`, `TWILIO_*` (SMS invites note honestly when unconfigured), APNS/FCM credentials.
- **Still blocked (founder-only):** production API restore (`api.opal.niovlabs.com` 503), web host re-deploy + DNS, Google OAuth consent tap, Google Places enablement + billing, `OPAL_INTELLIGENCE_SENDER_USER_ID` prod value.

## 3. Known gaps that remain (do not expect these on the walk)
- Live Geoapify results untested — venue search/near-me correctness against the real provider is proven only with recorded fixtures here.
- `classify("Any upcoming plans?")` → `:plan_create` (pre-existing, flagged for a future classifier pass).
- Withdrawn participants still block proposal consensus (product decision pending; behaves honestly — revision stays `"proposed"`).
- Reminders: honest "I can't set reminders yet" (no fake success).
- Settings marked HIDDEN in `SETTINGS_AUDIT.md` (backing APIs not shipped) are intentionally not painted — not bugs.

## 4. Device smoke test (30 minutes, on the TestFlight build)
1. Badge/seed check: confirm served tip = `muse/repair-13` tip.
2. Onboarding → Center: "Find Nighthawk in Coronado" → address shown and attached.
3. Create plan with a real contact → confirm two ways (button + "I confirm") → change time ("make it 8 PM") → verify the plan row, the Graphs card, Timeline, and the peer thread all show the same day + time with AM/PM.
4. Cancel a plan → the other side gets the right notification; re-confirm is refused.
5. "Saturday after 10" (no AM/PM) → honest refusal, never an invented half-day.
6. "Who's coming?" / "Where is it?" → answers from the real plan, never "tell me more".
7. YOU screen: flip read-receipts and a notification toggle → behavior actually changes; no dead screens; no fabricated counts.
8. Keyboard open in chat → composer rides above it; NEXT TOGETHER card shows the current time, no overlap.
9. Near-me with location permission → real distances, device origin labeled; denied → honest gate.

## 5. What "done" looks like
Every screen benefits the user (every-asset law); every tappable performs; no fake successes; plan lifecycle coherent across Center/Graphs/Timeline/chat; the gyroscope gate makes illegal transitions unrepresentable. Machine-proven in `VERIFY.json`; the founder's walk is the acceptance authority.
