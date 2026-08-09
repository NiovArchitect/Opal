# PR #65 — Automation / user-effort target (honest architecture)

**Status:** product target + Phase-1 honesty  
**Visuals:** frozen (not changed by this pass)  
**Date:** 2026-08-09  

---

## Product law

> Opal does the invisible work.  
> Users usually do nothing, one confirmation, one correction, or one private choice.

Alignment is the output. Availability is one private input stream.

---

## What Opal can know **today** (Phase 1 runtime)

| Source | Status | Notes |
|--------|--------|--------|
| Manual private windows (`availability_windows`) | **READY** | Owner-only create/list/delete |
| Intentional share into conversation | **READY** | Owner chooses windows; revoke supported |
| Shared-safe overlap compute | **READY** | Intersection of shares; no peer private leakage |
| Conversation membership / block | **READY** | Blocks empty coordination surface |
| Plan-forming / open-loop signals | **READY** | Existing journey signals (not second Set engine) |
| AlignmentAuthority Set | **READY** | Sole Set authority; availability never sets |

---

## What requires **manual input today**

| Gap | Why |
|-----|-----|
| First free windows | No calendar free/busy yet — user (or future sync) must create windows |
| Peer windows | Peer must share intentionally (or future authorized free/busy) |
| “Already know enough” without any windows | **Not true in production** until a private source exists |

---

## What can be **inferred/computed today**

Given shares exist: overlap ranges, shared-safe labels, participant_count (sharers), need_more_shares / no_overlap / overlap_found.

Cannot honestly infer peer free time from chat text alone in production.

---

## Future sources (same UX, richer underlay)

| Source | Adds | Auth required |
|--------|------|----------------|
| Calendar free/busy | Private free ranges without typing | User grant; scope; revoke |
| Device schedule / routines | Confidence + freshness | Explicit permission |
| Relationship prefs / recurring patterns | Prioritization | User-approved memory |
| Purpose-bound location | Place fit later | Purpose-bound only |

UI should not care which private source fed a safe conclusion.

---

## Minimum Question fit

Already conceptualized for “smallest missing fact.”

| Enough private data? | Ask |
|----------------------|-----|
| Yes + need expose permission | Share Thursday? (one choice) |
| No free windows | When could work? (fallback editor) |
| Stale free window | Still free Thursday evening? |
| Two strong overlaps | Thursday or Sunday? (≤3) |
| One strong | Surface one — no list |

**Tiny bridge needed (not built this pass):**  
`availability_data_sufficient?` / confidence+freshness on private sources → choose private confirm vs sheet vs silence. Do not invent a second engine if Alignment Gap + Minimum Question can own the decision.

---

## Review harness honesty

| Journey | What it demonstrates |
|---------|----------------------|
| **PRIMARY · Opal already knows** | **Fixture-mode** authorized known free window + compatible peer share → private “lines up” → Share Thursday → shared result → human agreement → Set. **Does not claim live calendar.** |
| **Fallback · needs one input** | No sufficient data → Find a time chip → private editor |
| **Variant multi / group** | Cardinality / group, not next chapters of primary |

Production must not tell users Opal “knows your calendar” until that integration is real.

---

## User effort doctrine (Phase 1 → later)

| Phase | Underneath | On top |
|-------|------------|--------|
| Now | Manual windows + share | Primary review shows target; runtime falls back to editor when empty |
| Next | Remember explicit windows | Fewer re-asks |
| Then | Free/busy | Primary path becomes common |
| Then | Device / location | Still: silence / one confirm / one correct / one private choice |

---

## Non-goals this pass

- No CSS / material / Motion redesign  
- No calendar integration  
- No second Set authority  
- No privacy weakening  
