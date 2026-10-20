# Repair #19 - Founder Polish Wave - Cluster H: Density & Collapse (P11) + Horizon & Preparation Spine (P12)

Branch: `muse/r19-polish-density` (base 95319bd7). Commits: `05922736` (web), `05716450` (backend). Not merged, not pushed. FOUNDER_ACCEPTED=NO. No pack captures taken (integrator's job - frame list at the end). No ledger edits.

One derivation owns everything below: `apps/opal_web/src/c2/shell/density.ts`, consumed by the one adapter (`shellData.ts` -> `graphListFromPlans`, `detailFromPlan`, `openingFromPlans`, `homeFromSession`) and stamped onto the projections in `projections.ts`. No component counts, buckets, weighs, or cools a plan on its own. The backend leg is one gate inside the ONE reveal derivation (`Reveal.for_viewer`).

---

## 1. The one bucket system (P11-3 + P12-1: ONE system, past and future symmetric)

Thresholds, from the plan record's own `start_at` (falling back to `completed_at` / `created_at` for past records). A plan with no parseable date carries NO band - a bucket is never invented from a `time_label` string (pinned in tests).

| Direction | Bucket | Rule (calendar days from now) | Presence |
|---|---|---|---|
| future | today | 0 | full - weight 1 |
| future | week | 1-7 | present - weight 0.75 |
| future | month | 8-30 | quiet - weight 0.5 |
| future | far (horizon band) | 31+ | distant - weight 0.25 |
| past | month pill | within the last 12 months | settled / white, collapsed |
| past | year pill | older than the month window | settled / white, collapsed |
| past | "Earlier" pill | no date on the record | settled / white, collapsed - never assigned an invented month |

Migration (P12-2): the presence stamp (`{band, weightClass, weight}`) is computed in the projection from `start_at` vs now, so a plan migrates far -> month -> week -> today and gains weight exactly as its start crosses the thresholds. Pinned with a pinned clock: the same +40-day plan projects distant at now, quiet at +20d, present at +35d, full at +40d (`density.test.tsx`).

## 2. Per-pattern novelty record (standing mandate)

### Pattern: past / archive
- Considered: (S1) SETTLED STONES - past plans as dimmed points of light on the graph/orbit, a year as a field of stones, tap a stone for the moment. (S3) THE QUIET LEDGER - past as a typographically set book, chapters by month, one line per plan. Founder floor: PAST AS A PILL - period summary pills, expansion by intent only.
- Pick: **Past as a Pill, with the Quiet Ledger as its expansion.** The pill carries period + count + up to three real highlights in settled/white treatment; expanding a pill reveals one-line ledger rows (title - when, in the record's own words), not full cards.
- Reason: clarity is the senior partner. Stones cannot carry a count, a highlight, or an answer to "what did we do in March?" for an unsure user - a field of points is beautiful and mute. The Ledger alone is still a 120-line scroll at heavy scale. The pill is the summary a person can hold; the ledger is the reading inside it. Stones remain the right *visual* language for the graph/orbit surface and compose later: a pill's cards are exactly a stone field's points, so a stones layer can be drawn over this same projection without a second derivation.

### Pattern: density (dense lists generally)
- Considered: (a) virtualized endless lists (render window over one long scroll), (b) the bucket constitution (time buckets + importance pinning + summarization thresholds), (c) a ranked river with summarization "dams" every N items.
- Pick: **(b) the bucket constitution**, with collapse doing the work virtualization would do.
- Reason: virtualization treats render cost, not noise - a perfectly smooth endless scroll still violates QUIET. Buckets make most of a heavy graph *not render at all* until asked (past = pills, far = one-line rows), which is both the perceptual and the DOM win. (c) is (b) with worse language.

### Pattern: invitations
- Considered: (S2) COOLING INVITATIONS - an invitation loses color temperature as it ages and dissolves into the archive at expiry. (a) Silent auto-archive with no line at all. (b) A dedicated "Declined" section listing every no.
- Pick: **S2 Cooling, ending in the settled line.** `invitationTemperature` projects warm (fresh / start 8+ days out) -> cooling (start within 7 days, unanswered) -> **limbo** (start passed, still unanswered - the past-grace segment) -> settled (declined or expired: one summarized line in the viewer's own past area, absent from every actionable list).
- Limbo composition (P14 coordination with Cluster I): cooling and limbo are ONE physics in this implementation. Limbo is the ruled past-grace segment of the same cooling - amber cooling toward muted, its own pattern channel, explicitly NOT action red (red is spent only on a live action state). The settled line is cooling's exact end-state, in the same muted/settled treatment, so a user learns one cooling language, not two. Cluster I drafts the limbo Rulebook entry; the integrator reconciles both entries into one cooling grammar at merge - the shared vocabulary is: warm / cooling / limbo / settled, with limbo defined as above.
- Reason (a) loses the user's own history truth (they did answer; their past should say so, once, quietly). (b) is decline theater aimed at the viewer themselves and keeps dead cards alive as a section. The sender side: NOTHING about a decline is projected anywhere else - `settledInvitations` exists only on the viewer's own GraphListProjection, the deck and Home filter settled plans out, and no other participant's surface consumes this derivation. No surface announces a decline to others.

### Pattern: time display
- Considered: (a) relative countdown labels ("in 74 days", "3 days left") - rejected: countdown noise, and P12-4 forbids it for far plans. (b) Absolute record labels only (status quo). (c) Band-first display: for far plans the band itself is the display (a quiet horizon line), with the record's own `whenLine` carried verbatim and no derived countdown anywhere.
- Pick: **(c)**. Presence weight + band replace the countdown; the words stay the record's own.

### Pattern: far field (P12)
- Considered: founder sketch - the DISTANT STONE (a far plan as a faint stone on the graph, time as light in both directions; the symmetric pair of settled stones). Alternative of mine: a separate "Horizon" page/shelf where far plans live out of the list entirely. Second alternative: a year-calendar zoom surface where far plans appear only as calendar marks.
- Pick: **the Distant Stone, in-band.** Far plans render in the Graphs list as a summarized horizon band of one-line rows at distant presence (0.25 / opacity treatment on the row), under the heading "On the horizon".
- Reason: a separate page hides far plans so completely they are forgotten - the founder's booked-out user must still *hold* the far plan. A calendar zoom answers "when" but not "what is quietly waiting". The in-band distant stone keeps the far future on the same graph as tonight, at a weight that can never compete with it. Settled stones (past pills) and distant stones (horizon rows) are the symmetric pair the founder named: time reads as light in both directions - past settled and white, future faint and quiet.

### Pattern: preparation spine (P12)
- Considered: (a) a generic checklist / to-do list on the plan, (b) a timeline/Gantt bar, (c) the ARC SPINE: intent -> preparation -> event -> settling into memory, each item with state, owner, and a position on the one arc.
- Pick: **(c) the arc spine.** A checklist loses ownership and the journey's shape; a Gantt is heavy, noisy, and implies scheduling precision the records do not hold. The arc is the general pattern the founder named, and its settling end lands exactly on the P11 past pill ("Settled - it rests in your past as a pill, not a scroll").

## 3. Density declarations per surface (VERBATIM - for the asset accountability table)

> **Home feed** - "Density: a capped, ranked river, never a calendar. At most 14 cards: up to 3 live, up to 10 plans, moments fill the rest. Plans order by state rank - happening, needs-you, ready, forming, past last - stable within a family, never relabeled. Settled invitations (you declined, or it expired) never appear. Nothing is bucketed under date headers; everything past the cap stays off-screen until the user goes to Graphs or Chats."

> **Center deck (opening)** - "Density: needs-you first - every action-family card, in projection order - then one hero: the happening plan, else the next ready plan. Remaining ready plans follow, then forming plans, each naming its one missing slot. Settled invitations never appear. Far-band plans carry no extra weight here beyond their family. Declared gap: the deck does not yet cap the needs-you and forming counts at heavy scale - under the heavy persona those lists are bounded by the persona's actionable set, and a cap threshold is future work, honestly unbuilt."

> **Chats list** - "Density: NOT governed by this wave's machinery. The list renders the conversation projection's own order (the C1 hosts own it; unread and next-together ride that projection). No summarization threshold, bucket, or collapse was added here. Declared gap: a booked-out user's chat list remains a recency scroll from the server projection - density rules for it belong to the chats cluster's projection, not a component."

> **Call log** - "Density: NOT governed by this wave's machinery. The log renders the calls projection (the calls cluster owns it), with ambient borders color-coded by the call's action state. No collapse or threshold was added here. Declared gap: a heavy call history has no pill/month collapse yet; the past-pill grammar in density.ts is the named pattern to apply when the calls projection carries period dates."

> **Graphs list** - "Density: the dense-list constitution, implemented. Group order is fixed: Needs your answer (action) first, then Coming up (happening + ready), then Needs a day or a detail (forming with exactly one missing slot named), then Someday (forming, nothing missing), then On the horizon (far band, one quiet line per plan, distant presence) - past is never a rows group. Every card carries its projection-stamped presence weight (full / present / quiet / distant) from its real start date; a plan with no real start carries no weight. Settled invitations are absent from every group. Private graphs never enter groups or counts."

> **Graphs past** - "Density: past is a pill, never a scroll. Past plans collapse into period pills - a month pill within the last 12 months, a year pill before that, one 'Earlier' pill for undated records - each pill showing period, count, and up to three highlights, in settled/white treatment. Expansion is by intent only and reveals one-line ledger rows for that period alone. Settled invitations rest here as one summarized line each, in the viewer's own past area only."

> **Orbits log** - "Density: NOT governed by this wave's machinery. The orbit history / Opal-conversation log renders its own projection (C1 hosts). The past-pill grammar was not applied here. Declared gap: orbit history accumulates as a scroll today; if it is to collapse, it should collapse by the same pill grammar from its own projection - named, not improvised in this wave."

> **Graph detail - History** - "Density: already collapsed before this wave (a History - show/hide toggle, closed by default) and unchanged; it is a per-plan record, not an accumulating list, so the pill grammar does not apply."

> **Settings - Activity (Center log archive)** - "Density: NOT changed by this wave. The Activity room renders every account-activity entry as a row from its settings projection, which carries no period date per row, so the pill grammar cannot be applied truthfully from that projection. Declared gap: archive collapse belongs in that projection (period dates first), not in the surface."

Where the collapse grammar WAS applied: Graphs past (lead pattern, fully), Graphs list horizon band, Home feed and Center deck settle-filtering. Where it was NOT: chats list, call log, orbits log, settings Activity - each declared above with its reason.

## 4. Heavy persona (P11-4)

Spec: **Robin Alvarez** (`robin-booked-out`), a booked-out user -
- 120 completed past plans over 14 months (past pills, both month and year kinds exercised as time passes);
- 42 invitation records: 16 pending/actionable, 14 declined by the viewer, 12 expired unanswered;
- 3 circles ("Close circle", "Work crew", "Family"), carried on `who_label` as the real contract carries them;
- a living present: 1 happening, 1 ready-in-week, 1 ready-in-month, 1 forming;
- 2 far plans: a birthday at +52 days and the substantial plan below.
- The substantial plan: "A long weekend in Joshua Tree with the whole crew", +74 days, agreed, 5 of 6 going, carrying a real-shaped completion record (steps: calendar/projected, restaurants/running, food/collecting, ride/offer, follow_through/registered) for the spine frame.

Provisioning: ADDITIVE and separate - `apps/opal_web/src/c2/shell/heavyPersona.ts` exports `HEAVY_PERSONA`, `heavyPersonaPlans(now)`, and `heavySubstantialPlan(now)`. Dates generate relative to the caller's `now`, so pinned-clock tests and captures are exact. The existing seed world is untouched: `founderGraphSeed.ts` and the backend `HumanSeedWorld` / founder seeds are byte-stable (no file edited), so the machine-speak gate and the API floors are unaffected - the full web suite result below confirms it.

HONEST GAP: the heavy persona is a fixture/capture-world persona, NOT a backend account - there is no sign-in as Robin. Backend provisioning would require a new plan-writer module registered in `repair18_pattern_enforcement_test.exs` (FIX-10b: registration is a founder-visible event) behind the founder-seed gate; this wave does not silently perform that registration. The integrator's capture harness feeds `heavyPersonaPlans()` through the real projections instead (frame list below).

## 5. Performance under density (P11-5)

Measured in `density.test.tsx` by rendering `C2Graphs` with the heavy projection (182 plans) in jsdom:
- Past DOM by default: **0 past plan rows/cards**. 120 past plans render as **at most 15 pill buttons** (12-14 in practice) + 26 one-line settled summaries. Expanding one pill renders at most **10 ledger rows** (that period only).
- Horizon DOM: far plans render as **2 one-line rows**, not full cards.
- Full cards in the DOM under the heavy persona: only the live groups (action/coming-up/needs-detail/someday) - about 34 cards; everything else about this graph is lines and pills.
- No virtualization/windowing library was added: collapse IS the windowing for past and far (the two unbounded directions). The bounded middle (live groups) is small by construction. Jank finding: none at fixture scale; the remaining unbounded surfaces (chats list, call log) are declared gaps above, not hidden.

## 6. P12 - Horizon + preparation spine

### Thresholds + migration rule
One system with the past buckets (table in section 1). Bands are calendar-day differences from the record's own `start_at`: today 0, week 1-7, month 8-30, far 31+. Presence weights: full 1 / present 0.75 / quiet 0.5 / distant 0.25, stamped on the card by `graphListFromPlans` (`presence` field) and rendered as `data-presence-weight` on Graphs rows; horizon rows render at distant treatment. Migration is a projection fact - re-projecting the same plan at a later `now` changes its weight class (pinned, section 1).

### Milestone touches only (P12-4)
Implemented in the ONE backend reveal derivation (`apps/opal_core/lib/opal_core/social_flow/reveal.ex`, `plan_item/3` gate): a far-band plan (start > 30 calendar days out) is reveal-INELIGIBLE unless a milestone holds - the viewer's participant response is pending (a decision is needed) or the plan is missing exactly one slot the viewer can supply (also a decision). A ready or quietly forming far plan produces no reveal and no countdown. Preparation-completion milestones ride the existing P6 report leg (material `ShellRecentChange`), which is not a plan item and is untouched by the gate. The web mirror `farBandMilestone` in density.ts carries the same rule for projection consumers and is pinned in web tests. Pinned-clock backend test: `repair19_polish_horizon_reveal_test.exs` passes `now:` explicitly into `Reveal.for_viewer/2` - far ready = no item; far pending (participant) = item; near ready = item.

### Spine model - as found vs built
AS FOUND (investigated first): R16's `PlanCompletion` machinery persists real steps on the plan record (`alignment["completion"].steps`, projected on the contract as `completion.steps`): ids calendar, restaurants, food, ride, directions, join_link, follow_through, coming_up, proactive_anchor, checkin - each with a machinery-written status. There is NO owner field, NO due field, and NO user-creatable preparation-task record anywhere (no plan steps/tasks table; attention items are signals, not plan children).
BUILT (additively, no parallel truth): `spineFromPlan` in density.ts projects the journey arc INTENT -> PREPARATION -> THE EVENT -> SETTLING INTO MEMORY from records the plan already carries - its completion steps (in the record's order), its missing-slot fact, its Who answers (folded in by `detailWithHistory` via `foldSpineAnswers`), and its own state. Every item carries: state (the record's own status mapped to spine language: done / working / needs-you / waiting / declared), owner (you / Opal / "an agent, only with your approval" - the proactive_anchor step), and due-position (arcPosition 0..1, finished in the projection). View: `PreparationSpine.tsx`, mounted additively in `C2GraphDetail` as its own section under the plan card (minimal diff to C2Graphs.tsx, one conditional block - the integrator can move the mount without touching the projection).
HONESTY BOUNDARIES: a step renders only when the completion record carries it; a failed step renders "declared" (Opal could not do this - it is yours if you want it), a skipped step "not needed" - never done. Ride and food steps are owner=you (the machinery only offers/asks; no booking or ordering execution exists, and none is simulated). The agent-owned item is the existing opt-in-gated proactive anchor step - approvals/wallet/QUIET rules stay with that machinery; the spine adds no execution path.
DECLARED GAPS: users cannot add their own preparation tasks to a spine (no backend record/gate exists - building one is a backend wave, not a projection); spine items carry arc position, not calendar due dates, because the records carry none.

## 7. Tests + exact results

Web (this worktree, `apps/opal_web`):
- `src/c2/shell/` - **25 test files, 217 tests, all passed** (includes the new `density.test.tsx`: thresholds/migration, pill collapse, heavy-persona settle + ordering + DOM budget, cooling/limbo lifecycle, milestone mirror, spine projection; and `r19Graphs`, `dropItWiring` - one existing assertion updated to read past cards from `pastPills`, where they now live - `c2ShellSurfaces`, `homeSocial`, `harmony2`, `adopt1`).
- Full web suite: **212 files passed / 16 files failed; 1765 tests passed / 23 failed** - exactly the stated floor (23 failed / 16 files), no growth.
- Typecheck: **exactly 9 errors**, all pre-existing (OpalApp Tab x3, productClient duplicate plan_type/online x5 - pre-existing in the contract type, YouSettingsDestination x1). None in files this wave touched.

Backend (`apps/opal_core`, scratch env, PG on 5433 via DATABASE_URL):
- `repair19_polish_horizon_reveal_test.exs` (new): **1 test, 0 failures**.
- `repair19_ja02_private_projections_test.exs` + `repair18_pattern_enforcement_test.exs`: **16 tests, 0 failures** (the Reveal change breaks no existing reveal/privacy/pattern law).
- Note: `mix format --check-formatted` flags `reveal.ex` at the pre-existing JA-02 comment block (line ~233, untouched by this wave); the added gate block is formatted to the file's style and the whole file was NOT reformatted, to keep the diff clean. Full `mix precommit` (full backend suite) was not run - compile is clean for the touched module via the test runs above.

## 8. Honest gaps (consolidated)
1. Heavy persona has no backend account / sign-in (section 4) - fixture + capture-harness persona only.
2. Chats list, call log, orbits log, settings Activity: density declarations recorded, machinery NOT applied (reasons per surface, section 3).
3. Center deck needs-you/forming counts are uncapped at heavy scale (declared in its declaration).
4. Spine: no user-creatable prep tasks, no per-item calendar due dates (section 6).
5. The list adapter's state family is status-derived (the pinned `familyOfStatus` canon): a pending *invitation* whose plan status is tentative projects as forming on Graphs, as before this wave - the per-viewer action derivation lives in the backend NextPlan/Reveal, and the cooling temperature stamp is what marks those cards as open invitations in this projection. Not silently changed here.
6. Settled-stone VISUAL layer (points of light on the graph/orbit) not built - the pill projection is its data source when it is.

## 9. FRAME LIST for the integrator (heavy persona, both modes each)

Reach method for ALL heavy frames: there is no Robin sign-in (gap 1). In the capture harness / dev build, build the projection from the fixture and render the real surfaces:
```ts
import { heavyPersonaPlans, heavySubstantialPlan } from "src/c2/shell/heavyPersona";
import { graphListFromPlans, detailFromPlan } from "src/c2/shell/shellData";
const now = new Date();
const listProjection = graphListFromPlans(heavyPersonaPlans(now), now); // -> <C2Graphs projection={listProjection} .../>
```
Capture each frame in dark mode and light mode.

1. **Graphs - All lens, heavy** (density default state): groups in constitution order, horizon band visible, Past section = pills + settled lines. From the projection above, default lens.
2. **Graphs - Past lens, heavy**: tap the Past lens chip (`c2-lens-past`) - pill list + settled lines, no rows.
3. **Graphs-past pill default** (close): the Past section of frame 1, unexpanded - pills show period + count + highlights.
4. **Expanded pill**: click the first `[data-testid="c2-past-pill"]` - ledger rows for that month only (`c2-past-ledger-row`).
5. **Settled-invitation history line**: in the Past section, any `[data-testid="c2-settled-invitation-line"]` (26 lines; first reads "... - settled. You said you could not make it.").
6. **Far-field band**: the "On the horizon" section (`c2-graphs-horizon`) of frame 1 - 2 distant rows (`c2-horizon-row`, `data-presence-weight="distant"`).
7. **Spine view (substantial plan)**: render `<C2GraphDetail detail={detailFromPlan(heavySubstantialPlan(now), "graphs")} .../>` - the "How this plan comes together" section (`c2-preparation-spine`) under the plan card shows intent -> preparation (calendar done/Opal, restaurants working/Opal, food waiting/yours, ride waiting/yours, watch registered/Opal) -> event -> settling.
8. **Migrated week-of view**: re-project with a pinned later clock - `graphListFromPlans(heavyPersonaPlans(now), new Date(heavySubstantialPlan(now).start_at! - 3*86400000))` rendered as frame 1: the Joshua Tree plan has left the horizon band and sits in Coming up at `data-presence-weight="present"`. (Equivalently pin `now` to 3 days before its start.)
9. **Cooling states** (optional, if Cluster I wants the shared grammar in one pack): a Graphs list built from three pending invitations at +20d / +3d / -1d against a pinned `now` - their cards carry `temperature` warm / cooling / limbo in the projection (the stamp is on the card data; no dedicated visual exists yet - the frame documents the projection state, and the limbo visual treatment is Cluster I's P14 surface work).
