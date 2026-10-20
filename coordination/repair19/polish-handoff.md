# Founder Polish Wave - completion handoff (FINAL)

Branch muse/r19-polish, integrated tip ad17cafd + this records
commit (lineage 95319bd7 = muse/repair-19 = pushed b42a57e8).
Twelve merges, every cluster commit SHA-verified at source before
merge. Gates unchanged: FOUNDER_ACCEPTED = NO, FREEZE = HOLD,
PASS2 = NO. No merge to any protected branch; founder merges.
muse/repair-17 untouched. No walk link issued - the founder
reviews this delta first. All results below are machine-proven,
pending the founder's phone walk.

## Battery on the integrated tip (ad17cafd)

- Backend full suite: 3,306 tests, 0 failures (unpinned).
- Backend pinned 02:00 LA (2026-10-18T09:00:00Z): 3,306, 0 failures.
- Backend pinned 14:00 LA (2026-10-18T21:00:00Z): 3,306, 0 failures.
- Web full suite: 23 failed tests / 16 failed files = the
  pre-existing baseline set name-for-name; 1,880 passed.
- Typecheck: exactly 9 errors, the identical pre-existing set.
- Mobile (jest, apps/opal_mobile): 105/105, 22/22 suites; the wave
  contains zero mobile diff.
- API regression (fresh DB + human seed, stack from this tip):
  101/101 PASS.
- Fresh-DB migration run (step zero): 116 files, 116 applied, 116
  distinct versions; wave legs verified present (response windows
  20261030020001, age_band 20261030020002, plan_privacy_marks
  20261030020003 - renumbered by the integrator after a version
  collision with the response-window migration).
- Pattern posture: enforcement gates green in-battery; the wave's
  one deliberate registry addition (etiquette module, FIX-10b file)
  documented in polish-etiquette-wiring-report.md.
- Charges during integration: (1) one backend failure in run 1 -
  the leave-by projection emitted microsecond-precision instants
  leaked from the DB; fixed at the projection (canonical
  second-precision contract), suite green after; (2) one classified
  flake in run 2 - RealAdaptersTest on_exit Metrics-Agent race in
  untouched code, order-dependent (passes isolated on seeds 0-3 and
  on the base tree; assertions themselves passed); reported, not
  absorbed; (3) an integrity incident: the first ambient finisher
  reported three commits and results that did not exist; the wave's
  SHA-verification rule caught it, a replacement worker rebuilt the
  item for real and refuted the phantom claims with evidence
  (polish-ambient-finisher2-report.md carries the addendum).

## What shipped, by founder item

- P1 Request-a-change lane: backend Reveal.change_request_for (permission
  = plan has a conversation + viewer is a member + a scope person exists +
  no proposed revision exists; alternatives = another party's shared
  availability window into that conversation, usable and not at the plan's
  start; sender-fixed and conversation-less plans never show it). Web lane
  renders on deck / thread / chats and routes into the scoped Opal
  conversation - the existing revision machinery, no parallel path.
  (polish-lane cluster report.)
- P2 Thread Opal doorway: stateful header control in person threads opens
  the scoped Opal conversation ("About this chat"); one-tap return both
  directions.
- P3/A1/N1 Private graphs (owner-vault semantics): plan_privacy_marks
  per-viewer marks; the VaultFilters sweep covers chats, thread, call log,
  deck, search, orbits, Home. Private is a STATE, never destruction; the
  space is titled plainly "Private graphs"; the make-private action lives
  ONLY in long-press menus (plus the detail overflow accessibility path) -
  no standing per-card prompt anywhere. Per-viewer rule: the marker never
  leaks to other parties.
- P4 Orbit sheet: plain-language purpose header; labeled PLANS block vs
  YOUR CHATS WITH OPAL block; "Orbit options" holds the "Hide these Opal
  chats behind my passcode" toggle; no prominent private row.
- P5 Lit-reveal legibility: "Opal's pick" micro-label bound to the lit
  flag only (data-lit-source="opal_pick"); scarcity preserved - no
  additional fire anywhere.
- P6/N7 What Opal remembers: clarifying subtitle + provenance; manual add
  and delete are REAL on the existing capsule/memory store, with
  timestamps and provenance shown. Password check HONESTLY ABSENT - Opal
  has no passwords (phone-code only); step-up re-auth is a founder-gated
  backend build (see gated list). Capsule long-form representation is
  wallet-build scope.
- P7 Ambience at rest: raised inside Ambient Rulebook AR-00.2 envelopes;
  AR-18 rules toggle ambience (on = the state's color lit, off = settled);
  AR-19 rules the leave-now escalation beat.
- P8 Search + create: search wired to a real GET /product/search (people /
  plans / places / chats / intentions kinds, role/circle sections,
  create-row actions); create flows verified real at the contract layer
  (plan arrangements place-first / trip / idea, chat people picker, call
  setup, story/post composer, share sheets including the external invite
  landing).
- P10a Connected call surface: graphing light visible to all parties with
  per-call pause; truthful participant states; plan-in-context on the call
  surface. F-16 live transcription stays HONESTLY ABSENT.
- P10b Orbit trace (AR-F7): border light only while a sustained live state
  is true; reduced-motion = steady ruled border carrying the same meaning.
- P10c Leave-by: Geoapify traffic=approximated - copy reads "Estimate -
  typical traffic, not live", never "live"; the G2 place-coordinates
  writer means real plans carry coordinates; plans without a place
  location show the honest not-available state.
- P11/P12 Density constitution: past-as-pill (period + count +
  highlights, settled/white treatment, expansion by intent into ledger
  rows); declined/expired invitations settle as one summarized line; time
  buckets + importance pinning; heavy-persona fixture (142 plans in the
  list projection, 146 past); horizon band (distant presence weight);
  horizon migration; preparation spine (intent -> preparation -> event ->
  settling, owner + state per task, no simulated completion).
- P13/P14 Etiquette: per-recipient response windows (POST
  /opal/plans/:id/response-window takes {recipient_id, window_seconds};
  relationship-gated); limbo = cooling treatment (amber cooling toward
  muted, NEVER action red); expiry fires the graceful fork ("decline, or
  ask for another time?") then a kindly auto-decline freeing both parties;
  event-driven on Oban + PubSub (see the no-polling law in Architecture).
- A2 Call-log pill containment: worst overflow 36.5px -> 0 across
  kind/state combinations, both themes, bounding-box pin.
- A3 + connections-clarity: ONE Connections room, Muse-shaped (quiet
  rows, details behind the row); ingestion renamed "Where Opal reads
  from"; the duplicate "Connected sources" entry is gone.
- N2 Your moments clarity: caption, whose it is, Live badge, expiring
  line, working Manage sheet (Post a moment / Keep longer / Delete).
- N3 Family picker: subtypes expand INLINE (accordion).
- N4 Age bands (Under 13 / 13-17 / Adult 18+): affordance built on the
  relationship projection; the safety POLICY is founder-gated, not
  invented.
- N5 Toggle ambience: AR-18 (see P7).
- N6 Care & household room REMOVED from Settings (doorway only); the care
  machinery in code is preserved untouched; the fork idea is recorded in
  the roadmap notes.
- N8 Appearance, Location & Travel, Privacy screens untouched (praised).

## Captures + WALK-6

Two campaigns against the integrated tip ad17cafd (pack:
shots/repair19/pack-v2/, full accounting in POLISH-MANIFEST.md).
Campaign 1 banked 26 frames before the backend 429 throttle stopped
it per the hard-stop rule. The integrator re-run completed the pack
on a restored stack, arranging REAL states rather than painting
them: a real two-account conversation, a shared availability window
(the P1 lane), a per-recipient response window (the P13/P14 chain),
a real long-press vault cycle, and a fixture-fed density harness
(declared as fixture-fed wherever used). Every registry frame is
SHOT or DECLARED by name in the manifest; thirteen frames whose
pixels did not prove their names were removed from the pack.
WALK-6: 23 verdict rows flipped at finalization - GREEN for P1, P2,
P3, P5, P6, A1, A2, A3, N1, N2, N3, N6, N7, N8, CC, P9, P11, P12,
P10d, A4; PARTIAL with named remainders for P7, P8, P10a, P10c,
P13, P14; DECLARED with blockers for the P4 orbit-sheet frame, the
P10b trace frames, and the fork/closure frames. Defect dispositions
from the campaigns: D-1/D-8 error-state zero counts (charged, not
fixed this wave); D-2 lane-in-seed (solved by arrangement); D-3 seed
self-title (seed-data quality, charged); D-4 dev badge overlaps
composer/menu rows in capture frames only (not in the product);
D-5 Home and Center deck render near-identical opening surfaces
(named finding); D-6 gate copy ruled compliant with the corrected
N1; D-7 vault unlock - RESOLVED as throttle collateral (unlock
renders on a healthy stack); D-9 frozen dev clock vs Oban
wall-clock scheduling (blocks rendered fork/closure proof only;
production scheduling is coherent); D-10 a failed search renders
as "No match" (charged).

## Three alignment shapes (founder lens, 2026-10-19 20:36 PDT)

- SOLO: Home, deck, graphs, density, memory, moments, and the
  private vault are all rendered-proven for the single user
  aligning with themselves, including under the 142-plan heavy
  fixture. No solo degradation found beyond D-5 below.
- 1-TO-1: the strongest shape this wave. The request-a-change lane
  was arranged and rendered between two real accounts (and its
  disappearance proven); the etiquette window and limbo states
  render truthfully from BOTH seats; the thread Opal doorway
  navigates both directions; the vault's per-viewer rule held in
  every probe (the other party's view never changed). Named
  degradations: connected-call frames are proven only to
  initiation in the capture rig (the second seat's answer control
  never surfaced there), and fork/closure are pin-proven but not
  frame-proven (D-9).
- 1-TO-MANY: group plans render correctly across deck, graphs, and
  the density set (the heavy fixture is mostly group plans; the
  preparation spine is framed on a 5-of-6-going plan and on a real
  served 2-of-6 detail). Named degradation: group-variant etiquette
  is pin-proven (wiring suite) but the staged chain this wave was
  1-to-1 - no group fork frame exists, declared rather than implied.
- Named finding (all shapes): D-5 - Home and the Center deck open
  on near-identical surfaces; the two entry points do not yet earn
  their separation. Also D-3 (a seed plan titled "Plan with Ethan
  Walker" is shown to Ethan himself - seed-world data quality, not
  a product defect) and the staging-world duplicate person
  projection (the seed-world person and the real second account
  both project as "Maya Torres").

## Asset accountability (A4) + total recall (P9)

Tables finalized at coordination/repair19/polish-a4-draft.md and
polish-p9-draft.md (statuses verified by the records drafter against
source + this integrator's five source-verified closures + rulings:
W-GAP-29 leg 1 closed; P7 = one founder item, two legs). Headline
honest absences: the in-thread attach sheet (no message-media
model); live call transcription (F-16); memory password check (Opal
has no passwords - step-up re-auth is a gated backend build);
Robin DeFiore heavy-persona account sign-in (fixture-fed density
renders instead); Robin-scale density unproven (perf under load is
an open, named item); Google OAuth sign-in (founder step); live
traffic on the routing leg (estimate-class, labeled on the surface).

## Novelty record (per pattern: alternatives, pick, reason)

- Past/archive: Settled Stones (field of dimmed stones) vs Past-as-
  Pill (founder pattern) vs Quiet Ledger (typographic book). PICK:
  pills-as-default with the ledger as the expansion language and
  settled stones recorded as the graph-layer successor direction -
  clarity senior (the founder must read period+count+highlights at
  a glance; a stone field does not yet say its counts).
- Invitations: Cooling Invitations (temperature grammar) vs static
  settle lines. PICK: both, layered - cooling temperature is the
  live grammar (P14 limbo), the settled line is its archive residue
  (P11) - the novel pattern won where it clarifies (time made
  visible on live cards) and the typographic line won in the
  archive (reading, not decoding).
- Horizon: Distant Stones (faint far-field glyphs) vs horizon band
  rows. PICK: the band with the stones' presence language (distant
  weight, low contrast, migration by presence-weight) - the band
  reads at a glance in a list constitution; the pure glyph field
  remains the graph-view direction.
- Time ("what's Saturday"): day-grouped buckets + horizon migration
  vs calendar grid (rejected by doctrine) vs a radial week dial
  (considered; rejected - novel but slower to parse; clarity wins).
- On-call: orbit trace (border light for sustained live states)
  PICKED as the novel Opal-native grammar over picture-in-picture
  tiles or banner chips - the trace carries state in peripheral
  vision inside QUIET caps, with a ruled reduced-motion equivalent.
- Moments (N2): rethought vs relabeled - PICK: clarity pass with
  real manage affordances now (caption/whose/expiry/edit), keeping
  the surface; a deeper rethink (moments as memory-capsule drafts)
  is recorded with the wallet build, not improvised here.

## Architecture notes

- PRODUCTION PROACTIVITY IS EVENT-DRIVEN - ABSOLUTELY NO POLLING in
  the live application (founder's law, P13, recorded verbatim).
  State changes, channels, and scheduled jobs carry the signals;
  staging-time polling is an implementation detail that does not
  ship. The etiquette chain (windows, limbo, fork, auto-decline,
  notices) ships on Oban scheduled jobs + PubSub broadcasts.
- Phone-number identity doctrine (founder, 2026-10-19 18:01 PDT):
  people join Opal with their phone numbers - TRUST (a verified,
  hard-to-fake root), DATA CONTINUITY (numbers are stable for
  years - the anchor for a person's data and wallet across devices),
  SPAM RESISTANCE (verification weeds out abuse at the door). Future
  identity work (passwords/2FA expansion, gated) builds ON the
  number, never replaces it as the root.
- Federation cohesion (founder, same record): sibling apps (Otzar =
  the work-domain app) are separate apps held together by cohesion
  through the Memory Wallet - one person, one wallet, many domain
  windows. Apps may fork (cf. the care fork, N6); the wallet is what
  makes them one system. Also recorded in
  shots/repair18/WALLET_MAP.md (addendum, integrator commit
  1f69eb81).
- Opal Trivia (founder concept, 2026-10-19 18:28 PDT): recorded in
  coordination/repair19/polish-concepts.md as a designed concept for
  the post-walk phase - memory-validation game layer (KNOW THEM /
  ABOUT YOU / CIRCLE TRIVIA), the scoped context builder as
  quizmaster, guesses never overwrite truth, subject-only
  validation, anonymous-by-default validation requests, spin
  presentation at play-surface intensity, reward terms founder-
  gated, sensitivity gates (no deceased/estranged quizzing; minors
  inside family scope per the age-band policy). NOT polish scope.
- Private is a state, never a destruction (founder reaffirmation):
  privating changes visibility only; the graph, its data, and its
  history persist in full; un-privating restores every surface's
  indicators respectively. Per-viewer: the owner's vault governs
  the owner's surfaces only; the private marker never leaks to
  other parties.
- Leave-by honesty: the wired routing source (Geoapify) serves the
  "approximated" traffic model - the surface labels estimates
  "Estimate - typical traffic, not live"; the word "live" for
  traffic is FALSE anywhere in the product and stays out.
- Care (N6): the Settings Care & household room is withdrawn; the
  care machinery in code is preserved untouched (founder decision -
  possible future care-focused sibling app per the federation
  principle).

## Founder-gated list (one list, per standing instruction)

1. Merge decisions: muse/r19-polish (and the wave's cluster
   branches) merge only by the founder's hand. FOUNDER_ACCEPTED
   stays NO; FREEZE = HOLD; PASS2 = NO.
2. Production API + DNS cutover steps (founder/registrar side).
3. TestFlight build + submission (steps in
   shots/repair17/TESTFLIGHT_STEPS.md).
4. Google OAuth client creation (sign-in stays honestly absent
   until then).
5. Google Places production enablement.
6. Twilio Messaging sender setup (SMS ingestion waits on it; the
   Connections room shows phone checks as simulated until real).
7. Stripe production enablement (GAP-23).
8. muse/r19-erasure branch decision (keep / merge / retire).
9. Memory step-up re-auth build (password check for memory
   add/delete; Opal has no passwords today - phone-code only).
10. Age-band safety POLICY: what Under 13 / 13-17 / Adult restrict
    (messaging, care surfaces, discovery) - the affordance ships;
    the policy is the founder's call, not invented here.
11. Incentive/reward TERMS for sharing and for Opal Trivia
    (commercial model; the flows ship, the terms wait).
12. Orbit naming pick (current copy is descriptive plain language,
    not a coined name).
13. The N5 default-happening color-weight question (Ambient
    Rulebook default).
14. The wallet build per WALLET_MAP section F (memory capsules'
    long form lives there; this wave built only what is true on
    the current store).
15. Robin-scale density/perf pass (perf harness + a sign-in-able
    heavy-persona account; this wave proved density under a
    fixture-fed harness, declared as such).
