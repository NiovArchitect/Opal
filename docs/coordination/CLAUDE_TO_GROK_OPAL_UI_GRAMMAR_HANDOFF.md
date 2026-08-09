# Claude → Grok — Opal UI Grammar Handoff

**Writer:** Claude (independent), remote controller mode
**Reader:** Grok — lead executor for whatever below is ported to production
**Date:** 2026-08-08
**Full detail:** `docs/design/ui-ux/opal-ui-grammar.md` (grammar + mapping), `docs/design/motion/opal-moment-motion-language.md` §13 (motion delta), `docs/design/prototypes/opal-ui-grammar-prototype.html` (local static prototype, 8 states, real tokens only)

---

## What this is

The founder asked for a discovery pass on the "missing" Opal interface primitive. The finding: it isn't missing — `OPAL_HUMAN_AND_AI_STATE_MATRIX.md` (six states) and `EXPERIENCE_COLLABORATION_AND_NUANCE.md` (content classes, journey signals, healthy reward loop, noise budget) already lock the semantic grammar as accepted product truth, and `technicolorProduction.ts` already reserves a `"private"` semantic state (deepViolet) with zero UI built against it. What was actually missing was the concrete presentation spec — this handoff is that spec, for four ephemeral primitives (Opal Edge, generalized Moment Chip / Expanding Moment, Private Opal Guidance, a narrowly-scoped Relationship Pulse) that all extend `.opal-moment`/`semanticStateForSignal`, not a parallel system.

**Do not read this as replacing `CLAUDE_TO_GROK_AVAILABILITY_ALIGNMENT_HANDOFF.md`** — that one still governs the availability capability specifically; this one governs the general grammar every future capability (including availability) should present through.

---

## MUST

- **Never push a status statement about a specific person's inaction into any shared surface** — thread, composer edge, or otherwise. This was already a MUST in the availability handoff; the founder's new brief's own example chips (`Still waiting on one`, `One person left`, `Maya still needs a minute`) reintroduce exactly that pattern in a new location. They are explicitly REJECT (see below), not a softer allowance because they moved from the thread to the composer.
- **`deepViolet` as the *dominant* color (border + label text) is reserved for Private Opal Guidance only.** No shared moment's border or label text may be dominantly violet, and Private Guidance's border/label are never anything else. Low-alpha deepViolet as an incidental *background gradient stop* is already in use on the shared availability-overlap moment (part of its recognition-family gradient, predates this doc) and is not a violation — it never carries the label color or the dominant border hue. Precision matters here because the distinction is what a user actually reads at a glance is label/border color, not gradient stops. If this boundary gets fuzzy in implementation, tighten it toward "no violet at all on shared moments," not the other way.
- **Private Opal Guidance copy stays first-person-directed, never a stated fact about the peer** — even in a surface only the owner sees. "Want a couple ideas?" is fine; "she usually prefers X" is not, regardless of audience, because it asserts certainty about someone who has no way to see or correct it.
- **Opal Edge is a static, one-shot-entrance treatment on the existing journey bar — never a frame-wide sweep around the conversation, never a loop beyond the single already-permitted Still-Open breathing instance.** If you build this and it ends up animating on every message, that's the exact anti-pattern the motion doc rejected once already; re-derive the trigger condition (state crossing into "actionable," not "message arrived") rather than the visual treatment.
- **Relationship Pulse, if built at all, must be strictly per-topic and non-persistent** — it renders the *current* journey signal's state ambiently, and disappears when that topic resolves or goes quiet. It must never aggregate across topics, never compare conversations, and never produce a number, percentage, or rank. This is a hard product-law boundary (`GAPS_AND_OPEN_DECISIONS.md` G054, "Relationship health quantification — Rejected"), not a style preference — treat any design that drifts toward persistence as the rejected pattern, not a variant worth trying.
- **No new `SignalKind`, color, or component shape without extending the existing ones.** `semanticStateForSignal`'s `"private"` case already exists and is unused — build the producer that sets it, don't invent a parallel private-content pathway.

## SHOULD

- Follow the prototype's placement pattern for each primitive (`docs/design/prototypes/opal-ui-grammar-prototype.html`, states B/D/E) when you get to implementation — it's a static mockup, not a component library, but the DOM placement reasoning (Edge on the journey bar itself, private strip structurally separate from the shared composer chip, expansion inline rather than a new sheet) matches the grammar doc's reasoning and is worth porting the *shape* of, even though you'll write real components.
- When a capability's restraint check would say "silence," nothing in this vocabulary should render — extend the existing `Restraint.decide/1` pattern (or a capability-appropriate sibling built the same way) per-capability rather than inventing a second gate; this grammar is a presentation layer over gates that already decide whether to show anything, not a new decision point.
- Treat Provider Confirmation (state 5) and Action-in-progress (state 4) as **not yet designed against a real capability**, correctly, per the grammar doc §10 — don't build UI for either speculatively; wait until a real provider integration or in-progress action exists, then design against that, the same discipline already applied to availability.
- If/when tone-by-relationship-context gets built (courtship vs. friends vs. church group vocabulary), gate it on a context the specific user has explicitly confirmed — never an inferred one — and keep every primitive mechanically identical across contexts; only word choice should vary.

## EXPERIMENT

- The Opal Edge's "brighter static baseline layered on top of an existing Still-Open breath" behavior (grammar doc §3.1, motion delta §13.1) — worth building and looking at on a real render; two co-occurring states on one element (Still Open + something new to look at) is a real scenario worth testing for legibility before assuming layering reads correctly rather than confusingly.
- The private-guidance placement (a strip near the composer, visually distinct from the shared Contextual Composer chip) is a first attempt at solving "close in position, unmistakable in meaning" — worth a real side-by-side look once both exist in the same build to confirm the color distinction alone is sufficient, or whether it also needs a position/shape difference.

## REJECT

- `Still waiting on one`, `One person left`, `Maya still needs a minute` as unprompted pushed text anywhere in the shared conversation view (thread or composer edge) — names or implies a specific person's inaction to other people without being asked. The sanctioned substitute is a plain count inside a sheet/detail a user opened on purpose (`"Based on times 3 people have shared."`), never a chip.
- `Plans changed` as an unprompted push notice — matches the already-rejected `availability:revoked` thread notice from the prior handoff. A changed state should surface by the old moment simply no longer being true (it ages out / stops rendering), never by a new notice announcing the change.
- Relationship Pulse implemented as any kind of visible meter, percentage, or persistent-across-topics indicator — see MUST above; this is the one idea in the founder's brief most likely to accidentally become the explicitly-rejected relationship-score pattern if implemented casually.
- A frame-wide Technicolor sweep around the whole conversation border for any purpose, including the Edge — already rejected once (motion doc §3), still rejected; the Edge lives on the journey bar element only.
- Any UI-invented specific time, venue, or option not directly present in a real backend payload — same discipline as the availability pass, now stated as a general rule for every future capability's Moment Chip, not just this one.

## OPEN FOUNDER QUESTIONS

1. **Relationship Pulse — build it at all, in Phase-appropriate scope, or hold it entirely?** The grammar doc conditionally approves a strictly per-topic, non-persistent version; it's the one primitive in this pass with no existing precedent anywhere in the product (unlike Edge/Chip/Private-Guidance, which all extend something that already partially exists). Worth an explicit founder call on whether it's worth building even in its safest form, or whether "the existing journey signal, rendered a little richer" is enough without giving it its own name and identity.
2. **Tone-by-confirmed-relationship-context** (courtship vs. friends vs. church group copy variants) is real future scope per the founder's brief, but nothing in the current product has relationship-context-confirmation UI built yet (`OPAL_RELATIONSHIP_CONTEXTS.md` describes the model, not a shipped confirmation flow). Sequencing question for the founder: does that confirmation UI need to exist before any tone-varying copy ships, or is a first version allowed to infer context privately (never shown, never asserted) while the confirmation flow is still being built? The grammar doc assumes the stricter answer (confirmed-only); worth the founder saying so explicitly since it constrains a real amount of future copy work.
3. Same MVP-boundary and location-scope questions from the availability handoff remain open and apply here too — this pass didn't touch either, since none of these four primitives require calendar integration or location data to work as designed.
