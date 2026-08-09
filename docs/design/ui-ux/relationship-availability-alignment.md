# Relationship Availability Alignment — "Find a time" — UI/UX Design

**Author:** Claude (independent) via agent opal-ui-ux-pro-max
**Lane:** research / design — not production deploy
**Grounded in:** `docs/coordination/FOUNDER_NUANCE_PACK.md`; `apps/opal_web/src/OpalApp.tsx`; `apps/opal_web/src/data.ts`; `apps/opal_web/src/theme/technicolorProduction.ts`; `apps/opal_web/src/designTokens.ts`; `apps/opal_web/src/brand/OpalLogo.tsx`; `apps/opal_web/src/people/FindPeopleFlow.tsx` (sheet pattern); `apps/opal_web/src/realtime/RealtimeClient.ts`; `apps/opal_mobile/src/shell/navigation.ts`; `docs/evidence/social-flow-14/CALENDAR_AUDIT.md`; `docs/product/OPAL_HUMAN_AND_AI_STATE_MATRIX.md`; `docs/build/BOOKING_STATE_COPY_PATCH_PROPOSAL.md`; `docs/reviews/CLAUDE_PR61_INDEPENDENT_REVIEW.md`; `docs/reviews/CLAUDE_AVAILABILITY_PRIVACY_PRESSURE_REVIEW.md`; and, read directly via `git fetch`/`git show`, the actual Phase 1 backend source on the unmerged branch `origin/build/relationship-availability-alignment` @ `dd9f085`: `apps/opal_core/lib/opal_core/social_flow/availability.ex`, `availability_controller.ex`, `availability_window.ex`, `docs/architecture/AVAILABILITY_ALIGNMENT_ENGINE.md`, `docs/evidence/availability-alignment/PHASE1_STATUS.md`, and the partial client stub already drafted in `apps/opal_web/src/api/productClient.ts` on that same branch.
**Last updated:** 2026-08-08

---

## 0. Copy-provenance correction (read this first)

The task brief's example locked strings ("You both have Thursday evening open.", "Want a couple ideas?", "Still open.", "Set.") do not all match what is actually implemented on the Phase 1 backend branch. I read `availability.ex` directly rather than trust the paraphrase. The **real, shipped, tested** strings are narrower:

| `overlap_status` | Real backend `label` (verbatim, from `overlap_label/1` / `empty_overlap/1`) |
|---|---|
| `need_more_shares` (fewer than 2 people have shared into this conversation) | `"Share a couple times that work."` |
| `no_overlap` (≥2 people shared, ranges don't intersect) | `"No shared times yet."` |
| `blocked` (trust/safety block in this conversation) | `"Could not find a shared time."` |
| `overlap_found`, 1 merged range | `"One time works for both of you."` |
| `overlap_found`, N merged ranges (N ≥ 2) | `"N times work for both of you."` |

There is no backend string that says "You both have Thursday evening open." or "Want a couple ideas?." I have not treated those as real copy. Instead I designed a **composition**: the backend `label` renders verbatim (never rewritten, never invented), and a *separately-sourced, honestly-formatted* line underneath renders the real `display_start`/`display_end`/`timezone` the backend already returns inside `overlaps[]` — the same class of operation as `new Date(m.created_at).toLocaleTimeString(...)` already used at `OpalApp.tsx:150,363` for message timestamps, not a new claim to fact. That composition is what gets you the *feeling* of "Thursday evening open" without a UI ever asserting a specific moment the backend didn't actually return. `"Set."` and `"Still open."` are real, but they are the **existing** `SignalKind` labels (`open_loop` → "Still open", and the live-server label rendered via `s.label`/`activeChat.signalLabel` for the terminal stage — see §7.6) — not new strings this capability introduces. Where I do use "Want a couple ideas?"-style language below, it is marked **[PROPOSED]**, gated to a specific data condition where it wouldn't fabricate anything, and flagged for backend copy confirmation before Grok wires it as literal text.

## 1. Summary

"Find a time" is not a new screen, not a calendar, not a fifth tab. It is: (1) one existing UI element — the conversation's journey chip, already rendered at `OpalApp.tsx:516-529` whenever a signal exists — becoming tappable; (2) one reused bottom sheet (`.find-people-overlay`/`.find-people-sheet` pattern from `FindPeopleFlow.tsx`) that holds a private list editor and a scoped share picker; and (3) one new `opal-moment` variant that only ever interrupts the conversation with real news: a genuine computed overlap. Everything else — "nobody's shared yet," "you shared, still waiting," who has and hasn't responded — stays inside the sheet, on request, never pushed at anyone. This is the design's central non-manipulation mechanism, and it is enforced by the API shape itself, not just by copy discipline: `compute_overlap/2` (`availability.ex:213-256`) structurally cannot return a peer's individual windows, so no UI built against it can honestly say "she has nothing else scheduled" or "she should make time for you" — that data was never fetched, because the endpoint never sends it. The interface is incapable of the manipulative framing by construction. Tone rules are the second line of defense, not the first.

## 2. What's wrong / weak if this is designed naively

- **Calendar-shaped UI.** A week/month grid, a free/busy heatmap, or a "scheduling" home screen was already rejected for this exact domain (`docs/evidence/social-flow-14/CALENDAR_AUDIT.md`: "not a calendar wearing a chat skin"). The backend schema physically cannot support one anyway — `availability_windows` has no title/note/reason column (`availability_window.ex:19-24`), so any grid-and-tooltip UI would be inventing content that doesn't exist to fill cells.
- **A fifth nav tab or persistent "Availability" surface.** `apps/opal_mobile/src/shell/navigation.ts` enumerates exactly `Home / Chats / Plans / You` and explicitly lists `"signals"` in `NOT_PRIMARY_TABS`. `PHASE1_STATUS.md` (backend, verified) independently states the same constraint: "No Home / Chats / Plans / You restructure... No Availability tab."
- **A specific invented time in a chip.** This is the exact class of defect already found and fixed once in this product (`docs/build/BOOKING_STATE_COPY_PATCH_PROPOSAL.md`, `OPAL_HUMAN_AND_AI_STATE_MATRIX.md §4`): an unattributed chip that reads like a fact when nothing that specific was confirmed. Rendering "Thursday evening open" as if it were the backend's own words, or splitting a single wide overlap range into three invented time-of-day options, would reproduce that defect inside a brand-new feature on day one.
- **Reintroducing the orb/halo.** Any celebratory "you found a match!" moment is a natural place for someone to reach for a glow ring around a mark. `OpalMark`'s glowing-ring treatment was already built, flagged, and removed (PR #62). Do not touch `OpalMark`/`OpalLockup` for this feature at all — it has no brand-arrival role inside a conversation.
- **Nudging the slower sharer.** "Waiting on Jordan," a red badge, an unread-style counter on the journey chip, or repeating the invite copy on every open — all read as guilt, which `FOUNDER_NUANCE_PACK.md` explicitly excludes from allowed dopamine. `docs/reviews/CLAUDE_AVAILABILITY_PRIVACY_PRESSURE_REVIEW.md` flags this exact risk as *not yet written down as an explicit rule anywhere* — this document is where it gets written down for the UI layer: **no state in this design pushes a "some people haven't shared" message into the main thread, ever.**
- **Conflating overlap with Set.** `Availability.authorizes_set?/1` is hardcoded `false` (`availability.ex:243-246`) and has a dedicated regression test (`"share+overlap alone never elevates ProductSignals to Set"`). If the UI ever lets an overlap moment look like a confirmation — same color, same shape, same certainty — the frontend would be lying about a boundary the backend goes out of its way to guarantee.
- **Romantic default.** The task explicitly flags this as a defect condition. See §10 — the primary two-person walkthrough below is platonic friends, not a courtship pairing, and the mechanism is stated to be identical regardless.

## 3. What peak looks like (principles)

1. **Say only what was actually returned, formatted, never synthesized.** The backend's plain-language `label` renders verbatim. Specific times only ever come from real `display_start`/`display_end` values already in the payload, formatted client-side the same way message timestamps already are — never generated, never subdivided into invented instants.
2. **Silence is a feature, not a gap.** The "nobody's shared" and "shared but no match" states are real, valid, and calm — they do not need a headline moment in the thread. Only a genuine overlap earns an interruption.
3. **One honest color for "Opal noticed a pattern," a completely different one for "this is done."** Overlap is state 2 in the six-state matrix (what Opal noticed) — dressed in the same visual family as "Becoming a plan," never in the green used for Set/Ready.

## 4. Data model recap (ground truth for everything below)

Endpoints exist today at `apps/opal_core/lib/opal_core_web/controllers/availability_controller.ex` on `origin/build/relationship-availability-alignment` (not yet merged to this worktree's branch):

| Action | Route | Scope |
|---|---|---|
| List my private windows | `GET /availability/windows` | owner only |
| Create a window | `POST /availability/windows` `{start_at, end_at, timezone?}` | owner only, no title field exists |
| Update a window | `PATCH /availability/windows/:window_id` | owner only |
| Delete a window | `DELETE /availability/windows/:window_id` | owner only; soft-revokes any active shares of it |
| Share into a conversation | `POST /conversations/:id/availability/share` `{window_ids: [...]}` | owner + member + not blocked; response includes the *sharer's own* fresh `overlap` inline, no second round trip needed for the actor |
| Revoke a share | `POST /conversations/:id/availability/shares/:share_id/revoke` | owner of that share only |
| List what's shared in this conversation | `GET /conversations/:id/availability/shared` | any member; each item is `{share_id, owner_user_id, display_start, display_end, timezone}` — owner + that one window, nothing else |
| List my own shares in this conversation | `GET /conversations/:id/availability/mine` | owner only |
| Compute overlap | `GET /conversations/:id/availability/overlap` | any member; returns `{overlaps: [...], label, overlap_status, participant_count, no_private_schedule: true}` |

Realtime (Phoenix channel `conversation:<id>`, same channel `RealtimeClient.ts:116-170` already joins for `message:new`): `availability:shared` and `availability:revoked` broadcast a shared-safe projection of *one share* — never overlap. **There is no `availability:overlap_found` push.** Design consequence, stated once so it isn't re-litigated per component below: any client holding a conversation open should call `getAvailabilityOverlap` once on `availability:shared`/`availability:revoked` receipt (a normal `channel.on(...)` handler, same shape as the existing `message:new` handler) — that is the "refetch after a share event" the task describes, not a new realtime primitive.

`apps/opal_web/src/api/productClient.ts` already has draft client functions on that same unmerged branch: `listMyAvailabilityWindows`, `createAvailabilityWindow`, `shareAvailabilityWindows`, `getAvailabilityOverlap`, `listSharedAvailability`, with matching exported types `AvailabilityWindowOwner`, `AvailabilitySharedSafe`, `AvailabilityOverlap`. **Missing from that stub, needed for this design:** `updateAvailabilityWindow` (PATCH), `deleteAvailabilityWindow` (DELETE), `revokeAvailabilityShare` (POST .../revoke), `listMyAvailabilityInConversation` (GET .../mine) — same `request<T>(...)` pattern as the five that exist, four small additions.

Note for Grok, not a design point: `AvailabilityGrant` (`apps/opal_core/lib/opal_core/social_flow/availability_grant.ex`, present in *this* worktree) is SF4's older group free/busy primitive and is a **different table** from `AvailabilityWindow`/`AvailabilityShare` above — `AVAILABILITY_ALIGNMENT_ENGINE.md` calls this out explicitly. Do not merge the two in implementation.

## 5. Component-level design

### 5.1 Entry point — the journey chip becomes the door, not a new button

Today, `OpalApp.tsx:516-529` renders, whenever a signal exists:

```tsx
<div className="opal-moment journey signal-${activeChat.signal ?? "plan_forming"}" role="status" ...>
  <span className="opal-moment-mark" aria-hidden>◈</span>
  <span className="opal-moment-label">{activeChat.signalLabel}</span>
</div>
```

Change: when `activeChat.signal` is `"plan_forming"` or `"open_loop"` (the two stages where a real-world moment is still forming), render this as a `<button type="button">` instead of a `<div role="status">`, keeping every existing class and the visible label unchanged, adding `aria-haspopup="dialog"` and `aria-label="Conversation state: ${activeChat.signalLabel}. Open Find a time."`. When the signal is `"ready"`/`"follow_through"`/`"moment"` (i.e., past plan-forming), leave it as the current non-interactive `<div role="status">` — availability has nothing left to do once a plan is past forming. This is the *entire* entry point: no new element, no new persistent chrome, and it is only ever interactive at the moment the product already considers the conversation to be "becoming a plan." A conversation with no signal at all (`data.ts`'s "ordinary conversation stays quiet" case) has no journey chip and therefore no Find-a-time entry point — that is an accepted Phase 1 scope limit, not an oversight: the capability is reachable exactly where the product already shows forward motion, nowhere else.

**One-time discoverability hint**, because a status pill silently becoming tappable is not self-evident (Nielsen affordance failure): the first time `plan_forming`/`open_loop` appears in a conversation with zero availability activity (no windows ever created, no shares in this conversation), render one small `muted-lede`-styled line directly under the chip: `"Tap to share a time that works."` — new copy, age-12, not backend-sourced. Store a per-conversation `localStorage` flag on first tap (same mechanism as `FIRST_RUN_STORAGE_KEY` at `brand/brand.ts`) so it never repeats, and also suppress it permanently once any share exists in that conversation (fetched via `listMyAvailabilityInConversation` or `listSharedAvailability` on chat open). No badge, no color change, no animation loop — a static text line, gone after one use.

### 5.2 The sheet — reuse `.find-people-overlay`/`.find-people-sheet`, do not invent a new modal system

One `<AvailabilitySheet>` component, structured exactly like `FindPeopleFlow.tsx:198-207`: `<div className="find-people-overlay" role="dialog" aria-modal="true" aria-labelledby="availability-title">` → `<div className="find-people-sheet lumen-card">` → `<header className="find-people-header"><h2 id="availability-title">…</h2><button className="btn ghost" aria-label="Close">Close</button></header>`. Reuse `.find-people-body`, `.find-people-actions`, `.field` styles verbatim — do not add a parallel CSS system for this sheet.

Two named steps inside the same sheet (tabs, not separate screens — avoid a wizard the task explicitly warns against):

**Step A — "Your times" (private).** Title: `"When could you meet?"` Reassurance line, same visual weight as `.permission-line`: `"Only you can see this list."` A list of the user's own windows (`listMyAvailabilityWindows`), each row: formatted range + a ghost "Remove" button (44px target, `deleteAvailabilityWindow`). Below the list: `"+ Add a time"` opens an inline two-field form — **start** and **end**, both `<input type="datetime-local">` (native picker, respects OS locale/24h preference, no custom widget to build or maintain) — **no title/note field**, because none exists on the backend and adding one would silently create a UI promise the API can't keep. Timezone is **not** a form field by default: derive it from `Intl.DateTimeFormat().resolvedOptions().timeZone` at creation time and send it invisibly. Only surface timezone as plain, non-editable text (e.g., "Pacific time") the moment two windows a user is viewing together disagree in zone (the travel case) — never a dropdown on the default path. This keeps the form to exactly two fields, matching the UX-guideline database's own forms priority (`ui-ux-pro-max` skill, `ux` domain, Forms category: use appropriate native input types, avoid overwhelming a form upfront with fields the task doesn't need).

**Step B — "Share into [Conversation name]."** Checkbox list of the same private windows (owner decides per-window, per-conversation — nothing is shared by default just by existing). Explicit scoping line directly under the step title, doing the legibility work the task calls for without jargon: `"Only shared here, in this conversation."` Primary button: `"Share"` (disabled until ≥1 checked, ≥44px, `.btn.primary`) → calls `shareAvailabilityWindows`. On success, the response's own `overlap` field (already returned inline, no extra fetch) immediately updates the sheet's result area (see §5.4) before the sheet even closes — the sharer never has to guess whether anything happened.

Below Step B, a **transparency section**, always visible when non-empty, not gated behind another tap: `"Shared into this chat"` — the real list from `listSharedAvailability`, each row `Name — formatted range`, with a `Revoke` ghost button only on the current user's own rows (`revokeAvailabilityShare`). This is where "owner + that specific window, nothing else" becomes visible and inspectable by any member, satisfying the transparency the backend already guarantees at the data layer.

### 5.3 The overlap moment — the one thing allowed to interrupt the thread

New `SignalKind`: **`"availability_overlap"`** only (a single addition to `data.ts:3-8`, `Message.signal.kind`/`ChatPreview.signal`). Not `availability_shared`, not `availability_waiting` — there is deliberately no render site for "someone shared, nothing yet" inside the main thread; that state lives only in the sheet (§5.2), keyed off `overlap_status === "need_more_shares"` or `"no_overlap"`, rendered as quiet sheet copy, never pushed at anyone.

**Placement — not inside `bubble-row`.** The existing inline-moment pattern at `OpalApp.tsx:538-550` is nested *inside* each `bubble-row`, which unconditionally renders `<div className="bubble"><p>{m.body}</p><time>{m.time}</time></div>` ahead of the moment span — that shape only works when the moment is decorating a real message that has a `body`. An overlap has no message body and no `serverSeq`/`clientMessageId`; injecting a synthetic entry into `threads[activeChatId]` to carry it would (a) render an empty bubble above the moment and (b) get silently wiped the next time `listMessages`/history-sync runs, since it isn't real server-synced state. Instead, render it as a **direct child of `.thread`**, after the `messages.map(...)` block and before `<div ref={endRef} />` (`OpalApp.tsx:531-554`) — `.opal-moment.inline` is already written for exactly that placement (`align-self: center; margin: 8px auto`, `styles.css:494-497`). This also makes the moment correctly **derived/ephemeral, never persisted transcript history** — worth stating explicitly so nobody tries to write it into message state: it is recomputed from `getAvailabilityOverlap` on mount/refetch, not stored, and a stale moment (e.g., after a revoke changes the answer — §7.2 step 6) simply stops rendering on the next fetch rather than needing to be "corrected" in history.

```tsx
{overlap?.overlap_status === "overlap_found" ? (
  <div
    className={`opal-moment inline signal-availability_overlap${formattedRange ? " has-detail" : ""}`}
    role="status"
    data-testid="opal-moment"
    data-state={semanticStateForSignal("availability_overlap")}
  >
    <span className="opal-moment-mark" aria-hidden>◈</span>
    <span className="opal-moment-label">{overlap.label}</span>
    {formattedRange ? (
      <span className="opal-moment-detail">{formattedRange}</span>
    ) : null}
  </div>
) : null}
```

`overlap.label` renders the backend string **verbatim** ("One time works for both of you." / "3 times work for both of you."). `formattedRange` is new, client-composed, real-data-only supporting text — present only when `overlaps.length === 1` (a single unambiguous range, no invented options): format `overlaps[0].display_start`/`display_end` in the **viewer's own timezone** (not the sharer's) via `Intl.DateTimeFormat`, same technique as the existing `toLocaleTimeString` calls at `OpalApp.tsx:150,363`. Example real output: `"Thursday, 6:30–9:00 PM"` — this is how the design achieves the task's "You both have Thursday evening open" *feeling* without inventing a backend string that doesn't exist (see §0). When `overlaps.length >= 2`, do not attempt to summarize into one line client-side; instead show a small text-button under the label — `"See both times"` / `"See all N times"` — that opens a compact inline picker listing each real range (§5.5). **[PROPOSED, gated]:** if backend copy later adds a bridging line for exactly this branch (2+ real options), `"Want a couple ideas?"` is a defensible fit for *that* button label specifically, because at that point there genuinely are multiple real options to choose from — confirm with backend copy owner before wiring literal text; until then, use the plain `"See both times"`/`"See all N times"` phrasing above, which needs no confirmation because it's already accurate.

New CSS (extends `styles.css:524-541`, does not touch `.opal-moment` base or any existing `.signal-*` rule):

```css
/* Availability overlap: Opal noticed a real pattern — same "recognition" family as
   plan_forming/open_loop (cyan), pulled toward violet so it never reads as the
   ready/Set green. Uses --iris, an existing token (designTokens.ts), not a new hex. */
.signal-availability_overlap {
  border-color: rgba(139, 92, 246, 0.32); /* OPAL_SPECTRUM.deepViolet, low alpha */
  background: linear-gradient(
    120deg,
    rgba(94, 214, 232, 0.07),
    rgba(139, 92, 246, 0.09)
  );
  color: var(--iris); /* #8B9CFF, confirmed declared at styles.css:23 (:root) —
                          7.87:1 on --chat-pane #07090E, measured against the bare
                          pane; the 0.07–0.09-alpha gradient on top of near-black
                          shifts this negligibly, stays well clear of AAA. */
}

/* .opal-moment is `display: flex; align-items: center` (styles.css:453-473) — a
   plain third child lays out on the row's main axis, not on its own line, and
   .opal-moment-label's nowrap/ellipsis (styles.css:509-513) would truncate the
   label once a detail line is present. This variant is required, not optional,
   whenever .opal-moment-detail is rendered — do not omit it. */
.opal-moment.has-detail {
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
}

.opal-moment.has-detail .opal-moment-label {
  white-space: normal;
  overflow: visible;
  text-overflow: clip;
}

.opal-moment-detail {
  font-size: 0.68rem;
  font-weight: 500;
  opacity: 0.82;
}
```

Extend `semanticStateForSignal` (`technicolorProduction.ts:68-92`) with one new case, in the same "recognition" bucket as `plan_forming` (this is state 2 of the state matrix — Opal noticed a pattern — not a suggestion, not an action, not a confirmation):

```ts
case "availability_overlap":
  return "recognition";
```

**Important, `data-state` correction:** the `data-state` attribute the moment already carries (`OpalApp.tsx:521,543,977,1027`) is **not** read by any current CSS rule — I grepped `styles.css` for `[data-state=` and found zero matches; every visual rule keys off the `.signal-*` class name (`styles.css:524-541`). Attach the new color via the class, as above, or the moment will silently inherit base `.opal-moment` cyan and become visually indistinguishable from "Still open."

**The three real states, and where each one is allowed to appear:**

| `overlap_status` | Real label | Where it renders |
|---|---|---|
| `need_more_shares` | "Share a couple times that work." | Sheet only (§5.2 Step B empty state) + the one-time entry hint (§5.1) |
| `no_overlap` | "No shared times yet." | Sheet only — the sharer sees this immediately in their own result area after sharing; nothing pushed to other members |
| `blocked` | "Could not find a shared time." | Sheet only, and only if a member somehow opens it in a blocked conversation; the vague backend copy already avoids revealing the block, keep it that way — do not add a clearer message client-side |
| `overlap_found` | "One time..." / "N times..." | **The only status that gets the inline thread moment** described above |

### 5.4 Option choice / return to conversation — no dead end, composer prefill only

Tapping the overlap moment (single-range case) or a specific range inside "See all N times" (multi-range case) does one thing: closes the sheet if open, focuses `#composer-input` (`OpalApp.tsx:566-573`), and prefills `draft` with a plain, human, editable sentence built only from that one real range's own formatted text — never from an invented time:

> `"Thursday 6:30–9:00 PM works for me — does that work for you?"` (2-person)
> `"Thursday 6:30–9:00 PM — does that work for everyone?"` (group)

The person can edit or delete this before sending, exactly like typing anything else — nothing sends automatically. This satisfies requirement 5 directly: the "option" a person acts on is not a separate screen with its own back-button problem, it is the same composer that was already there, with a head start. No new component required beyond a `prefillComposer(text: string)` callback threaded down from `OpalApp`'s existing `draft`/`setDraft` state.

### 5.5 Multi-range picker (only exists when `overlaps.length >= 2`)

A small inline expansion under the overlap moment (not a new sheet — keep it lightweight), each real range as its own row/button using the same formatting as §5.3, tapping one does exactly the §5.4 prefill for that range. This is real data rendered as real options — not the rejected "split one range into three invented times" pattern; it only appears when the backend actually returned 2+ disjoint merged ranges (e.g., both people are free Tuesday evening *and* Thursday afternoon — two genuinely separate windows, not one window artificially cut up).

### 5.6 Handoff to Set — structurally, not just visually, a different thing

Three independent guarantees, stacked, so a viewer never has to trust just one of them:

1. **Different color family.** Overlap uses the violet-leaning `.signal-availability_overlap` (§5.3). Set/Ready uses the existing green (`styles.css:530-534`, `#7eecc0`, `signal-ready`). These do not share a hue family — someone glancing at the thread can tell them apart without reading the label.
2. **Different shape of claim.** Per `OPAL_HUMAN_AND_AI_STATE_MATRIX.md`, an overlap moment is state 2 ("what Opal noticed") — phrased as an observation, dismissible, never asserted as agreement. The Set/Ready label a real product session renders comes from `ProductSignals.classify_stage/1` server-side via `s.label`/`activeChat.signalLabel` (`OpalApp.tsx:222,380,423`) — a completely different code path with a completely different authority behind it (`AlignmentAuthority`, requiring ≥2 distinct human affirmatives, per the PR #61 gate). The overlap moment component never writes to, calls, or approximates that path — it has no way to, since `Availability.authorizes_set?/1` is hardcoded `false` and no availability function is referenced anywhere near `ProductSignals` (verified directly in `availability.ex`, confirmed again in `docs/reviews/CLAUDE_AVAILABILITY_PRIVACY_PRESSURE_REVIEW.md`).
3. **The prefilled sentence is still just a draft.** Tapping an overlap option does not send a message, does not create a share-based "soft yes," and does not touch conversation state at all until a human explicitly hits send — and even then, sending one message is state 1 (a person spoke), not state 6. Set still requires the existing two-distinct-affirmative exchange in conversation, exactly as it does today, with or without availability ever being used.

Do not, at any point, style the overlap moment with the same shape/weight/certainty as the Set label, and do not let a successful share auto-populate anything resembling "confirmed" language — the backend's own copy already refuses to do this (`"Could not find a shared time."` instead of naming a block; `"No shared times yet."` instead of "no match" or "declined") and the UI should hold the same discipline.

## 6. Copy table (age-12 check)

| String | Source | Read-back test |
|---|---|---|
| "Share a couple times that work." | Backend, verbatim | "Is this asking me to do something small, or hand over my whole calendar?" → small, specific action. Passes. |
| "No shared times yet." | Backend, verbatim | "Does this say someone said no?" → No, it says nothing has matched yet. Passes — matches the exact non-shaming intent already verified in `CLAUDE_AVAILABILITY_PRIVACY_PRESSURE_REVIEW.md`. |
| "Could not find a shared time." | Backend, verbatim (also covers `blocked`) | Deliberately uninformative on purpose — passes because it's *supposed* to reveal nothing extra. |
| "One time works for both of you." / "N times work for both of you." | Backend, verbatim | "Is this booked?" → No — "works for" reads as availability, not confirmation. Passes; contrast with the pre-fix walkthrough defect ("Thursday · 7:00 PM" alone), which this new copy does not repeat. |
| "Tap to share a time that works." | **New**, one-time entry hint | "What happens if I tap this?" → answer is obvious and low-stakes. Passes. |
| "Only you can see this list." | **New**, Step A reassurance | Unambiguous, one clause. Passes. |
| "Only shared here, in this conversation." | **New**, Step B scoping | Directly answers "does everyone I know see this?" with "no, just this chat." Passes — this is the exact legibility requirement 3 asks for, in eight words. |
| "Thursday, 6:30–9:00 PM" (formatted range) | **New**, client-formatted real data | Not a sentence needing a read-back test — it's a date/time format, same class as any message timestamp already in the product. |
| "See both times" / "See all N times" | **New**, multi-range disclosure | "Do I know what happens if I tap this?" → yes, more real options appear. Passes. |
| "Want a couple ideas?" | **[PROPOSED]** — not verified in backend source; do not ship as literal text without confirmation (see §0, §5.3) | N/A until confirmed |

Forbidden-language check against `FORBIDDEN_COPY` (`designTokens.ts:75-82`) and the founder's explicit list: nothing above uses "your people" (Step B intentionally says "into this conversation," never "your people" or "everyone you know"), nothing implies daily-engagement pressure, nothing is AI-powered self-description, and no line names or shames a slower sharer.

## 7. Scenario walkthroughs

### 7.1 Scenario A — close friends, one with a busy social life (non-romantic)

Reusing the existing `data.ts` fixture: **Jordan Lee**, currently seeded with `preview: "I'm free after 6:30. Does Thursday work?"`, `signal: "open_loop"`, `signalLabel: "Still open"`. Framed explicitly as **platonic** — a friend from a former job Priya keeps meaning to properly catch up with, not a romantic interest. The mechanism is identical either way; only which relationship-context copy pack a future pass might layer on top would differ, and Phase 1 has no relationship-context branching at all (`docs/reviews/CLAUDE_AVAILABILITY_PRIVACY_PRESSURE_REVIEW.md`: "relationship-label overfitting — not applicable yet, by design").

Jordan has an active social calendar; Priya doesn't, and wants structure. Walk-through:

1. Conversation shows `"Still open."` journey chip (existing behavior, unchanged) — now tappable, one-time hint underneath: `"Tap to share a time that works."`
2. Priya taps it → sheet Step A → adds two windows (Thursday evening, Saturday afternoon) → Step B → shares both into this conversation → sheet's own result area shows Priya's fresh overlap: `"Share a couple times that work."` (Jordan hasn't shared anything yet — `need_more_shares`). Priya closes the sheet. **Nothing appears in the main thread.** No "waiting on Jordan," no badge.
3. Jordan, separately and at their own pace, opens the same chip, sees the same sheet, shares one window that happens to fall inside Priya's Thursday-evening window.
4. Priya's client receives `availability:shared` on the conversation channel, silently refetches `/overlap`, gets back `overlap_found`, `"One time works for both of you."` → **this is the first and only moment that appears unprompted in the thread**, as `.signal-availability_overlap`, violet-leaning, with `"Thursday, 6:30–9:00 PM"` underneath in Priya's own local time.
5. At no point does any copy reference Jordan's other plans, Jordan's business, or Jordan's general availability. The UI literally does not have that data — `compute_overlap` never returned it. This is the privacy-by-API-shape guarantee from §1 made concrete: there is no code path by which this screen could render "Jordan's usually free anyway," because Jordan's individual windows never left the server for anyone but Jordan.
6. Priya taps the moment → composer prefills `"Thursday 6:30–9:00 PM works for me — does that work for you?"` → edits it slightly → sends. That message is now state 1 (a person spoke) in a normal thread — availability's job is done. Set follows the existing message-agreement path, untouched.

### 7.2 Scenario B — 4–6 person friend group, one organizer, one undecided, people already moving

Extending the existing `data.ts` "Saturday dinner" fixture (`contextLine: "Maya, Chris, Jordan"`, `signal: "open_loop"`) to 5 people for this walkthrough: **You** (organizer), **Maya**, **Chris**, **Jordan**, **Priya** (undecided).

1. Chip reads `"Still open."`, tappable. You share two windows. Sheet shows `participant_count: 1` implicitly (only you so far) and label `"Share a couple times that work."`
2. Maya and Jordan each independently share a window that overlaps yours; Chris (already moving around, busy) shares a narrower one that also happens to fit; Priya shares nothing.
3. `compute_overlap` runs pairwise across all owners with active shares (`multi_intersect`/`merge_ranges` in `availability.ex`) — it does **not** require all 5 people, only ≥2 distinct owners with intersecting ranges, and a 5th person's absence never blocks or degrades the result for the other 4. Result: `overlap_found`, `"One time works for both of you."` — note the backend label text is fixed regardless of group size (verified: `overlap_label/1` has no N-person branch), so for a group the same two-person phrasing renders. This is a real, minor honesty gap worth flagging to backend copy (a label that says "both of you" to four people who shared is slightly off), but not something to patch client-side by inventing new group copy — flag, don't fork.
4. In the sheet only (never the thread), a client-composed sub-line under the shared list, sourced from the real `participant_count` field: `"Based on times 3 people have shared."` — a plain count, not a checklist of who's in and who's out, not a progress bar. This is the entire design answer to "group without becoming group-project software": one honest number, no roster, no red flags next to Priya's name for not having shared.
5. The inline thread moment fires once, identically to the 2-person case — same component, same class, same copy composition. Priya seeing it later has exactly the same option to tap it, share her own time, or ignore it; nothing in the UI treats her differently for not having participated yet.
6. If Chris later revokes their share (plans changed), `availability:revoked` fires; the group's next fetch recomputes overlap silently. **No "Chris removed a time" line is ever shown** — per §2, a removal notice would be surveillance-flavored and manufacture exactly the guilt pressure the founder's brief forbids. If the recompute changes the moment's content (e.g., from `overlap_found` back to `no_overlap`), the thread's existing moment simply stops being freshly true; because there is no live-updating animation implying real-time sync (see §4 realtime note), the stale moment quietly ages out of relevance rather than visibly flickering — the honest fix here is only surfaced the next time anyone reopens the sheet or a fresh `overlap_found` occurs, not by editing history in the thread.

## 8. 390px hierarchy critique (thumb zone, reachability)

- **Journey chip** sits directly under the fixed `chat-header` (`--topbar-h`), full-width, centered — comfortably reachable but not in the primary thumb arc on a one-handed 390px phone (top third of screen). This is *correct* for this element: it's a status/disclosure control, tapped occasionally, not a repeated action — it should not compete with the composer for thumb-zone real estate.
- **Sheet actions** (`.find-people-actions`, `.btn.primary`/`.btn.ghost`) already sit in the sheet's lower half by virtue of the existing `place-items: end center` overlay layout (`styles.css:1087-1103`) — bottom-anchored, thumb-reachable by construction, no change needed.
- **`datetime-local` inputs** in Step A: verify computed height clears 44px on iOS Safari/Android Chrome at 390px (native control chrome varies) — if the OS-rendered control comes in under 44px, wrap it in a `.field` row with `min-height: 44px` padding, matching the existing `.find-people-body .field input` pattern (`styles.css:1124-1130`) rather than styling the native control directly.
- **Revoke buttons** on shared-list rows must keep an 8px+ gap from the row's own tap target (owner name/window) per the `ui-ux-pro-max` skill's Touch domain result (`Touch Spacing`, severity Medium: "Minimum 8px gap between touch targets... Don't: tightly packed clickable elements") — do not let "Revoke" sit flush against the row, especially with 3–5 rows stacked in a group conversation's transparency section.
- **Composer prefill** (§5.4) lands in the existing `#composer-input` at `OpalApp.tsx:566-573`, already 44px min-height and already in the primary thumb arc at the bottom of the screen — this is the single best-placed interaction in the whole flow, which is why the design routes every "act on this" path there instead of building a new confirm button somewhere else on screen.

## 9. Accessibility

- **Contrast, measured, not asserted:** `--iris` (#8B9CFF) on `--chat-pane` (#07090E) = **7.87:1** (AAA for normal text); on card background (~#0E1118) = **7.46:1**. `deepViolet` (#8B5CF6) alone only clears **4.70:1** — too close to the AA floor for an 0.72rem label — which is why the label text uses `--iris`, not raw `deepViolet`; `deepViolet` is reserved for the low-alpha border/background tint only, where contrast doesn't govern.
- **Journey chip → button conversion:** must carry `aria-haspopup="dialog"` and a full `aria-label` (state + action) since its visible text alone ("Still open.") doesn't communicate that it's now interactive — screen-reader users get no other cue a `<div>` became a `<button>` besides role and label changing.
- **Sheet:** `role="dialog"` `aria-modal="true"` `aria-labelledby`, exactly the existing `FindPeopleFlow` pattern — inherits its already-correct focus trap and Escape-to-close behavior; do not reimplement.
- **`datetime-local` inputs:** always paired with a real `<label>` (not placeholder-only) — per the `ui-ux-pro-max` skill's Forms guidance already surfaced (`Placeholder-only label` is an explicit anti-pattern) — `"Start"` / `"End"`, visually via `.field` label styling already established in `FindPeopleFlow`'s `.field` pattern.
- **Overlap moment:** `role="status"`, same as today — screen readers announce it once, in place, when it mounts; do not wrap it in `aria-live="assertive"`, which would interrupt whatever the user is doing to announce a scheduling detail (not urgent enough to justify that).
- **Reduced motion:** the overlap moment's arrival should be a simple opacity/scale-in respecting the existing global `prefers-reduced-motion: reduce` block (`styles.css:1189-1203`, already strips `.opal-mark--glow` filters and forces near-zero animation durations) — no bespoke motion spec here; hand exact easing/duration to `opal-motion-director`'s companion pass per this task's own instruction, this document only notes *that* an arrival transition should exist, not its timing.
- **Large text / zoom:** the sheet's list rows and form fields use relative units already established by `.find-people-body` — no fixed pixel heights that would clip at 200% zoom; verify `.opal-moment-detail`'s `0.68rem` still meets 3:1 large-scale contrast minimum at that color (measured above at 7.87:1, well clear).

## 10. Full vs Controlled

This entire capability lives inside human chat / the authenticated member shell — **Controlled tier**, matching `visualShellProps("member")` already applied to the conversation view (`OpalApp.tsx:666-676`). Nothing here should:
- Use `tc-full` styling, full-spectrum gradients, or walkthrough-grade motion intensity (`WALKTHROUGH_SCENE_MOOD` entries in `technicolorProduction.ts:94-103` are walkthrough-only; do not port `"emergence"`/`"cyan-violet-amber"` mood language into this feature's spec — I've deliberately sourced the violet lean from the already-Controlled `--iris` token instead).
- Touch `OpalMark`/`OpalLockup` sizing, glow, or placement — this feature has no brand-arrival role.
- Introduce a new ambient background, mesh gradient, or particle effect for the "celebration" of finding an overlap — one modest arrival transition on the moment itself (owned by the motion pass) is the entire budget. The sheet inherits the calm `lumen-card`/`glass` surface treatment already used everywhere else in the member shell, not a special-occasion skin.

## 11. What not to do

- Do not add a title/note/reason field to the private window editor — the backend column doesn't exist, and per the state-matrix discipline, a UI must not promise data it can't actually store.
- Do not surface `overlap_status: "blocked"` with any language clearer than the backend's own `"Could not find a shared time."` — the vagueness is intentional trust/safety design, not a copy gap to "improve."
- Do not push "X hasn't shared yet" into the main thread in any form, for 2-person or group conversations.
- Do not build a group roster/checklist ("✓ Maya, ✓ Jordan, ✗ Priya") — one participant count in the sheet is the ceiling.
- Do not invent specific times by subdividing a single wide overlap range — only render real `overlaps[]` entries.
- Do not give the overlap moment the same color, weight, or copy certainty as the Set/Ready label.
- Do not add a timezone dropdown to the default add-a-time path.
- Do not reintroduce any glow/halo/ring treatment around `OpalMark` as part of an overlap "celebration."
- Do not ship `"Want a couple ideas?"` as literal UI text before backend copy confirms it exists for the multi-range branch — use `"See both times"`/`"See all N times"` until then.
- Do not build this against `AvailabilityGrant` (SF4) — it's a different table with a different purpose.

## 12. Grok implementation order (smallest, highest-impact first)

1. **Merge/rebase dependency first:** this design depends on backend code that only exists on `origin/build/relationship-availability-alignment` (unmerged as of this writing) — confirm that branch is merged or rebased in before any of the below, and add the four missing `productClient.ts` functions (`updateAvailabilityWindow`, `deleteAvailabilityWindow`, `revokeAvailabilityShare`, `listMyAvailabilityInConversation`) alongside the five already drafted there.
2. **Journey chip → conditional button** (§5.1): smallest, fully contained change to `OpalApp.tsx:516-529` — swap element type + add `aria-haspopup`, gated on `signal` value. No visual change yet if the sheet doesn't exist; safe to land standalone.
3. **New `SignalKind` + CSS + `semanticStateForSignal` case** (§5.3): three small, additive diffs (`data.ts`, `styles.css`, `technicolorProduction.ts`) — no runtime behavior until something actually sets `kind: "availability_overlap"`, safe to land ahead of the sheet.
4. **`<AvailabilitySheet>` Step A only** (private editor, §5.2): wire to the journey-chip button from step 2; ships private list management end-to-end before touching sharing at all — independently testable/demoable.
5. **`<AvailabilitySheet>` Step B + transparency list** (§5.2): share/revoke/list-shared wiring.
6. **Overlap fetch + realtime refetch-on-event + inline moment render** (§5.3, §4's `channel.on("availability:shared"/"availability:revoked", ...)` addition to `RealtimeClient.ts`, modeled on the existing `message:new` handler at line 140): the first point real conversation content changes.
7. **Composer prefill on tap** (§5.4) + **multi-range picker** (§5.5): completes the loop back into normal conversation flow.
8. **One-time entry hint + `localStorage` suppression** (§5.1 second half): pure polish, safe to defer to last without blocking any functional step above.
