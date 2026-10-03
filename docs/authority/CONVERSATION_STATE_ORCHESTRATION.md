# Conversation State Orchestration (CSO)

**Status:** MINIMUM ARBITRATION **REQUIRED NOW** for A8 closure · FULL CSO remains later expansion  
**Audience:** Agents closing whole-application coherence recovery / A8  
**Does not authorize:** Track B work, merge, public live, Journey feature build, inventing parallel SharedPlan/Attention engines

```yaml
authority_class: CONVERSATION_STATE_ORCHESTRATION
implement_authorized: minimum_arbitration_only
DOCUMENT_ONLY: false
DO_NOT_IMPLEMENT_NOW: false
minimum_required_for_a8_closure: true
full_cso_expansion: after_a8_whole_app_freeze
before: Journey_intelligence
supersedes: prior_document_only_sequencing
track_b_touch: forbidden
```

## Standing order (founder authority reset 2026-10-02)

Physical iPhone evidence proved temporal + state-layer contradictions.  
**Minimum Conversation State Orchestration arbitration is now a prerequisite to finishing A8** — it no longer waits until after A8 commit.

1. **Whole-application coherence recovery** (this mission) — includes min CSO arbitration.  
2. Automation GREEN across temporal / surfaces / hygiene / geometry / time-travel / founder-fixture E2E.  
3. **ONE** founder physical phone walk.  
4. A8 whole-app freeze / commit only when GREEN.  
5. **Then** full CSO expansion if remaining.  
6. **Then** Journey intelligence.

**Do not start Journey or new product features.**  
Pointer: `docs/evidence/v2-coded-experience/a8-cross-surface/NEXT_CONVERSATION_STATE_ORCHESTRATION.md`  
Related: `PRODUCT_INVARIANTS.md` · `STATE_SURFACE_CONTRACT.md` · `CURRENT_OPAL_STATE.md`

---

## Why this exists

Cross-surface presentation (A8 / `SurfaceProjection`) answers: **where** an issue appears and how surfaces stay coherent without duplicate action pressure.

It does **not** answer: **what conversation UI mode** a person should be in for a given open loop — per strand, per participant, without thrashing from casual chat.

Conversation State Orchestration is the future authority for:

- deriving **UI mode** from truth layers (not from a single global conversation enum)
- keeping **human chat freeform** while structured action exists when needed
- preventing **mode thrash** (hysteresis)
- choosing a **dependency-aware dominant state** when multiple strands are open
- preserving the escape hatch: humans can always speak past buttons

---

## Non-ownership (hard boundaries)

| Owner (remains) | Owns | Does **not** become |
|-----------------|------|---------------------|
| `SharedPlan` / plan fields | Canonical agreement truth | Conversation UI mode |
| `ConversationAlignment` | Fold messages/actions → plan dimensions | Global chat enum; Attention |
| `AttentionAuthority` | Who to interrupt / silence / coalesce | Conversation mode; Graph truth |
| `SurfaceProjection` (A8) | Where / how an issue projects across surfaces | Conversation state machine |
| Graph / Graph Detail | Object reality + lineage presentation | Conversation mode |
| **CSO (future)** | Strand + participant response → **UI mode** | SharedPlan mutation; Attention delivery; Graph schema |

**Laws:**

- **Attention ≠ conversation state.** Attention decides interruption/delivery; CSO decides conversational UI mode for an open loop.
- **Graph ≠ conversation state.** Graph presents object/commitment reality; CSO does not redefine Graph Detail as a mode owner.
- CSO **composes** existing authorities; it does not replace them or invent a second SharedPlan / second Attention engine.

---

## Three-layer model

UI mode is **derived**, never stored as a lone global conversation enum.

```text
┌─────────────────────────────────────────────────────────────┐
│  Layer 1 — Canonical object state                           │
│  SharedPlan / commitment / execution / proposal truth       │
│  (what is true in the world of the plan)                    │
├─────────────────────────────────────────────────────────────┤
│  Layer 2 — Strand state                                     │
│  Per open loop / dimension (time, place, activity, auth…)   │
│  Not one enum for the whole chat                            │
├─────────────────────────────────────────────────────────────┤
│  Layer 3 — Participant response state                       │
│  Per person: owes_action | waiting | settled | muted | …    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    Conversation UI mode
                 (for this viewer, this strand,
                  under hysteresis + dominance)
```

### Layer 1 — Canonical object state

Examples (illustrative vocabulary; reuse existing plan/execution truth where it already exists):

- no plan / unknown dimensions  
- candidates forming  
- committed exact time + place  
- `change_proposal` pending (e.g. 8:00 PM vs committed 7:30 PM)  
- reservation auth required / blocked by upstream  
- provider failure needing repair  
- settled / quiet

### Layer 2 — Strand state (per-strand, not global)

A **strand** is one open coordination loop inside a conversation (time change, place pick, activity, reservation auth, repair, later journey leave-by, etc.).

Rules:

- A conversation may have **multiple strands**; do not collapse them into one `conversation_state`.
- Each strand has its own lifecycle and may be quiet while another is dominant.
- Casual messages attach to chat history; they do **not** automatically rewrite every strand.

### Layer 3 — Participant response state

Per participant, relative to a strand:

| Response state | Meaning |
|----------------|---------|
| `owes_action` | Must Accept / Keep / authorize / repair (canonical CTA) |
| `waiting` | Proposed or acted; waiting on someone else |
| `settled` | No response owed on this strand |
| `muted` | Truth preserved; interruption suppressed (Attention law still applies) |
| `observer` | In conversation but not actor for this strand |

Proposer never gets an approval CTA for their own proposal (`PROPOSER_GETS_APPROVAL_PROMPT=0` remains).

---

## Composition → UI mode

```text
UI_mode(viewer) =
  dominate(
    hysteresis(
      compose(object_state, strand_state, viewer_response_state)
    )
  )
```

- **compose** — object + strand + this viewer’s response → candidate mode  
- **hysteresis** — do not flip modes on a single casual / non-consequential message  
- **dominate** — when multiple strands qualify, pick dependency-aware dominant strand (upstream unsettled blocks downstream action pressure)

---

## Primary modes (initial list)

Documentation vocabulary for future CSO. Names may map onto existing thread treatments; **do not implement a parallel mode enum in clients now.**

| Mode | Viewer experience (intent) |
|------|----------------------------|
| `FREEFORM` | Normal human chat; no structured action chrome required |
| `ALIGNING` | Soft structured help while dimensions are still open (activity / time / place) — still allows freeform |
| `ACTION_REQUIRED` | Canonical CTA in thread (e.g. Accept change / Keep current; auth when unblocked) |
| `WAITING` | Status that peer / system owes the next move; no fake self-approval |
| `UPSTREAM_BLOCKED` | Downstream CTA suppressed while upstream strand unsettled (e.g. reservation under pending time proposal) |
| `EXECUTION` | Provider / auth / repair loop owns the next human choice |
| `SETTLED_QUIET` | Plan/strand resolved; chat returns to freeform without leftover pressure |
| `JOURNEY_READY` | **Future after CSO + Journey** — real-world coordination mode; not in scope until Journey tranche |

Modes are **viewer-relative**. Walk A and Walk B may see different modes for the same strand at the same instant.

---

## Hysteresis / no thrash

**Problem:** One casual message (“lol”, “on my way later”, emoji, off-topic) must not yank the thread between structured and freeform chrome.

**Laws:**

- Mode transitions require **consequential** evidence (explicit action, consequential utterance under existing alignment rules, proposal create/accept/keep, auth, failure) — not every message.
- Entering `ACTION_REQUIRED` / `EXECUTION` is sticky until the strand settles, supersedes, or the viewer’s response state clears.
- Leaving structured modes back to `FREEFORM` / `SETTLED_QUIET` requires strand settlement or explicit reopen — not a single offhand line.
- Recompute may be frequent; **UI mode notify/flip only when mode value materially changes** (same spirit as temporal materiality hysteresis).

---

## Dependency-aware dominant state

When multiple strands are open:

1. Prefer the **upstream** unsettled strand that blocks others (time proposal before reservation auth).  
2. Suppress competing downstream CTAs (`DOWNSTREAM_ACTION_COMPETES_WITH_UNSETTLED_UPSTREAM=0` — already A8 law).  
3. Dominant strand drives viewer UI mode; non-dominant strands may remain as quiet status only.  
4. Do not surface two primary CTAs for one viewer in one thread.

CSO dominance must stay consistent with A8 SurfaceProjection coherence — CSO does not invent a second Accept/Keep path.

---

## Freeform escape hatch

```yaml
BUTTON_ONLY_FLOW: 0
```

Structured buttons and alignment chrome are accelerators, not prisons.

- Humans may always type / speak past the current CTA.  
- Freeform input must remain available in `ACTION_REQUIRED`, `ALIGNING`, and `WAITING` (subject to existing product shell).  
- Consequential freeform may update Layer 1 via `ConversationAlignment`; non-consequential freeform must not thrash Layer 2/3.  
- Never ship a mode where the only way forward is a button maze with chat disabled.

---

## Fort Oak example lifecycle (canonical Walk A/B)

**Fixture anchors (reference):**

- Conversation `ace99adc-db67-4258-9d95-f612246c6c84`  
- Plan `70804c05-779f-4991-ab9c-c75c319ebf2f`  
- Walk A proposer · Walk B responder  
- Committed **7:30 PM** · pending proposal **8:00 PM**

Illustrative CSO reading (documentation only):

| Beat | Object (L1) | Strand (L2) | Walk A (L3) | Walk B (L3) | UI mode A | UI mode B |
|------|-------------|-------------|-------------|-------------|-----------|-----------|
| Plan committed 7:30 | committed exact_time | time strand settled | settled | settled | `SETTLED_QUIET` / `FREEFORM` | same |
| A proposes 8:00 | `change_proposal` pending | time-change strand open | waiting | owes_action | `WAITING` | `ACTION_REQUIRED` |
| B still deciding; A chats casually | still pending | same strand | waiting | owes_action | stay `WAITING` (no thrash) | stay `ACTION_REQUIRED` |
| Reservation auth exists but proposal pending | auth blocked | auth strand subordinate | — | — | not auth CTA | `UPSTREAM_BLOCKED` for auth; time CTA dominates |
| B Accepts 8:00 | committed 8:00 | time-change settled | settled | settled | `SETTLED_QUIET` | `SETTLED_QUIET` |
| Later Journey work | journey facts | journey strand | … | … | only **after** CSO + Journey tranche | |

Attention may show Walk B For-you + Review link while B is `ACTION_REQUIRED` — that is **Attention delivery**, not a second conversation mode owner. Graph Detail may show `8:00 PM proposed` — **object projection**, not conversation state.

---

## Required zeros

| Law | Must remain |
|-----|-------------|
| `DOCUMENT_ONLY_UNTIL_A8_COMMIT` | No CSO product implementation before A8 commit |
| `JOURNEY_BEFORE_CSO` | **0** — Journey does not leapfrog CSO |
| `GLOBAL_CONVERSATION_ENUM_ONLY` | **0** — no single enum replacing per-strand state |
| `ONE_CASUAL_MESSAGE_MODE_THRASH` | **0** |
| `BUTTON_ONLY_FLOW` | **0** — freeform escape hatch always |
| `ATTENTION_EQUALS_CONVERSATION_STATE` | **0** |
| `GRAPH_EQUALS_CONVERSATION_STATE` | **0** |
| `SURFACE_PROJECTION_OWNS_CONVERSATION_MODE` | **0** — A8 owns cross-surface projection, not CSO |
| `CSO_MUTATES_SHARED_PLAN_DIRECTLY` | **0** — alignment/plan APIs remain writers |
| `CSO_BYPASSES_ATTENTION_AUTHORITY` | **0** |
| `PROPOSER_GETS_APPROVAL_PROMPT` | **0** (unchanged) |
| `MULTIPLE_CANONICAL_ACTION_IMPLEMENTATIONS` | **0** (unchanged A8) |
| `DOWNSTREAM_ACTION_COMPETES_WITH_UNSETTLED_UPSTREAM` | **0** (unchanged A8) |
| `SIMULATED_PHONE_EQUAL_PHYSICAL_PHONE` | **0** — shell proof stays physical |
| `TRACK_B_IN_CSO_TRANCHE` | **0** |

---

## Implementation order (locked)

```text
mobile product shell GREEN (physical)
  → founder walk (A8 product-feel)
  → COMMIT A8
  → Conversation State Orchestration (this authority → design → implement)
  → Journey intelligence
```

Until A8 is committed:

- **CURRENT PRIORITY = mobile shell**  
- CSO = documentation / sequencing authority only  
- Journey = not started  

---

## Related authorities (do not duplicate blindly)

| Doc | Role vs CSO |
|-----|-------------|
| `docs/evidence/v2-coded-experience/a8-cross-surface/CROSS_SURFACE_PRESENTATION_CONTRACT.md` | Where issues appear; coherence; not UI mode owner |
| `docs/evidence/v2-coded-experience/a8-cross-surface/NEXT_CONVERSATION_STATE_ORCHESTRATION.md` | Sequencing pointer + priority |
| AttentionAuthority / A6.1 Attention Center | Delivery / badge / Review — not conversation mode |
| `ConversationAlignment` / SharedPlan | Object + fold truth — Layer 1 inputs |
| `docs/authority/STATE_COMPLETENESS_LAW.md` | In-place transformation; less new screens |
| `docs/authority/OPAL_PRODUCT_OPERATING_SYSTEM.md` | Alignment loop; Journey sits after coordination |
| Testing Law (workspace memory) | Grok tests first; founder walks last |

---

## Explicit non-goals for this document pass

- No Elixir module, schema, API, or client mode store  
- No edits to `SurfaceProjection`, `AttentionAuthority`, or Track A intelligence modules  
- No Track B / WebRTC / call-transport work  
- No Journey ETA/leave-by implementation  
- No commit implied by this file’s existence  

**DOCUMENT ONLY — DO NOT IMPLEMENT NOW.**
