# Repair #21 - Cluster W-18: HOLE INVENTORY + END-STATE AUDIT

Branch `muse/r21-holes`, base `22744b3c` (muse/repair-21 tip).
No merge, no deploy, muse/repair-17 untouched. Plain hyphens in
all user-facing copy.

THE TEST (founder, 2026-10-20 21:43 PDT): every tappable asset -
including assets nested inside other assets - must terminate in a
FULFILLED END STATE: tap -> ... -> completed action / arrived
surface with its own exits / honest empty state that still
fulfills. A rendered asset that cannot be tapped anywhere, a flow
that opens and cannot finish, a spinner with no resolution, a
sheet with no way through or back - each is a HOLE.

Method: source-level trace of every interactive element in the
served C2 shell on this base (C2Shell, C2Home, C2CenterOpening,
C2Graphs + detail, C2You + shellData sections, C1ShellHosts,
adopt3, PlanCardC2, CardContextMenu, PersonProfile,
RelationshipPicker, EventShareCard, PreparationSpine,
GroupMembership, C2Onboarding), cross-checked against the branch
reports on this base and the sibling worktrees (wt-r21-openings,
wt-r21-orbitv4, wt-r21-calls, wt-r21-flows2, wt-r21-connectors).
Sibling-owned surfaces (Orbit v4, openings/Flows rebuild, flows2,
calls, connectors room) are audit-only here; findings on them are
declared with provenance, never built here.

## Counts

Tallied from the rows below (Sections A + B + C = 170 rows; two
rows are cross-references to Section A items, noted in place):

- Assets traced: 170
- TRUE (journey completes, fulfilled): 135
- HONESTLY ABSENT (not present, absence is the truth, named): 21
- FALSE (present but broken / dead / half-built / misleading): 14
  rows, 13 distinct (A-03 is cross-referenced once in Section C)
- Holes built on this branch: 2 (H-NEW-1, H-NEW-2)
- Holes declared (exact build + sequencing named): every other
  FALSE and ABSENT row

## Baselines (re-derived on this base, this run)

- Web: 24 failed / 2091 tests / 17 files failed - name-for-name the
  openings cluster's figure at this lineage. Verified, not inherited.
- Typecheck: exactly 9 pre-existing errors (OpalApp.tsx x3,
  productClient.ts x5, YouSettingsDestination.tsx x1). Zero new
  after this branch's builds (re-run in the closing check).
- Affected suites after builds: 73/73 green (r21Holes 3 new pins +
  planCardAtfix, c2Foundation, r19Graphs, r20Graphs, huntFixDetail,
  r21Calm, c2ShellSurfaces).

---

## SECTION A - The known ledger, verified (floor, not ceiling)

| # | Asset path | Class | End-state trace | Disposition |
|---|---|---|---|---|
| A-01 | Calls > in-call > live transcription | ABSENT | tap Call -> status note only -> no transcription surface exists | Declared (F-16). Build: Deepgram streaming leg + in-call surface (calls cluster / post-integration). Founder-gated config. |
| A-02 | Memory > capsule filing from conversations | ABSENT | conversation -> no file-to-capsule control exists | Declared. Build: capsule-filing wire from thread/orbit into Memory Wallet (wallet pipeline W-GAP rows). |
| A-03 | Memory > step-up re-auth on add/delete | FALSE | add/delete -> password check promised by founder law -> backend re-auth unbuilt, web gate is local only | Declared structural. Build: server step-up re-auth endpoint + web challenge wire. Post-integration, wallet track. |
| A-04 | Titles > viewer-relative titles remainder (V-1) | FALSE | plan/thread titles -> some surfaces still render creator-relative wording | Declared. Build: projection-side viewer-relative title pass on the remainder surfaces named in r20 records. |
| A-05 | Thread > anchor-move in-conversation affordance | ABSENT | thread -> no move-anchor control in the conversation | Declared. Build: orbit anchor-move control inside thread header menu (orbit track). |
| A-06 | AT-11 (ambient truth remainder) | FALSE | ambient cues -> remainder rows in ambient-truth-audit unclosed | Declared. Build: per-row closure in the Ambient Rulebook wave. |
| A-07 | BS-06 distance leg | FALSE | Graph detail > Who row > distance -> real check-in position only; no live distance | Declared partial. Build: device-location pipeline into Who projection (founder location order, 2026-10-16). |
| A-08 | BS-10 partial | FALSE | per blindspot-report remainder | Declared partial; build per blindspot-report BS-10 row. |
| A-09 | MP-2 / MP-6 pattern residue | FALSE | codebase-wide -> governed counts, not zero | Declared. Build: pattern-repair successor conversions continue per wave; recurrence charged to its check. |
| A-10 | Calls > in-call surface (r21-calls declaration) | ABSENT | Chats > Calls > Call -> createConversationCall -> status note + log re-read -> NO ringing/connecting/connected surface mounts in C2 | Declared, verified in code this run (zero CallSurface references under c2/). Build: mount CallSurface/ActiveCallOverlay in C2 shell (calls cluster owns). |
| A-11 | Calls > video path | ABSENT | call -> no video leg exists | Declared (r21-calls). Build with A-10. |
| A-12 | Thread > fork-answer leg | ABSENT | thread -> no etiquette fork presentation exists on thread, so no answer control mounts | Declared (r21-builds). ForkAnswerControl mounts unchanged if a fork presentation lands on thread. |
| A-13 | Flows > Trivia validation expiry | ABSENT | Trivia card (sibling) -> guesses never expire by validation window | Declared (openings). Build: expiry wire on the trivia validation contract. Sibling-owned. |
| A-14 | People > places/interests follow endpoint | ABSENT | profile -> no follow endpoint for places/interests | Declared. Build: follow endpoint + profile control. |
| A-15 | Center > braid narrow current | FALSE | braid -> narrow-current leg unproven at rendered layer | Declared unproven; proof owed at next capture pass, not a code claim. |
| A-16 | Graphs > nearby tier + travel intent | ABSENT | graphs -> roadmap only, no surface | Declared roadmap. No surface pretends otherwise. |

## SECTION B - NEW HOLES (this sweep's hunt, beyond the floor)

| # | Asset path | Class | End-state trace | Disposition |
|---|---|---|---|---|
| H-NEW-1 | Graphs > Plan detail > Where card > handoff button AND detail > Next-step button (c2-detail-next) | FALSE (latent-dead) | tap -> events.runNextAction -> C2Shell passes () => undefined in BOTH mounts (list + detail) -> nothing happens, no state, no words. Reachability today: the sole adapter (shellData.detailFromPlan) stamps nextAction: null and handoffLabel: null on every plan, so the buttons never render - a loaded wire, not a live dead button. The first projection that stamps either field ships a dead primary button. | BUILT HERE: both render branches removed from C2Graphs.tsx with the absence named in code (JA-06 rule). The buttons return only with a real projection + handler together. Declared remainder: runNextAction stays in the events contract (test hosts pass it); contract cleanup is a post-integration one-line removal once sibling branches settle. |
| H-NEW-2 | Plan card > nested primary button (c2-plan-primary, PlanCardC2) | FALSE (latent-dead) | tap -> stopPropagation + onPrimaryAction?.() -> on surfaces that render the card WITHOUT a handler (Center Needs-you/Coming-up plain slots, Graphs past/settled/horizon cards, the foundation gallery) a stamped label would render a button that swallows the tap AND blocks the card's own open. Today the served adapter stamps primaryActionLabel: null, so the button never renders in the served shell; the gallery renders labels with no handler and no button behavior at all. | BUILT HERE: PlanCardC2 renders the primary button only when a real onPrimaryAction handler is provided. Pins: r21Holes.test.tsx 3/3 (no handler -> no button; handler -> fires; no label -> no button). |
| H-NEW-3 | Graphs > Plan detail > header card (PlanCardC2 at detail top) | TRUE | renders with no onOpen/onPrimaryAction -> static subject card of the page itself, role/tabIndex correctly withheld by PlanCardC2 when onOpen is absent -> not a door, does not pretend to be one | TRUE with proof: PlanCardC2 sets role=button only when onOpen exists. After H-NEW-2 its nested button can no longer pretend either. |
| H-NEW-4 | Shell > crash boundary | FALSE | app crash -> legacy-faced error screen with an R17 recovery path (BS-07 / JA-05 remainder on this base) | Declared. Build: C2-faced crash boundary whose recovery re-enters the C2 shell. Not sibling-owned; sequenced post-integration because C2Shell.tsx is frost-touched by orbitv4 this wave. |
| H-NEW-5 | Shell > ?shell=r17 legacy route | FALSE | URL param -> whole R17 shell still serves (BS-07) | Declared. Build: retire the override in App.tsx with the revert-spot discipline (muse/repair-17 branch stays untouched as code; the runtime override is the hole). Founder-gated decision - name it, do not silently cut his fallback. |
| H-NEW-6 | Flows (base) > feed card action buttons | TRUE | feedAction is NOT wired in C2Shell -> C2Home renders NO action button (JA-06 fix verified in code) -> cards open their surfaces; no dead Watch remains on this base | TRUE with proof: C2Shell.tsx JA-06 comment + conditional render in C2Home. The Live viewer itself is A-declared absent (J2 exception). NOTE: sibling openings branch rebuilds this surface; re-audit at integration. |
| H-NEW-7 | Center > Needs-you deck > RevealCard actions | TRUE | tap Confirm/Dismiss/Request-change -> real plan path + outcome read-back (totality CM-2) | TRUE. |
| H-NEW-8 | Graphs > detail > completeSlot wire in the DETAIL mount | FALSE (latent) | C2Shell detail mount passes completeSlot: () => undefined while the list mounts pass openGraph - the detail's own PlanCardC2 receives no onPrimaryAction today, so unreachable; same loaded-wire species as H-NEW-1 | Declared with H-NEW-1: one-line fix in C2Shell.tsx (pass openGraph like the other mounts, or drop the field) - sequenced post-integration (orbitv4 frost hunks in the same file this wave). Neutralized today by H-NEW-2 (no handler -> no button renders). |
| H-NEW-9 | You > Memory > capsule edit/correct | ABSENT | memory room -> forget (two-step -> hard DELETE, proven) exists; no edit control -> correcting means forget + re-tell | Declared (J5 exception, W-GAP-03). Build: capsule edit surface in the wallet track. |
| H-NEW-10 | Live > start/watch a Live from the served shell | ABSENT | no go-live affordance anywhere in C2; lives read exists, Home renders live cards when rooms exist (sibling flows2 adds GoLiveFlow - provenance: wt-r21-flows2) | Declared on this base; sibling build in flight. Re-audit at integration. |
| H-NEW-11 | Composer > attach (+) sheet | ABSENT | thread/orbit composer -> no (+) renders (withheld by orbitv4 steer-8 reconciliation: in-thread media path not real) | HONESTLY ABSENT, declared in the orbitv4 report. Build: real media path first, then (+) returns. Sibling-owned surface. |
| H-NEW-12 | Orbit (sibling v4) > doorway-to-room transition | FALSE (declared-by-owner) | doorway tap -> fade/scale continuity, NOT a true shared-element morph | Declared by the orbitv4 cluster itself; web shell cannot honestly morph. Accepted declaration, re-check at integration. |
| H-NEW-13 | Orbit (sibling v4) > audio-send from orbit composer | ABSENT | orbit composer recording -> STOP-to-text only; no audio-to-Opal API | Declared by owner. Build: audio ingest endpoint for Opal sessions. |
| H-NEW-14 | Connectors room > catalog breadth rows (Drive, Sheets, Docs, Plaid, socials, health, business rows) | ABSENT | room renders ONLY Business/Gmail/Calendar/Custom per the founder catalog ruling; all other rows live in the r21-connectors standing map as QUEUED with per-row wiring | HONESTLY ABSENT with the map as the truth surface. Per-row builds named in r21-connectors-report (scope + adapter + row + pins each). Audit-only here (connectors cluster). |
| H-NEW-15 | Connectors > Google rows pre-founder-step | TRUE | row -> View with the gate line naming the exact founder step (OAuth client + env + restart) -> honest gated end state, no fake Connect | TRUE (gated form). Founder step is the only blocker. |
| H-NEW-16 | Graphs > Who section on plans-contract detail | ABSENT | detailFromPlan stamps who: [] -> Who section omitted cleanly until the Division A detail projection lands (named gap in code, spec 8.2 omission rule); detailWithHistory re-projects Who when the history read lands | HONESTLY ABSENT in the adapter leg, named in code. Not a dead surface: nothing renders empty. |
| H-NEW-17 | Mobile shell (apps/opal_mobile) | TRUE (scoped) | mobile wraps the same served web machinery; no separate dead-button species found in scan (no noop onPress / TODO stubs in src) | TRUE at scan level; full mobile end-state trace rides the web trace. Declared scope limit: no device run in this cluster. |

## SECTION C - TRUE traces (nested assets verified end to end, by surface)

Dock (5): Flows / Chats (badge = real unread) / Center orb / Graphs /
You -> each goRoute -> surface mounts. TRUE x5.

Splash + onboarding (8): Splash Enter / Already-have-account ->
onboarding phone -> code (resend real) -> meet (name/handle) ->
shell; back chevron at each step; busy states disable with reason.
TRUE x8.

Flows/Home on this base (11): header avatar -> You; search icon ->
search; activity icon -> activity; create sheet Story/Post ->
composer (camera/library are real file inputs) -> publish ->
feed; story viewer close; feed plan cards -> openGraph; moment
stones do NOT exist on this base (openings sibling) - ABSENT here,
provenance wt-r21-openings. TRUE x10, ABSENT x1 (stones).

Center (10): orb doorway -> Opal chat; Make-something -> create;
Needs-you Next card -> openGraph; limbo window line is display
truth (not tappable, does not pretend); deck RevealCards (H-NEW-7);
Coming-up / Taking-shape cards -> openGraph, completion slots ->
completeSlot -> openGraph. TRUE x10.

Chats / thread / calls hosts (13): chats rows -> thread; search
field filters (real filter); Calls tab rows render server status
verbatim; call-back -> state transition (suite-proven); people
picker rows -> openPickerPerson; phone entry -> startByPhone with
busy + note states; group membership sheet (add multi-select /
remove admin-rule / leave) -> membership events; check-in summary
sheet close + scrim; thread voice-note record -> stop -> review
player -> send; composer send. TRUE x12, ABSENT x1 (in-call
surface, A-10).

Graphs list (15): group cards -> detail; long-press card menu
(Open / Make private / Drop / Repeat where stamped) -> real
actions; fork-answer control on horizon cards -> respond endpoint
-> refresh; drop sheet confirm -> error line on failure; Past
pill expand -> cards -> detail; settled summary expand -> cards;
private gate (code entry, busy, error) -> unlock or honest error;
intentions create (person + title gate) / goals create / link /
unlink / delete; shelf starters -> promote -> promoted line;
create sheet rows -> create flows. TRUE x15.

Plan detail (19): back; share -> share sheet -> Copy details with
copied read-back; overflow menu items (private toggle, repeat)
gated on stamped handlers (canRepeat / setPlanPrivate presence);
Join online -> meeting link in new tab; virtual-no-link -> honest
line naming the host step (fulfilled empty); convert -> busy +
note read-back; Who rows (tie + location lines, display truth);
Add people -> sheet -> busy state; Share location -> start/stop +
status note; food panel (compose -> handoff -> self-confirm);
check-in section -> summary sheet; spine items WITH action render
as buttons -> doorway, items without render static (PreparationSpine
contract, verified); history toggle; open-chat -> plan chat.
TRUE x19. (Next-step + handoff were the only dead wires: H-NEW-1.)

You / Settings (22 sections via shellData): edit-profile save +
read-back; appearance mode rows; Soul (level, quiet hours on/off
with the JA-07 disabled-state truth, feedback style, save);
Memory (add with step-up note A-03, forget two-step); what-opal-
remembers rows -> toggle; calls-assist toggles -> graphing truth;
connections rows (H-NEW-14/15); connector-permissions; privacy;
private-graphs vault (PIN gate, busy, error); linked-devices
roster + revoke; location-travel; account-security; saved-logins
add/remove; invite-code redeem; delete-account (guarded);
help-support / report / feedback submit; your-moments archive
(caption save, audience rows, delete confirm/cancel); your-library
(artifacts, remove). TRUE x20, FALSE x1 (A-03 step-up), ABSENT x1
(H-NEW-9 edit).

Search + create (8): search input -> grouped results (plans /
chats / people) -> each result opens its real surface; no-match ->
honest empty line; create plan/trip/idea forms -> Create disabled
until title (and when, for repeat) -> submit -> surface. Places
field searches no directory and says so. TRUE x8.

Sheets + pickers (9): PersonProfile (identify row -> relationship
picker; family subtype steps; minor toggle; age-band radios +
clear; Message -> thread; What Opal remembers -> Memory room
filtered); EventShareCard copy; CardContextMenu scrim/cancel;
GroupMembership (C hosts). TRUE x9.

Orbit v4 sibling (10, provenance wt-r21-orbitv4, audit from its
report + frames): ring header; Where rows are doors -> plan ->
return with scroll preserved; collapse toggle persists; static
(i) line; push-to-chat drag -> lands populated UNSENT in thread
composer; chapters pills -> stones; future glimpse rows -> Graphs;
composer send/mic per H-NEW-11/13 declarations. TRUE x8,
FALSE x1 (H-NEW-12 morph), ABSENT x1 (H-NEW-13 audio-send).

Openings/flows2 siblings (8, provenance wt-r21-openings +
wt-r21-flows2): Moment Stones -> create flows (photo REAL, video
declared, text REAL, Go live REAL over lives endpoints on flows2);
Trivia card round -> sent guess reads back waiting; presence
strip lights; co-presence on Live (host + viewer only, roster
declared D-1). TRUE x6, ABSENT x2 (A-13 trivia expiry, watcher
roster).

## Surprises

1. The served shell's worst dead buttons (JA-06 species) are
   already gone - what remains is LATENT: two loaded wires
   (H-NEW-1, H-NEW-2, H-NEW-8) where the adapter contractually
   nulls the field today, so the first honest projection stamp
   would have shipped a dead primary button. The holes were in
   the wiring closet, not on the glass.
2. PlanCardC2 already withholds role=button when no onOpen
   exists - the card knew the honesty rule; its nested primary
   button did not. One component, two standards.
3. The openings baseline claim (24 failed / 17 files) re-derived
   EXACTLY on this base - the lineage's numbers are trustworthy.

*FOUNDER_ACCEPTED = NO. This ledger certifies the end-state
trace, not acceptance.*
