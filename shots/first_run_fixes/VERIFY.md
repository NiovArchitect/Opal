# First-run fixes — Phase 1–3 (2026-10-08)

Tip: `d4fa37a3` on `muse/packet-b-batch-2`

## Phase 2 break (exact)

- **File:** `apps/opal_web/src/onboarding/OpalWorking.tsx`
- **Bug:** Connect calendar called `window.location.assign("/?opal_connect_calendar=1")`, navigating out of Meet Opal to the home feed and killing the planning thread.
- **Fix:** `resolveCalendarStayInThread(connected)` — stay in thread; acknowledge; show concrete day pills.

## Phase 1

- Native bridge: `opal_native_request_contacts` via expo-contacts (search + pick).
- UI: `ContactSuggestPicker` in Meet Opal + FindPeopleFlow.
- Storage: snapshot name/phone + `contact_id` (invite reliability + optional re-link).
- Permission copy updated in `app.json`.
- **Requires native rebuild** for expo-contacts bridge on device (WebView host).

## Phase 3

- Greeting: plain list of what Opal does + catch-up ask in one bubble.

## Tests

- vitest holyShitFirstRun + firstRun + s1Adversarial: 35/35
- mobile jest contacts: 5/5
- tsc: 0 errors
