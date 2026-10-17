# SETTINGS_MAP - Repair #15 (Worker DF, Track D)

**Branch:** `muse/repair-15-df` - **Base:** Repair #14 tip `025a0289`
**Date:** 2026-10-16
**Anchor surfaces audited:** `apps/opal_web/src/opalUi/YouSettingsDestination.tsx`,
the YOU hub in `apps/opal_web/src/OpalApp.tsx` (`YOU_HUB_SECTIONS`, `YouPane`),
`apps/opal_mobile/src/screens/YouScreen.tsx`, and the Repair #13 audit at
`shots/repair13/SETTINGS_AUDIT.md` (re-verified against current code, not
taken on trust).
**Law applied:** the R13 standard - every settings control is REAL (wired to
a working backend behavior) or HIDDEN; never painted-but-dead. Quiet law:
no noise, no pressure. Least friction. No fake successes.

**Baselines (measured this pass, before changes):**

- Backend: 2,655 tests / 0 failures at the base tip
  (`shots/repair14/VERIFY.json`, integrated Repair #14 result). This track
  changed no backend code, so the backend baseline stands untouched.
- Web (vitest, full suite): **25 failing tests, invariant across four
  full runs (two at base, two after this track), with the failing test
  names identical in every run** - the same 25 pre-existing failures
  documented in Repair #13, spread over 18 files (activation,
  availability, designTokens, firstRun,
  s1Adversarial, authorityRejectedStates, grammar, graphCalendaring x2,
  graphDetail, graphScroll x2, graphSpine, liveJourneyProof,
  pasteW4DeviceFixes x2, technicolor, waveBChats x3, waveBGraphs,
  waveBHome, OpalCenterChat send-error, CSP/design-token family).
  Collected-test totals wobble between runs (1,069-1,119 observed)
  because two unrelated suites (`onboarding/phoneAutofillDisplay`,
  `opalUi/callSubstrate`) intermittently fail to collect in this VM's
  jsdom environment; they hold no failing tests in any run, are
  untouched by this track, and account for the failed-file count
  varying (18-20). The 25-failure test set never varied.
- TypeScript (`tsc --noEmit`): 7 errors, all pre-existing - 6 in
  `OpalApp.tsx` (ChatPreview planProjection, `setTab("opal")` x3) plus
  the known `RelationshipContact.handle` error in
  `YouSettingsDestination.tsx` (all verified present in HEAD code at
  identical locations). After this track: still 7, identical set.
  Zero new type errors; none of the 7 sits in a file this track changed.

---

## 1. The two references, and what Opal does with each pattern

The founder supplied two reference patterns:

1. A reference app's **settings**: a connectors hub (categorized
   Social / Health / Business / Device, each source connected or one tap
   away), plain-language permissions with stated defaults, honest data
   controls (import / export / delete), notifications, appearance.
2. The same app's **tab architecture**: Main chat / Feed / Ideas / Goals /
   Library as first-class tabs, where proactivity is structural - the
   system publishes for the user (Feed), opportunities are prepared and
   waiting (Ideas), tracked outcomes live with plain-language status
   (Goals), and everything produced is kept (Library).

Section 2 maps reference pattern 1 row by row. Section 5 maps reference
pattern 2 (the tab architecture) onto Opal's surfaces.

---

## 2. Reference pattern 1 - settings, row by row

### 2.1 Connectors hub (categorized, connected or one tap)

| Reference pattern | Opal current state (code evidence) | Action taken |
|---|---|---|
| A hub listing sources by category, each showing connected state, connect in one tap | **No connectors surface existed in YOU/settings at all.** Exactly one real connector exists in the backend: Google, via `ConnectorController` (`apps/opal_core/lib/opal_core_web/controllers/connector_controller.ex`) and `ProviderConnections` - status (`GET /connectors/google_calendar` -> `public_status`: connected / status / scopes / token_present, tokens never returned), connect (`POST .../start`, real OAuth: signed single-use state, PKCE S256), disconnect (`POST .../revoke`). `Calendar.connected?/1` genuinely gates free/busy checks in planning. The web client had **no functions** for any of these routes (`grep` of `apps/opal_web/src/api/productClient.ts` at base: zero connector calls), so the one real connection Opal has was invisible and unmanageable from settings. | **WIRED (this pass).** Added client functions `getGoogleCalendarStatus`, `startGoogleCalendarConnect`, `revokeGoogleCalendarConnection` to `productClient.ts`, and a `ConnectedSourcesSection` filed into You -> Privacy (the "what Opal may access" home), showing the live backend status, a Connect button that leaves for Google's own consent screen, and a Disconnect button that revokes server-side. Status is a pure projection (`projectGoogleConnection`) of the real payload; a failed read renders "Could not check" with retry - never a guessed state. Registered GREEN in `settingsWireClass.ts`. Proven by `connectedSources.test.tsx` (13 tests: projection units, wire guards, render against the mocked status boundary for connected / not-connected / failed states, and Privacy-destination mount). |
| Category: Social (message / social accounts) | No social-account connector exists in the backend. The one candidate, `messaging_business` act-on-behalf, is already hidden in `YouSettingsDestination.tsx` with the comment "hidden from consumer until channel connector ships (Pass B)". | No paint. Proposal P-2 in section 4. |
| Category: Health | No health connector, no health data store, no status API anywhere in `apps/opal_core`. (Fit preferences are local picks, not a health connection - see 2.5.) | No paint. Proposal P-3 in section 4. Painting a Health row today would be fabricated. |
| Category: Business (work accounts, tools) | No business connector exists. Stripe exists in the product as a gated payment path (wallet loads disabled), not as a user-connectable source with a status endpoint. | No paint. Proposal P-3 in section 4. |
| Category: Device | Real but thin: the current session is real (Linked devices -> "This phone / Active", a local session projection, R13 verdict INFO/GREEN). There is no device roster, no session list, no revoke API. Mobile YouScreen shows the same honest projection ("This phone / Active session", fabricated counts removed in R13). | Kept as-is (already honest). Roster/revoke stays a documented gap (Proposal P-4); the blocked inventory rows remain unpainted. |
| Contacts as a source | No persistent contacts connection and no status endpoint. Contacts exist only as per-action paths: `POST /contacts/resolve` (phone resolution for a person you pick) and `POST /contacts/celebration-sync` (birthday/anniversary sync for selected contacts only, already wired into onboarding/celebrations). | **Not painted as a connector** - a "Contacts: Connected" row would claim a standing connection that does not exist. Documented as Proposal P-2. The per-action paths stay where they already live. |
| Location as a source | No standing location connection. Location is per-plan and explicit: device origin flows through `OpalCore.Center.DeviceLocation` (`origin_source` in device / manual / named_destination) when a plan needs it, and timezone-only travel ingest (`ingestTravelTimezone`) explicitly never sends GPS - the server rejects GPS payloads. Home timezone is a real, editable setting (Location & travel, R13 GREEN). | Kept as-is. A "Location: Connected" row would misstate the product's own privacy law ("Opal knows your timezone, never your precise location"). No action; reasoning recorded here so a future pass does not "fix" this into a fabrication. |

### 2.2 Plain-language permissions with defaults

| Reference pattern | Opal current state | Action taken |
|---|---|---|
| Permissions written in plain language, each with a stated default | Already the house standard after R13, re-verified this pass: Assist toggle ("Allow Assist on future calls. You can still pause it on any private call.", default off, GREEN); Graphing modes in plain words with hints (Never / Ask each time / Automatically Graph allowed calls / Only selected people) plus Pause Graphing ("Overrides every relationship grant until you resume.", GREEN); act-on-behalf grants ("Place calls for you" / "Make reservations for you", each "only with your OK. Revoke anytime.", 365-day expiry shown on the row when granted, GREEN); Notifications rows ("Direct contact that needs a reply.", GREEN x2); access rows in Privacy state what each thing is and that it can be revoked ("Facts Opal holds. Forget anytime."). Defaults are visible in the control state itself. | One label **fixed for honesty** in the new Connected sources row: the Google consent is a single sign-in granting **two** read-only scopes (`calendar.readonly` + `gmail.readonly`, `GoogleAdapter.oauth_scopes/0`, Paste G), so the row is titled "Google Calendar and email" and says in plain language: "One Google sign-in, read-only. Opal checks busy times for planning and can read email with the same sign-in. It cannot send, change, or delete anything." Naming only "Calendar" would have understated the consent. No other copy changes - the rest already meets the standard, and churn without a defect would violate least-friction. |
| Permissions grouped by what they allow, not by subsystem | Privacy holds access + memory + celebrations; Calls & Opal Assist holds Assist + Graphing + act-on-behalf (the action grants are deliberately separated from access, with the law line "What Opal may notice. Acting for you is under Calls & Opal Assist."). | Kept. Connected sources was filed into Privacy for the same reason: it is an access grant, not an action grant. |

### 2.3 Honest data controls (import / export / delete)

| Control | Opal current state | Action taken |
|---|---|---|
| Delete data you gave Opal | **Real, per-kind:** Forget a memory fact (`forgetMemoryFact`, GREEN, R13-proven); delete a celebration (GREEN); remove spending data (`deleteFinancialProfile`, GREEN); revoke a consent grant (GREEN); disconnect Google (revokes the provider connection server-side, **wired this pass**); revoke per-person Graphing grants (GREEN). | Disconnect added (above). The rest already wired; re-verified in code this pass. |
| Delete account | **Honest gate, correctly not fake:** Delete account screen states self-serve delete is not available and to contact support. There is no self-serve delete endpoint in the router. A painted "Delete my account" button that calls nothing would be the worst R13 violation; the current screen is the lawful state. | No change. Proposal P-5 (build the endpoint, then wire the button) - a backend feature, out of this track's scope. |
| Export your data | **Does not exist.** No export endpoint in `apps/opal_core/lib/opal_core_web/router.ex`, no client function, no settings row. | **Not painted.** Proposal P-5. Painting an Export button with no backend is exactly the dead-control pattern R13 removed. |
| Import your data | **Does not exist as a user control.** The only import-shaped path is the selected-contacts celebration sync (2.1), which is a per-action sync, not a data import. | **Not painted.** Proposal P-5. |

### 2.4 Notifications

| Reference pattern | Opal current state | Action taken |
|---|---|---|
| Notification choices in plain language | Two real controls, both GREEN and R13-proven end-to-end: Messages & calls (`message_notifications_enabled` gates the in-app notice and badge) and Read receipts (`read_receipts_enabled` suppresses the peer-visible read broadcast). Four further categories (Graph changes, Live movement, Social activity, Critical timing) sit in blocked inventory with real reasons (push categories need an Expo rebuild and APNs credentials) and are **not painted**. Per-conversation mute also exists where it belongs - in the conversation, not settings. | No change. The categories become paintable only when the push path ships (Proposal P-6). Note the quiet-law alignment: the blocked Social activity row's own inventory copy says "quieter by default" - when it ships, its default should stay off. See SOCIAL_DIRECTION.md. |

### 2.5 Appearance and the remaining screens

| Screen | State (R13 verdict, re-verified) | Action |
|---|---|---|
| Appearance | GREEN, local-only and honest about it: System / Dark / Light picker applies immediately via `localStorage` + `data-theme`. | None needed. It is the one reference-pattern screen Opal already matches fully. |
| Edit profile | Name + username GREEN (real profile API). Bio stays hidden - it is not on the profile API. | None. |
| Location & travel | Home timezone GREEN; Travel mode is a read projection (On / Adapting / Off), not a fake toggle. Device-permission and live-share rows hidden. | None. |
| Spending | Comfort level + dining range GREEN (trust-gated, consumed by curation); Remove spending data GREEN. Learning/budget-private/trip-goal rows hidden. | None. |
| Fit | GREEN, honestly local: activity picks + wellness goal + share toggle in per-user localStorage; the share gate genuinely controls whether Center sees the slice (`readFitSliceForOpal` returns null when off). It is **not** a health connector and is never described as one. | None. |
| Linked devices / Account & security | Honest projections and navigation; phone change, two-step UI, session alerts hidden for stated reasons (no backing APIs). | None. |
| Mobile YouScreen | Post-R13: no fabricated counts; cards are INFO projections or wired actions only. It has no settings destinations at all - it is a summary surface, and everything it claims is true of the current session. | None. Parity gap (mobile cannot reach the web settings destinations, including the new Connected sources) recorded as Proposal P-7. |

### 2.6 Misleading copy found and fixed this pass

- **"Feed & discovery" screen title vs. contents:** after R13 hiding, the
  screen's only live content is Invite friends (GREEN) plus the note
  "Exact location is never shared from here." The title is the hub's name
  for the destination and is asserted by tests
  (`youSettingsComingSoon.guard.test.ts` expects the "Feed & discovery"
  inventory title); renaming is a founder design decision, not a repair.
  Recorded here as a known tension, not silently changed.
- **Google consent scope understatement** - would have been introduced by
  a naive "Connect Google Calendar" label; avoided by the "Google
  Calendar and email" title and read-only scope copy above.
- No other misleading consumer copy found in the settings surfaces this
  pass. In particular, no painted control lacks a backing behavior: the
  render gate (`blockedReason` rows return null) is intact and guarded by
  `youSettingsComingSoon.guard.test.ts` and `settingsWireClass.test.ts`,
  both green after this pass.

---

## 3. Actions taken (code, this track)

1. `apps/opal_web/src/api/productClient.ts` - added
   `GoogleCalendarConnectionStatus` type and `getGoogleCalendarStatus`,
   `startGoogleCalendarConnect`, `revokeGoogleCalendarConnection`
   against the existing ConnectorController routes. No backend change.
2. `apps/opal_web/src/opalUi/YouSettingsDestination.tsx` - added
   `projectGoogleConnection` (pure projection; unknown and failed states
   never guess) and `ConnectedSourcesSection`, filed into the Privacy
   destination under "What Opal may access". Connect leaves for Google's
   real consent screen via the returned `authorize_url`; when the server
   has no Google OAuth configured, the start endpoint's 503 is translated
   to plain language ("Google connect is not set up on this server yet.
   You can still share your availability by hand.") - the raw server
   message, which names server environment variables, is never painted.
   Disconnect revokes and re-reads status.
3. `apps/opal_web/src/opalUi/settingsWireClass.ts` - registered the new
   row GREEN with its full wire path.
4. `apps/opal_web/src/opalUi/connectedSources.test.tsx` - new, 13 tests,
   all green (see section 6).

No control was hidden this pass (none needed hiding - R13 had already
cleared the painted-but-dead inventory, and this pass re-verified that).
No new backend feature was built; every gap below is a proposal.

---

## 4. Proposals (documented, NOT built - backend features are out of scope for this track)

- **P-1: A first-class Connected sources destination.** When a second
  real connector ships, promote Connected sources from a Privacy section
  to its own hub row under "Your Account" (or "How Opal Helps"), grouped
  by plain categories (Calendar and email; Messages; Health; Work) with
  the reference pattern's rule: a category is painted only when at least
  one source in it has a real status endpoint. Until then, one row does
  not justify a destination, and empty categories would be noise.
- **P-2: Contacts and social-message sources.** Define what "connected"
  would mean before painting anything: a standing, revocable grant with
  a status endpoint (e.g. address-book access on device, or a messaging
  channel connector for the already-hidden `messaging_business`
  capability). The existing per-action contact paths (resolve,
  celebration sync for selected contacts) are the honest stopgap and
  should stay per-action until a standing grant exists.
- **P-3: Health and Business categories.** No substrate exists at all
  (no store, no status API). First step is a backend provider-connection
  record reusing the `ProviderConnections` pattern that Google already
  proves, per category, with read-only scopes and plain-language consent
  copy reviewed before any UI.
- **P-4: Device roster and revoke.** Needs a session roster API (list
  sessions, revoke by id). The Linked devices screen's blocked inventory
  already names this exactly; un-hide the rows when the API ships.
- **P-5: Data export and self-serve account deletion.** Export: a
  server endpoint that assembles the user's own profile, memory facts,
  celebrations, consents, and financial profile (all of which already
  have per-kind read/delete paths) into one downloadable file, with the
  honest note that provider obligations resolve first (the delete screen
  already says this). Deletion: a confirmed, nested self-serve flow
  behind the existing Delete account destination; until the endpoint
  exists, the contact-support copy stays.
- **P-6: Push notification categories.** Blocked on the Expo rebuild and
  APNs credentials the inventory already names. When they ship, un-hide
  Graph changes and Critical timing first (plan-anchored, quiet-law
  compatible); Social activity ships last and defaults off.
- **P-7: Mobile settings parity.** Mobile YouScreen is a summary, not a
  settings surface. The smallest honest step is deep-linking each mobile
  card to the corresponding web destination (or a native destination
  when one is built); do not duplicate control paint on mobile before
  the wires exist there.

---

## 5. Reference pattern 2 - tab architecture vs. Opal's surfaces

The reference makes proactivity structural with five tabs. Opal's dock is
deliberately smaller - Home / Chats / floating Opal (Center) / Graphs /
You (`TABS` in `OpalApp.tsx`, Dock Option B) - and Opal's Center is not a
tab but the floating action the whole dock orbits. The mapping below is
therefore functional, not visual: which Opal surface does each reference
tab's *job*, and does the job arrive prepared, or must the user go
browsing for it?

| Reference tab (its job) | Opal surface doing that job | Structural proactivity today | Gap / note |
|---|---|---|---|
| Main chat (talk to the system) | Center (floating Opal, `OpalCenterChat`) plus Chats for person-to-person threads. Center is reachable from every tab via the dock's floating button. | Strong: Center holds context across 1:1, 1:many, many:many threads and acts inside them. | None for settings purposes. |
| Feed (the system publishes for the user) | Home (`GraphSocialHome`) - see SOCIAL_DIRECTION.md for the full treatment. | Partial by design: Home republishes the *residue of the user's own coordination* (consequence cards, Memories, Lives at real places), never an editorial stream. After this pass, Home ranking carries no engagement term (Track F). | The direction doc governs; no settings action. |
| Ideas (opportunities prepared and waiting) | Scattered, no single home: conversation opportunities (`getConversationOpportunity` / `evaluateConversationOpportunity` in `productClient.ts`), Center curation (`curateRecommendations`), discovery/near cards on Home, celebration curation in Privacy ("What would they love?" + Plan this). | Real but fragmented: each surface prepares its own opportunities; a user cannot see "everything Opal has prepared for me" in one place. | Proposal P-8: an Ideas-style prepared surface is a *product* decision (new destination), not a settings repair. The ingredients and their APIs all exist; what is missing is the one waiting-room surface and a founder call on its dock status. Not built here. |
| Goals (tracked outcomes, plain-language status) | Graphs tab: plans with a real lifecycle (forming / set / ready / handled), the Graphs temporal timeline (`GraphsTemporalTimeline`), and Attention Center's "Needs You" items (`AttentionAuthority` projection) with plain-language next actions. | Strong for plans: status is a state-layer projection, not per-surface shadow truth. Celebrations are the nearest thing to non-plan tracked dates, and they live under Privacy settings rather than with plans - a filing quirk worth a founder look. | No code action; noted for the founder. |
| Library (everything produced is kept) | Memories (durable SocialMoments served by `fetchHomeFeed`), What Opal remembers (memory facts, in Privacy), shared history on person profiles, conversation history in Chats. | Partial: kept things exist, but "kept" is spread across Home, Privacy, and profiles. A user looking for "everything Opal has made for me" must already know where each kind lives. | Same shape as Ideas: ingredients real, single shelf missing. Proposal P-8 covers both: one prepared-and-kept surface, or an explicit founder decision that distribution is the design. Not built here. |

**Settings consequence of the tab audit:** none of the reference's
proactivity requires a new *settings* control today. The settings-side
obligation is the one this pass discharged: when the system acts for the
user (Center, curation, opportunities), the grants behind that action
must be visible, plain-language, and revocable in YOU - and they are
(Assist, Graphing, act-on-behalf, Connected sources, memory forget).

- **P-8: Prepared-and-kept surface (product proposal).** Give Ideas and
  Library a home: one destination where prepared opportunities wait with
  their next action, and produced things (Memories, plans, curations)
  are kept with plain-language status. Build only on existing APIs
  (opportunities, attention, home feed, celebrations); the work is
  composition, not new backend. Founder decides dock status.

---

## 6. Verification (this track)

- New tests: `connectedSources.test.tsx` - 13 tests, green: 5 projection
  units (connected / not-connected / revoked / checking / failed), 4
  source guards (real routes, Privacy filing, no unbacked category
  painted, scope copy), 4 renders (connected, not-connected, failed,
  Privacy mount) against the productClient boundary.
- Settings guard suite re-run green: `settingsWireClass.test.ts` (7,
  including the new GREEN row's existence check),
  `youSettingsComingSoon.guard.test.ts` (4), `youHubHierarchy.test.ts`
  (4), `youSettingsRender.proof.test.tsx` (2).
- Full web suite after changes (two runs, incl. one on the final
  committed tree): 25 failures in both - the failing test names are
  identical to the baseline list (compared name by name across all
  four runs). The 16 new tests pass in the full suite (final run:
  connectedSources 13/13, homeFeedRanking.socialDirection 3/3).
  Zero new failures, zero repaired-by-accident.
- Backend: untouched by this track; the 2,655 / 0 baseline stands.
- TypeScript: 7 errors before, 7 after, identical set (all pre-existing,
  in files/lines this track did not alter).
