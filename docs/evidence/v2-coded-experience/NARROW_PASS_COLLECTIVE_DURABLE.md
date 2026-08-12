# NARROW PASS — Collective intelligence + durable chronology

**Status:** **DO NOT MERGE**  
**Branch:** `build/v2-coded-experience-closure`  
**Scope:** No new UI concepts · no features · no logo  

Founder correction accepted: **unanimous-all-members is a safety fallback, not brilliant group coordination.**

---

## Product threshold (not met)

> A realistic conversation changes. Opal understands why it changed, recomposes across all affected people, keeps private causes private, updates the visible reality, preserves who socially led the interaction, and leaves the humans with less work than they would otherwise have done.

**Verdict: NOT YET.** Architecture for required/optional + durable moments exists; full product brilliance + Figma + live socket proof remain open.

---

## 1. True collective intelligence

### Authority model (corrected)

| Model | Status |
|-------|--------|
| Old permanent “everybody must say yes” | **Rejected as permanent social model** |
| Required participants must affirm | **Implemented** (Set gate) |
| Optional late (“start without me”) does not block | **Implemented** |
| Early leave does not kill plan | **Implemented** (composition) |
| Guest ask capacity (Sam) | **Detected** (projected party size) |
| Full quorum-only-where-context-permits | **Partial** — not full Collective UI path |

### Proof episode (unit-tested)

```
Saturday?
I'm in.
Can't get there before 7:30.
Anywhere but downtown.
Not sushi again.
I can come but I'm leaving around 9.
Can Sam come?
Start without me, I'll meet you around 8.   ← optional
(+ required affirmations)
```

| Dimension | Derived |
|-----------|---------|
| Who | 5 members → projected 6 (Sam) |
| When | strongest common start ~7:30; one leave ~9 |
| Where | downtown incompatible |
| Food | sushi conflict |
| Participation | late/early do not kill plan |
| Capacity | guest may change venue feasibility |
| Authority | `required_participants` (not unanimous-all) |

**Recomposition test:** adding “Anywhere but downtown” flips `downtown_incompatible` without restarting the world.

**Modules:** `GroupComposition`, `AlignmentState` / `AlignmentAuthority` consume `required_participant_ids`.

### Still weak

- Place preference memory still WEAK  
- Compound venue ranking not on product path  
- Collective GroupOption UI not the shell  
- Guest “Sam” is a name ask, not a real membership join  

**Group intelligence: WEAK → improving (required/optional real).** Not impressive end-to-end yet.

---

## 2. Figma fidelity

### Mechanical pass status: **NOT EXECUTED**

Required loop (founder):

```
approved Figma frame → 390px screenshot → diff → repair → screenshot again
```

Screens: Home, Chat, Shared Reality, Curate, Extend, Group, Plans  
Diff axes: geometry, spacing, type, negative space, depth, asymmetry, material, hierarchy, density, filament, bubbles, motion, collapse, **absence**.

**This agent pass did not run the visual-diff machine.**  
“Living Void tokens” is **not** claimed as proof.

**Gate 2: OPEN.**

---

## 3. Durable Opal chronology

### What changed

| Piece | Behavior |
|-------|----------|
| Table `opal_chronology_moments` | Persisted rows |
| `Chronology.record_after_message/1` | On every created message |
| Stage + composition + shared-reality moments | Idempotent keys |
| Private “Only you” | `visibility: private_viewer` |
| `GET .../messages` | Returns `chronology` + `durable_chronology: true` |
| Web shell | Prefers durable chronology for filaments |

### Proof (unit)

- Moments survive re-read with same ids  
- Private moments visible only to viewer  

### Still partial vs founder story

Ideal:

```
7:12 human → 7:14 human → 7:14 Opal → 7:18 Opal place gap
→ 7:20 Only you curate → 7:24 Opal settled
→ refresh / logout / return → same story
```

We have durable stage/composition rows and private API. We do **not** yet have full human-time stamps in filament copy, Extend auto-record on every curate path, or founder-proven logout survival in a live browser.

**Gate 3: PARTIAL (durable store exists; living-record UX not closed).**

---

## 4. Socket health

| Item | Status |
|------|--------|
| `getDiagnostics()` | Present |
| 15–30 min dual-browser proof | **NOT RUN** |
| Harness note | `scripts/socket_health_probe.mjs` |

Healthy target:

```text
connectCount: 1
closeCount: 0
reconnectScheduleCount: 0
errorCount: 0
connectedLifetimeMs: large
```

**Gate 4: UNPROVEN.**

---

## 5. Human Coordination Residue (measurement)

### Framework (use on every serious episode)

| Metric | Without Opal (baseline) | With Opal (observed) |
|--------|-------------------------|----------------------|
| Human messages to decide | e.g. 18 | ? |
| Repeated availability questions | 2+ | ? |
| External restaurant search | yes/no | ? |
| Maps / “where are we meeting?” | yes/no | ? |
| Final reconfirmation loop | yes/no | ? |
| Private causes leaked? | n/a | must be **no** |
| Who socially led? | n/a | preserved? |

### Episode template — Saturday group

| Without Opal (estimate) | With Opal (this pass) |
|-------------------------|------------------------|
| ~15–20 msgs + group chat thrash on place/food/time | Conversation stays human; composition dimensions computed |
| Separate DMs for “is Chris in?” | Optional late modeled; required still gate Set |
| Restaurant hunt + “not downtown / not sushi” lost in scroll | Constraints on `group_composition` |
| “Can Sam come?” forgotten until table size wrong | Capacity / projected who recorded |

**Residue reduction: directionally better in tests; not founder-measured in live product.**

---

## Scorecard (strict)

| Area | Score |
|------|-------|
| Group composition intelligence | **Improving** (required/optional/constraints) |
| Group product experience | **WEAK** |
| Place / memory | **WEAK** |
| Durable chronology | **PARTIAL** |
| Figma exact fidelity | **OPEN** (not mechanically run) |
| Socket lifetime | **UNPROVEN** |
| Human coordination residue | **Framework only** |
| Brilliant? | **NO** |

---

## Merge

| | |
|--|--|
| **Merge?** | **NO — DO NOT MERGE** |
| **Why** | Differentiation gates still open: compound group experience, literal Figma, living durable history under logout, socket proof, measured residue |

### Next pass only

1. Wire composition into visible Shared Reality / Home without new chrome  
2. Mechanical Figma 390px diffs for every locked screen  
3. Full living-record timestamps + Extend private durable path end-to-end  
4. Dual-client 15–30m socket measurement  
5. Record residue numbers on one founder episode  

When the threshold quote is true **repeatedly** and the UI matches approved Figma — that is Opal itself, not architecture demo.
