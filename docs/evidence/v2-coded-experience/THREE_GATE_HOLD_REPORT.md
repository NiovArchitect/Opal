# THREE-GATE HOLD REPORT

**Status:** **DO NOT MERGE**  
**Branch:** `build/v2-coded-experience-closure`  
**Date:** 2026-08-11  

Founder direction accepted: no new features. Attack only three unresolved gates. Do not call Opal brilliant because unit tests pass.

---

## Closure condition (harder bar — not met)

> Call Opal brilliant only when a realistic human conversation changes direction, Opal correctly understands the change, preserves privacy and authorship, recomposes the plan, updates Home/Chat/Shared Reality, and the humans have **noticeably less coordination work** afterward.

**Verdict:** **NOT MET.** Gates improved but not closed. Place / Memory / Group remain the differentiators that are still weak.

---

## Gate order (this pass)

| # | Gate | Target | This pass | Closed? |
|---|------|--------|-----------|---------|
| 1 | Intelligence — true group composition | 5 humans, constraints, partial participation, recompose without dyad proxy | Multi-member path + Set gate fix + seed | **NO** |
| 2 | Figma fidelity | Literal visual-diff vs approved frames at 390px | Incremental CSS only | **NO** |
| 3 | Causal Opal chronology | Human → human → Opal fact → continue → gap resolve → Shared Reality from real state | Provenance + interleaved filaments | **PARTIAL** |

**Socket caveat (founder):** Debounced Live/Reconnecting UX is not proof. Raw reconnect metrics added; lifetime still unmeasured in a live founder session.

---

## Gate 1 — Group / compound intelligence

### What was wrong

- Product seed labeled “Friends group” was a **dyad** (Founder ↔ Chris) with group copy.
- `AlignmentState.set_gate_satisfied?/1` allowed **2 affirmatives** even when membership was 5 → **dyad-proxy Set**.
- No product HTTP path to create multi-member `ConversationMember` conversations.

### What changed

| Change | Location |
|--------|----------|
| `Messages.create_group_conversation/3` (3–8 members) | `messages.ex` |
| `Messages.add_conversation_member/3` | `messages.ex` |
| `POST /api/v1/product/conversations/group` | router + controller |
| `POST /api/v1/product/conversations/:id/members` | router + controller |
| Set requires **every current member** to affirm | `alignment_state.ex` |
| Signals expose `composition`, `member_count`, `partial_group?` | `product_signals.ex` |
| Shared Reality `who` gap for multi-speaker forming | `shared_reality_presentation.ex` |
| Seed builds **true 5-person** Friends (Founder/Chris/Jess/Alex/Maya) | `scripts/founder_review_seed.mjs` |

### Tests (green)

- `create_group_conversation requires 3–8 unique members`
- `five-member group does not Set when only two affirm (no dyad proxy)`

### Still WEAK (honest)

| Area | Why still weak |
|------|----------------|
| **Group** | Collective path (options, unanimous rules, late decline, group_fit) is not fully wired into product web UI. Seed proves membership + message path; not full compound planning UX. |
| **Place** | Still pattern/extract + gap copy — not preference memory + collective place fit in the shell. |
| **Memory** | Authorship / recall still thin; no durable “we always do Harbor on Saturday” product surface. |
| **Brilliance** | Regex + membership gate ≠ understanding a direction change and recomposing a plan with less human work. |

---

## Gate 2 — Figma fidelity

### What changed

- Presence blocks: Living Void gradient + inset edge.
- Filament geometry: asymmetric radius, lower weight than human bubbles.
- Group presence border accent token.

### What did **not** happen

No literal side-by-side visual-diff pass (approved Figma frame beside running 390px for Home, Chat, Shared Reality, Curate, Extend, Plans, Group, temporal maturation, Opal filament).

### Honest scorecard

| Screen | Status |
|--------|--------|
| Home | Closer — not exact |
| Chat + filament | Closer chronology — not pixel Figma |
| Shared Reality | Still thin vs settled plate |
| Curate / Extend | Functional private-first — not full composition field |
| Group | Membership real — UI not a dedicated group frame |
| Brand mark | Working O — not master lock |

**Gate 2: OPEN.**

---

## Gate 3 — Causal chronology

### What changed

| Change | Effect |
|--------|--------|
| `source_message_ids` / `evidence_message_ids` on recognition | Provenance list from real messages |
| `chronological_moments[]` with `after_server_seq`, `evidence_message_id` | Stage transitions as conversation grew |
| Set moment only when `AlignmentAuthority` elevates | Not staged as evidence fiction |
| Chat interleaves filaments **after** triggering human message | Not dumped at end of thread |

### Still partial

- Moments are stage transitions from classifiers, not a full “Opal recognized fact X” ledger.
- Persistence is recompute-on-read (ProductSignals), not a durable moment store — refresh is consistent only if messages unchanged.
- Founder still cannot scroll one long realistic conversation and always *feel* quiet causal intelligence without reading debug fields.

**Gate 3: PARTIAL — better than staged end-dump; not closed.**

---

## Socket reconnect caveat

| Layer | Status |
|-------|--------|
| UI debounce (4s) + backoff | Present (prior pass) |
| Coalesced connect | Present |
| **Raw metrics** | `getDiagnostics()`: `connectCount`, `reconnectScheduleCount`, `closeCount`, `errorCount`, `connectedLifetimeMs` |
| Live founder measurement | **Not run this pass** |

**Next run must log:** session duration, reconnectScheduleCount, closeCount while UI stays quiet. If reconnects stay high with quiet UI, the bug remains.

---

## Scorecard (no greenwash)

| Dimension | Score | Notes |
|-----------|-------|-------|
| Place | **WEAK** | Gap language only |
| Memory | **WEAK** | No product recall surface |
| Group | **WEAK → improving** | True membership + Set gate; not compound UI |
| Time / availability | Improving | Open-ended prior pass |
| Visible intelligence | Improving | Causal filaments partial |
| Figma fidelity | **PARTIAL** | No literal diff pass |
| Brilliant? | **NO** | Harder closure condition not met |

---

## How to review (local)

```bash
# API up, then:
node scripts/founder_review_seed.mjs
# Login +12025550101 / 111111
# Open Friends (5 peers) — scroll filaments interleaved after human turns
# In console (optional): productRealtime.getDiagnostics()
```

---

## Merge decision

| | |
|--|--|
| **Merge?** | **NO — DO NOT MERGE** |
| **Why** | Gates that define Opal’s differentiation remain open: true group brilliance, exact Figma, causal brilliance under direction-change. |
| **Next pass only** | Real group composition + compound intelligence → exact Figma implementation fidelity → causal chronology from real A↔B↔group conversations + raw socket lifetime proof. |

No feature expansion. Hold for founder eyes.
