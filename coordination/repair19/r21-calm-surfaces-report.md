# Repair #21 - Cluster W-2/W-3: Separation + Emphasis System + Label Stripping

Branch: muse/r21-calm (base 70584ad8, muse/repair-20 tip + "Flows" label fix)
Scope: served C2 shell surfaces only. OrbitScreen.tsx/css were NOT touched
(that room is muse/r21-orbit). No merge; muse/repair-17 untouched.
Copy rule: plain hyphens only in new/changed user-facing copy; no em dashes.

## 1. Shared treatment spec (what Orbit consumes)

Defined ONCE in apps/opal_web/src/c2/shell/c2shell.css (section
"R21 W-2 CALM: separation + emphasis (shared)"), plus the one shared
component InfoBubble in apps/opal_web/src/c2/shell/bits.tsx (already
imported unchanged by apps/opal_web/src/opalUi/c1/C1Surfaces.tsx).

For the Orbit cluster (muse/r21-orbit) - consume exactly this:

- Markup classes (defined in c2shell.css, @layer c2; OrbitScreen is
  hosted inside the C2 shell so the sheet is loaded):
  - .calm-stack - a container of stacked rows; every .calm-row after
    the first gets a hairline top border (1px solid var(--line-1)).
  - .calm-row - one row inside a .calm-stack.
  - .calm-key - a heading / key value: font-weight 700. Color rules:
    [data-state="action|ready|forming|happening|past"] paints the
    state color; [data-entity="1"] with style="--calm-entity: <token>"
    paints an entity color; no attribute = surface ink (--ink-1).
  - .calm-sub - secondary text at the legibility floor (see below).
  - .calm-clickable - a row that opens something: visible chevron
    affordance (::after) plus pressed/focus fill. Not cursor alone.
  - .calm-info / .calm-info-wrap / .calm-info-pop - the (i) bubble
    treatment (20px circle, italic serif i, --line-2 border, --ink-2).
- Component: InfoBubble({ text }) from c2/shell/bits.tsx - renders the
  .calm-info button (data-testid="calm-info", aria-expanded); tapping
  reveals the text in .calm-info-pop (data-testid="calm-info-pop").
  Use it for any explanation Orbit needs; do not plaster copy.
- Color rule (important): text never wears the raw canon hex. Canon
  (action #FF4D5E, ready #FFC86B, forming #8B5CF6, happening #00E5FF,
  past white) stays on rules, stones, pills and borders, where it
  already lived. TEXT wears the mode-adapted --state-*-ink derivative
  of the same canon hue (c2Tokens.css), because raw gold/cyan on the
  light canvas fails the founder's glasses-off contrast pass. The
  .calm-key[data-state] rules encode exactly that mapping, so Orbit
  gets the canon family with legibility by using the classes alone.
- Legibility floor (the low-vision pass): secondary reading text is
  --ink-2 in both modes (light #44403c, dark #cfc8d8). --ink-3 is
  retired for reading text in the treated surfaces: .c2s-detail-kicker,
  .c2s-who-tie, .c2s-story-sub, .c1-session-tie and .c1-session-time
  were all raised from --ink-3 to --ink-2, and PlanAwareness text/meta
  lost their 0.85 opacity fade for full opacity + --ink-2.
- Mirrors: c1.css carries [data-design="r18"] mirrors of .calm-key and
  .calm-info so C1 surfaces keep the treatment in standalone mounts.
  The canonical definitions remain c2shell.css.

## 2. W-2 per-surface application

- Plan detail (C2Graphs.tsx C2GraphDetail - the founder's brunch
  example surface):
  - Hairlines: .c2s-detail-section + .c2s-detail-section now draws a
    1px var(--line-1) top border, and .c2s-who-row + .c2s-who-row the
    same - the stacked sections and the roster rows no longer run
    together. (The former "Where we're at" card is the detail's
    PlanCardC2 head; the sections under it are what separated.)
  - Emphasis: When value = .calm-key[data-state=plan state]; Where
    value = .calm-key (entity emphasis, bold surface ink); leave-by
    line = .calm-key[data-state] with its existing leave-now action
    escalation unchanged.
  - The who roster keeps name (bold) / response / location as
    content, now separated per row.
- Thread Next Together strip/cards (C1Surfaces.tsx, PlanCard.tsx,
  PlanAwareness.css):
  - The strip already had a hairline bottom (c1.css); the strip's
    plan-awareness text is now semibold at full opacity (was a faded
    0.85 run), and the row variant's meta line sits at the calm-sub
    floor (--ink-2, opacity 1).
  - PlanCard (strip/thread sizes): the when line is .calm-key with
    data-state=<plan state> - bold, in the plan's state color. The
    strip card already carried a chevron affordance; kept.
  - Note: the strip variant of PlanAwareness keeps its compact
    one-line grammar - that grammar is pinned by
    r19ChatsThread.test.tsx ("strip and call variants keep the
    compact one-line form"), so emphasis there is typographic
    (weight + opacity), not a restructure.
- Deck / Center cards (PlanCardC2.tsx, C2CenterOpening.tsx):
  - PlanCardC2: the when line is .calm-key[data-state=<family>]
    (bold, state color). The title stays surface ink per the card's
    own contract ("Human title. Always rendered in surface ink,
    never state color").
  - Clickable affordance: cards with role="button" now get cursor +
    a visible chevron at the top-right + a pressed fill
    (.c2-plan-card[role="button"] rules in c2shell.css).
  - Center's bespoke Next-together card: its time line was hardcoded
    to happening ink for every state; it is now .calm-key with
    data-state=<the next plan's own state family>.
- You hub / settings rows and Graphs list cards already had hairline
  row separators (.c2s-row border-bottom inside .c2s-row-block;
  thread rail + cards) - verified, no change needed; their key
  values already render bold at --ink-1 with --ink-2 subs, which now
  matches the shared floor.

## 3. W-3 removal ledger (every removal audited)

Dispositions: STRIPPED (gone from the surface), BEHIND-(i) (moved
behind the InfoBubble), KEPT-AS-CONTENT (audited, survives, why).

| Surface | String | Disposition |
| --- | --- | --- |
| Thread (next-plan strip) | "Opal chats about Maya Torres" / "Opal chats about Ethan Walker" (the Opal-chats index button, testid opal-chats-index-open) | STRIPPED - founder-named. The header doorway orb (thread-opal-doorway) and the orbit it opens carry the meaning. Pinned absent by r21Calm.test.tsx |
| Thread (no next plan) | Same label in the slim zone under the header (testid thread-opal-zone) | STRIPPED - the whole zone existed only for that label; zone deleted with it |
| Center session list (Chats with Opal) | "Filed by what they are about. Your current chat stays at the top." (.c1-sublabel) | STRIPPED - pure instruction about the list it sat on; the Continuing/Pinned/Orbits/Earlier groups carry the filing visibly |
| Plan detail | "Who is coming, and where they are" (.c2s-detail-kicker over the roster) | STRIPPED - hand-holding label; roster rows (name, response, location) are self-evident. r19Graphs.test.tsx assertion flipped to absence (see Tests) |
| Plan detail | "Next step" (.c2s-detail-kicker over the next-action button) | STRIPPED - the button's own label is the step |
| Plan detail | Location-share explainer: "Sharing your location is per plan and shares where you are right now, once - a snapshot, not live tracking. Only people on this plan see it, until you stop sharing or 4 hours pass." | BEHIND-(i) - genuinely needed (privacy), one tap away beside Share my location. JA-09 honest wording unchanged inside the bubble (its em dash became a plain hyphen per the R21 copy rule). ja09 test flipped to absent-on-surface / present-after-tap |
| Plan detail | Private-graph explainer: "This graph is in your Private graphs. On your surfaces it shows only inside that space - everyone else on the plan keeps their own view of it." | BEHIND-(i) beside More actions - the private state itself is carried by the vault gate |
| Graphs list (Past view) | "Everything that already happened, in the order it settled." | STRIPPED - explained its own heading ("Completed and past plans") |
| Graphs list (Someday shelf) | "Nothing on the shelf yet. Ideas you save will live here." | STRIPPED in part - the quiet state "Nothing on the shelf yet." stays; the explanatory second sentence is gone |
| Opal chat (CenterChat) context chip | "Opal chats about <person>" (testid opal-context-open-index) | KEPT-AS-CONTENT - audited and deliberately NOT stripped: this one is not a thread label or a section header, it is a navigation action inside Opal's own chat (the two-way door back to the person's Opal-chats index), rendered next to "Back to your chat with <person>". The founder's named examples were the thread headers; removing this would delete a working route, not a label. Flagged here so the coordinator/founder can overrule if the intent was all three |
| Thread strip | "NEXT TOGETHER" kicker | KEPT-AS-CONTENT - the strip's name (a plan-state surface the founder has repeatedly protected, incl. its solid-header rule), not instruction |
| All surfaces | Surface titles and content group titles: Chats, Calls, Flows feed leads ("Your people", "Moments and plans"), deck groups ("Needs you", "Coming up", "Taking shape", "Next together"), Graphs groups, You hub group labels, plan-detail kickers When / Where / When to leave / Settled / Activity / Check in | KEPT-AS-CONTENT - each names the content under it (a plan set, a value kind, a state); none instructs. "When to leave" survives because the leave-by line is meaningless without it |
| Settings sections (You hub) | Section ledes (e.g. "Loud for people. Quiet for noise.") and field reasons | KEPT-AS-CONTENT - Settings is the sovereignty/control surface; the founder's settings law requires every setting TRUE in plain words with its reason on the room. Explanation is the content of this surface, not plaster on a social surface |
| Search / error states | "No chat matches that search.", "No call matches that search.", "No match. Try Privacy or Notifications.", error lines (feed error text via EmptyBlock lineVisible) | KEPT-AS-CONTENT - live feedback about the user's own action or a real failure, not standing instruction |
| Thread | "ONLY YOU" private-guidance kicker + guidance line | KEPT-AS-CONTENT - a privacy state marker on a private thread (state, not instruction); it renders only when the host supplies private guidance |
| Create flows / sheets | Field labels (Who / What / When / Where) and sheet titles | KEPT-AS-CONTENT - form labels are the control's identity, required for the control to be usable at all |

ThreadShell API note: onOpenOpalChats is still accepted (host
compatibility) but no longer rendered by the thread; personContext
now feeds only the header doorway's richest-context selection.
C1ShellHosts still passes both - no host change needed.

## 4. Empty-state audit (shell-wide)

Pattern applied: quiet state (headline only) + InfoBubble; the
explanation reveals on tap. Orbit's empty state is the other
cluster's and was not touched; every other primary surface's was
audited:

- Shell-wide mechanism: bits.tsx EmptyBlock now renders its `line`
  behind InfoBubble by default. That single change converts, with
  no per-call-site edits: Graphs error / empty / lens-empty, Flows
  feed empty ("Nothing here yet."), the people-picker empty
  ("No one connected yet."), the Activity empty ("All quiet."), and
  every other EmptyBlock consumer in C1ShellHosts/C2Shell.
  Exception: a caller whose line is live content passes lineVisible
  - set on the Flows feed-error block, whose line is the error's
  own words.
- Center session list empty: "No chats yet." + (i) "Start your
  first chat with New chat."
- People chats list empty: "No chats yet." + (i) "Start a chat
  with + New."
- Call log empty: "No calls yet." + (i) "Calls you make and receive
  will show up here." The search no-match line stays on the surface
  (feedback, above).
- Center deck calm state: "Nothing needs you right now. It is all
  yours." KEPT as-is - a quiet state line, no explanation in it.
- Graphs past-empty ("Nothing completed yet."), private-empty and
  settled lines: quiet single lines already; no explanatory text to
  move. The shelf line was shortened (ledger above).
- Settings search no-match and shell search no-match: feedback,
  kept (ledger above).

## 5. Tests

New: apps/opal_web/src/c2/shell/r21Calm.test.tsx (11 tests):
- The named pin: no "Opal chats about" / no opal-chats-index-open /
  no thread-opal-zone in ThreadShell for Maya Torres (with a next
  plan) and Ethan Walker (without); header doorway still present;
  plus a source pin that ThreadShell's source renders neither string.
- Sublabel absence; three empty states reveal their explanation only
  after tapping the (i) bubble; EmptyBlock default behavior.
- Plan detail: who kicker absent, when value is .calm-key with
  data-state="ready", location explainer behind (i) with JA-09
  wording intact; PlanCardC2 when line calm-key + button role.
- Shared-system pin over c2shell.css (calm classes, state rules,
  detail/who hairlines) - the Orbit consumption contract.

Flipped assertions (stripped copy):
- c2/shell/r19Graphs.test.tsx: "Who is coming, and where they are"
  was asserted present; now asserted ABSENT, with the reason in a
  comment at the assertion.
- c2/shell/ja09LocationShareHonesty.test.tsx: the location explainer
  was asserted on the surface; now asserted absent before the tap
  and present (same honest wording, same "not next 4 hours" ban)
  after tapping the bubble.

Typecheck: tsc --noEmit reports zero errors in every touched file.
Repo-wide it reports 8 pre-existing errors in untouched files
(OpalApp.tsx x3, api/productClient.ts x4, YouSettingsDestination.tsx
x1) - present on the base, not introduced here.

Full-suite results: the whole apps/opal_web tree was run twice in
full parallel mode. Both runs reported a small set of failures in
files this cluster did not touch, and the two runs' failing sets
were DIFFERENT (13 tests / 4 files, then 17 tests / 8 files, with a
rotating cast: homeSocial, r20Orbit, GraphDetailSheet.attendance,
r19CallsHost, fa01ChatsSearchExercise, harmony2, c1ShellWiring,
r20ComposerFurniture, r19ListenRail, plus one consistently named
device-location-sharing test whose path does not exist in this
tree). Every one of those files was then re-run individually or in
small batches on this branch and PASSED (61 + 41 tests across the
two re-run batches), as did every test file that touches this
cluster's changes: r21Calm (11), opalChatDoorway (46),
r19ChatsThread (14), r19Graphs (11), ja09 (2), c1 (10),
dir1PlanAwareness, c2ShellSurfaces A1 audit (incl. the token-defined
audit over the new calm CSS), settingsArchitecture, smSoulMemory,
polishVault, f6OrbitPrivacy, r19FixB, deckfix, density, homeSocial,
r20Graphs/People/Vault/Connect/Actions, r20Orbit, r19CallsHost,
harmony2, c1ShellWiring, r20ComposerFurniture, fa01, r19ListenRail,
GraphDetailSheet.attendance, emptyStateQuality, unifyDrift,
planStateColors, repair18CenterWeb. Verdict: the full-parallel
suite is flaky in this environment (rotating failures under
contention); no test that touches this cluster's files fails, and
no consistently-reproducible failure was found. The integrator
should re-run the full suite once on a quiet machine before merge.
