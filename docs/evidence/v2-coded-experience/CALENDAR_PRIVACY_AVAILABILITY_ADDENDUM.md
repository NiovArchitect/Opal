# OPAL — CALENDAR PRIVACY + AVAILABILITY COMPOSITION ADDENDUM

**HOLD. DO NOT MERGE.**  
**Branch:** `build/v2-coded-experience-closure`  
**Date:** 2026-08-11 (session)  

Additive canon only. No calendar product. No Home noise. Figma remains visual law.

---

## FINAL LAWS (ACK)

| Law | Status |
|-----|--------|
| Know availability deeply; reveal minimally | **ENCODED** |
| Calendar access ≠ calendar disclosure | **ENCODED** |
| Availability shared; private causes not | **ENCODED** |
| Dayparts are real human time | **ENCODED** |
| Fixed event time ≠ chosen social time | **ENCODED** |
| Open-ended social time remains valid | **ENCODED** |
| Busy ≠ cannot choose flexibility | **ENCODED** |
| Never move private calendar without auth | **PRESERVED** (`WriteAction`) |
| Compress scheduling into smallest shared signal | **ENCODED** |
| Humans feel synchronized, not operating a calendar app | **PRODUCT PATH** (invisible intelligence) |
| Figma pulled directly before surface implement | **PRIOR** (this pass: composition domain; Figma audit below) |

---

## CALENDAR CAPABILITY MAP

| Layer | What exists | Status |
|-------|-------------|--------|
| **Manual windows + intentional share** | `Availability`, `AvailabilityWindow`, `AvailabilityShare` | **Production path** (Phase-1 source = manual) |
| **Shared-safe overlap** | `Availability.compute_overlap/2`, `assert_shared_safe!` | **Production** |
| **Intervention / sufficiency** | `resolve_intervention`, `AvailabilitySufficiency`, `CalendarSufficiency` | **Production** (native Opal busy + optional external) |
| **Free/busy contract** | `CalendarFreeBusyContract` — title-free private facts | **Contract ready** |
| **Aggregation** | `Calendar.Aggregation` multi-calendar busy merge | **Production pure** |
| **FreeBusyStore** | In-process title-free store for tests/local | **Synthetic / test** |
| **Google freeBusy adapter** | `GoogleAdapter` — freebusy scope, no titles | **Code present; live OAuth not claimed** |
| **CompositeAdapter** | Google if connected else FreeBusyStore | **Wiring present** |
| **WriteAction** | prepare → user authorize → execute; no silent create | **Production state machine** |
| **Opal native calendar** | Commitments from SharedPlan; private conflict guidance | **Production** |
| **DecisionTrace** | Redacted telemetry; forbids titles/tokens | **Production** |
| **GroupFit** | Viability (participation/burden), not free/busy composition | **Adjacent** |
| **AvailabilityComposition** | Multi-person private fit → shared consequence | **NEW (this pass)** |
| **Home calendar UI** | Heatmaps / week views / conflict badges | **ABSENT (correct)** |
| **Find-a-time enterprise scheduler** | Full calendar product | **ABSENT (correct)** |
| **Live multi-provider production sync** | Google/Apple/Outlook always-on | **Partial** — adapter + store; not full prod claim |
| **Oracle resistance at API edge** | Composition `probe_response` | **Domain PASS**; full network soak **P1** |

### What is synthetic?

- `FreeBusyStore` busy blocks for tests
- Local permission grants without OAuth
- Composition tests use explicit busy intervals (no event titles)

### What is production?

- Manual share + overlap + intervention
- Shared-safe projections
- Native Opal commitments after Set
- WriteAction authorization gate
- Title-stripping on free/busy sanitize

### What is absent?

- Pixel-perfect Figma time UI (Find-a-time sheet still lightweight; not redesigned this pass)
- End-to-end dual-browser calendar privacy soak over live Google
- Automatic daypart inference from live chat → composition (heuristic path exists separately)
- Unrestricted peer free/busy API (correctly absent)

---

## PRIVATE AVAILABILITY MODEL

Internal (not human matrix):

| Concept | Meaning |
|---------|---------|
| AVAILABLE | Free in search window |
| BUSY | Busy block overlaps |
| PREFERRED | (reserved; not required for fit) |
| POSSIBLE WITH CHANGE | Flexibility signaled; needs confirm |
| UNAVAILABLE | No free slot and no flexibility |
| OPTIONAL / FLEXIBLE | Optional participant or late_ok |

Human surface stays simple consequence labels, not a scheduling matrix.

Module: `OpalCore.SocialFlow.AvailabilityComposition`

---

## CALENDAR DISCLOSURE RULES

**Shared may include:**

- Consequence label (`Thursday · 7:30 PM works for both of you.`)
- Suggested start (shared consequence only)
- Fit status classes (`fit`, `partial_fit`, `no_overlap`, `partial_coverage`, …)
- `open_ended`, `shared_safe`, `no_private_schedule`
- Fixed event public label when event itself is shared truth

**Shared must never include:**

- Event titles / therapy / work meeting / medical / family obligations
- Peer busy-until edges at high resolution
- `event_title`, `private_reason`, `peer_busy_until`, calendar source mechanics
- “Jordan has not connected Google Calendar” unless product intentionally surfaces connection state (currently not to peers)

**Private (ONLY YOU) may include:**

- Soft own-conflict copy
- “7:45 fits both calendars better” without naming peer events
- Flexibility confirmation reminder — no auto-move

Enforced by: `assert_disclosure_safe!/1`, title strip on ingest, `probe_response/2` oracle gate.

---

## DYAD FIT RESULT

**Test:** free after 6 vs free after 7:15 → **Thursday · 7:30 PM works for both of you.**

| Check | Result |
|-------|--------|
| Slot rounds up from 19:15 → 19:30 | **PASS** |
| Label contains 7:30 + both of you | **PASS** |
| Open-ended; no fabricated end | **PASS** |
| No therapy/work titles | **PASS** |
| `authorizes_set?` false | **PASS** |

---

## GROUP FIT RESULT

**Test:** 4 required + 1 optional late (Jess busy until 19:45)

| Check | Result |
|-------|--------|
| Strongest workable time for required | **PASS** |
| Optional late does not force private cause disclosure | **PASS** |
| No “jess” / “work meeting” in shared payload | **PASS** |

---

## DAYPART RESULT

| Check | Result |
|-------|--------|
| `evening`, `after work`, `weekend evening` resolve | **PASS** |
| `exact_time: false` until calendars support a slot | **PASS** |
| Progressive: daypart window → exact suggestion (7:30) | **PASS** |
| Unknown daypart rejected | **PASS** |

---

## FIXED EVENT RESULT

| Check | Result |
|-------|--------|
| Concert Sat 8 PM → `find_a_time: false` | **PASS** |
| Label is event truth, not “find a time” | **PASS** |
| Late joiner → partial_fit “joining later”; no private cause | **PASS** |

---

## OPEN-ENDED TIME RESULT

| Check | Result |
|-------|--------|
| `suggested_end` always nil when open_ended | **PASS** |
| Soft internal horizon 90 min exists internally only | **PASS** |
| Label does not fabricate `7:30–9:30` | **PASS** |

---

## FLEXIBILITY RESULT

| Check | Result |
|-------|--------|
| Busy + “I can move things” → needs_flexibility_confirm | **PASS** |
| `auto_moved_calendar: false` | **PASS** |
| `authorizes_calendar_write?` false | **PASS** |
| Private copy: will not move without confirmation | **PASS** |

---

## CALENDAR PRIVACY RESULT

| Check | Result |
|-------|--------|
| `assert_disclosure_safe!` raises on event_title / therapy label | **PASS** |
| Titles on busy blocks stripped before composition | **PASS** |
| Private guidance actor-scoped `only_you` | **PASS** |
| Peer private guidance not returned to stranger | **PASS** |
| Existing `Availability.assert_shared_safe!` still gates shares | **PASS** (regression suite) |

---

## ORACLE ATTACK RESULT

| Check | Result |
|-------|--------|
| Narrow probes never return `peer_busy_edges` | **PASS** |
| `allows_high_res_peer_busy: false` always | **PASS** |
| After 4+ probes → `oracle_refusal` | **PASS** |
| Response is shared consequence only | **PASS** |

**P1 remaining:** dual-client network payload soak over live sockets/API.

---

## TIMEZONE RESULT

| Check | Result |
|-------|--------|
| Wall-clock 19:00 Rome ≠ 19:00 LA as instants | **PASS** (documented offsets) |
| Composition evaluates UTC busy instants | **PASS** |
| Busy at LA event instant → conflict | **PASS** |

Note: full IANA zone database not required for UTC-instant path; wall-to-UTC for named zones falls back safely when DB is UTC-only.

---

## FIGMA NODES PULLED DIRECTLY

*This addendum pass did not re-pull Figma (domain-only). Prior founder repair pull:*

| Node | Surface | Tool (prior) |
|------|---------|----------------|
| `2:2` | HOME | `get_design_context` |
| `3:2` | CHAT | `get_design_context` |
| `3:11` / `3:21` / `3:29` | Filament / PRIVATE OPAL | via chat context |
| `4:2` | SHARED REALITY | `get_design_context` |
| `4:11` | CURATE | `get_design_context` |

File: `fy69K8cCug9prf5GLwQ7Hy`

**This pass:** calendar intelligence is **invisible** — no new calendar UI that collides with V2. Find-a-time remains socially lightweight when already present; no heatmap/week-grid added.

---

## FIGMA ASSETS USED

| Asset | Path | This pass |
|-------|------|-----------|
| Ambient field SVG | `apps/opal_web/public/figma-v2/ambient-home.svg` | Unchanged (prior) |
| Opal mark SVG | `apps/opal_web/public/figma-v2/opal-mark.svg` | Unchanged (prior) |

No new calendar icons hand-drawn. No Tailwind install for Figma dump.

---

## FIGMA HOME FIDELITY

| | |
|--|--|
| Target | Living field, Tonight is happening, one awakened decision, quiet dock (`2:2`) |
| Calendar noise | **None added** (law 18) |
| Fidelity | Structural (prior); not pixel-perfect |
| Status | **HOLD** — calendar does not regress Home |

---

## FIGMA CHAT FIDELITY

| | |
|--|--|
| Target | Human primary, filaments, PRIVATE OPAL violet (`3:2`) |
| Calendar | Shared consequence can surface as Opal signal copy only; private conflicts ONLY YOU |
| Status | Domain ready; UI wire of composition labels **P1** |

---

## FIGMA SHARED REALITY FIDELITY

| | |
|--|--|
| Target | Atmosphere, settled plate, WHO/WHAT/WHEN/WHERE (`4:2`) |
| WHEN | May show shared consequence time; never peer calendar causes |
| Status | Compatible; no calendar plate invented |

---

## FIGMA CURATE FIDELITY

| | |
|--|--|
| Target | I've got your evening; Looks good private (`4:11`) |
| Calendar | No collision |
| Status | Prior private Extend repair holds |

---

## P0 / P1 / P2

### P0 (must not ship broken)

| Item | Status |
|------|--------|
| Unauthorized peer event details in shared composition | **PASS** (unit) |
| Availability still never authorizes Set | **PASS** |
| Calendar write requires authorization | **PASS** (WriteAction + composition) |
| Open-ended end fabrication | **PASS** |

### P1 (next proof)

| Item | Status |
|------|--------|
| Wire composition labels into live Chat/SR presentation | OPEN |
| Dual-browser oracle + privacy network soak | OPEN |
| Live Google freebusy end-to-end with two real users | OPEN |
| Progressive daypart from conversation heuristic → composition | OPEN |
| Figma pixel fidelity (Home/Chat/SR/Curate) | OPEN (prior partial) |

### P2

| Item | Status |
|------|--------|
| Multi-calendar-per-person source settings UX | OPEN |
| Travel/timezone polish in labels | OPEN |
| Soft hold language only after real calendar write succeeds | Documented; write path exists |

---

## CODE DELIVERED THIS PASS

| File | Role |
|------|------|
| `lib/opal_core/social_flow/availability_composition.ex` | Private multi-person fit, daypart, fixed vs chosen, flexibility, oracle, disclosure |
| `lib/opal_core/social_flow/availability.ex` | `compose_calendar_fit/1`, `compose_fit_for_conversation/3` entry points |
| `test/.../availability_composition_test.exs` | 16 tests — dyad/group/daypart/fixed/flex/privacy/oracle/tz |
| This evidence doc | §42 return |

**Tests:** 16 composition + 26 availability regression = **42 passed, 0 failures**.

---

## HOLD

- **Do not merge** until founder reviews calendar law encoding + Figma presentation path.
- No calendar product UI introduced.
- Composition is private infrastructure; humans should feel synchronized, not scheduled.

**OPAL CAN KNOW WHEN PEOPLE ARE AVAILABLE WITHOUT TELLING PEOPLE WHY THEY ARE UNAVAILABLE.**
