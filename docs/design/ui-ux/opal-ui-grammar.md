# Opal UI Grammar — the Ephemeral Presentation Layer

**Author:** Claude (independent), remote controller mode
**Lane:** research / design — not production deploy
**Date:** 2026-08-08
**Answers:** founder's "OPAL CLAUDE UI DISCOVERY PASS" brief — what should appear, disappear, transform, or become available in the interface when Opal understands something socially useful, in a way that could only exist because Opal understands relationships.

---

## 0. The actual finding, stated first

The founder's brief frames this as discovering a missing interface primitive. Before designing anything, I checked what's already locked. The answer: **the semantic grammar already exists, named, as accepted product truth** — this is not a gap, it's an unbuilt presentation layer over a real spine:

- `OPAL_HUMAN_AND_AI_STATE_MATRIX.md` (2026-08-05, ACCEPTED PRODUCT TRUTH) — the **six states** every piece of Opal-adjacent content must belong to: what a person said, what Opal noticed, what Opal suggested, what Opal is doing, what an outside provider confirmed, what is complete. Its own §6 says explicitly: *"Visual system (color, glyph, motion per state) is a design decision, not a product-truth decision — the existing `technicolorProduction.ts`/`.css` semantic-state mapping (`semanticStateForSignal`) is the right place to extend, not replace."* That sentence is this document's actual mandate.
- `EXPERIENCE_COLLABORATION_AND_NUANCE.md` — **content classes** (Human message / Shared Opal moment / Private Opal guidance / System confirmation), **journey signals** (Quiet/Forming/Partial/Deferred/Aligned/Complete, placed as conversation-list chip / thread journey bar / occasional inline moment / Plans-tab "in motion" list), a **healthy reward loop** section that already bans points/streaks/rankings and names the real rewards (a reply arrives, uncertainty becomes clarity, a plan becomes real...), and a **noise budget** section that already states the attention-cost rule the brief asks me to invent.
- Code: `apps/opal_web/src/theme/technicolorProduction.ts` already defines `SemanticState = recognition | participation | private | execution | completion | urgency` and `semanticStateForSignal(kind)` mapping real `SignalKind` values to them — including a **`"private"` case already reserved and colored (`deepViolet`, #8B5CF6), with no UI built against it yet.** `apps/opal_web/src/OpalApp.tsx` already renders `.opal-moment` in four placement variants (`journey`, `inline`, `row`, `static`).

So the brief's real question isn't "what primitive are we missing" — it's "what does the unbuilt half of an already-locked grammar concretely look like, move like, and behave like." That's what this document, the prototype, and the motion-doc delta answer. Nothing below invents a new taxonomy; §2 is a mapping table specifically so nothing does.

## 1. Two things I have to reconcile before designing anything

**Conflict A — Relationship Pulse vs. the relationship-scoring ban.** The founder's "ambient relationship signal... forming → open → aligned" idea is explicitly caveated as never a score, but the distinguishing test is structural, not intentional: does the signal attach to *one topic's alignment state* (fine — that's the existing journey signal, rendered ambiently, and it expires when the topic resolves), or does it *persist across topics as a property of the relationship itself* (that's a friendship/closeness score with the numbers filed off, which `OPAL_DYNAMIC_SOCIAL_EXPERIENCE_INTELLIGENCE_PHASE0.md` §6 bans outright — "no friendship score, no social worth UI, no leaderboard of closeness" — and `OPAL_RELATIONSHIP_CONTEXTS.md` principle 5 — "no public ranking of relationships" — and `GAPS_AND_OPEN_DECISIONS.md` G054 marks "Relationship health quantification" **Rejected**, not open). §4.4 below designs it strictly the first way and states the constraint explicitly so it can't drift into the second.

**Conflict B — the brief's contextual-composer examples contradict my own committed handoff.** `CLAUDE_TO_GROK_AVAILABILITY_ALIGNMENT_HANDOFF.md`, filed one turn ago: *"Never surface 'X hasn't shared yet' in the main conversation thread... do not push a 'someone revoked their share' notice into the thread."* This brief's examples — `◇ Still waiting on one`, `One person left`, `Maya still needs a minute`, `Plans changed` — are exactly that pattern, moved from the thread to the composer's edge, which is still an unrequested appearance inside the conversation view. The reconciliation, consistent with the availability UI/UX doc's own resolution (a **count** survives in the sheet — *"Based on times 3 people have shared"* — a **roster** does not): a plain journey-signal label like `Still open` is fine, because it's the existing per-topic signal, not new information about a specific person. `Still waiting on one` naming a countdown against a specific missing person is the thing I already told Grok not to build. §4.2 and §7 below hold this line; do not let a later pass quietly readmit it because the founder's new brief phrased it more casually than the original push-notice ban.

## 2. Mapping the founder's eight proposed grammar elements onto what's locked

Per `HUMAN_AND_AI_STATE_MATRIX.md` §6, this is extension, not renaming. Column 3 says what's actually new to design (the rest of this document).

| Founder's term | Maps to (existing, locked) | What's actually new |
|---|---|---|
| Human Bubble | State 1 ("what a person said"); content class "Human message" | Nothing — already shipping, unchanged |
| Opal Edge | Not a new content class — a **presentation variant** of "Opal noticed" (state 2), rendered at the conversation/thread level instead of a specific message | The visual/motion spec + the one-active-at-a-time appear rule (§3.1, §4.1) |
| Context Chip / Moment Chip | Existing `.opal-moment.journey`/`.inline` pattern (states 2–3); already exists for `plan_forming`/`open_loop`/`ready` today, generalized here across capabilities, not just availability | Generalizing it beyond the one capability it's built for so far (§3.2) |
| Expanding Moment | Not a new class — an **interaction affordance** on top of a Moment Chip (tap → reveal state 2/3 detail) | The expand/collapse spec (§3.3) — mechanically identical to what the availability UI/UX doc already built for its own "See both times" picker, generalized |
| Private Opal Guidance | Content class "Private Opal guidance"; `SemanticState = "private"` (deepViolet) — **class and color both already exist, no UI built against them yet** | The actual component (§3.4) — this is the single largest real gap this document fills |
| Provider Confirmation | State 5 ("what an outside provider confirmed") | Nothing conceptually new; not exercised by any current capability (no provider integration is live) — noted, not designed further here |
| Action State | State 4 ("what Opal is doing") | The "traveling light" in-progress motif (motion-doc delta, §5) — not exercised by any current capability either, same caveat |
| Set Resolution | State 6 ("what is complete"); `SemanticState = "completion"` (richEmerald) | Already fully specified in `opal-moment-motion-language.md` §4.4 from the prior pass — reused verbatim, not redesigned |
| Relationship Pulse | **Not currently anything** — genuinely the one proposed element without an existing home | Designed narrowly in §4.4, with the scoring-ban constraint stated inline |
| Contextual Composer | Not a new class — a **placement** of an existing Moment Chip, anchored above the composer instead of inline in the thread | The placement spec + Conflict B's content restriction (§4.2) |

## 3. The four ephemeral primitives (design, not new taxonomy)

All four extend `.opal-moment` and `semanticStateForSignal` — no parallel component or class system, and no new `SignalKind` beyond the two already proposed in the prior pass (`option_surfaced`, `set`) plus one more needed here (`private_guidance`, §3.4).

### 3.1 Opal Edge

A localized, subtle glow on the **thread journey bar's own existing border** (`.opal-moment.journey`, already rendered per `EXPERIENCE_COLLABORATION_AND_NUANCE.md`'s placement rule: "one dominant journey bar") — not a frame-wide sweep around the whole conversation viewport. This reconciles directly against `opal-moment-motion-language.md` §3, which rejected a literal "sweep across the conversation border" as recurring too often (several times a minute in a busy thread) and structurally adjacent to the halo/orb anti-pattern at container scale. The Edge is compatible with that rejection specifically because its trigger profile is different: it does not fire per-message or per-arrival — it is a **standing state** ("there is something worth a look right now"), appears once when a conversation crosses into a genuinely new actionable state, and persists (static, not looping — see the one-breathing-element rule) until the user taps it or the state resolves. At most one Edge active per conversation at a time. This is presentation of state 2 ("what Opal noticed") at the thread level rather than attached to one message — the existing journey bar already occupies that role; the Edge is a glow treatment on it, not a new element.

Behavior: appears as a slightly wider, brighter version of the journey bar's own existing masked-border gradient — the exact treatment (color, curve, one-shot-only entrance) is in the motion-doc delta (§5.1). Tap reveals whatever Moment Chip/detail is behind it. No text on the Edge itself — the journey bar's own label is already there; the Edge is purely "this one has something," legible without reading anything.

### 3.2 Moment Chip (generalized)

Already exists and already works for availability (`opal-moment inline signal-availability_overlap`, from the prior pass). This section is the generalization: any capability that produces a state-2/state-3 event (a pattern noticed, an option to consider) renders through the same chip shape, same placement rule (`.opal-moment.inline`, direct child of the message-list scroll region, not injected into a synthetic message — the same non-negotiable placement reasoning the availability UI/UX doc already worked out, since a chip with no real message body breaks history-sync the same way regardless of which capability produced it). A chip disappears once its underlying state is no longer true (the overlap changed, the option was acted on, the window to act passed) — never lingers as stale information, per the availability design's existing "stale moment quietly ages out" rule.

### 3.3 Expanding Moment

A Moment Chip's tap target, when the underlying state has more than one real thing to show (2+ overlap ranges, 2+ venue options once `CollectiveFit` is wired to a real capability), reveals them inline, directly under the chip, not a new sheet/modal — mechanically identical to the availability design's "See both times" / multi-range picker (§5.5 of that doc), generalized to any future multi-option state. Collapses back to the single-line chip once a choice is made or the sheet/panel that opened it is dismissed. Never a permanent expanded card — expansion is a temporary reveal, not a new resting state.

### 3.4 Private Opal Guidance (the genuinely new component)

This is the one primitive with no existing UI at all — `SemanticState: "private"` and the content class both exist in the codebase/docs today with zero rendering built against them. Design:

- **Visual distinction from Shared Moment must be unmistakable, not subtle.** Shared moments use the recognition/participation/execution/completion color families (cyan, amber, royal blue, emerald) as their **dominant/label color**. Private guidance is the only primitive whose *dominant* color — border and label text both — is `deepViolet` (`OPAL_SPECTRUM.deepViolet`, #8B5CF6). Precision on the boundary, since the availability design already uses a low-alpha deepViolet tint inside its recognition-family gradient (`.signal-availability_overlap`'s background gradient) alongside cyan: that low-alpha *background tint* usage is not a violation — it never carries the label's color or the border's dominant hue, and it predates this document. What's reserved absolutely is deepViolet as the **primary, legible color a user reads** — no shared moment's border or label text may ever be dominantly violet, and Private Guidance's border and label text are never anything else. A user glancing at their screen tells "only I can see this" from the label/border color, not from incidental background gradient stops.
- **Placement is structurally private, not just colored differently.** A private-guidance moment renders in a location that is not part of the shared thread's DOM/data at all — the same architectural pattern the availability design already uses for the sheet's "Your times" step (owner-only data, fetched via an owner-scoped endpoint, never present in the payload any other participant's client receives). Concretely: a small private strip **above the composer, visible only to the person it's for**, distinct from the Contextual Composer chip (§4.2) which is a *shared* moment placed near the composer — these must not be visually confusable with each other despite similar position, which is exactly why color (violet vs. the shared families) carries the distinction, not position alone.
- **Copy stays first-person-directed, never third-person-about-the-peer**, per the founder's own clean-wingman rule and the already-shipped `Clean wingman` section of `OPAL_RELATIONSHIP_ALIGNMENT.md`: *"Want a couple ideas?"* (addressed to the viewer) is fine; *"She usually prefers Italian"* (stated as a fact about the peer, even to the one person allowed to see it) is not — private does not mean license to be presumptuous about someone who can't see or correct it. This is stricter than "don't leak it," it's "don't even privately assert it as certain."
- **New `SignalKind`: `"private_guidance"`** → `semanticStateForSignal` already has the `case "private": return "private"` branch ready to receive it; no code change needed there, only a producer that actually sets `kind: "private_guidance"` on a private-scoped payload.
- **Dismissal is unconditional and local.** Unlike a shared Moment Chip (which may need to reflect a real state change), private guidance is always dismissible with no consequence to the other participant, and never reappears once dismissed for that specific suggestion (same "never re-ask a declined prompt" rule already locked in `MINIMUM_QUESTION_ENGINE.md` §3.5, extended to private guidance generally, not just questions).

## 4. Appear / disappear / transform rules

Per element, stating trigger, duration, dismissal, and persistence — the founder's brief §7 requirement, answered concretely rather than left as a principle.

### 4.1 Opal Edge

| Property | Rule |
|---|---|
| Trigger | A conversation's journey signal crosses into a state with a real next action available (e.g., `plan_forming` with a usable overlap, or any future capability's equivalent) — never on message arrival alone |
| Duration | Persists (static glow, no loop) until tapped or the underlying state resolves/expires |
| Dismiss | Tap opens the underlying Moment Chip/detail; the Edge itself has no separate "X to dismiss" — dismissing the thing behind it removes the Edge too |
| May return | Yes — if the state becomes actionable again later (new overlap after a revoke-then-reshare), a new Edge may appear; it does not "remember" having been dismissed once, because the underlying situation genuinely changed |
| Reopen after dismiss | N/A — see above; there is nothing to reopen, the state either is or isn't currently actionable |
| Lives in history | No — it's a live-state indicator, not a transcript entry, same as the existing journey bar |
| Survives refresh | Recomputed on load from current state, not stored as an event |
| Circumstance changes | Recomputed on next relevant refetch (matches the availability design's existing refetch-on-`availability:shared` pattern) — the Edge is derived, never itself a source of truth |

### 4.2 Contextual Composer chip

| Property | Rule |
|---|---|
| Trigger | A capability has a concrete, actionable next step for *this specific user* right now (e.g., "Find a time" once plan-forming language exists) |
| Content restriction | **Only ever a forward-looking action the viewer can take** (`Find a time`, `2 things could work`, `Set`) — per Conflict B (§1), never a status statement about another person's inaction (`Still waiting on one` is REJECT, see §6) |
| Duration | Present only while the action is genuinely available; disappears the instant it's acted on or no longer applies |
| Dismiss | Tapping either performs the action or opens the relevant detail; there is no separate "not now" dismiss because the chip already only appears when it's real and current — if the founder wants an explicit "not now" that suppresses it for this session, that's new scope, not in this pass |
| Lives in history | No |
| Survives refresh | Recomputed, not stored |

### 4.3 Private Opal Guidance

| Property | Rule |
|---|---|
| Trigger | Elixir determines a private-scoped suggestion clears the restraint threshold for this user specifically (reuses `MINIMUM_QUESTION_ENGINE.md`'s worth-asking check, generalized from questions to suggestions) |
| Duration | Persists until viewed/dismissed by the owner; never expires silently without the owner seeing it at least once, unlike a shared moment which may quietly age out |
| Dismiss | Unconditional, immediate, permanent for that specific suggestion (§3.4) |
| May return | Only as a genuinely new suggestion, never a repeat of a dismissed one |
| Lives in history | No — private guidance is not a transcript entry for anyone, including its owner; it's a live surface, consistent with `EXPERIENCE_COLLABORATION_AND_NUANCE.md`'s surprise-sensitive-privacy rule that private guidance "never appears in the recipient's thread" — here extended to say it doesn't live in *anyone's* thread, it lives in its own private surface |
| Survives refresh | Recomputed from current private state on load |

### 4.4 Relationship Pulse — scoped strictly to prevent Conflict A

| Property | Rule |
|---|---|
| What it visualizes | The **current topic's** journey-signal stage, rendered ambiently (spectral light quality) instead of/alongside the text label — literally `semanticStateForSignal` of the active signal, given a slightly richer visual treatment than a static chip, not a new data model |
| Explicitly does not | Persist once the topic resolves or the conversation goes quiet again; aggregate across topics or across time; compare against any other conversation; produce a number, percentage, or rank of any kind, anywhere, ever |
| Trigger | Same trigger as the underlying journey signal already has — no new trigger logic |
| Duration | Exactly as long as the topic remains open; resets to nothing (not "low," nothing) when the topic closes or goes quiet |
| Lives in history | No |
| Verdict | **Conditionally approved, not rejected** — but only in this strictly per-topic, non-persistent form. If a future pass proposes making it visible across conversations, or remembering "this relationship tends to run warm," that is the rejected friendship-score pattern and must stop at the design stage, cited against `GAPS_AND_OPEN_DECISIONS.md` G054 directly |

## 5. Attention cost — cites existing engine, does not reinvent one

The founder's brief asks for an "Attention Cost rule." One already exists and applies unchanged: `EXPERIENCE_COLLABORATION_AND_NUANCE.md`'s noise budget ("surface only when expected social value is meaningfully greater than interruption and privacy cost") and its code implementation, `OpalCore.SocialFlow.DynamicIntelligence.Restraint.decide/1`, which already returns `{:surface, meta} | {:silence, reason}` computing exactly this tradeoff. Every primitive in §3 is a *presentation* of something that already passed (or will pass, once wired) that gate — this document does not add a second gate. The mapping: Opal Edge and Contextual Composer chip only render when the underlying capability's own restraint check (existing today for DSI, to-be-extended per-capability per the availability handoff's SHOULD section) says surface; if it says silence, nothing in this document's vocabulary appears at all. Silence remains the default and the majority outcome, exactly as already locked.

## 6. Healthy reward — confirms alignment, does not redesign

`EXPERIENCE_COLLABORATION_AND_NUANCE.md`'s "Healthy reward loop" section already lists real Opal rewards (a reply arrives, an idea gains momentum, uncertainty becomes clarity, a plan becomes real, a surprise stays protected) and already bans points/streaks/rankings/reliability scores/follower counts. Every primitive in §3 produces a reward from that existing list, never a new one: the Opal Edge appearing *is* "uncertainty becomes clarity" made visible; Set's motion (already specified) *is* "a plan becomes real." No new reward mechanic is introduced by this document. The founder's "oh shit, Opal figured that out" framing is real and correct — it maps to the existing loop, not a new one.

## 7. REJECT — the founder's own examples that don't survive Conflict B

Stated explicitly so it can't drift back in later: **`Still waiting on one`, `One person left`, `Maya still needs a minute`, `Plans changed`** (as an unprompted push) are all named directly in the founder's brief as example Contextual Composer / group-plan chip text. All four name or imply a specific person's inaction to people other than that person, pushed into a place the recipient will see it without asking — exactly the guilt-adjacent pattern `CLAUDE_TO_GROK_AVAILABILITY_ALIGNMENT_HANDOFF.md` already forbade and `FOUNDER_NUANCE_PACK.md` already excludes from allowed dopamine ("Not: ... guilt"). The count-only substitute (§3.2's generalization of the availability design's *"Based on times 3 people have shared"*) is the sanctioned version — a number, not a name, and only ever inside a sheet/detail view a user opened on purpose, never pushed as a chip. `Plans changed` specifically is REJECT as an unprompted push for the same reason `availability:revoked` already isn't shown in the thread (`CLAUDE_TO_GROK_AVAILABILITY_ALIGNMENT_HANDOFF.md` DO-NOT list) — if a future capability wants to communicate "something changed," it must do so by the changed state simply no longer matching what's shown (the existing "stale moment ages out" pattern), never by a new notice about the change itself.

## 8. Context tone — confirmed-label only, design-ahead, not implementable in Phase 1

The founder's per-context action-label sets (courtship vs. close friends vs. large group vs. study partners vs. church group) are a legitimate future direction, but must route through the existing rule, not around it: `OPAL_RELATIONSHIP_CONTEXTS.md` — Opal may *suggest* a relationship context, the user *accepts, edits, or declines* it, and "frequency is not identity" (message volume alone may never silently pick a tone). None of the four ephemeral primitives in §3 currently branch on relationship context at all (matches the availability review's finding: "relationship-label overfitting — not applicable yet, by design"). If a future pass wires tone-by-context, the constraint is: **only a context the specific user has explicitly confirmed for that relationship may change copy tone**, never an inferred one, and the underlying primitive (Edge, chip, private guidance, pulse) stays mechanically identical across every context — only word choice varies. This is design-ahead guidance for whoever eventually builds it, not a Phase-1-implementable spec; no code exists today that would need to change.

## 9. First-30-seconds and novelty test (brief §12, §13, answered as analysis)

**First-30-seconds:** the smallest interaction that says "this isn't another messaging app" is not a primitive at all — it's the **absence** of one during ordinary conversation, followed by one genuine Opal Edge appearance the first time a real plan-forming moment happens. A first-run user who sends a few ordinary messages and sees nothing extra, then later sees one small, correct, unforced glow appear exactly when something real is happening — that sequence *is* the aha, because the silence beforehand is what makes the appearance legible as intelligence rather than chrome. This confirms rather than changes the existing product instinct (`FOUNDER_NUANCE_PACK.md`'s "restraint is itself a speed mechanism") — the discovery-pass framing risked treating "make something appear" as the goal; the actual goal, already locked elsewhere, is that appearing at all is rare and earned.

**Novelty test, applied to each primitive in §3:** Opal Edge — could WhatsApp add an "AI found something" badge tomorrow? Structurally yes as a badge; not with this specific constraint set (derived from relationship-scoped conversation content, restraint-gated, never a count/red-dot). Private Opal Guidance — no generic chat app has a symmetric-but-asymmetric-visibility surface like this at all; strong pass. Relationship Pulse — this is the one to watch: implemented as a literal progress meter it would fail the test immediately (any app could bolt on a progress bar); implemented per §4.4's strict per-topic/non-persistent form, it passes only because it's derived from the same restraint-gated relationship intelligence as everything else — worth re-running this test again once it's actually built, since a meter-shaped implementation could quietly fail the test even while the design doc passes it.

## 10. What this document does not do

Does not modify `OpalApp.tsx`, `styles.css`, or `technicolorProduction.ts` — design only. Does not rename any locked term from `HUMAN_AND_AI_STATE_MATRIX.md` or `EXPERIENCE_COLLABORATION_AND_NUANCE.md`, despite the founder's "you may rename these" — renaming a locked product-truth vocabulary is not this document's authority. Does not design Provider Confirmation or Action State beyond noting their existing state numbers, since no current capability exercises them yet — better to design those against a real capability when one exists than speculatively now, matching the review discipline from the availability pass.
