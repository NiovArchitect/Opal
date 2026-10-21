# Repair #21 - Cluster L-LAWS - two founder laws verified, pinned, fixed where violated

Branch: muse/r21-laws, base 3d7cf86b (muse/repair-21 tip, W-6
connectors merge included). Gates unchanged: no merge,
muse/repair-17 untouched, FOUNDER_ACCEPTED = NO,
FOUNDER_PHONE_PASS = NOT_CLAIMED. Plain hyphens only in this
report; no em dashes in any user-facing copy touched (no
user-facing copy changed at all - the greeting words and formats
are byte-identical to before; only their hour and name sources
were corrected).

## Verdicts up front

- L-1 THE GREETING IS TRUE: VIOLATED in two of the three greeting
  composers, FIXED at the source, now pinned on all three.
  - Center (web): already true in substance, now pinned and given
    an explicit viewer-timezone seam (details below).
  - Flows (mobile): violated - the greeting hour was the UTC
    hour. Fixed.
  - Flows (server snapshot): violated - the greeting hour was
    the UTC hour, and a caller-supplied display name could
    override the viewer's own name. Both fixed.
- L-2 CONNECTORS ARE PER-ACCOUNT: ALREADY TRUE at every layer
  audited, now pinned with a two-account isolation proof at the
  payload boundary plus an HTTP leg. No product code changed for
  L-2. The rule is also stated in r21-connectors-report.md (new
  closing section, appended by this cluster).

## L-1 - The greeting is true

### What the code does today (file-level, after this cluster)

Three composers produce a "Good morning/afternoon/evening, Name."
greeting. (A fourth, greetingForHour in opalUi/c1/C1Surfaces.tsx,
is a pure hour-to-word helper whose only caller is the C1 review
fixture with a hardcoded hour - not a live surface, unchanged.)

1. Center (web) - apps/opal_web/src/c2/shell/shellData.ts
   openingFromPlans/3, rendered by C2CenterOpening.tsx as the
   deck's h1.
   - Name: C2Shell.tsx (line ~488) passes
     session?.display_name - the signed-in viewer's own session
     name. openingFromPlans takes the first word of exactly that
     string. No plan field, counterparty, or seed persona can
     reach it. Already true; now pinned (a plan titled "Dinner
     with Ethan Walker" in the viewer's deck does not move the
     greeting).
   - Hour: pre-L-1 it was `new Date().getHours()` - the
     browser-local hour, which IS the viewer's timezone at
     runtime, so the surface was true in substance but had no
     explicit timezone input and no way to pin it. Now:
     greetingWordForViewer(now, timeZone?) /
     hourInViewerTimeZone(now, timeZone?) resolve the hour
     through Intl.DateTimeFormat in the named viewer timezone,
     defaulting to the browser-local timezone; openingFromPlans
     accepts an optional {now, timeZone} pinned-clock seam.
     Production callers pass neither - behavior is the viewer's
     local time, exactly as before, now provable.
2. Flows (mobile) - apps/opal_mobile/src/shell/homeModel.ts
   buildHomeSnapshot, rendered by HomeScreen.tsx (the surface
   whose accessibilityLabel is "Flows").
   - Name: input.displayName, passed by HomeScreen from the
     signed-in session's props. Already true.
   - Hour: VIOLATED. The input field was named hourUTC and the
     default was `new Date().getUTCHours()` - at 19:00 in Los
     Angeles (02:00 UTC) a viewer was greeted "Good morning".
     Fixed: hourUTC is removed; the snapshot takes now /
     timeZone / viewerHour and resolves the viewer's hour with
     the same Intl rule as the web (device-local by default).
     Call sites updated: release/homeTorture.ts and
     __tests__/productShell.test.ts now pass viewerHour.
3. Flows (server) - apps/opal_core/lib/opal_core/social_flow/
   product_shell.ex home_snapshot/1, served by
   ConversationChannel "social_flow:home_snapshot" for the
   socket's signed-in user.
   - Hour: VIOLATED. greeting/1 read DateTime.utc_now().hour -
     a UTC greeting for every viewer. Fixed: greeting/3 shifts
     the instant into the viewer's timezone before picking the
     word. Timezone precedence: an explicit viewer timezone in
     the call (the channel now forwards the device timezone the
     viewer sends with the home_snapshot request), then the
     viewer's stored effective timezone (TravelMode.effective_tz:
     travel-local when travelling, else home), then UTC.
     Clock: attrs :now is the pinned-clock override (the backend
     convention - Connections.build's :now opt, FollowThrough's
     attrs :now); nil means the real clock.
   - Name: VIOLATED in construction. home_snapshot accepted
     attrs :display_name and it overrode the viewer's record, so
     any caller passing a payload field naming another person
     would have that person greeted. (The production channel
     passed no display_name, so the live path greeted correctly -
     but the law is about the source, and the source allowed the
     leak.) Fixed: the override is gone; the name is always
     display_name(user_id) from the viewer's own user record.
     Existing callers that passed a matching name (the journey
     tests) are unaffected; greeting_context now also carries
     the viewer's timezone.
   - Tzdata note, stated plainly: this backend has no Tzdata
     package, so DateTime.shift_zone cannot resolve IANA names.
     The fix follows the house convention already used by
     AttentionBudget.local_clock and
     TemporalFollowThrough.local_date_hour: shift_zone first,
     then a fixed-offset fallback table (the AttentionBudget
     table, plus Pacific/Auckland in the same rough-DST style
     as its Sydney row). Timezone validation is the house
     IANA-shape convention (AvailabilityWindow's standing note).

### Pins (test names)

Web - apps/opal_web/src/c2/shell/r21Laws.test.tsx (vitest, jsdom),
6 tests, all passing:
- "the same instant renders evening / morning / afternoon under
  three viewer timezones" (pinned instant 2026-10-20T02:00:00Z:
  America/Los_Angeles evening, Asia/Tokyo morning,
  Pacific/Auckland afternoon - Center).
- "the viewer hour is read in the named timezone, not UTC".
- "with no explicit timezone, the hour falls back to the
  browser-local hour".
- "two distinct viewers are each greeted by their own name, at
  the same instant and timezone" (Sadeil Reyes / Ethan Walker).
- "a plan naming a counterparty never leaks that name into the
  viewer's greeting".
- "the rendered Center surface shows exactly the viewer's
  greeting" (C2CenterOpening h1).

Mobile - apps/opal_mobile/src/__tests__/r21Laws.test.ts (jest),
4 tests, all passing (see Tests for the runner note):
- "the same instant renders evening in Los Angeles and morning
  in Tokyo" (Flows buildHomeSnapshot).
- "the viewer hour is not the UTC hour".
- "the viewerHour pinned-clock override still names the
  viewer's hour".
- "two distinct viewers are each greeted by their own name".

Backend - apps/opal_core/test/opal_core/social_flow/
r21_greeting_law_test.exs, 4 tests, all passing:
- "L-1: the same instant renders evening / morning / afternoon
  under three viewer timezones".
- "L-1: two distinct viewers are each greeted by their own name
  at the same instant" (fixture users Alex / Jordan).
- "L-1: a caller-supplied display_name naming another person is
  never greeted" (passes display_name "Jordan" for Alex's
  snapshot; the greeting and greeting_context name Alex).
- "L-1: an invalid viewer timezone falls back, never to a seed
  or server name".

## L-2 - Connectors are per-account

### What the code does today (file-level)

Already correctly scoped at every layer audited; no leak found,
no product code changed:

- Payload builder: apps/opal_core/lib/opal_core/settings/
  connections.ex build(user_id) - the only per-user state any
  row carries comes from google_row, which reads
  ProviderConnections.public_status(ctx.user_id,
  "google_calendar") with the builder's own user id. Every other
  row keys off server configuration (Opal's own providers) -
  that is catalog/server truth, identical for every account,
  not a person's connection state. No unscoped query, no cache
  (the builder constructs the payload per call; there is no
  shared cache anywhere on this path, keyed or otherwise).
- Store: apps/opal_core/lib/opal_core/social_flow/real_world/
  provider_connections.ex - get/2 is Repo.get_by(user_id +
  provider); list_for_user/1 filters where user_id; revoke and
  mark_error go through get/2; public_status/2 returns no token
  material (access_token / refresh_token fields are literally
  nil) over TokenVault ciphertext at rest
  (provider_connection.ex + token_vault).
- Custom connectors (Saved logins): apps/opal_core/lib/
  opal_core/settings/saved_logins.ex - list_for_user filters by
  user_id, remove is get_by(id + user_id), use_for_host is
  get_by(user_id + host), and the schema carries a
  [user_id, host] unique constraint; the outward contract
  (saved_login.ex to_contract) is id + host + saved_at only.
- HTTP boundary: ConnectorController.settings_connections and
  SettingsAccountController.saved_logins_* take the account
  from conn.assigns.current_user_id (the signed-in session) -
  never from a request parameter. ConnectorController.index's
  step_audits are static comparison rows with no user state.
- Web room: shellData.ts "connections" case renders the
  payload for the viewer's own bearer verbatim and filters it
  through the closed allowlist; the "saved-logins" case renders
  getSavedLogins for the same bearer. No client-side state is
  shared between accounts.

### Proof pinned

Backend - apps/opal_core/test/opal_core_web/
r21_connector_isolation_test.exs, 3 tests, all passing (the
W-GAP-32 two-account species, at the payload boundary plus one
HTTP leg):

- "L-2: A's live connection and saved login never appear in B's
  connector payload or lists" - A holds a live Google grant
  (calendar + gmail scopes) and a saved login for
  bank.example.com; B holds none. B's Connections.build payload
  shows both Google rows not_connected/gated with no disconnect
  action; the catalog id set is identical for A and B (catalog
  universal, state personal); neither payload's JSON contains
  A's token strings or saved secret; B's public_status is
  connected false / token_present false; list_for_user(B) is
  empty; B's saved-login list is empty; B cannot use or remove
  A's saved login ({:error, :not_found} both ways).
- "L-2: symmetric - B's own state is B's, and revoking B leaves
  A connected" - both accounts connected with distinct tokens
  and distinct saved-login hosts; cross-refs absent from both
  payloads and lists; each account's use_for_host returns only
  its own secret; revoking B flips only B's rows.
- "L-2 HTTP: two sessions each read only their own connections
  and saved logins" - two real activation sessions; GET
  /settings/connections and GET /settings/saved-logins under
  each bearer return only that account's truth.

The rule statement required by the brief is appended to
coordination/repair19/r21-connectors-report.md as the section
"L-2 - Connectors are per-account (founder law, 2026-10-20
13:23 PDT; R21 Cluster L-LAWS)": catalog universal / state
personal, state scoped to the person's wallet, shared across
that person's domain apps per the federation note, never across
people, plus the one-line proof summary. The federation gap
recorded in that report (state is app-local in
provider_connections today; the wallet-scoped registry is not
built) is unchanged by this cluster and is not disguised here.

## What was fixed (complete list)

- apps/opal_mobile/src/shell/homeModel.ts - UTC greeting
  removed (hourUTC / getUTCHours gone); viewer-timezone hour
  via Intl with device-local default; now / timeZone /
  viewerHour seams. Call sites: src/release/homeTorture.ts,
  src/__tests__/productShell.test.ts (hourUTC -> viewerHour).
- apps/opal_core/lib/opal_core/social_flow/product_shell.ex -
  greeting/3 (viewer timezone, :now clock override, fixed-offset
  fallback per house convention); display_name override
  removed (name always from the viewer's record);
  greeting_context gains the viewer timezone.
- apps/opal_core/lib/opal_core_web/channels/
  conversation_channel.ex - the home_snapshot handler forwards
  the viewer-sent device timezone (payload "timezone"); identity
  still comes only from the socket's signed-in user.
- apps/opal_web/src/c2/shell/shellData.ts - no behavior change
  in production (the hour was already browser-local): the
  resolution is now explicit (Intl, named viewer timezone) and
  openingFromPlans gained the optional {now, timeZone}
  pinned-clock seam the pins drive.

## Tests

Backend (PATH=~/workspace/elixir/bin:...,
MIX_DEPS_PATH=/tmp/opal_deps, MIX_TEST_PARTITION=r21laws,
PGHOST=127.0.0.1 PGPORT=5433):
- New pins + the existing suites they touch, one run:
  r21_greeting_law_test.exs + r21_connector_isolation_test.exs
  + product_shell_test.exs + settings_connections_test.exs:
  30 tests, 0 failures.
- Other home_snapshot consumers: repair15_proactivity_test.exs
  + repair16_proactivity_test.exs +
  repair16_chat_lock_drive_test.exs: 39 tests, 0 failures.

Web (apps/opal_web, vitest):
- New: src/c2/shell/r21Laws.test.tsx: 6/6 PASS.
- Existing suites in the touched neighbourhood, same worktree:
  r20Connect.test.tsx + polishVault.test.tsx +
  r20Graphs.test.tsx + c2ShellSurfaces.test.tsx: 44/44 PASS.
- Typecheck: tsc -p tsconfig.json reports pre-existing errors
  in untouched files only (OpalApp.tsx, api/productClient.ts,
  YouSettingsDestination.tsx); no error names a file this
  cluster touched.

Mobile (apps/opal_mobile):
- New r21Laws.test.ts (4 tests) + existing productShell.test.ts
  (5 tests): 9/9 PASS. Runner note, stated honestly: this
  worktree has no mobile node_modules and the mobile jest stack
  is not installed, so the two jest files were executed against
  the real, unmodified sources bundled with esbuild under a
  minimal jest-globals shim in /tmp; the files themselves are
  standard jest (matching jest.config.cjs) and will run under
  the project's own `npm test` wherever that stack is installed.
  The touched mobile sources also typecheck clean under tsc
  (strict, skipLibCheck).

Environment note: the VM restarted mid-run, wiping /tmp (deps)
and stopping Postgres; Postgres was restarted from the
persistent polish-scratch pgdata and deps re-fetched into
/tmp/opal_deps before the green runs above. All green results
quoted are from runs after that recovery, in this worktree.

## Declarations

- No merge performed; muse/repair-17 untouched; commits are on
  muse/r21-laws only.
- No screenshot or walk claim: the greeting surfaces' rendered
  proof in this cluster is the C2CenterOpening render pin plus
  the payload-level proofs; a phone walk remains the founder's.
  FOUNDER_ACCEPTED = NO, FOUNDER_PHONE_PASS = NOT_CLAIMED.
