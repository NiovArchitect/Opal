# Repair #21 - Orbit v4 Report (Cluster W-1 Revision)

Branch: `muse/r21-orbit-v4` - base `22744b3c` - code tip at capture time stated in the Frame Evidence section (frames are shot on the served tip and carry its `seed - <sha>` dev badge in-frame; the badge must equal the reported tip).

## Purpose

Orbit exists because people ALREADY screenshot their conversations into an AI "to get my own clarity to help move the conversation forward." That is the behavior Orbit makes native, private, and contextual.

Every element in the room is measured against that sentence (founder, 2026-10-20 18:12 PDT): does it help a stuck person get clarity and MOVE THE CONVERSATION FORWARD - or does it invite rumination, surveillance, or stalling? Forward is the only direction the room serves. The per-element purpose test is recorded in the v4.2 section's accounting table; anything whose honest answer was rumination, surveillance, or stalling is named there as a cut candidate, with the verdict as its reason. The retrospective is bound by the same test: chapters are looking back to move forward, never dwelling.

## The Three Lenses

**Calm Law.** Orbit is the quiet room. First paint is a spare column: the ring, the topic, the parties line, the Where-we're-at card (expanded only when a live state exists), folded history, the composer. Nothing pushes; the retrospective and the future glimpse are discovered, never announced. Every v3 law stands: Center Law (the topic is the center, never a person), Voice Law, the Sameness Test, Law 3, Law 4, the ethics constitution, invisibility, density inheritance.

**Discovery lens.** Discovered delights: the ring composition itself (the doorway, grown - see Addendum B); done-and-loved resurfacing as stones in the retrospective fold; chapters that open from period pills; the drag gesture (a suggestion you can pick up). Explained things: exactly one - the (i) bubble, now a single static line. If a frame needs a caption, the frame fails; the frame audit below is written against that rule.

**Attraction lens (North Star).** Orbit is a main attraction - a place opened partly for the pleasure of it. The delight budget is spent inside the brand elements: the living ring (traveling lights, a tracing rider, a breathing glow), the drag-and-slide tactility, the doorway continuity. Per frame, the audit names what is a pleasure to look at, or says plainly that it is not yet.

## Requirement Dispositions

**(1) Ring composition header - DONE.** The header is the doorway's own ring, grown: the brand composition (`ORB_RING` / `ORB_HRING`, 200-unit viewBox) reused, not a cousin. Topic text at center; one light per party on the ring, glowing in its state (pending/limbo in state color, settled soft); 11+ parties compress to 11 lights + a `+N` overflow marker. The conversation still owns the room below.

**(2) Composer above the pad - DONE, measured.** The orbit composer docks at the bottom of the room content, above the shell pad, in every state. Capture geometry (390x844): session composer bottom 736, empty composer bottom 748; frost strip top 752; dock top 772. The composer is never under the frost or the pad. (v4.1 re-shoot re-measures; see Frame Evidence.)

**(3) Composer furniture, R-3 thread model - DONE with declarations.** Mic in the action slot when empty; recording state inside the bar; the orbit composer sends on the orbit session's existing path. Reconciled against the founder's confirmed reference (steer 8): see Composer Reference Reconciliation below.

**(4) Full-width frost - DONE.** `.c2s-frost-strip` is a fixed, edge-to-edge strip (chrome-glass blur), z-index 30 below the dock's 50, hidden in the wide layout, registered in the glass registry. Captures show the edges; no legible content peeks at either side of the pad.

**(5) Where-we're-at collapses - DONE.** One-tap toggle; default expanded iff a live state exists (next plan, viewer pending, pending/limbo parties, open windows, membership events); an empty orbit defaults collapsed (quiet). The choice is held in component state for the life of the room and never reset by re-renders.

**(6) Color/weight discipline - DONE, corrected in v4.1 (C-1).** `.orbit-heading` carries bold + state ink; `.orbit-content` is regular weight, neutral ink. State color moved off values entirely. v4.1 per-row root-cause and fix: see the v4.1 section.

**(7) Rows are doors - DONE.** Every Where row (next together, open window, pending, limbo, closed) navigates to its own plan; the shell restores the room on return with scroll position preserved via the C1 host. The return frame proves the round trip.

**(8) Static (i) - DONE.** The orbit info bubble is one static line, exactly: "Just you and Opal, about this conversation." The v3 dynamic `emptyExplanation` strings are dead. Other surfaces' InfoBubble uses untouched.

**(9) Push-to-chat as a gesture - DONE with a v4.1 correction.** Long-press arms the drag; the suggestion lifts and follows; the thread presents as drop target; on release the card flies (380ms) into the thread composer, landing populated and UNSENT, the user landed in the thread shaping it. The long-press menu's "Push to chat" performs the same flight. Never the clipboard, never auto-send. Reduced motion: direct transition, same landing truth. v4.1: drag start now dismisses the long-press menu, so the lifted card is the compact draft alone, unmistakably the carried words (charge C-4).
> **SUPERSEDED (Round 3, founder correction 2026-10-20 21:39 PDT):** the drag/flight mechanic and the menu's "Push to chat" described here are DISPOSED. Long-press now SELECTS the suggestion and the one place action ("Place in Maya's composer") crosses the screens for the user. See the Round 3 section at the end of this report. This passage stands as history.

**(10) Kept from v3 - DONE.** Three-dot overflow (founder-loved shape), the done-and-loved folded block, folded past chats, the (i) bubble pattern, every law and pin. All v3 pins green or extended, never weakened.

## Addendum Dispositions

**A. Send is first-class - DONE.** With text present, Send is primary and unmistakable; audio stays one tap away. Proven by `orbit-v4-composer-send-{dark,light}`.

**B. The room and the doorway are the same orbit - DONE with one declaration.** The header composition IS the doorway glyph's geometry, grown. Lights travel the ring slowly (rotor period 96s, transform-origin at ring center so lights can never leave the ring); a state change answers in the ring's glow. **Declared:** the doorway-to-room transition is a fade/scale continuity, NOT a true shared-element morph - a real morph is beyond the web shell's honest reach. Never faked.

**Addendum 2 - Light is the showcase - DONE.** Living light, each behavior justified in one sentence:
- *Trace rider (36s circuit of the ring):* the ring's living identity - this room is an orbit, and an orbit is in motion.
- *Traveling party lights (96s rotor):* the relationship is live - the people in this orbit are present, not archived.
- *Breathing glow (6s):* ambient presence - the room is attended, quietly, the way a held room feels held.
- *Glow shift on state change:* the ring answers a true state change (a move landing, a window opening, limbo starting) - light as the state's announcement.
- *Reduced-motion equivalents:* travel and trace still; the glow and its state meaning remain, statically. Same meanings, no motion.
Motion evidence: `orbit-v4-motion-trace-{dark,light}.webm`, `orbit-v4-motion-state-{dark,light}.webm`. **Declared:** the state webm is the closest honest equivalent the rig can fire (a real in-room transition could not be triggered on demand in the capture rig); no fake state was staged.

**Addendum 3 - The second fold: retrospection - DONE, truth-bound.** Chapters by period: the folded row's period pills open into highlight chapters; settled plans render as stones; done-and-loved is composed as the living edge of the latest chapter (pills = chapter index, done-and-loved = the open edge), one system, not two. Only real history renders - milestones/firsts only where the record carries them; a thin record renders an honestly thin chapter (the quiet promise state), never a fabricated recap. The retrospective is continuous and private - per relationship, always there - not an annual marketing recap. We're doing something no one else has done before.

**Addendum 4 - The third tense + boundary law - DONE.** Orbit holds past (chapters), present (where-we're-at + conversation), future as a glimpse: this anchor's forming/far plans as quiet stone rows in the Where card, each a row-door into Graphs. No plan lists, no spines, no create-plan furniture - Graphs keeps the planning craft. Anti-tacky rule binds: a future renders only if it is a real graphed plan with a true state; where the anchor has no real future, the glimpse is absent.

**Addendum 5 - Inhabited rooms + intuitiveness - DONE with declarations.** (a) All orbit frames show the room in use - a real exchange, a suggestion resting in the stream - driven through the real session wiring in the rig (Shape flow drafts, e.g. "Tell me more - I can help you plan or check what's coming up."), not staged DOM. The empty-state frame is the one exception and still carries the ring and the (i). (b) In-stream cards are residents at the YOUR MOVE craft standard. **Declared:** a mini where-we're-at in-stream card type does not exist in the projection and was not built - no honest feed for it. (c) First-entry seed moment: the ring settles once on entry; Opal's first in-room message derives from the existing where/insight derivations for that conversation. (d) Progressive revelation order - recorded below.

**Addendum 6 - The twin test - DONE, recorded below.** Orbit is never the thread's twin.

**Composer refinements (steer 7) - DONE with declarations.** (1) No focus border: focus shows the caret only - the c1 focus-within ring and the unifyChats `input:focus-visible` outline are removed; proven in the composer-send frames (typed text, no inner box). (2) Recording controls: while recording, the bar offers STOP and SEND. STOP ends recording and leaves the result in the composer as a transcription draft (Web Speech API where the platform offers it); SEND sends the voice note as audio on the thread's existing voice path. **Declared:** for orbit (Opal) sessions, the audio-send leg is missing - there is no audio-to-Opal API; STOP-to-text is the orbit recording truth, and the thread is where audio-send lives. Recording in the headless capture rig cannot be exercised (no microphone); the furniture is pinned by tests.

**Composer reference reconciliation (steer 8).** Against the founder's Muse screenshots:
- Resting pill: plus (+) at left - **withheld** (see below); placeholder names the destination ("Message Opal" in orbit, the person's name in thread); mic at right when empty - matches.
- With text: pill expands, no inner focus border (caret only) - matches; (+) drops to bottom-left - withheld with the (+); **Send is the filled circle with an up-arrow** - this supersedes my earlier "Send ↑" text pill and is what ships in both composers.
- (+) sheet: the attach sheet's shape (Library strip + Add files / Add videos rows) is **withheld entirely** - Opal's in-thread media path is not real today (declared absent in the polish wave), and row honesty forbids dead rows, fake thumbnails, or a staged library. The gap is declared, not painted. Where the implementation would bend when a real media path lands: the (+) returns at left of the resting pill, drops to bottom-left with text, and opens the sheet with only the rows the media path honestly feeds.

**Coordination heads-up (steer 9) - honored.** My `C2Shell.tsx` / `c2shell.css` hunks are frost-only (the strip element + its styles + the glass-registry entry). No dock slots or labels were restyled; W-8..W-11's active-state work is untouched. This branch merges first; the integrator sequences from there. Hunk inventory: `C2Shell.tsx` +6 lines (frost strip element), `c2shell.css` +21 lines (strip styles), both frost-scoped.

## Progressive Revelation Order (Addendum 5d)

| Element | First appears when | Wired today? |
| --- | --- | --- |
| Ring composition + topic | On entry (identity, always present) | Yes |
| Where-we're-at card, expanded | A live state exists for this anchor | Yes |
| First suggestion card | The user hesitates over words / asks Opal to shape a reply (Shape flow) | Yes - via the real Shape flow |
| Your-move row | A plan in this orbit is waiting on the viewer | Yes - projection-driven |
| Future glimpse rows | A forming/far plan with this anchor is graphed | Yes - projection-driven |
| Done-and-loved fold | A plan with this anchor settles and is loved | Yes - projection-driven |
| Chapter pills + chapters | History accrues across periods | Yes - projection-driven |
| First-entry seed message | First entry to the orbit | Partially - ring settle is wired; the derived first message rides the existing insight derivation (**declared**: no separate first-entry-only message path was built) |

## Twin Test Record (Addendum 6)

Four layers, simultaneous, same conversation (Maya Torres), both modes - `orbit-v4-twin-{dark,light}` composites:
1. **Overhead:** Orbit always shows the ring composition; the thread shows the person's face/name. No orbit frame lacks the ring - collapsed, empty, mid-drag, chapter open included.
2. **Light:** the orbit room carries the ring's ambient glow tint (`.orbit-field` sourced from the ring's state); threads stay neutral. The tint IS the ring's presence in the room's light.
3. **Address:** Orbit's composer placeholder addresses Opal ("Message Opal"); the thread's addresses the person - verified in the twin frame itself, where Maya's thread composer reads "Message Maya Torres". The CenterChat embedded slot's placeholder is host-supplied and reads "Message Opal" in the orbit frames.
4. **Motion:** entry is the fade/scale continuity from the doorway (declared in Addendum B - not a true morph); it reads as ARRIVAL somewhere else, and this layer carries the morph gap's weight explicitly.
Exit names its destination: the orbit back affordance reads "Back to your chat with Maya" (host-supplied person name). Orbit's title names the TOPIC, never styled as the person's chat header.

## Tests

- `r20Orbit.test.tsx`: 41 tests - all v3 pins plus new pins for the ring composition (topic at center, one light per party, state glow classes, +N overflow), composer presence/docking in all room states, collapse defaults + toggle persistence, color/weight discipline, rows-are-doors + return contract, the exact static (i) line, the drag contract (lift, drop, landing populated/unsent, no clipboard, no send) + menu-path equivalence, chapter composition, the glimpse, and the v4.1 pins (per-row heading color, delta rows, waiting-fold, chapter dedupe, embedded mic uniformity).
- Full app suite at the code tip: **2067 passed, 24 failed** (2091 tests, 257 files) - and **all 24 failures are pre-existing, none introduced by this branch**. Verification: the failure set was diffed against the v3-lineage worktree (23 of 24 identical there); the 24th (`r20CardMenu` state-accent tokens) is proven pre-existing at the true base - the test scans `c2shell.css` for canon hex literals, the base `22744b3c` version of that file already contains them in a comment (line 1126), and this branch's c2shell.css diff adds zero hex lines. The failures live in unrelated surfaces (activation, onboarding, graphs-exact authority, Wave B exact, design tokens) - the integrated base carries them. **Correction note:** an earlier draft of this section cited "3442 passed, 1 failed" - that figure came from a misattributed background result during the capture phase and is WRONG; the numbers above are from direct runs on this branch and the comparison worktree, re-verified after the fact. The scoped sweep for this cluster's own surfaces (c1 + c2/shell + theme + brand) stands as originally reported: 758 passed, 1 failed (`technicolorProduction`, pre-existing).
- Typecheck: exactly the 9-error baseline, zero new.

## Frame Evidence

All frames shot on the served code tip `221712b` (the in-frame dev badge reads `seed - 221712b` in every frame), 390x844, against the stack whose API serves the orbit projection (see the stack note in the v4.1 addenda - the orbit rides the thread's messages payload, and only one of the two Phoenix instances on this VM serves it; captures were API-rewritten to that instance, the harness's documented local-run adaptation). Pack directory: `~/workspace/opal-graph/shots/repair19/pack-v2/`.

Geometry (measured in-page, both modes): ring y44-192; session composer bottom 736; orbit (empty) composer bottom 748; frost strip top 752; dock top 772. The composer clears the frost and the pad in every state.

| Frame | What it proves |
| --- | --- |
| `orbit-v4-1to1-{dark,light}` | The flagship room, EXPANDED (v4.1 C-1 proof): ring with topic "Talk tonight about Saturday" centered, parties "You, Maya Torres"; card heading neutral; NEXT TOGETHER in its plan's action red with delta content "tomorrow after 10 PM"; OPEN WINDOW in violet (forming) with "Place not set yet"; YOUR MOVE in action red; all content regular/neutral; ring glow answering the action state (red trace arc + pending light). Inhabited (Shape affordance + session). Attraction: the ring's red arc against the calm room - the state is the color story. |
| `orbit-v4-composer-send-{dark,light}` | Typed text present; filled-circle Send primary; no inner focus border (caret only). |
| `orbit-v4-group-{dark,light}` | Weekend Crew: ring with the crew's lights, parties line, done-and-loved fold present in the room. |
| `orbit-v4-collapsed-{dark,light}` | Same 1:1 conversation, card collapsed by one tap (`data-expanded=false` verified in-page); the conversation owns the room; ring + composer unchanged. |
| `orbit-v4-drag-{dark,light}` | Mid-drag: the compact draft card lifted and in transit over the stream, the "Drop to chat" target zone presented. The carried words are unmistakably the card. **SUPERSEDED in Round 3 - these frames were retired to `pack-archive/superseded-drag-gesture-r21/` (see the Round 3 section); the current mechanic's frames are `orbit-v4-select-*` + the re-shot `orbit-v4-landing-*`.** |
| `orbit-v4-landing-{dark,light}` | Maya's thread after the flight: pushed draft in her composer ("You mentioned Maya earlier - want to keep going on that, or something new?"), violet filled-circle Send, UNSENT. No "Talk to Opal" text line (C-5). The strip carries only the plan stone; the YOUR MOVE card names the same plan. Chats dock slot shows the active dot. |
| `orbit-v4-return-{dark,light}` | Round trip: row tap opened the plan surface (graph detail verified mid-trip), one back tap restored the same orbit, expanded, position preserved. |
| `orbit-v4-chapter-{dark,light}` | Weekend Crew retrospective: fold open, two stones (Farmers market run; Saturday ride to Oceanside - each plan once, strongest form), Done together chapter open below; honestly thin chapter content where the record is thin. |
| `orbit-v4-empty-{dark,light}` | The true empty room (Maya's seat, plan-less Ethan orbit): ring identity, collapsed quiet card, the lone (i), "Message Opal" + mic. Calm as designed. (The opened bubble's exact static line is unit-pinned; in these frames the (i) sits closed.) |
| `orbit-v4-twin-{dark,light}` | Side-by-side, same conversation: thread (face/name overhead, "Message Maya Torres") vs orbit (ring overhead, "Message Opal", tinted room light). Unmistakable at a one-second glance. |
| `orbit-v4-motion-trace-{dark,light}.webm` | Several seconds of the ring: trace rider traveling, party lights traveling, glow breathing. |
| `orbit-v4-motion-state-{dark,light}.webm` | The ring/card light answering a state change - closest honest equivalent (declared above). |

Coherence audit (V-1 discipline): every 1:1-chain frame (1to1, composer-send, drag, landing, return, collapsed, twin) is the SAME conversation - Maya Torres / "Talk tonight about Saturday" - topic, parties, Where rows, thread, and landing target all agree; verified in-page per frame (topic/parties/row-states recorded during capture) and at the glass. The group/chapter frames are the Weekend Crew conversation throughout; the empty frames are Maya's plan-less Ethan orbit (her seat, MT dock avatar - coherent from her side). No identity collisions: no frame greets the viewer as the counterparty. (The earlier incoherent pairing the parent flagged came from a stale-stack capture window - see the stack note; the record itself, read on the correct stack, is consistent.)

## v4.1 - Parent Inspection Charges (2026-10-20 16:02 PDT)

**(C-1) Per-row color discipline - FIXED + PINNED.** Root cause: not a single shared value - each heading already derived from its row - but in the 1:1 room every row derives from the same plan in the same (action) state, and the card's own heading also wore the dominant state color, so the whole card read as one red block. Fix: the card heading ("WHERE WE'RE AT") is a name, not a row - it no longer carries state color. NEXT TOGETHER keeps its own plan's state family. OPEN WINDOW now carries its own row semantics - `forming` (the window is by definition unformed: time/place unset). YOUR MOVE stays action red - spent rarely, on the true needs-you heading only. Pin: a test rendering rows of differing states (ready next / forming window / action your-move) asserts differing heading state tokens, and that the card heading carries none.

**(C-2) Row copy duplication - FIXED.** Rows compress to their delta: NEXT TOGETHER carries when (then where) - never the title again (the topic at the ring's center already names the plan); OPEN WINDOW carries only the missing piece ("Place not set yet" / "Time not set yet"). The "Still waiting on..." restatement folds into YOUR MOVE when the viewer owes the answer (the fact is carried once, by the calmer row). Chapter composition deduplicated: a plan appears once, in its strongest form - the stone in the fold, loved mark on it; the chapter panel no longer re-lists plans (sessions and milestone lines only).

**(C-3) Composer mic inconsistent - FIXED; parent verified at the glass 16:46 PDT - CLOSED.** Root cause: state-dependent gating - the group/empty frames use OrbitScreen's own composer (mic present), while the 1:1/collapsed frames use the embedded CenterChat, whose action slot honestly rendered nothing (no host voice tenant). Fix: the embedded (orbit) CenterChat gains the uniform voice leg - mic in the slot when empty, recording inside the bar, STOP leaves a transcription draft (same pattern as the orbit composer). Standalone CenterChat is unchanged (its honest empty slot pin stands). Pinned by the C-3 uniformity test.

**(C-4) Drag frame - FIXED.** Drag start now dismisses the long-press menu; the lifted card is the compact draft alone - offset, floating over the stream, unmistakably the carried words. Re-shot in the v4.1 round.

**(C-5) Thread label leak - REMOVED.** The strip's text doorway ("Talk to Opal about this plan - ...") is stripped from ThreadShell per W-3; the header doorway orb is the door, the strip holds only the plan stone itself. The `opalDoorway` prop and host derivation stay for the header doorway. W-3 audit note: the three doorway tests that pinned the strip button were updated to the header doorway and to assert the strip's text door is absent. (Parent's positive sighting noted, no action: the Chats pad slot's active dot - W-10 surfacing.)

**Protected (passed inspection, not regressed):** the ring with topic centered and parties as lights; composer above the pad with the filled-circle Send; "Message Opal" addressing; the collapsed state giving the conversation the room; the empty orbit's calm + the lone (i); the landing contract at the glass (pushed words in the thread composer, unsent).

### v4.1 addenda (2026-10-20 16:46 PDT)

- C-3 closure recorded above.
- C-1 proof: DELIVERED - the expanded 1:1 pair in this round is shot with the Where card OPEN and rows visible (see Frame Evidence). One honest nuance: in this room NEXT TOGETHER and YOUR MOVE share red because the next plan genuinely IS the action plan (the viewer owes the Confirm - the thread's own YOUR MOVE card agrees). The per-row differentiation is visible in-frame via OPEN WINDOW's violet (forming) against the reds, and the full ready/forming/action differentiation is pinned by unit test.
- Capture coherence (V-1 discipline): AUDITED - every frame in this round is identity-coherent (see the coherence audit in Frame Evidence). The earlier incoherent frame is root-caused below, not papered over.
- Stack note (root cause of the capture incoherence + the quiet-room frames, for the integrator): this VM runs TWO Phoenix instances. The one on port 4000 serves a stale sibling world whose messages payloads carry NO orbit field and whose plan titles differ ("Plan with Ethan Walker"); the one on port 4001 serves the canonical R21 world WITH the orbit ("Talk tonight about Saturday"). Captures taken while the rig pointed at 4000 showed a mismatched topic over the room and quiet cards - a stack-pointing artifact, not a product or capture-pairing defect. All final frames are on the 4001 stack (harness API rewrite, its documented local-run adaptation), verified by in-frame chip + in-page coherence reads. A related environmental note: the shared backend enforces a per-user rate limit (429, retry_after 3600) that the seed viewer A hits when many workers capture concurrently; it clears with quiet time.

## Terminology Note (founder, 2026-10-20 17:55 PDT)

"Rituals" is RETIRED (religious misreading risk); the replacement term is **rhythms**. Sweep of this branch's scope (all user-facing copy in the branch's ten touched files + this report): **zero occurrences** of "rituals" - nothing to change. Out-of-scope check across the wider tree: no occurrence of the term "rituals" exists anywhere in `apps/opal_web/src` or `coordination/` on this branch either; the only substring matches are "spiritual" inside two onboarding files (`onboarding/OpalWorking.tsx`, `onboarding/holyShitCopy.ts`) - a different word, not the retired term, and outside this cluster's scope regardless. No cross-branch changes made.

## v4.2 - Space Pass (founder review 2026-10-20 17:49 PDT) + Seating Discipline + Purpose Test

Code tip for every frame and figure in this section: **`1b198efa`** (badge `seed - 1b198ef` in-frame). Commits since v4.1: `4fb57bc7` (the pass), `87cb9fb5` (ring artwork scales into the band), `d326d18f` (seating + snug floor + gesture constant), `b162a77c` (insight suppression + title clamp), `4c2f6375` + `4eb93b74` (drag selection hardening), `1b198efa` (dragged card keeps its body). Judged, as instructed, by CONVERSATION AREA: measured on the light 1:1 frames, the stream's first message moved from y~560/844 (v4.1) to y~390/844 - roughly **170px, a fifth of the viewport, returned to the conversation** (ring settle + slim card + snug floor together). Mid-pass the VM restarted and killed the whole stack; it was revived self-healing style (Postgres via the polish stack-up; Phoenix :4001 relaunched from this worktree against `opal_dev_r21`, verified through the API - conversations 200, orbit field present; preview :5299 from this worktree's dist). No frames were filed from the interrupted runs.

### F-1 - The frost is one true backdrop sheet

The strip is now a single sheet: full width, `bottom: 0`, height `dock + 172px` (tall enough to hold composer AND pad), `backdrop-filter: blur(22px) saturate(1.3)` (a stronger local blur than the shared chrome token), tint at 80% rising to 94% via color-mix, and - the hard edge's executioner - a `mask-image` fade so the BLUR ITSELF dissolves toward the top. Composer bars lift above the chrome band (`z-index: calc(var(--layer-chrome) + 1)`) so the furniture sits INSIDE the sheet, in front of the glass. The sanctioned-glass registry entry was updated to the new declaration with its reason (unifyDrift green). Per-surface audit (frames in `r21v4-scratch/frost-audit/`, 6 surfaces x 2 modes; this is the first pass - close-out re-proves on the integrated tree):

| Surface | Verdict | Evidence |
| --- | --- | --- |
| Flows home | PASS | Second YOUR MOVE card ("Rooftop drinks at The Brick Hotel") fades to barely-visible inside the sheet; sheet continuous behind the pad. |
| Chats list | CONDITIONAL | Sheet present and full-width, but the audit frame caught the list before it assembled on this stack ("No chats yet") - no content was behind the sheet to dissolve. The dissolve itself is proven on Graphs/Thread/You/Orbit; the integrator's close-out re-proves Chats with a loaded list. |
| Thread | PASS | Thread composer ("Message Maya Torres") sits inside the sheet; one continuous sheet behind composer and pad; dissolve at the sheet's top. |
| Graphs | PASS (textbook) | The third Ready card ("Sunday brunch at Herb & Wood") is barely visible through the sheet - exactly the law's sentence. |
| You | PASS | "What Opal remembers" row fades into the sheet. |
| Orbit | PASS | Every pack frame: stream tail dissolves into the sheet behind the snug composer; no hard edge anywhere. |

### F-2 - Composer snug to the pad

The room's floor is `dock-clearance - 10px`; the embedded surface's tail padding dropped to 2px. Frame-measured (light 1:1): composer bottom edge y~762, pad top y~772 - a ~10px gap inside one sheet (v4.1's session frame: composer bottom ~736, a ~36px gap).

### F-3 - The ring settles

Entry lands BIG (the doorway continuity), breathes, then at 1600ms `data-settled` flips and the composition transitions (900ms) to a 90px band - 39% smaller, as specified. Identity survives the shrink: the SVG scales with the box (the first v4.2 frames caught it NOT scaling - fixed in `87cb9fb5`), topic centered and clamped to 3 lines INSIDE the ring, lights on the ring, trace, state glow. The parties line and the center orb yield at settle (their information lives on as lights; the names return in the full card). Reduced motion starts compact: the JS reads `prefers-reduced-motion` for the initial state and the CSS kills the transition. Pins: settle-after-window + reduced-motion-compact + the band's CSS contract.

### F-4 - Where-we're-at default = SLIM (supersedes requirement 5's default)

Stated plainly, as instructed: **F-4 SUPERSEDED the v4 requirement-5 default.** Slim is home: with a live state the card shows exactly two rows - Next together and Your move, the move's fire intact - and everything else (open window, glimpse, pending, limbo, closed, membership, insight) waits behind ONE tap on the existing toggle. A quiet room's card is a bare header. The expansion choice persists for the room's life, as before. The collapse-default pin was rewritten to the F-4 contract; tests that asserted full-card rows now take the one tap first (the rows-are-doors, glimpse, C-1, C-2, friction, and membership suites included - their assertions are unchanged, only their entry state is honest). The group/chapter frames show the same posture: the Weekend Crew card sits slim above its chapter.

### F-5 - Furniture placement

No furniture floats mid-room. The "Shape what to say" chip is anchored to the room (`position: absolute; bottom: 142px`, directly above the composer, inside the frost zone; the embedded flow gained tail padding so the last message rests clear of it when scrolled to the end). The embedded conversation's overflow (•••) moved to the HEADER ROW, top-right (absolute to the room; its menu drops from the same corner), which required the embedded surface to give up its own scroll box - the message flow keeps the scroll instead. Both placements are frame-visible in the 1:1 pair (chip on the composer's shoulder; ••• beside Back) and pinned as CSS contracts.

### Charges carried from v4.1

- **C-1 expanded proof (owed)**: `orbit-v4-expanded-{dark,light}` are in this pack, shot tapped-open at the final tip. DOM record, both modes identical: `orbit-next-together` (delta "tomorrow after 10 PM"), `orbit-open-window` ("Place not set yet"), `orbit-viewer-pending` (Your move) - and the C-1 suite pins the differing heading tokens (next = its plan's family, window = forming violet, your-move = action red). In this room NEXT and YOUR MOVE share red truthfully: the next plan IS the action plan.
- **C-3 closure**: confirmed in the final frames - the 1:1 session composer and the collapsed/empty composers all carry the mic.
- **Capture coherence (V-1)**: every final frame is the same conversation's truth - ring topic "Talk tonight about Saturday", parties You + Maya Torres, the card's plan = the thread's plan = the landing's plan. The run5 dark-mode projection variance (a quiet next row in one dark frame) did not recur in the final runs; both modes' expanded DOM records are quoted above and match.

### Seating discipline (founder, 2026-10-20 18:07 PDT)

**(1) One loud thing.** In every final frame the ring is the only performer: it alone moves, glows, and carries saturation. The card's reds are one-line small-cap state headings (C-1 discipline); the stones, folds, and chip sit in neutral registers; the dock orb is below the frost - another room's furniture, muted by the sheet. Nothing was found competing in the re-shot frames; the one borderline element, the membership lines, was already seated to the full card only by F-4 and is carried as a cut candidate below.

**(2) One gesture grammar.** Orbit's long-press now imports the app's shared `LONG_PRESS_MS` (500, `c2/CardContextMenu`) instead of a local literal - the same exported constant the card-menu family uses, so the family cannot drift. The press means the same family of things everywhere: hold to deepen (the card scales 1.03 and takes the card shadow), the same hold arms both the options menu and the drag (lift words / open doors - one press, two expressions of it), movement carries, release beyond the threshold commits the flight, release in place opens the options. The drag also stopped being a text selection (user-select/touch-action hardening on the card and its children, after a capture caught Chromium painting a selection into the carried card).
> **SUPERSEDED in part (Round 3):** the shared `LONG_PRESS_MS` grammar stands, but what the hold commits changed - it SELECTS the draft; the drag, the flight, and release-in-place-opens-options are gone. See the Round 3 section.

**(3) Materials, not decoration.** The room ships exactly three effects, each doing its job: FROST = the bottom sheet (its gradient is the dissolve mechanism, not decoration - it says what is behind is out of reach until you scroll); GLOW = the ring's state glow, the room tint sourced from it, and the trace (state and living identity made visible); SHADOW = card depth and the dragged card's lift (depth, and the answer to "this is in my hand now"). One fix fell out of this law during the pass: the dragged card's body was transparent - border and shadow only - and dissolved over the stream; it now carries a solid canvas body while dragging (shadow does the depth, the card keeps its body). The entry settle is motion, not a material - it is the doorway continuity, accounted in Addendum B.

**(4) Subtraction accounting + the Purpose Test.** Every surviving element, what it makes unnecessary, its purpose verdict (does it move a stuck person FORWARD, or invite rumination / surveillance / stalling?), and its seat:

| Element | Makes unnecessary | Purpose verdict | Seat |
| --- | --- | --- | --- |
| Ring composition (settled band) | A person-header / avatar identity for the room; any "where am I" chrome | FORWARD - the room's live state (who is pending, what is lit) orients a stuck user in one glance | KEEP - the one loud thing |
| Slim Where card (Next + Your move) | A home/dashboard summary surface | FORWARD - the two facts that unblock: what is next, what waits on you | KEEP |
| Full-card rows (window, pending, limbo, closed, glimpse) | A trips/plans detour to learn status | FORWARD - each row is a door into its plan; status exists to be acted on | KEEP (behind the one tap) |
| Your move row | In-room notification badges | FORWARD - the ask, stated once, answerable | KEEP |
| Insight row | A separate "Opal notes" surface | CONDITIONAL KEEP - a real read ("Bea has gone quiet since Tuesday") is clarity; a bare restatement is a stall, and restatements are now SUPPRESSED in code (an insight equal to the next plan's time or the Next delta never renders; pinned) | KEEP, guarded |
| Chapters + stones (retrospective) | An archive/memories surface inside the room | FORWARD - looking back to move forward: the stones are doors to settled plans, and loved marks say what to repeat; seated below the fold, never on first paint | KEEP |
| Done-and-loved marks | A favorites list | FORWARD - repetition is a forward act; the mark names what worked | KEEP |
| Past chats fold | Restarting a line of thought from zero | FORWARD - resume the thinking session, do not restart it | KEEP |
| Membership lines (joined/left) | Nothing the chapter does not already imply | WATCH - backward-looking context; serves forward only as "who is in this room now" | CUT CANDIDATE, carried: survives this round because membership truth has no other in-room home; already seated lowest (full card only, quiet rows). If the card grows, these go first |
| Shape chip + recommendation + drag | A separate "help me draft" surface; copy/paste between apps | FORWARD - the room's founding verb: words when you are stuck, carried into the chat UNSENT (the screenshot-into-AI behavior, native) | KEEP |
| Composer ("Message Opal") | Performing half-formed thoughts in the thread | FORWARD - private clarity first, public words when ready | KEEP |
| (i) static line | A tutorial / help overlay | FORWARD - one line of orientation, then silence | KEEP |
| Overflow (•••), header row | A settings detour for session actions | NEUTRAL furniture in the founder-approved seat | KEEP |
| Parties line + center orb (entry size only) | A members list at entry | FORWARD at entry (who is here), then they yield to the conversation at settle | KEEP (they seat themselves lower automatically) |
| Room tint / breathing / trace | A "live room" indicator or status dot | Identity, not information - they answer "where am I" before cognition; no rumination affordance | KEEP (quiet caps apply) |

**Purpose-test failure found and fixed this round:** the host's scoped insight for the flagship room was the bare string "tomorrow after 10 PM" - the next plan's time wearing an insight's clothes. It rendered as an unmanned row under Your move: no clarity, a small stall, and a C-2 duplication at the data level. Suppressed at the render (see Insight row above) and pinned. **Declared, not fixed here:** on thin sessions the baseline Shape draft can echo Opal's own last line ("Tell me more - I can help you plan or check what's coming up." is what landed in the final landing frames) - the push-to-chat contract held exactly (those words, populated, unsent), but a draft that repeats the room is not yet clarity; that is LLM-baseline quality on a sparse record, owned by the Shape derivation, outside this cluster's furniture.

### Tests and frames (v4.2)

- Scoped sweep (c1 + c2/shell + theme + brand) at `1b198efa`: **761 passed, 1 failed** - the one failure is `technicolorProduction`, pre-existing on the clean base. New pins: F-3 settle + reduced-motion, F-4 slim default + persistence, F-5 furniture CSS contracts, insight-restatement suppression, F-1 frost sheet assertions; the glass registry updated. Typecheck: the 9-error baseline, zero new.
- Frames, all badge `seed - 1b198ef`, all coherence-checked: the full pack re-shot this round - 1to1, expanded, composer-send, drag, landing, return, collapsed, group, chapter, empty, twin (x dark/light = 22 PNG) + 4 motion webms (trace + state). The motion pair now opens on the entry settle before the trace takes over. Frost audit frames (12) live in scratch, cited in the F-1 table.

## Declarations Summary

1. Doorway morph: fade/scale continuity ships; a true shared-element morph is beyond the web shell's honest reach.
2. Orbit recording: STOP-to-text (transcription draft) is real where Web Speech exists; sending audio to an Opal session is not a wired path. Thread audio-send is real.
3. State-change motion webm: closest honest equivalent (the rig cannot fire a real in-room transition on demand); no fake state staged.
4. (+) attach sheet: withheld - no real media path; row honesty. Shape, live rows, and withheld rows declared above.
5. Mini where-we're-at in-stream card: not built - no honest projection feed.
6. First-entry seed message: rides the existing insight derivation; no separate first-entry message path.
7. Chapter/gimpse content is exactly as thick as the seed record - thin where the record is thin, never padded.

## Repair #21 orbit v4.2.1 - glass charges CF2-5..CF2-7 (2026-10-20, from the parent's 19:33 PDT glass inspection of the v4.2 pack)

Code tip `ae5c735e` (charges commit `20e8f7cb` + a Back-alignment fix `ae5c735e` found at the glass during this recapture, below). The whole orbit pack was re-filed at badge `seed - ae5c735`. Nothing merged; `muse/repair-17` untouched; FOUNDER_ACCEPTED remains NO.

### CF2-5 - compact ring truncation: FIXED

The settled header clamped the topic to 3 lines at max-width 64px inside the 90px settled ring ("Talk tonight about..."). The compact form is restructured: when the ring settles, it shrinks to a 22px GLYPH (the orb, its lights and arcs - previously the settled orb was display:none and only a clamped title sat in an empty ring), and the topic renders OUTSIDE the composition as header text beside the ring (`.orbit-compact-topic`), wrapping freely at 700 15px/20px. There is no `-webkit-line-clamp` and no `text-overflow: ellipsis` anywhere in the orbit stylesheet. The big entry form is unchanged (topic centered in the ring while it settles). The Twin Test holds: ring overhead always present, topic named, full text readable - capture notes record `titleInsideRing=false` and the full string "Talk tonight about Saturday" in every settled room (1:1 chain, collapsed, group, chapter, empty pairs). Frames: the whole pack below; the twin pair was recomposed from this build's thread half and 1:1 half, and the motion webms re-shot - a tail frame of the trace video shows the settled glyph ring with the full topic beside it.

### CF2-6 - copy coherence on the card: FIXED AT THE DERIVATION, BOTH LAYERS

Root cause, traced: the two rows derived from different truths. (a) Backend: `OrbitProjection.where_lines` printed "No next plan is set yet." whenever there was no SCHEDULED pick, even when an unscheduled plan existed in the room. (b) Web: the next-together row printed its empty copy from the projection while YOUR MOVE derived `viewerPending` independently from thread scope - and the filed v4.2 collapsed-light frame was itself captured mid-fallback (scope truth landed, projection truth not yet), producing "Nothing is planned together yet." directly above "A plan here is waiting on your answer."

The fix makes each layer derive the pair from one truth. Backend: the next fact is `next_plan || first plan`; a fact with no `when_label` renders "Next together: <title> - not scheduled yet." plus " One waiting on you." when the viewer is a pending party on it; "No next plan is set yet." survives only when no plan exists at all. Web: `viewerParty`/`viewerPending` now compute before the next row; the row is three-way - scheduled (when + where, a door), unscheduled ("Not scheduled yet - one waiting on you." when the viewer is pending, else "Not scheduled yet - <where>." / "Not scheduled yet."; a door to that plan carrying the plan's own state family), or truly empty ("Nothing is planned together yet." only when no plan exists in any derivation). The projection's first line is dropped from the expanded list whenever it would duplicate or contradict the key row (it previously deduped only against the scheduled form), and the card body now also opens when plans exist head-only. Pinned: one backend test (creator's line / pending invitee's line / scheduled line for the same plan) and six web pairing tests - scheduled+move, unscheduled+move, empty-projection+move, scope-fallback+move, empty+no-move, unscheduled-with-nobody-waiting. Live sighting: this round's first dark capture caught the fallback pairing in the wild and the card read "Not scheduled yet - one waiting on you." over YOUR MOVE; the final pack's 1:1 chain reads scheduled+move coherently in both modes, recorded per frame.

### CF2-7 - frost edge residue: FIXED, MEASURED

Root cause: the sheet's tint gathered on a two-stop ramp (80% at 56% height) while its mask reached solid at 48% - the two curves crossed mid-sheet and printed a soft horizontal kink wherever nothing dissolved over it (the collapsed and empty rooms; inhabited rooms hid it behind content, which is why only the collapsed frame was charged). One more pass on F-1's wording (c2shell.css, shell-wide, so every room and surface inherits it): the sheet is 24px taller (starts higher, lands softer), the tint now eases on a five-stop ramp (22% / 48% / 72% / 88% / 94%), and the mask's solid point moved to 64% so tint and mask follow the same curve - no crossing, no kink. `backdrop-filter: blur(22px) saturate(1.3)` is byte-identical (the sanctioned-glass registry pin in `theme/unifyDrift.test.ts` was NOT touched). Proof, beyond the eye: (1) DOM geometry recorded in every room state and mode - sheet top 584, bottom 844 (the screen's bottom edge), left 0, right 390 (full width), one strip behind composer AND pad; (2) pixel sampling down the sheet's free lane in the re-shot collapsed pair, empty pair and group frame - maximum row-to-row luminance step 2/255 through the whole band (mean 0.21-0.24), a continuous ramp with no edge. The soft halo still visible around the composer in the emptiest frames was sampled too: it dips under the pills (center-weighted), i.e. it is the composer/dock furniture shadow - the materials law's card depth, present on every surface - not the sheet. Re-shot as proof: the collapsed pair, plus the expanded and empty pairs, plus the entire pack since the sheet is shell-wide.

### Capture and test record for v4.2.1

- Frames re-filed at `ae5c735`, 390x844, zero declared across the final runs: 1to1, expanded, composer-send, drag, landing, return, collapsed, group, chapter, empty, twin (x dark/light = 22 PNG) + 4 motion webms (trace + state). The empty pair was re-filed from Maya's seat - the pack's recorded empty room (bare card, (i), empty composer, MT dock avatar) - with the title "Ethan Walker" now in full beside the glyph ring.
- Recapture find, fixed in `ae5c735e`: the compact header's row wrap stretched the Back button full-width and centered its label; Back is left-aligned again in every settled frame.
- Process note (recorded, not hidden): restarting :4001 for the backend change, the old beam was killed before its environ transplant was read; Phoenix was relaunched from the recorded stack topology (this worktree, `opal_dev_r21`, PORT 4001, synthetic verify + expose code, OPAL_CLOCK_OVERRIDE 2026-10-20T02:30:00Z, PG 127.0.0.1:5433). Every frame's badge and room truth verify the same world the v4.2 pack was filed from. Past-chats counts grew across capture runs (8 in dark, 9 in light) as capture-created sessions accumulate on this stack.
- Tests: scoped sweep (c1 + c2/shell + theme + brand) **768 passed / 1 failed** - the failure is the pre-existing `technicolorProduction` expectation only (761 baseline + 7 new v4.2.1 pins). `r20Orbit.test.tsx` alone: 50 passed. Backend orbit projection file: **9 tests, 0 failures** (run with DATABASE_URL pointed at the suite Postgres on 127.0.0.1:5433; the bare `mix test` alias targets a dead 5432 default on this VM - one mid-run failure under that dead path was environmental, the file is green on the correct path). Typecheck: the 9-error baseline, zero new. A wider local run over all of src/c2 additionally shows the `r20CardMenu` hex pin failing - the same failure the v4 section recorded as pre-existing at base; the named scoped sweep is unaffected.

## Round 3 - O-1 traced messages, O-2 parties named, O-3 push-to-chat REBUILT (founder verdict + correction, 2026-10-20 21:34-21:39 PDT)

The founder's verdict on the v4.2.1 pack: the Orbit page is founder-loved ("drastic difference... way better... this page is almost perfect") and the v4 composition is PROTECTED. Round 3 changed only what O-1/O-2 named, plus O-3 as REBUILT by his 21:39 correction (which superseded both the original confirm-only O-3 and the drag half of the v4 spec). Code commits: `c0b5ba96` (O-1 + O-2 + the O-3 rebuild) and `7ed14988` (O-2 fallback hardening found at the glass). Every frame below is badged `seed - 7ed1498`, 390x844, zero declared across the final capture runs. Nothing merged; `muse/repair-17` untouched; FOUNDER_ACCEPTED remains NO.

### O-1 - Messages traced with light: DONE

**Ambient justification (one sentence, as required):** the trace IS the room's light, carried into the conversation - it is identity, not state, so it is the same for every message and never varies per message, because a variation would claim a meaning no message has. Every message bubble in the room's own conversation (the embedded Opal chat, both seats, voice notes included) now carries a fine opal trace around its edge: a conic fire-family segment (violet -> cyan -> point light) clipped to a 1px ring by the same mask construction as the orbit trace (AR-F7), traveling on the registered `--orbit-trace-angle`, one circuit in 16s. **Per-mode treatment:** light mode subtle (50% strength, no glow); dark mode luminous (95% strength plus a soft fire-violet drop glow) - "people should feel like they're in the heavens in here." **Reduced motion:** the travel stops and the segment rests where it is - a static trace, the same light standing still. Scoped strictly to `.orbit-field .c1-bubble`, so no thread or other surface changes. Pinned as a CSS contract, including the negative space: the trace rule derives from no state token and no room-glow variable, and no per-author or per-status variant of it exists. Frame proof: in `orbit-v4-1to1-dark` the segment is visible riding the top edge of both bubbles; in light it reads as a faint shimmer on the bubble's edge, as designed.

### O-2 - Parties named, quietly: DONE

The settled compact header had dropped the party line entirely (the lights carried presence, nobody was named - "Talk tonight about Saturday" with nobody named). The line now lives in the header zone in BOTH forms: centered under the ring at entry size (as before), and - instead of `display: none` at settle - as a quiet full-width line under the ring + topic row in the compact form. No new card, no noise. **Form:** built from the viewer's seat, viewer first as "You", then the others by name, joined in the founder's own form - the dyad reads exactly "You - Maya Torres". Groups name everybody up to four ("You - Jordan Ellis - Marcus Lee - Maya Torres"); past four, the first three names plus the count ("You - P1 - P2 +12 more") - the count is stated plainly and the TOPIC is never the truncated text (CF2-5's no-ellipsized-hero law stands; there is still no ellipsis anywhere in the orbit stylesheet). **Hardening found at the glass (commit `7ed14988`):** the first capture caught two frames on the scope fallback (the doorway-time peer list, which contains no viewer) before the projection landed - the group-dark line named three peers with no "You", the empty-light line named the peer alone. The line is now viewer-relative in BOTH derivations: when no listed party is the viewer, the viewer's seat leads the line (the viewer is definitionally a party of their own conversation's orbit; no name is invented and no ring light changes - the line only). Pinned: fallback dyad reads "You - Bea". Final frames were captured only after the projection's party truth polled true in the rig (viewer first, all members named), and the DOM record for every room frame - 1to1, collapsed, group, empty, both modes - reads the projection line.

### O-3 - Push-to-chat REBUILT (founder correction 2026-10-20 21:39 PDT): DONE, verified end-to-end

**Disposed, named:** the drag implementation is REMOVED - long-press-lift, the drop target ("Drop to chat" hint + field outline), the 380ms flight, and the long-press menu's "Push to chat" path. No dead gesture path remains presented as live: the OrbitScreen source contains no drag state, no drop target, no flight function (pinned by source assertions). His reasoning governs: Orbit and the thread are SEPARATE SCREENS, so a suggestion cannot fly down into a composer that is not on this screen.

**The new mechanic - select, then place:**
1. **Long-press a suggestion = select it** (the copy-gesture users already own; same shared `LONG_PRESS_MS` hold). The suggestion shows its SELECTED state in the room's light language: a fine lit outline in the fire family plus a soft fire glow (`data-selected="true"`). A moving press is a scroll and cancels the hold - it selects nothing.
2. **Selection offers ONE clear action:** "Place in Maya's composer" - the destination named from the anchor's person (first name; a group anchor with no single person reads "Place in the thread composer"), with the unsent truth stated quietly under it: "Lands in the composer, unsent - send or edit it there." It never reads as sending (no "Send to", pinned). The quiet secondaries (Adjust in Orbit / Another take / Dismiss) remain in the selected state. **No clipboard anywhere in the path** - placement is an in-app handoff; the no-clipboard/no-send source pin stands, extended to the new path.
3. **Tapping the action crosses the screens for the user:** the existing host handoff (orbit -> `onOpenPersonThread` with the composer draft) lands him in the anchor's thread with the words already in the composer, UNSENT, CARET ACTIVE (focus in the words, caret at their end - the ThreadShell landing behavior, now pinned with focus + selection assertions). A quiet provenance chip in the thread reads "From your Orbit - unsent" (plain hyphen), with the ONE-TAP RETURN ("Back to Orbit") beside it; the return reopens the same orbit through the doorway path, the room restored (title, parties, card) - the v4 return contract's path. The chip lives exactly as long as the unsent draft does: send or clear the words and it is gone (pinned). This supersedes the v2 "no marker that help was used" rule - the thread now tells the truth about where the words came from, quietly.

**Step-by-step verification at the glass (final build, both modes, real mouse in the rig - `cap-v43` results, badge `7ed1498`):**
- Long-press (950ms real hold): `data-selected` flips true DURING the hold and holds after release; drag attributes all absent (no `data-dragging`, no field drop target, no drop hint).
- Place action visible with the exact label "Place in Maya's composer"; actions text carries the unsent line.
- Tap place -> thread assembles (`thread-composer-input` present); composer value EQUALS the suggestion text exactly; the suggestion does NOT exist as a sent message bubble; DOM `document.activeElement` IS the composer input with the caret at the end of the words.
- Chip present with the exact text "From your Orbit - unsent"; return affordance present.
- Edit works: typing appends to the placed words in the composer ("...what's coming up. Bringing the map."); the chip persists while the edited words sit unsent.
- One-tap return: the orbit room restores - same title ("Talk tonight about Saturday"), same party line ("You - Maya Torres"), room settled (return frames kept in the rig scratch as `r3-returned-{dark,light}`).

**Pins:** selection state (hold selects; short press and moving press select nothing), place-action truth (exact destination label, no send wording, tap calls the handoff with the exact words, no clipboard/send in source), drag disposed (source + behavior), landing (prefilled + unsent + caret focus/selection + edit + chip lifecycle), chip + return contract, group fallback label. The drag-era tests were rewritten, not weakened: the menu-path test is now the select-and-place test, the drag test is now the disposed-gesture test, the landing test now carries the chip/caret/return assertions.

**Frames:** NEW `orbit-v4-select-{dark,light}` (suggestion selected, place action visible; the dark frame is the clean canonical proof - the light frame's room sits lower because the capture's stream recipe left the past-chats fold open, with the place action still visible and its DOM record identical). `orbit-v4-landing-{dark,light}` RE-SHOT for the new mechanic (thread, prefilled composer with caret at the words' end, the provenance chip, the return affordance). The RETIRED drag frames moved to `pack-archive/superseded-drag-gesture-r21/` with a README (what they showed, when superseded, by what) - never presented as current again. Because the compact header changed, the whole orbit pack was re-filed at `7ed1498`: 1to1, expanded, composer-send, select, landing, return, collapsed, group, chapter, empty, twin (recomposed from this build's thread + 1to1 halves) x dark/light = 22 PNG + 4 motion webms re-shot. Coherence: every 1:1-chain frame is the same Maya Torres conversation; group/chapter are the Weekend Crew; empty is the plan-less Maya dyad - topic, parties, and card agree per frame in the capture notes. Past-chats counts keep growing across capture runs (sessions accumulate on this stack; 10-11 by the final runs).

**Declarations:** (1) The Shape baseline draft on this stack still echoes Opal's own last line ("Tell me more - I can help you plan or check what's coming up." is what was selected, placed, and landed in the final frames) - the mechanic's contract held exactly with those words; draft quality on a sparse record remains the Shape derivation's, as declared in v4.2. (2) The chip's return reopens the orbit through the doorway path (the room restored to its landing state); it does not reopen the in-orbit session that was open before placing - the session is one tap away in Past chats, as it is from any doorway entry. (3) One combined scoped-sweep run showed a second failure that did not reproduce in per-directory runs or in the repeat combined run (both clean apart from the known failure); recorded as a load flake, not hidden.

### Tests (Round 3)

- `r20Orbit.test.tsx`: **60 passed** (50 at v4.2.1 + 10 net new/rewritten Round 3 pins across O-1/O-2/O-3).
- Scoped sweep (c1 + c2/shell + theme + brand) at the final Round 3 tip `7ed14988`: **778 passed / 1 failed** - the one failure is the pre-existing `technicolorProduction` expectation, unchanged from the v4.2.1 line (768 passed / 1 failed; the +10 delta is the Round 3 pins). Per-directory runs of the same scope are all green apart from that same failure.
- Typecheck: exactly the 9-error baseline, zero new.
