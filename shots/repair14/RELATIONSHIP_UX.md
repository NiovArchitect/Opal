# Repair #14 — Relationship-Type UX Assessment (DRAFT)

Founder asked: what does Opal FEEL like for a family member vs a friend vs an acquaintance vs a partner vs a business contact?

This is grounded in what the code actually does today (verified by Track C journey tests in `apps/opal_core/test/opal_core/repair14_relationship_journeys_test.exs`), not in docs or intent. Where the feel is thin or absent, that is stated plainly.

## The short answer

Relationship type in Opal is a **tone and restraint dial**, not a coordination dial. Plans coordinate identically no matter who someone is — same state machine, same confirmations, same notifications (proven across all 7 types in the Track C tests). What changes is *how Opal speaks about the person, how freely it nudges you about them, how much lead time it assumes, and how much intimate context it will carry into a room.*

The seven types (RU-1 taxonomy, exact): spouse, partner, family, close_friend, friend, business, acquaintance. There is no "relative" — the schema rejects it; family covers it.

---

## Per type: what it actually feels like

### Spouse / Partner — "Opal loosens up completely"

- **Voice:** warm_intimate. Reminders arrive as "Hey love — reminder: …". Plan proposals read like "Want to grab dinner tonight? No pressure — just us." Split asks: "Want to split dinner — $X each?"
- **Initiative:** highest. Daily nudge frequency (cap 3/day), high proactivity, Opal volunteers plans and context freely (disclosure: volunteers).
- **Planning:** fully spontaneous — same-day, zero lead time required. Opal never scolds you for planning something with your partner in an hour.
- **Call briefs:** "Relationship: partner. Tone: warm_intimate." — the brief knows this is your person.
- **Depth:** rich — birthdays, gift suggestions, routine tracking all on.
- **Feel:** like a chief of staff who is also family. Nothing is formal, nothing waits.

### Family — "warm, respectful, planned"

- **Voice:** warm_respectful. Proposals: "Shall we set dinner with Mom for Saturday? I'll leave a little lead time." Warm, but no slang, no over-familiarity.
- **Initiative:** medium. Weekly nudge rhythm (cap 1/day), balanced disclosure — Opal brings things up, doesn't volunteer everything.
- **Planning:** planned preferred — 12h lead time enforced for formal proposals. Spontaneous family plans still coordinate fine (the plan machine doesn't gate), but Opal's *suggestions* respect the lead time.
- **Person card:** "Family · warm_respectful".
- **Depth:** rich, same as partner — birthdays, gifts, routines.
- **Feel:** like a thoughtful relative-by-proxy: it remembers, it respects, it doesn't barge in.

### Close friend — "casual, fast, playful"

- **Voice:** warm_casual. "Dinner tonight with Jo? I'm down if you are." Split asks: "Split dinner? Your share is $X."
- **Initiative:** high proactivity, weekly nudge cadence, volunteers hangouts.
- **Planning:** spontaneous (2h effective lead) — the only non-romantic type Opal treats as spontaneous.
- **Depth:** rich.
- **Feel:** like a friend who plans. Low ceremony, high follow-through.

### Friend — "casual but don't over-initiate"

- **Voice:** warm_casual, same family of copy as close friend, but proposals switch to planned framing: "Want to lock dinner with Jo for Saturday? I'll pencil it in properly."
- **Initiative:** medium — the profile's own words: "Suggest plans when natural; do not over-initiate." Weekly nudges, 12h lead.
- **Depth:** standard (birthdays + routine tracking, no gift suggestions).
- **Feel:** noticeably more restrained than close friend. The difference between close_friend and friend is real and perceptible: spontaneity and gift/depth, not tone words.

### Business — "professional, planned, never drops the floor"

- **Voice:** friendly_respectful — the profile law is "never drop below friendly_respectful; planned, concise, no intimacy." Coordinate drafts say "professional note"/"professional message" where personal contacts get plain "note"/"message". Split asks: "Please confirm your share of $X for dinner."
- **Initiative:** low. **Casual proactive nudges about a business contact are blocked outright** (attention budget denies with `:relationship_bounds`) — Opal will not casually surface "you should reach out to your colleague." Only time-critical items and mediation break through; your own reminders are never blocked.
- **Planning:** 48h lead time — the longest of any type. Proposal copy says so out loud: "I'll allow at least 48h lead time and keep the framing professional."
- **Depth:** minimal — no birthdays, no gifts, no routine tracking in nudges.
- **Feel:** like a good executive assistant's discretion. Opal is visibly more careful here than anywhere else.

### Acquaintance — "polite, brief, waits to be asked"

- **Voice:** polite_brief — the profile marks this the "underconfident-safe" default: if Opal isn't sure who someone is, it errs toward this register. "Reminder: …" with no warmth markers. Invite copy: "has invited you to connect on Opal. Accept when convenient."
- **Initiative:** lowest. Casual nudges blocked, same as business. 24h lead time.
- **Depth:** minimal, except birthdays are still surfaced (the one social grace kept).
- **Default for strangers:** anyone with no type set is framed as an acquaintance in broadcasts — the most reserved register is the fallback, never the warmest. That is the right failure direction.
- **Feel:** courteous distance. Opal will not pretend a slight acquaintance is a friend.

---

## What does NOT change by type (by design, proven)

- **Plan coordination.** Create → confirm → change → cancel produces identical state transitions and identical notifications for a spouse and for a business contact. A non-lead cancel is refused for every type. Group plans with mixed types (family + business + acquaintance in one thread) coordinate for everyone; nobody's type slows or alters the machine.
- **Group contexts strip intimate depth for everyone.** In a group prompt slice, even a family member's vibe, routines, open loops and known facts are withheld (`:shared_safe`) — the type dial never leaks private depth into a shared room.
- **Money privacy.** Split cards never show balances/history/thresholds, for any type.
- **Data isolation.** A type is per-account and per-direction: your "family" label on someone is invisible to every other account, including theirs.

## Honest gaps and thin spots

1. **The dial is mostly about Opal's voice and restraint, not about capabilities.** A business contact and a spouse get the same plan engine, the same venue search, the same questions answered. If the founder expects type to change *what Opal can do* (not just how it talks), that layer does not exist yet.
2. **Batch nudge cards don't apply per-recipient type bounds.** `AttentionBudget.grant_batch/3` records each item's relationship_type but the gate only reads single-person refs, and the function currently has no production callers. A future batch card mixing an acquaintance into casual nudges would not be type-gated. Filed as an observation, not fixed — batch gating semantics for mixed-type batches is a product decision.
3. **Unknown type strings fail closed for nudges but fall back to friend-register copy.** `nudge_allowed?("relative", casual)` denies (good), yet `style_for("relative")` returns "casual" and `planning_for("relative")` returns "planned", so proposal copy for an off-taxonomy label renders in the casual/planned (friend) register rather than the most reserved one. In practice the schema prevents off-taxonomy types from being stored, so this only matters for hand-passed strings — but the asymmetry is worth knowing: gating fails closed, copy fails casual.
4. **close_friend vs friend is the subtlest distinction** — same tone family (warm_casual); the difference is spontaneity, proactivity, and gift/depth. Users may not perceive a difference unless they hit a nudge or a same-day plan suggestion.
5. **Type is one-directional.** You can type someone "family" while they type you "acquaintance"; nothing reconciles or even surfaces the asymmetry. Each account's Opal simply behaves according to its own label. That is arguably correct (labels are private), but it is a product fact worth knowing.

## Verdict

The type system is real, not decorative: it changes Opal's voice, its willingness to interrupt you, its assumed lead times, its call briefs, its money asks, and its depth of memory per person — and the Track C tests now prove each of those behaviors against the code. The felt experience is a gradient from *intimate and proactive* (partner) to *formal and hands-off* (business/acquaintance), with family and close friend as two distinct warm registers in between. The coordination core underneath is deliberately type-blind, and that separation — same machine, different manners — is the strongest design property the tests found.
