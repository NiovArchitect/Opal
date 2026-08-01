# Social Flow Visible Components

**Authority:** ARCHITECTURE (UI component law) + ACCEPTED PRODUCT TRUTH  
**Status:** Conversation-native component catalog — documentation only  
**Related:** `VISIBLE_SIGNAL_PRINCIPLES.md`, `INFORMATION_ARCHITECTURE.md`, `OPAL_SOCIAL_FLOW_PRODUCT_TRUTH.md`, `SOCIAL_FLOW_PRIVACY_BOUNDARIES.md`  
**Owner (this phase):** UI Designer

---

## Design mandate

Social Flow UI is **conversation-native**.

Components live **in the thread**, in compact **plan cards**, and in a **lightweight Plans / Flow summary** — not in a separate “coordination dashboard product.”

| Home | Not home |
|------|----------|
| Message stream + contextual cards | Analytics dashboards |
| Composer + soft chips | Agent topology screens |
| Compact plan objects | Public social feeds |
| Private sheets | Relationship scoreboards |

---

## Component principles

1. **One glance, one meaning** — title + state + one action.  
2. **Chrome is quiet** — warm premium, spacious, legible; no glassmorphism soup.  
3. **Privacy is labeled** — private vs shared is a first-class visual, not a footnote.  
4. **States are human** — “Needs your answer,” not `participation=tentative`.  
5. **Expand, don’t explode** — progressive disclosure only.  
6. **Mobile-first layout** — thumb reach, 44pt targets, dynamic type (see `ACCESSIBILITY_SOCIAL_FLOW.md`).  
7. **No engineering dialect** in labels.

---

## Component catalog

### C1 — Soft plan proposal card (in-thread)

**When:** Opal detects a possible plan; user has not yet consented to coordinate as a shared plan.

```text
┌─────────────────────────────────────────┐
│ Dinner next week?                       │
│ Thursday after 6:30 looks possible      │
│ for both of you.                        │
│                                         │
│ [ Check availability ]  [ Not a plan ]  │
│            Suggest another time         │
└─────────────────────────────────────────┘
```

| Property | Spec |
|----------|------|
| Placement | Inline in conversation after relevant messages |
| Authority | Proposal only — **not** a binding event |
| Actions | Coordinate / check availability · Suggest another · Not a plan |
| Visual weight | Soft border; not full-bleed “alert red” |
| Dismiss | “Not a plan” removes card; optional “don’t suggest plans here” |

---

### C2 — Shared plan card (authoritative)

**When:** Agreement rules met; Elixir holds `SharedPlan`.

```text
┌─────────────────────────────────────────┐
│ SHARED PLAN                        Sat  │
│ Dinner · Saturday 7:00                  │
│ You · Maya · accepted                   │
│                                         │
│ [ Details ]  [ Change ]  [ Remind me ]  │
└─────────────────────────────────────────┘
```

| Property | Spec |
|----------|------|
| Badge | **Shared** (icon + text; never color alone) |
| Content | Activity, when, who, participation summary |
| Forbidden fields | Private gifts, personal budgets, private holds of others |
| Revision | “Changed” chip when newer `PlanRevision` exists |

---

### C3 — Private care / private reminder card

**When:** Personal hold, gift prep, private commitment, private deadline.

```text
┌─────────────────────────────────────────┐
│ PRIVATE                            only │
│          you can see this               │
│ Gift reminder · silver necklace idea    │
│ Before Maya’s birthday                  │
│                                         │
│ [ Keep private reminder ]  [ Dismiss ]  │
└─────────────────────────────────────────┘
```

| Property | Spec |
|----------|------|
| Badge | **Private** — high contrast label + lock/privacy icon |
| Boundary | User private context only |
| Leak test | Must never render inside partner-visible shared plan body |

---

### C4 — Participation / agreement strip

**When:** Group or multi-party plan needs status without a meeting.

```text
Three people agreed on Saturday · 1 still unsure
[ Nudge gently ]  [ See who’s who ]
```

| Property | Spec |
|----------|------|
| Tone | Humane; no shaming copy (“Jordan is flaky”) |
| Expansion | Names + states: invited / interested / tentative / accepted / declined / withdrawn |
| Actions | Nudge only if user-authorized and non-coercive |

---

### C5 — Availability option chip row

**When:** Free/busy or preferred windows granted for a scope.

```text
You both appear free after 6:30
[ Use this time ]  [ Show other options ]
```

| Property | Spec |
|----------|------|
| Data | Computed from grants — not from reading private event titles |
| Uncertainty | “appear” / “looks possible” when imperfect |
| No grant | Do not invent availability |

---

### C6 — Commitment row

**When:** Someone owns a do-item related to a plan.

```text
You offered to pick him up
Due · tomorrow · shared with family plan
[ Mark done ]  [ Transfer ]  [ Withdraw ]
```

or private:

```text
I’ll book the table · private progress
Deadline · tomorrow
```

| Property | Spec |
|----------|------|
| Owner | Always explicit |
| Privacy | Private vs shared progress toggle visibility |
| Completion | Visible resolution; no silent auto-done |

---

### C7 — Needs-answer indicator

**When:** User’s response blocks others or freezes a poll.

```text
This still needs an answer
[ Accept ]  [ Decline ]  [ Maybe ]  [ Later ]
```

| Property | Spec |
|----------|------|
| List badge | Subtle on conversation row (not red panic by default) |
| Thread | Card or sticky mini-bar above composer |
| Quiet hours | Respect mute / night |

---

### C8 — Plan changed / offline reconcile banner

**When:** Authoritative revision while user offline.

```text
The plan changed while you were offline
Saturday 7:00 → 7:30 · Maya proposed
[ Review change ]  [ OK ]
```

| Property | Spec |
|----------|------|
| Timing | On reconnect / open conversation |
| Content | What changed + who + version lineage summary |
| No silent overwrite of user’s local “understood” state without review path |

---

### C9 — Consent-to-coordinate sheet

**When:** First time elevating conversation content into plan intelligence for a scope.

```text
Use this conversation to coordinate this plan?
Opal will suggest times and track agreement.
You can stop anytime.

[ Allow for this plan ]  [ Not now ]
```

| Property | Spec |
|----------|------|
| Scope | Plan / conversation / circle as product defines |
| Revocation | Clear path; stops future AI context for that grant |
| Never | Buried only in settings |

---

### C10 — Family coordination surface (compact)

**When:** Multi-household or parent–child plans (when age authority allows).

Not a second app — a **scoped collection** of plan cards:

```text
Family · This week
• Practice moved to 5:00 · needs pickup rethink
• Saturday lunch · 3 accepted · 1 unsure
• School pickup · may be affected by practice change
```

| Property | Spec |
|----------|------|
| Entry | From family conversation, Plans filter, or explicit family circle |
| Signal | Impact lines (“may affect school pickup”) use uncertainty language |
| Youth | Respect guardian visibility and peer boundaries (product/legal docs) |
| Forbidden | Covert parent surveillance dashboard of child’s private chat as default UX |

---

### C11 — “Turn into shared family plan” prompt

```text
Do you want to turn this conversation into a shared family plan?
[ Create family plan ]  [ Keep as chat only ]
```

Same interaction pattern as adult “turn into a plan,” with **family membership and guardian rules** applied by authority layer — not a different visual language for “kids mode” gimmicks.

---

### C12 — Deadline / reservation urgency (calm)

```text
The reservation deadline is tomorrow
Owner · You · shared with plan
[ Open commitment ]  [ Snooze ]
```

Urgency via **deadline language**, not fear chrome. No “relationship at risk” patterns.

---

### C13 — Pattern recall (sparse)

```text
You and your partner discussed this trip twice
but never chose dates.
[ Pick dates ]  [ Not a plan ]  [ Don’t remind ]
```

| Property | Spec |
|----------|------|
| Frequency | Rare; high relevance only |
| Forbidden | Health scores, “stuck relationship” framing |

---

### C14 — Lightweight Plans view (secondary surface)

Aggregates conversation-native objects; does **not** replace chat.

| Section | Contents |
|---------|----------|
| Needs response | C7 items |
| Changed | C8 items |
| Upcoming | Shared plans |
| Undecided | Soft proposals still open |
| Promises | Commitments you own |
| Private | Private holds/reminders (private section only) |

No gamification streaks. No public discovery rail.

---

## Privacy chrome tokens (conceptual)

| Token | Use |
|-------|-----|
| `badge.shared` | Shared plan, shared commitment |
| `badge.private` | Private only |
| `badge.restricted` | Surprise / exclude-guest contexts |
| `badge.family` | Family-scoped plan (optional label) |
| `state.needs_answer` | Soft attention |
| `state.changed` | Revision since last open |
| `state.tentative` | Unsure / maybe |

Meaning must not rely on color alone (icon + text).

---

## Composition rules

1. **In-thread cards** are the default composition unit.  
2. **Plans view** is a sorted projection of the same objects.  
3. **Calendar grid** is a later projection — never the only place truth lives.  
4. **Family surfaces** compose C2 + C4 + C6 + C10; they do not invent a surveillance shell.  
5. **AI suggestions** must be announced as suggestions, not as messages from the contact (a11y + trust).

---

## Mapping to domain primitives

| Primitive | Primary component |
|-----------|-------------------|
| Plan proposal / PotentialPlan | C1 |
| Availability grant + Time option | C5 |
| Plan poll | C4 + poll UI (in-thread) |
| Shared plan | C2 |
| Participation state | C4 |
| Commitment | C6 |
| Plan revision | C8 + changed chip on C2 |
| Personal hold / private prep | C3 |
| Restricted surprise | C3-like restricted badge; guest excluded |
| Calendar projection | Secondary; not this catalog’s primary |

---

## Explicit non-components

Do not design or ship as Social Flow primary UI:

- Social Score widgets  
- Mood radar of contacts  
- Staking / wallet chrome  
- Agent swarm visualizer  
- “Memory capsule browser” of raw embeddings  
- Global friend-activity firehose  

---

## Summary lock

| Statement | Label |
|-----------|--------|
| Components are conversation-native, not dashboards | **ACCEPTED PRODUCT TRUTH** |
| Plan cards + private/shared indicators + family coordination surfaces | **ARCHITECTURE** (UI) |
| Private vs shared badges required | **ACCEPTED PRODUCT TRUTH** |
| Catalog maps to Social Flow primitives | **ARCHITECTURE** |
