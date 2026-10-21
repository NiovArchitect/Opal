# Repair #21 - Cluster W-6 - Connectors expansion, honesty-bounded

Branch: muse/r21-connectors, base 70584ad8 (muse/repair-20 tip plus
the "Flows" label fix). Gates unchanged: no merge, muse/repair-17
untouched, FOUNDER_ACCEPTED = NO, FOUNDER_PHONE_PASS = NOT_CLAIMED.
Plain hyphens only in this report; no em dashes in any copy touched.

## Verdict up front

1. Category (b) - a real end-to-end flow exists in code but the
   Connectors room does not expose it - is EMPTY. The audit below
   checked every row in the current room, every row the backend
   settings/connections payload can emit, every OAuth module,
   controller, and route in apps/opal_core, and every client entry
   in apps/opal_web. The only per-user permission-ask flow that
   exists in the product is the single Google OAuth grant, and the
   room already exposes it fully: Connect (when the server payload
   carries the enabled connect action), Disconnect (when it
   carries the enabled disconnect action), and View (honest gated
   form when it carries no action). Nothing was wired live in this
   cluster because there was nothing truthful left to wire.
2. No category (c) or (d) row was wired, painted, or added to the
   room. Their breadth lives in the Standing expansion map section
   of this report, per the founder's W-6 expansion directive.
3. R20 Declaration #8 (the expanded Gmail row repeating one
   sentence in STATUS and WHAT IS HOLDING IT BACK) was already
   fixed by the R20 amendment's Connectors v2 rebuild and is
   re-verified here, not re-fixed. Evidence in its section below.
4. The only code change in this cluster is test coverage: three
   R21 pins added to apps/opal_web/src/c2/shell/r20Connect.test.tsx
   (the disconnect leg of the Google rows, the closed allowlist,
   and the gated-row no-live-action rule). No product code changed,
   because the room's behavior already matched the law on every
   audited row.

## Method - what was read

- Backend projection: apps/opal_core/lib/opal_core/settings/
  connections.ex (the ONE settings/connections projection; its
  known_ids list is the complete backend row inventory:
  deepseek, deepgram_batch, elevenlabs, twilio_verify,
  twilio_messaging, geoapify, google_places, brave, duffel,
  google_calendar, gmail, stripe_wallet_loads).
- Backend flow: apps/opal_core/lib/opal_core_web/controllers/
  connector_controller.ex; apps/opal_core/lib/opal_core_web/
  router.ex (connector and oauth routes, lines 139-168 of the
  product scope); apps/opal_core/lib/opal_core/social_flow/
  real_world/calendar/google_adapter.ex (OAuth, PKCE via
  OAuthState, token refresh); provider_connections.ex and
  token_vault-backed provider_connection.ex; apps/opal_core/lib/
  opal_core/calendar.ex and email.ex (the read surfaces the grant
  powers); bookings/duffel.ex; wallets/stripe_checkout.ex.
- Web room: apps/opal_web/src/c2/shell/shellData.ts (the
  "connections" case of buildSettingsSection, allowlist
  USER_FACING_CONNECTOR_IDS = ["google_calendar", "gmail"]);
  C2You.tsx (connection row rendering); C2Shell.tsx (runAction
  google-connect / google-disconnect handlers); apps/opal_web/src/
  api/productClient.ts (startGoogleCalendarConnect,
  revokeGoogleCalendarConnection, getSettingsConnections,
  getSavedLogins / addSavedLogin / removeSavedLogin).
- Whole-tree searches for instagram, spotify, facebook, plaid,
  drive, docs, sheets, microsoft, outlook, caldav, ical, slack,
  whatsapp, healthkit across apps/opal_core, apps/opal_web, and
  apps/opal_mobile: no OAuth module, adapter, route, or client
  entry exists for any of them (details per row below).
- The R20 record: coordination/repair19/repair20-handoff.md
  (F-9, the Connectors v2 amendment cluster CD, and the V-6
  per-row table), which this report supersedes as the per-row
  record going forward.

## Per-row audit - rows in the room today plus every backend row

Categories: (a) real flow end-to-end today, (b) real flow exists
but not wired into the room, (c) flow blocked on a founder-gated
step, (d) no flow exists.

| Row | Cat. | Status | Evidence |
| --- | --- | --- | --- |
| Google Calendar (Business) | (a), gated per deployment by (c) | LIVE flow. Room shows Connect only when the payload carries the enabled connect action (server OAuth configured); otherwise View with the gate line. Connected state is read back from the stored grant, never assumed. | GoogleAdapter.authorize_url / exchange_code / oauth_configured? (google_adapter.ex); ConnectorController google_start, google_callback, google_revoke; router POST /connectors/google_calendar/start + /revoke, GET/POST /oauth/google/start + /callback; Settings.Connections google_row connect_action / disconnect_action; productClient startGoogleCalendarConnect; C2Shell runAction "google-connect" sets window.location to the returned authorize_url; read surface OpalCore.Calendar free_busy / list_events via CompositeAdapter |
| Gmail (Business) | (a), gated per deployment by (c) | LIVE flow, the SAME single Google grant as Calendar (consent carries calendar.readonly + gmail.readonly together). Room behavior identical to Calendar. Special truthful state: a grant connected without the gmail scope renders gated with Disconnect only, so the user can disconnect and reconnect with email allowed. | GoogleAdapter.oauth_scopes (calendar.readonly + gmail.readonly); Settings.Connections google_row gmail leg + gmail_scope_missing gate; read surface OpalCore.Email.search / get_message and Bookings.EmailWatch, both requiring the gmail scope on the stored grant |
| Saved logins (Custom) | (a) | LIVE real read/manage surface, not an OAuth flow. The room's Custom category carries it as its View/nav row into the Saved logins section (list, add, remove). It never renders a Connect, which is truthful: there is nothing to connect, the logins are already the user's own records. | Router GET/POST/DELETE /settings/saved-logins (SettingsAccountController); productClient getSavedLogins / addSavedLogin / removeSavedLogin; shellData "saved-logins" section + the Custom nav row in the "connections" case |
| Google founder gate (applies to both Google rows) | (c) | FOUNDER-GATED enablement, exactly as the payload states it. Founder step, verbatim from Settings.Connections: create the Google OAuth client and consent screen (the handoff's carried gated item "Google OAuth consent tap + client creation"), then "Add the Google sign-in details (GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_REDIRECT_URI) to ~/.opal/r1a1.env, then restart Opal once." Until then oauth_configured?() is false, the payload carries no connect action, and both rows honestly read View. No room change can or should bypass this. | connections.ex google_row gate code google_signin_not_set_up + founder_step; GoogleAdapter.oauth_configured? reads client id + secret from app config / GOOGLE_OAUTH_* or GOOGLE_CALENDAR_* env (config/runtime.exs lines 129-140) |
| DeepSeek, Deepgram (batch), ElevenLabs, Twilio Verify, Twilio Messaging, Geoapify, Google Places, Brave, Duffel, Stripe wallet loads (backend payload rows) | not user rows | ABSENT FROM THE ROOM BY LAW, correctly. These are Opal's own server-configured providers: there is no per-user account for the user to connect and no per-user permission ask exists or should exist. The web builder's allowlist drops them and a pin fails the suite if any of their names renders. Two of them carry founder gates of their own (next rows) - infrastructure gates, not user rows. | connections.ex known_ids + pre_status clauses (each keys off a server env credential); shellData USER_FACING_CONNECTOR_IDS allowlist; r20Connect.test.tsx infra pin (INFRA_ROWS fixture, 10 rows) |
| Google Places enablement (infra gate) | (c) | FOUNDER-GATED, not a room row. Founder step, verbatim from the payload gate: "In Google Cloud Console for project 449126891803, enable Places API (New) and confirm a billing account is linked to that project, then restart Opal once. No new key is needed." | connections.ex google_places gate code places_api_not_enabled |
| Twilio Messaging sender (infra gate) | (c) | FOUNDER-GATED, not a room row. Founder step, verbatim: "In Twilio Console, create a Messaging Service (or confirm a Twilio number), add OPAL_TWILIO_MESSAGING_SERVICE_SID to ~/.opal/r1a1.env, then restart Opal once." | connections.ex twilio_messaging gate code twilio_sender_missing |
| Stripe wallet loads (infra gate) | (c) | FOUNDER-GATED, not a room row. Founder step, verbatim: "Only after the legal review: set OPAL_WALLET_LOADS_ENABLED to true in ~/.opal/r1a1.env, add STRIPE_WEBHOOK_SECRET from the Stripe dashboard, then restart Opal once." | connections.ex stripe_wallet_loads gate code wallet_loads_gated; wallets/stripe_checkout.ex |
| Device sources (device location, device chats / calls / texts, in-room, linked devices) | not connector rows | EXCLUDED FROM THIS ROOM BY THE FOUNDER'S V2 RULING, and the exclusion is pinned. The underlying capabilities are real but their homes are elsewhere: device location is a per-plan, moment-of-use browser permission (apps/opal_web/src/device/deviceLocation.ts); notifications are asked at onboarding (onboarding/PermissionBootstrapPage.tsx, Notification.requestPermission); microphone is asked at moment of use (c2/shell/adopt3.tsx getUserMedia); linked devices is its own hub section with a real roster and revoke (getDeviceRoster / revokeDevice). Re-adding any of them to Connectors would regress the founder-approved v2 room. | repair20-handoff.md cluster CD (Your-device group stripped by name); r20Connect.test.tsx v2 form pin (banned-content list + ingestion payload never read) |
| Category (b) - any row, any provider | (b) | NONE FOUND. Every real per-user flow in the codebase (the Google grant; Saved logins) is already exposed in the room in its truthful form. This is the audit's central negative result, established from the code reads above, not from absence of searching: the backend row inventory is a closed list of 12 ids, the router's connector surface is Google-only, and whole-tree provider searches return no second OAuth or permission-ask implementation. | connections.ex known_ids (closed list); router.ex connector routes (Google only); grep evidence in Method |

## Standing expansion map

This section is the standing expansion map for the Connectors
catalog. It is 1:1 with the founder's full-scroll reference of
Meta Muse's Connectors page (re-sent 2026-10-20 13:18 PDT,
replacing every earlier paraphrase), plus Travel, which the
founder's earlier domain list names and this scroll does not:
Travel is kept as its own domain and marked
founder-domain-addition where it appears.

### Row grammar (the catalog's form, adopted in Opal's style)

- A row is: app icon + name + ONE action word. The action word
  is "Connect" (not yet connected) or "View" (connected). No
  other text on a row.
- Category headers carry "See all".
- The Custom row is the catalog's one doorway form: name +
  count subtitle + chevron, no action word.
- Opal's shipped room already obeys the row half of this
  grammar and it is pinned: icon + name + one action, no status
  sentence or subtitle on a row's face (r20Connect.test.tsx v2
  form pin, room text under 220 characters).
- "See all" deviation, declared with its reason: the shipped
  room's category headers do NOT carry "See all" today, because
  every rendered category shows its full real member list -
  nothing is collapsed and nothing hides behind the header, so
  a "See all" control would open nothing, and a control with
  no destination is a false control under the honesty law. The
  target grammar above stands: the day a category has more
  real rows than the room shows at rest, its header gains
  "See all" together with the real expansion it opens.
- Per-row, the "Reference action" column below is the action
  word in the founder's photograph (that user's state in the
  reference product). It is catalog data, not an Opal claim.
  Opal's own status sits beside it, and Opal renders a row
  only when its own status is LIVE - with its action word
  derived from the backend payload, never copied from the
  reference.

### Connect / View semantics (founder, 2026-10-20 13:18 PDT)

The distinction carries a lesson, in the founder's words:
"the things that save you, save you because of already
connected."

- A VIEW row means ALREADY CONNECTED and ALREADY WORKING for
  the user. It arrived via device permissions or account
  linkage and never needed a Connect tap. The reference's
  Meta-account socials and device sources, marked View in the
  photograph, are exactly this species.
- A CONNECT row means a fresh permission ask is the arrival
  path: nothing is connected until the user makes that ask
  and completes it.
- Map discipline that follows, applied to every row below: a
  row is marked with a pre-connected arrival (device grant or
  account link) only where that arrival is genuinely part of
  Opal's design or machinery. Where Opal today cannot honor
  the marked arrival path, the row stays queued and the
  Arrival path column names that plainly - no row is relabeled
  View, in the map or in the room, on the strength of another
  product's linkage.
- Consequence for Opal today, stated once so the map is not
  misread: Opal currently honors exactly ONE arrival path,
  the fresh permission ask (the Google OAuth tap, and Saved
  logins' own records). Opal has no Meta account link and no
  native device-grant module, so every pre-connected arrival
  in the catalog is a wiring need, not a present truth. In the
  shipped room, the Google rows render Connect before the ask
  and Disconnect after it (the founder-approved v2 action
  words; the tap on a connected grant row revokes it), and
  View is the word for a gated row's detail - Opal's words
  stay as approved until the founder changes them.

### The catalog, 1:1

| Domain (as photographed) | Row | Reference action | Arrival path | Opal status | Founder step (if gated) / wiring needed (if queued) |
| --- | --- | --- | --- | --- | --- |
| Productivity | Google Drive | Connect | Fresh permission ask - a new scope added to the existing Google grant's consent | QUEUED | No flow exists: the Google consent carries no drive scope and there is no Drive adapter, route, or client entry. Wiring: (1) add a drive.readonly scope to GoogleAdapter.oauth_scopes (the existing PKCE OAuthState + TokenVault + ProviderConnections plumbing is reused unchanged); (2) founder adds that scope to the Google Cloud consent screen and completes Google's sensitive-scope verification; (3) build a Drive read adapter beside calendar/google_adapter.ex on the stored grant; (4) add a google_drive row to Settings.Connections, connected only when the drive scope is actually on the grant; (5) web allowlist entry + pins. Absent from the room until all five land. |
| Productivity | Finances (Plaid) | Connect | Fresh permission ask - Plaid Link is the ask | QUEUED | No flow exists: "plaid" appears nowhere in apps/ or docs/architecture/ - no Link integration, no backend module, no env keys. Wiring: (1) founder creates a Plaid account, completes Plaid's production-access review, and provides PLAID_CLIENT_ID / PLAID_SECRET to ~/.opal/r1a1.env; (2) backend module OpalCore.Finance.Plaid: a link-token endpoint (the row's Connect opens Plaid Link - Plaid's own hosted permission ask, so the one-ask pattern holds), a public_token exchange endpoint, item storage in TokenVault under a new ProviderConnections provider id "plaid", tokens never returned in JSON; (3) a read adapter (accounts / balances) as function evidence - a stored item alone never renders Connected; (4) Settings.Connections row driven by that evidence; (5) web allowlist entry + pins. Experience target, per the founder: identical in shape to Gmail - one tap, one plain-words ask, done, truthful status read back. |
| Productivity | Google Sheets | Connect | Fresh permission ask - a new scope added to the existing Google grant's consent | QUEUED | No flow exists (no spreadsheets scope, no Sheets adapter). Wiring: spreadsheets.readonly scope on the same Google consent (founder consent-screen + sensitive-scope verification), Sheets read adapter on the existing grant, Settings.Connections row keyed to that scope, web allowlist + pins. Note: docs/architecture/OPAL_CONNECTOR_ARCHITECTURE.md holds "Docs/Sheets breadth" on HOLD; lifting that hold is a founder call recorded here, not assumed. |
| Productivity | Google Docs | Connect | Fresh permission ask - a new scope added to the existing Google grant's consent | QUEUED | No flow exists (no documents scope, no Docs adapter). Wiring: documents.readonly scope on the same consent (founder consent-screen + verification as for Sheets), Docs read adapter on the existing grant, backend row keyed to the scope, allowlist + pins. May ship as one row with Drive if the founder prefers a single ask; scope truth stays per-scope on the backend either way. |
| Productivity | Gmail | Connect / View (state-dependent in the reference) | Fresh permission ask - the Google OAuth tap; the only arrival path Opal honors today | LIVE | The single Google grant, in the shipped room under Business. Full evidence in the audit table above. Founder enablement gate: the Google OAuth client + consent step named in the audit table. |
| Productivity | Google Calendar | Connect / View (state-dependent in the reference) | Fresh permission ask - the Google OAuth tap; the only arrival path Opal honors today | LIVE | Same single grant as Gmail, same evidence, same founder enablement gate. In the shipped room under Business. |
| Social | Instagram | View | Reference arrival: pre-connected via account link (Meta). Opal CANNOT honor that arrival - no Meta account link exists anywhere in Opal - so in Opal's design this row's arrival, when wired, is a fresh permission ask; building any account-link arrival would be its own named build, not an assumption | QUEUED | No flow exists: zero product references - no Meta app, no OAuth route, no adapter. Wiring: (1) founder creates a Meta app and completes Meta app review for the Instagram permissions Opal needs; (2) OAuth module modeled on GoogleAdapter (signed state, tokens into TokenVault, new ProviderConnections provider id "instagram"); (3) ConnectorController start / callback / revoke routes; (4) a read adapter (profile / media) as function evidence; (5) Settings.Connections row + web allowlist under Social + pins. The R21 closed-allowlist pin already fails the suite if this row renders early. |
| Social | Facebook | View | Reference arrival: pre-connected via account link (Meta). Opal CANNOT honor that arrival - no Meta account link exists in Opal; when wired, arrival is a fresh permission ask | QUEUED | No flow exists in the Opal product (the user's own Meta Muse connectors are a different product and grant Opal nothing). Wiring: same Meta pattern as Instagram - founder Meta app + review, OAuth module, provider id "facebook", read adapter, backend row, allowlist, pins. |
| Social | Threads | View | Reference arrival: pre-connected via account link (Meta). Opal CANNOT honor that arrival - no Meta account link exists in Opal; when wired, arrival is a fresh permission ask | QUEUED | No flow exists. Wiring: Threads rides the Meta platform - founder Meta app with Threads permissions + review, OAuth module on the same pattern, provider id "threads", read adapter, backend row, allowlist, pins. Lands independently of Instagram / Facebook. |
| Social | Instagram Messages | Connect | Fresh permission ask - the messaging permission set on a Meta grant | QUEUED | No flow exists, and it is a SEPARATE row from Instagram for a real reason: messaging needs its own Meta permission set (instagram_manage_messages class) and its own app review. Wiring: founder Meta app + messaging permission review, OAuth module (may share the "instagram" grant only if the granted scopes actually include messaging - scope truth per-scope, as with Gmail), a messages read adapter, backend row, allowlist, pins. |
| Social | Spotify | View | Fresh permission ask in Opal's design - the reference View arrived via a connection made inside that product; Opal holds no Spotify link to arrive by | QUEUED | No flow exists (zero references). Wiring: (1) founder creates a Spotify developer app (client id / secret, redirect URI); (2) OAuth authorization-code + PKCE module modeled on GoogleAdapter, provider id "spotify"; (3) controller routes; (4) a read adapter (library / recently played) as function evidence; (5) backend row + allowlist under Social + pins. |
| Health | Peloton | Connect | Fresh permission ask | QUEUED | No flow exists (zero references), and docs/architecture/OPAL_CONNECTOR_ARCHITECTURE.md lists Peloton by name under Hold. Wiring: Peloton has no general self-serve third-party OAuth - step one is a founder step: obtain Peloton partner / enterprise API access. Then: adapter module on the ProviderConnections pattern (provider id "peloton"), token storage in TokenVault, a read adapter (workout history) as function evidence, backend row, allowlist, pins. Lifting the architecture Hold is a founder call. |
| Health | Function Health | Connect | Fresh permission ask | QUEUED | No flow exists (zero references). Wiring: Function Health integrations are partner-arranged - step one is a founder step: a Function Health partner / API agreement. Then the standard pattern: OAuth or API-key handoff into TokenVault (provider id "function_health"), a labs read adapter as function evidence, backend row, allowlist, pins. No row may render on the partnership announcement alone - only on a working read. |
| Health | HealthEx | Connect | Fresh permission ask | QUEUED | No flow exists (zero references). Wiring: HealthEx is a health-data exchange - step one is a founder step: a HealthEx partner integration agreement. Then: authorization flow into TokenVault (provider id "healthex"), a health-record read adapter as function evidence, backend row, allowlist, pins. |
| Business | Meta Business Manager | Connect | Fresh permission ask - the Meta business grant | QUEUED | No flow exists. Wiring: founder Meta app with Business permissions + business app review, OAuth module on the GoogleAdapter pattern, provider id "meta_business", a read adapter (business / ad account read per granted scopes), backend row, allowlist, pins. Distinct from the personal Facebook row: different permission set, different review, separate grant truth. |
| Business | GitHub | View | Fresh permission ask in Opal's design - Opal holds no GitHub account link to arrive by | QUEUED | No product flow exists. The only GitHub references in the shipped product are hosting facts (productClient checks for github.io hosting) and Opal's own development tooling, neither of which is a user connection. Wiring: (1) founder creates a GitHub OAuth App (client id / secret, callback URL); (2) OAuth module on the GoogleAdapter pattern, provider id "github", tokens in TokenVault; (3) controller routes; (4) a read adapter (viewer profile / repositories read) as function evidence; (5) backend row + allowlist + pins. |
| Business | Canva | Connect | Fresh permission ask | QUEUED | No flow exists (zero references; the code's "canvas" hits are Opal's own Trip canvas, a different word). Wiring: (1) founder creates a Canva developer app for the Canva Connect APIs; (2) OAuth module (Canva Connect is OAuth2 + PKCE - the GoogleAdapter pattern transfers directly), provider id "canva"; (3) controller routes; (4) a read adapter (designs list read) as function evidence; (5) backend row + allowlist + pins. |
| Business | Dropbox | Connect | Fresh permission ask | QUEUED | No flow exists (zero references). Wiring: (1) founder creates a Dropbox app (scoped permissions, OAuth2); (2) OAuth module with PKCE on the GoogleAdapter pattern, provider id "dropbox", offline access so a refresh token is stored; (3) controller routes; (4) a read adapter (account / files list read) as function evidence; (5) backend row + allowlist + pins. |
| Business | Zoom | View | Fresh permission ask for an account connection. The pasted meeting-link path is neither an arrival path nor a connection and is never marked as one | QUEUED as an account connection; PARTIAL truth recorded | What is already true in Opal, with evidence: a pasted Zoom link is a real, working part of a plan - social_flow/meeting_links.ex classifies zoom.us hosts as the "zoom" provider and virtual plans carry the link as their join handoff. What is NOT true: no Zoom account connection exists (no Zoom OAuth app, no meetings read, zero references beyond link parsing and intent vocabulary). Wiring for the row: (1) founder creates a Zoom Marketplace OAuth app; (2) OAuth module, provider id "zoom"; (3) a meetings read adapter as function evidence; (4) backend row + allowlist + pins. The link-carrying truth must never be presented as this row being connected. |
| Custom | Custom connectors | Doorway (count subtitle, chevron) | Fresh permission ask - the user adds and authorizes each tool, one by one | QUEUED as a registry; the category's one LIVE member today is Saved logins | No registry for user-added tools exists: ProviderConnections knows only providers the backend was built with. Wiring: (1) a backend connector-registry module (user-supplied endpoint + auth shape stored as a ProviderConnections row with provenance "custom", credentials in TokenVault only); (2) a plain-words permission-ask form stating exactly what the tool will be able to do, shown before anything is stored; (3) a health / read probe as function evidence - a custom row renders View (connected) only on probe evidence, never on the add alone; (4) the count subtitle becomes truthful the day the registry exists (it counts the user's real custom connectors); (5) pins. In the shipped room the Custom category renders with its real member, Saved logins (LIVE, doorway form - audit table above); the "Custom connectors" doorway itself does not render until the registry is real, because its count would otherwise be invented. |
| Your device | Calendar | View | Pre-connected via device grant - the OS permission on the paired phone. Opal CANNOT honor it yet: no native device-calendar module exists, so building the device-grant machinery is part of this row's wiring need (see Wiring column) | QUEUED for Opal's app; a different calendar connection is LIVE | No device-calendar integration exists in Opal's mobile app: whole-tree search finds no EventKit / Calendar Provider usage in apps/opal_mobile. What is true instead: Google Calendar (above) is a live calendar connection, and availability the user types by hand works without any connection. Wiring for THIS row: a native device-calendar module (iOS EventKit / Android Calendar Provider) with the OS permission ask, feeding busy intervals into the same availability machinery the Google adapter feeds (FreeBusyStore-shaped local adapter - busy only, no event titles, matching the Google adapter's privacy shape), plus a truthful connected state read from the OS permission + a successful read. Note on sources: device connectors exist in the assistant's own Meta Muse environment; that is a different product's grant and is NOT evidence about Opal's app - this row's status rests on Opal's code alone. |
| Your device | Contacts | View | Pre-connected via device grant - the OS permission on the paired phone. Opal CANNOT honor it yet: no contacts module exists, and the grant machinery must be built under the no-address-book-upload law (see Wiring column) | QUEUED | No device-contacts read exists in Opal's app (no Contacts framework usage in apps/opal_mobile). What is true: backend contact MATCHING exists and is law-bound to never upload an address book - social_flow/real_world/contacts/matching.ex ("full_address_book_uploaded" => false) and onboarding.ex carry no_full_address_book. Wiring must preserve that law: an on-device contacts permission ask (iOS Contacts / Android contacts permission), matching computed on-device or from hashes only, a connected state read from permission + a completed on-device pass. Any wiring that uploads the address book is a non-starter, not a variant. |
| Your device | Reminders | View | Pre-connected via device grant - the OS permission on the paired phone. Opal CANNOT honor it yet for the device's Reminders app: no EventKit module exists (see Wiring column) | QUEUED as a device source; PARTIAL truth recorded | What is true: Opal's OWN reminders are real - the mobile app keeps private reminders in its local store (apps/opal_mobile/src/socialFlow/socialFlowRepository.ts, sf_reminders) and the backend reminder machinery acts on Opal plans. What is not true: the device's Reminders app (EventKit reminders) is not read - no EventKit usage exists. Wiring for the device row: EventKit reminders permission + a read adapter into Opal's reminder surface, connected state from permission + read evidence. Opal's own reminders must never be presented as this row. |
| Your device | Health | View | Pre-connected via device grant - the OS per-type health permission on the paired phone. Opal CANNOT honor it yet: no HealthKit / Health Connect module exists (see Wiring column) | QUEUED | No health integration exists in Opal's app: no HealthKit (iOS) or Health Connect (Android) entitlement, module, or read anywhere in apps/opal_mobile. (Health data connectors in the assistant's own environment are, again, a different product's grant.) Wiring: native health module (HealthKit / Health Connect) with the OS per-type permission ask, a read adapter (steps / sleep class data) as function evidence, backend or on-device connected state read from permission + a successful read, backend row if the state is server-held, allowlist + pins. |
| Your device | Home | Connect | Fresh permission ask - an on-device platform grant (for example HomeKit) is still an ask the user must make | QUEUED | No smart-home integration exists in Opal (zero references), and docs/architecture/OPAL_CONNECTOR_ARCHITECTURE.md lists smart-home under Hold. Wiring: step one is a founder platform call (HomeKit has no cloud OAuth - it is an on-device entitlement and permission; Google Home / Alexa paths are partner programs). Then: the chosen platform's permission module on-device, a devices read as function evidence, a truthful connected state, backend row if server-held, allowlist + pins. Lifting the Hold is a founder call. |
| Travel (founder-domain-addition) | Flights - book a flight (Duffel, house provider) | No reference row (domain absent from the scroll) | No user arrival path exists or applies - house provider key; neither Connect nor View ever describes this row | Backend LIVE in test mode; FOUNDER-GATED for live; NOT a user Connect row by design | Duffel is Opal's house provider: it runs on Opal's own DUFFEL_API_KEY, so there is no per-user account and no per-user permission ask - a Connect row for it would be painted and must never render. Real state, with evidence: OpalCore.Bookings.Duffel search / book / cancel / get_booking are implemented against api.duffel.com, gated on the key, currently a test token (test mode by duffel_test_ prefix or DUFFEL_TEST_MODE); Bookings.Service routes flight / hotel / activity bookings to it. Founder step for live: replace the test key with a live DUFFEL_API_KEY (the carried gated item "the Duffel live token"). The capability surfaces inside plan flows, not Connectors; this row is its recorded home in the catalog. Hotels ride the same adapter and the same truth. |


### Federation note - connection state belongs to the wallet

Recorded in substance, per the founder (2026-10-20 13:18
PDT): connection state belongs to the WALLET, not the app
window. A tool connected once is connected across Opal,
Otzar, and future domain apps on the same Memory Wallet;
the user is never re-asked by a sibling app.

Where connection state lives TODAY, from the code:

- APP-LOCAL, not wallet-scoped. The one real connection
  (Google) is a row in Opal's own backend table
  provider_connections (migration
  20260818000001_create_provider_connections): the schema
  (social_flow/real_world/provider_connection.ex) belongs_to
  an Opal Accounts.User, keyed by user + provider string,
  with scopes and token ciphertext (AES-256-GCM via
  TokenVault) on the row. Settings.Connections and
  ProviderConnections read exactly that table. Saved logins
  are likewise Opal-backend records (SettingsAccountController
  saved-logins endpoints).
- The Memory Wallet holds NO connection state today: the
  memory_wallet modules (memory_wallet.ex and its capsule
  modules) contain no connection or provider storage at all
  (whole-module grep: zero hits). No Otzar codebase, shared
  wallet connection registry, or cross-app connection read
  exists in this repository.
- THE GAP, named: for the federation rule to become true,
  connection records (provider, scopes, status, credential
  handle - tokens as ciphertext or vault references, never
  values) must become wallet-owned records under the
  wallet's own scope-policy discipline, with a cross-app
  read contract a sibling app can consume, and Opal's
  provider_connections table must become a projection of
  that wallet state rather than its owner. Until that build
  exists, a sibling app WOULD re-ask, and no surface may
  claim otherwise. This gap is recorded here as part of the
  catalog's wiring backlog; it is not built, and not
  disguised, in this cluster.
- One forward-compatible fact worth recording: the
  provider_connections schema's provider vocabulary already
  anticipates more than Google - its @providers list names
  google_calendar, apple_calendar, outlook_calendar,
  maps_travel, place_catalog, and booking. Those are schema
  strings only; no adapter, flow, or row exists behind the
  non-Google names, and they change no status in this map.

### Also audited, not in the photographed catalog

These were audited under the earlier domain list and are
recorded here so nothing from that list is silently dropped;
they are not catalog rows and do not enter the 1:1 table:

- Payments: "Adding money (Stripe)" is Opal's merchant
  capability, founder-gated on the legal review plus
  OPAL_WALLET_LOADS_ENABLED and STRIPE_WEBHOOK_SECRET (audit
  table above) - never a user Connect row. A user's own card
  on file (Stripe SetupIntent class flow) has no
  implementation today and stays queued behind its own
  audited build if the founder asks for it.
- Travel companions from the audit: Ticketmaster event
  discovery (house key TICKETMASTER_API_KEY, capability inside
  plan flows, no user account); restaurant reservation
  execution (founder-gated on OpenTable partner access;
  discovery via Geoapify is real today); ride-hailing (no
  provider exists; the spine task honestly opens the
  plan-scoped Opal chat - a row exists only if a chosen
  provider offers a per-user account link).
- Other named providers with no flow anywhere in Opal's code
  (same queued shape as their catalog class - developer app,
  OAuth module on the GoogleAdapter pattern, ProviderConnections
  provider id, read adapter as function evidence, backend row,
  allowlist, pins): Slack and Microsoft 365 / Outlook (Business
  class), X and TikTok (Social class), Apple Calendar (no
  OAuth equivalent exists - iCloud is CalDAV with app-specific
  passwords, so it cannot honestly take the one-ask form).

## R20 Declaration #8 - disposition

ALREADY FIXED in the base (by the R20 amendment's Connectors v2
rebuild, cluster CD), re-verified in this worktree, no change
needed and none made:

- The builder drops the gate line when it merely restates the
  status detail: shellData.ts "connections" case sets gateReason
  to null when gate.reason_plain equals status_detail.
- The renderer prints the WHAT IS HOLDING IT BACK block only
  when gateReason is non-null: C2You.tsx connection detail.
- The pin: r20Connect.test.tsx, "Connect appears ONLY for tools
  with a real flow..." scenario 1, asserts the shared sentence
  appears exactly once in the expanded Gmail detail and that
  "What is holding it back" does not render.
- The R21 pins extend the other leg: when the gate reason
  DIFFERS from the status detail it is kept and rendered once
  under WHAT IS HOLDING IT BACK (no over-dedupe).

## Tests

Command (apps/opal_web, vitest):

- src/c2/shell/r20Connect.test.tsx: 14/14 PASS (11 pre-existing
  R20 pins green unchanged, plus 3 new R21 pins):
  1. Connected grant renders Disconnect (never Connect) on both
     Google rows, and tapping Gmail's Disconnect fires
     runAction("connections", "google-disconnect") - the shell
     handler that calls the real revoke endpoint - and never
     google-connect.
  2. Closed allowlist: a payload carrying instagram, spotify,
     and google_drive rows, each painted with an enabled connect
     action, renders none of them, no Social category, and the
     builder's connection rows stay exactly
     [google_calendar, gmail].
  3. Gated row (gate present, no actions): hasRealFlow false,
     action null, the rendered control is View only, tapping it
     fires no runAction, and a distinct gate reason renders once
     in the detail.
- Connector/settings neighbourhood, same run set:
  src/c2/shell/settingsArchitecture.test.tsx,
  src/c2/shell/adopt2Settings.test.tsx,
  src/opalUi/connectedSources.test.tsx - combined with
  r20Connect: 4 files, 57/57 PASS.
- No backend code changed, so no backend suite was run; the
  backend evidence above is code-read, file and endpoint level.
- No typecheck delta: the only changed file is a test file in
  the suite that runs green above.

## Declarations

1. NOTHING WAS WIRED LIVE. Category (b) is empty on the
   evidence; wiring anything from categories (c) or (d) would
   have been painting a Connect that does not connect, which
   the brief forbids absolutely. The deliverable for those rows
   is the Standing expansion map above.
2. The task brief named coordination/repair19/
   r20-connect-report.md as the R20 record; that file does not
   exist in the base. The R20 record that does exist and was
   used is coordination/repair19/repair20-handoff.md (F-9,
   cluster CD, and the V-6 table). Flagged so the parent can
   correct the pointer rather than hunt for a missing file.
3. Observation, not changed (outside this cluster's wiring
   scope and pre-existing): the Google OAuth browser callback
   (GET /oauth/google/callback) completes the exchange and
   answers JSON in the browser tab rather than redirecting back
   into the app. The connect flow is real end-to-end (state,
   exchange, stored grant, read-back status); the return
   landing is a UX wart for a future cluster, recorded here so
   it is not lost.
4. The simulated Google path (POST .../google_calendar/
   simulate, dev/test builds only) is unchanged and stays
   truthful: provenance simulated renders as simulated in the
   payload, never as Connected.
5. No screenshots or walk claims: this cluster changed no
   rendered surface, so no rendered proof is owed or claimed.
   FOUNDER_ACCEPTED = NO, FOUNDER_PHONE_PASS = NOT_CLAIMED.

## L-2 - Connectors are per-account (founder law, 2026-10-20 13:23 PDT; R21 Cluster L-LAWS)

- The CATALOG is universal: every account's connections payload
  carries the same row inventory (the builder's known ids, the
  web room's allowlist) - a catalog row exists for everyone or
  for no one.
- The STATE is personal: each account has its own connections,
  tokens, and View/Connect truth. User A's connected rows never
  appear for user B - including custom connectors (Saved
  logins). Connection state is read per account at every layer:
  the payload builder keys its one per-user read by the
  viewer's user id, the provider-connection store is keyed by
  user + provider, the saved-login store by user, and the HTTP
  controllers take the account from the signed-in session,
  never from a request parameter.
- Scope: connection state lives in the person's wallet scope -
  it is shared across THAT person's domain apps per the
  federation note above (today it is app-local in
  provider_connections, and the wallet-scoped registry remains
  the named gap recorded there) - and it is never shared across
  people.
- Proof (one line): the R21 two-account isolation proof
  (apps/opal_core/test/opal_core_web/r21_connector_isolation_test.exs)
  gives account A a live Google connection and a saved login and
  account B none, then its own, and shows B's payload, connector
  read-backs, saved-login list, and HTTP responses carry none of
  A's state, tokens, or saved logins - and symmetrically for A -
  while both payloads carry the identical catalog id set.
