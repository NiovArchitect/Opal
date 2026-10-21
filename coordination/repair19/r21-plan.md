# Repair #21 - CALM WAVE plan (coordinator record)

Base: muse/repair-20 tip 14ab0ecb PLUS muse/r20-flows tip 70584ad8
(the "Flows" nav-label micro-fix HAD landed when the wave started -
wt-r20-flows, commit "R20 micro-fix: social surface nav label
Flow -> Flows"). Branch muse/repair-21 created directly at
70584ad8 in wt-repair21; no cherry-pick needed. Recorded per brief.

Gates: FOUNDER_ACCEPTED = NO, FREEZE = HOLD, PASS2 = NO. No merge,
no production deploy, no user-data deletion, additive-only,
muse/repair-17 untouched, NO walk link.

## Clusters (parallel, own worktree + branch from 70584ad8)

- W-1 ORBIT v3 - muse/r21-orbit (wt-r21-orbit). Radical calm
  rebuild of OrbitScreen on v2 wiring. Addendum folded in:
  (A) empty-state italic-(i) info bubble pattern (explanation
  behind the bubble, never on first paint);
  (B) ACCEPTANCE LENS - DISCOVERY: surprise, discovery,
  anticipation; if a frame needs a caption to be understood, the
  frame fails. PROTOCOL EXCEPTION: v3 frames
  (orbit-v3-{1to1,group,empty}-{dark,light}) go to the parent the
  moment they exist, before the rest of the wave integrates.
- W-2/W-3 CALM SURFACES - muse/r21-calm (wt-r21-calm). Separation
  + emphasis system (hairlines, bold + state-colored key values,
  low-vision contrast) on plan detail / thread Next Together /
  deck cards; shared treatment exposed for Orbit. Label stripping
  audit across the served shell (Discovery Doctrine) with a
  per-removal ledger; shell-wide empty-state (i)-bubble audit
  (Orbit's empty state excluded - W-1 owns it).
- W-5 BUILDS - muse/r21-builds (wt-r21-builds). (a) Fork-answer
  surface: rendered answer controls for the etiquette fork where
  its presentation lives (plan card/detail, thread if applicable),
  wired to the existing respond endpoint - closes R20
  declaration #4. (b) Group membership UI: multi-select add,
  admin-rule remove, leave, membership events into the orbit
  record, orbit identity stable. (d) In-call orbit doorway:
  wire only if truthful, else sharper declaration.
- W-6 CONNECTORS - muse/r21-connectors (wt-r21-connectors).
  Per-row truth audit against real provider flows; wire only
  real-but-unwired rows; Google rows stay founder-gated with the
  exact step named; per-row table (live / gated / queued) is a
  delivery artifact. R20 declaration #8 (Gmail copy repeat) in
  scope if touched.

## Coordinator-owned, after integration (on the final tip)

- W-4 FROSTED PAD proof set: per-surface scroll sequences
  (Flows / Chats / Graphs / Thread / Plan detail) + drag test,
  both modes. PRECISION (founder, 2026-10-20 13:14 PDT):
  "content never resting behind the pad" binds ONLY the
  END-OF-SCROLL REST STATE - when the user reaches the bottom of
  a page, the final content must come to rest fully ABOVE the
  frosted border/pad, never trapped behind it. Mid-scroll,
  content passing behind the frost IS the intended dissolve
  behavior and is NOT a violation. Proof obligations, exactly
  two: (1) rest position at page bottom - bottom inset
  sufficient on every scroll surface, tested explicitly as a
  rest-state pin; (2) the dissolve during travel. Pad never
  moves under drag/scroll (fixed anchoring). Failures get
  fixed, not declared away.
- W-5c cardmenu-graph-private re-shoot: get the vault unlock
  path working in the rig and capture the private card menu.
- W-7 walk-prep: LIGHT MODE recorded as the founder's walk
  default in the handoff + walk script (parity still proven
  both modes in frames).
- Integrated battery on the final tip. WATCH LIST (the two R20
  load-flakes, CPU-ratio tests that failed only while capture
  rigs drove the same box; standalone 25/25 green x3 at R20):
  apps/opal_core/test/opal_core/social_flow/human_validation_test.exs
  (longitudinal) and
  apps/opal_core/test/opal_core/social_flow/compound_quality_test.exs
  (dyad maturity) - run the battery WITHOUT capture rigs on the
  box; if either fails, re-run standalone x3 and record exactly.
- API regression 101/101, web exact baseline (23 failed / 16
  files name-for-name), mobile 105/105, typecheck exactly 9.
- Pack hygiene: superseded frames archived to
  shots/repair19/pack-archive/ with version labels; frame-version
  audit line in the handoff.
- Push via the API method with tree verification (local tree ==
  remote tree), per the standing transport discipline.
- Handoff: coordination/repair19/repair21-handoff.md with the
  reconciliation checklist (this brief W-1..W-7 + R20 declared
  items converted or re-declared by name: capsule-filing,
  fading scaffold, Law 4 fuller bilateral rendering,
  connected-call frames, leave-by estimate frames - carried
  declarations stay named, never silently dropped).

## Founder doctrine carried into this wave (do not skip a thing)

- Discovery Doctrine: intuitive requires no explanation;
  explanation lives in documentation or behind an (i) bubble.
- Calm Law for Orbit v3 + Discovery acceptance lens (above).
- Light mode is the founder's favorite and his walk default.
- Every R20 Orbit law stands; v3 is presentation only.

ADDENDUM (2026-10-20 13:15 PDT) - W-6 CONNECTOR CATALOG: the room
promises breadth with choice; the catalog spans Your device,
Google/productivity (Gmail, Calendar, Drive, Docs, Sheets),
Social, Business, Finance (Plaid), Travel (flight booking),
Payments, Custom. The W-6 report must carry the full catalog as
the standing expansion map: every row with status live /
founder-gated (exact step) / queued (wiring need). Experience
bar: one guided permission ask in plain words per tool, Plaid
and flights with the same ease as Gmail. Relayed to the W-6
cluster in flight (submission ed03f7d6).

W-6 CATALOG, EXACT (founder, 2026-10-20 13:18 PDT - supersedes the
13:15 paraphrase; relayed to the W-6 cluster, submission 2f11986c):
Row grammar: app icon + name + ONE action word ("Connect" /
"View"); category headers carry "See all"; no other text on a
row. Rows: Productivity - Google Drive, Finances (Plaid), Google
Sheets, Google Docs, Gmail, Google Calendar. Social - Instagram,
Facebook, Threads, Instagram Messages, Spotify. Health -
Peloton, Function Health, HealthEx. Business - Meta Business
Manager, GitHub, Canva, Dropbox, Zoom. Custom - Custom
connectors (count subtitle, chevron). Your Device - Calendar,
Contacts, Reminders, Health, Home. The delivery map is 1:1 with
this catalog; queued rows never render in the shipped room until
TRUE - they live in the table + map only.

W-6 SEMANTICS (founder, 2026-10-20 13:18 PDT; relayed to the W-6
cluster, submission 72461fad): "View" = already connected and
already working (arrived via device grant or account link, never
needed a Connect tap); "Connect" = fresh permission ask. Every
catalog row carries an arrival-path marking: pre-connected via
device grant / pre-connected via account link / fresh permission
ask. FEDERATION NOTE: connection state belongs to the WALLET,
not the app window - connected once = connected across Opal /
Otzar / future domain apps; never re-ask. The connectors report
records both, plus where connection state actually lives in
today's code and the gap if it is per-app.

FOUNDER LAWS ADDED TO THE WAVE CHECKLIST (2026-10-20 13:23 PDT):
(L-1) THE GREETING IS TRUE - on Flows AND Center: the time-of-day
word follows the VIEWER's timezone at the moment of viewing; the
name is the SIGNED-IN USER's own name, no one else's. Proof:
pinned-clock legs (same instant, morning in one timezone /
evening in another) + two-account own-name check.
(L-2) CONNECTORS ARE PER-ACCOUNT - the catalog is universal; the
state is personal (own connections, tokens, View/Connect truth;
custom connectors included). State lives in the person's wallet
scope - shared across THEIR domain apps, never across people.
Proof: two-account connector-state separation test (isolation
species); the rule is stated in r21-connectors-report.md beside
the catalog map. Verification cluster: muse/r21-laws.

INTEGRATION NOTES (coordinator, 2026-10-20):
- All five cluster branches merged into muse/repair-21:
  W-6 (3d7cf86b), W-2/W-3 (f338968b), L-laws (244cc9c2),
  W-1 (4f4a43ff), W-5 (e6b4e794; single conflict in
  productClient.ts, purely additive type fields - both kept).
- Integrator seam fixes (one commit on top of the W-5 merge):
  (1) W-5b's "WHO CAME AND WENT" card folded into the Where
  card as hairline rows (separate kicker card violated the v3
  composition law); line testids preserved, r21GroupMembership
  8/8 green. (2) The orbit Where card's duplicated Next
  Together (projection where_lines[0] restates the key row)
  deduped at the render seam + pinned in r20Orbit (25 tests).
  Affected suites on the integrated tree: 66/66 green.
- Migration count: W-5b added ONE additive migration
  (conversations.created_by_user_id) - step-zero at battery is
  118, not R20's 117.
- Close-out sequence (single worker, in order): captures on the
  integrated tip (W-4 proof set per the 13:14 rest-state
  precision, W-5c cardmenu re-shoot, orbit-v3 re-shoots on the
  integrated tip so pack frames match the shipped tree), THEN
  rigs down and the full battery on a quiet box, pack archive +
  frame-version audit, API push + tree verification, handoff.
