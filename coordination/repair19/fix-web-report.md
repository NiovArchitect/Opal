# Repair #19 — WAVE W19-FIX-B (WEB + SEED) — report

- **Branch:** `muse/r19-fixb` in `wt-r19-fixb`, off merged tip `66aa797f`.
  **Not pushed.** 4 commits:
  - `dff04e26` BS-05 seed photo assets
  - `e896a2e2` web: BS-02 gate wiring, BS-08 dismissal/focus, BS-11 share honesty
  - `ebad1a8f` backend: BS-05 seed imagery + BS-12 brunch timezone
  - `d7a8b7a1` web tests for BS-02/08/11
- **FOUNDER_ACCEPTED = NO.** Nothing here is a walk claim.

---

## BS-02 — Orbit gate wired to real verification (web half)

**Was:** `C1ShellHosts`' `orbitGate.requestUnlock` added the orbit key to a
local set unconditionally, with the notice "(Passcode verification is not
wired yet.)" — one tap revealed a private orbit's contents.

**Now:**
- `requestUnlock` only opens the new `OrbitUnlockPrompt`
  (`apps/opal_web/src/opalUi/c1/OrbitUnlockPrompt.tsx`) — the same component
  discipline as the Graphs Private unlock: password field, code handed to
  the server and dropped, never stored or checked client-side.
- The orbit joins `unlockedOrbits` **only** in the prompt's `onUnlocked`,
  which fires only after `verifyOrbitLock` returns `{unlocked: true}`.
  A wrong code (403) keeps the prompt open with "That code did not open
  it." and the orbit reveals nothing.
- Whether a passcode exists is read via the existing `getGraphLock`
  (W7's one lock truth). If **no** passcode is set, the prompt says so
  and offers the Graphs area's own set path (`setGraphLock`); a
  successful set unlocks — the Graphs Private area's exact law. There is
  no path that "unlocks" against nothing.
- Relock mirrors `C2Graphs`: `visibilitychange` to hidden clears all
  unlocked orbits and any open prompt; host unmount clears them too.
- The old "not wired yet" notice is gone.

**⚠ CONTRACT FOR INTEGRATION (flagged, as tasked):** the client is
defined in `productClient.ts` as

```
verifyOrbitLock(code, bearer) → POST /api/v1/product/opal/orbit-verify
  body { code } · 200 { unlocked: true } · 403 { unlocked: false }
```

— the `POST /opal/graph-lock/verify` pattern exactly, verified
server-side against the same account passcode (`getGraphLock` reads
whether one is set). W19-FIX-A was still uncommitted when this wave
built, so the endpoint's landed path could not be read from its branch.
If FIX-A lands it under a different path (e.g. nested under
`graph-lock/`), **`verifyOrbitLock` in `productClient.ts` is the only
client change** — the prompt, gate, and tests are path-blind.

**Tests** (`r19FixB.test.tsx`, host-level with the real CenterHost):
locked orbit shows header-only (no title, no latest line) before
verification; tapping it opens the prompt and still reveals nothing;
wrong code → error line, prompt stays, contents stay hidden; right code
→ prompt closes, orbit's lines appear. Second test: `passcode_set:
false` → prompt offers the set path, `setGraphLock` is called,
`verifyOrbitLock` never is, and the orbit then unlocks.

## BS-05 — Walk-world imagery is real

**Was:** every seeded story's media was a 1×1 PNG; no seeded plan carried
imagery under any field Home reads.

**Imagery sourcing (and why it's honest):** nine real photographs from
Wikimedia Commons (CC BY / CC BY-SA / CC0), resized to 640px-wide JPEGs,
committed at `apps/opal_core/priv/seed_assets/` with a `SOURCES.md`
giving each file's license, author, and Commons source URL. They are
staging-world records: each photo depicts the *kind* of place/moment
the plan or story is about (a market stall for the market run, pancakes
for brunch, a coast road for the ride), uploaded through the product's
own media owner — no record claims a photo *is* the venue, and the
seed's moduledoc says exactly that. What was not acceptable — and is
gone — is a 1×1 pixel or a title-derived placeholder presented as
imagery.

**Mechanics:**
- `HumanSeedWorld` uploads the photos via
  `SocialMomentPublishing.upload_media` (real media records with the
  photos' real dimensions: 640×360 … 640×480, 20–83 KB each) for every
  seeded story and plan. Plans carry the media id in `alignment`
  (insert-missing-only — re-seeding never rewrites an existing one);
  the founder seeds' own plans (Dinner at Juniper & Ivy, Saturday
  morning at Oceanside Farmers Market) are attached by title.
- Stories seeded by the pre-fix world converge: if a story's media is
  not a real image (missing or either dimension ≤ 1), its media ref is
  replaced with the real photo on re-seed.
- One real producer for the plan-imagery chain:
  `SharedPlan.to_contract/2` now projects **`image_url`** (the first
  field `planImageFromRecord` reads) from the plan's media id,
  pointing at the product's own media endpoint. Plans without media
  are byte-identical to before.
- Byte authorization: `read_media/2` gains a plan leg —
  `SharedPlan.plan_media_authorized?/2` authorizes exactly the plan's
  creator and participants, deny-by-default, mirroring the story leg's
  pattern. It is an existence check that renders no plan state, and it
  is registered in `PlanProjection`'s sanctioned read surface (the
  gyroscope/coherence suite passes with it there). Without this leg
  even the founder-viewer could not load a peer-created plan's image.
- **State distribution unchanged** (no plan status/participant row was
  touched). **Machine-speak:** no display string changed — titles,
  locations, messages, captions are untouched; the only string change
  is the seed summary's internal `venue_photo` value, which now reads
  `seeded_as_media_records_on_plan_and_story_records` (its test
  assertion updated to match). The backend half of the machine-speak
  gate (assertions inside `human_seed_world_test.exs`) is green. The
  rendered/API half (`scanSeedWorld` in shots/regression) runs against
  a served stack and was not runnable in this worktree — named, not
  silently skipped.

**Tests** (new in `human_seed_world_test.exs`): every named walk-world
plan carries a media id whose record is a real JPEG (width/height > 1,
byte_size > 1000), the contract carries `image_url` and `media_id`, a
participant can read the bytes, a stranger gets `:not_found`; every
story's media is likewise a real JPEG; payload asserts `has_image` for
all world plans.

## BS-08 — Chrome keyboard / focus

One shared hook, `apps/opal_web/src/opalUi/c1/useDismissable.ts`,
following the codebase's existing document-level Escape pattern and
adding the focus legs: **Escape closes; on open, focus moves into the
surface (first focusable control); on close, focus returns to the
invoking control** (the caller's trigger ref when it owns one, else
the element focused at open). Wired into:

- **Conversation rail** (`ConversationRail`): Escape + focus in/return;
  panel gains `aria-modal="true"`.
- **Orbit sheet** (`OrbitSheet`): same; `aria-modal="true"` added.
- **Conversation overflow menu** (`CenterChat`): Escape + outside
  pointer-down close (pointer-downs on the trigger itself are left to
  its toggle, never double-handled), focus in/return via the overflow
  button's ref; the button gains `aria-haspopup="menu"` and the menu
  an `aria-label`.

The orbit unlock prompt (BS-02) and conversation share sheet (BS-11)
use the same hook.

**Tests:** one per surface — open → focus is inside → Escape → closed
→ `document.activeElement` is the invoking control; plus the menu's
outside-pointer-down leg.

## BS-11 — Conversation Share honesty

**Was:** Share invoked `navigator.share` / clipboard with
`Opal chat: <title> (<anchor>)` — a reference that resolves to nothing.

**Now:** Share opens `ConversationShareSheet`
(`apps/opal_web/src/opalUi/c1/ConversationShareSheet.tsx`), W13's
plan-card law applied to a conversation (new
`ConversationShareCardProjection` in `projections.ts`, one adapter
`conversationShareCard` in `C1ShellHosts.tsx`): a card built only from
records the host holds — conversation title, its anchor line, and the
anchor plan's own card block (title/state/when/where from the ONE plan
projection) when the anchor resolves to a held plan. Its **one action
is Copy details** — exactly the card's text lines. No URL is
fabricated (a conversation has none), `navigator.share` is never
called, message content is never on the card, and the card states in
words what sharing means: *"This shares the chat's details. The
conversation itself stays private to your account — nothing here
opens it."* The old bare-reference code path is deleted, not bypassed.

**Tests:** end-to-end through CenterHost — overflow → Share → sheet
renders with the plan block; Copy calls `clipboard.writeText` once
with lines containing the title, anchor line, and plan when-line plus
the honesty line, containing no `http` and not matching the old
`Opal chat: …(…)` form; `navigator.share` spy never called. Plus an
adapter unit pin for the unanchored case.

## BS-12 — Seed brunch timezone

`next_sunday_late_morning/0` built **11:00 UTC** while the label said
"Sunday · 11:00 AM" (4:00 AM PDT by the instant). It now builds next
Sunday **11:00 America/Los_Angeles** — the zone every seeded plan row
already carries. The app has no tzdata dependency, so the offset
follows the US DST rule directly (PDT −7 from the second Sunday of
March to the first Sunday of November, else PST −8; exact for an
11:00 AM target). **Test pin:** the brunch plan's `start_at`, read in
the home zone by the same rule, is a Sunday at exactly 11:00, its
label is "Sunday · 11:00 AM", and the instant is in the future.

---

## Floors — results verbatim

**Web suite** (full run in this worktree, `--reporter=basic`; baseline
re-measured the same way on a detached checkout of pristine `66aa797f`
in this same worktree — an earlier partial run during a /tmp wipe was
discarded and re-measured, see scratch):

```
Baseline 66aa797f:  Test Files  16 failed | 190 passed (206)
                    Tests       23 failed | 1656 passed (1679)
FIX-B tip:          Test Files  16 failed | 191 passed (207)
                    Tests       23 failed | 1663 passed (1686)
```

The +1 file / +7 tests are this wave's `r19FixB.test.tsx` (7/7 pass).
The failing **test-name set and file set are byte-identical** between
baseline and tip (diffed; only durations differ). That is the stated
baseline 23/16 (23 tests / 16 files). Adjacent suites also run green
individually: doorway 39/39, c1ShellWiring 14/14, legacyRecreation 5/5.

**Typecheck:** `tsc -p tsconfig.json --noEmit` — 11 pre-existing errors
at baseline, the identical 11 at tip (sorted diff empty):
**zero-delta**.

**Backend** (targeted, per task; env `PATH=~/workspace/elixir/bin:~/workspace/otp/OTP-27.3.4.2/bin:$PATH`,
`MIX_DEPS_PATH=/tmp/opal_deps`, Postgres 16 :5433 via `DATABASE_URL`):

```
human_seed_world + founder_communication_seed + founder_graph_commitment_seed
+ social_moment_publishing + plan_projection_coherence
+ repair18_pattern_enforcement + temporary_story_publishing:
  50 tests, 0 failures
```

(Baseline for the seed suites before changes: 5 tests, 0 failures.)
One environment note: at this merged tip a fresh `mix ecto.migrate`
stops on BS-01's duplicated migration version — FIX-A's item. For the
targeted runs only, the graphs migration was temporarily renamed to
`20261030010002` (the exact renumber FIX-A's fresh-DB proof records)
and restored after each run; **no migration change is committed on
this branch** (`git status` clean for `priv/repo/migrations`).

Scratch (full vitest logs, failing-set lists, typecheck lists):
`coordination/repair19/fixb-scratch/`.
