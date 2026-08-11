# Shared Reality Closure + 4D UI Journey Audit

**Status:** Surgical translation layer — **no redesign**, no new authority.  
**Branch:** `build/shared-reality-closure-ui`  
**Law:** Opal does not celebrate alignment prematurely. Collapse consequential gaps until social reality is usable.  
**UI law:** Every asset must **Reveal · Resolve · Execute · Recall**.

---

## 1. Repository map (existing machinery — do not duplicate)

| Dimension | Existing capability | Role |
|-----------|---------------------|------|
| **People** | `ConversationMember`, `PlanParticipant`, `AlignmentAuthority.current_member_ids/1`, `PrivateParticipation` | Who may affirm Set; membership-scoped |
| **Social context** | `DynamicIntelligence.SocialContext` (`shared_facts`, `context_type`), relationship memory, family contexts | Affects fit/privacy — **not** visible badges |
| **Time** | `SharedPlan.start_at/time_label`, `ProductSignals` day/time extract, shell `when_label`, calendar commitments (elsewhere) | When window / exact time |
| **Place / World** | `SharedPlan.location`, `CollectiveFit`, synthetic/real venues, `LiveExperience` venue change | Where + capacity + handoff |
| **Participation / capacity** | `GroupSharedPlan`, group agreement rules, family pickup | Add/remove without full restart when truth holds |
| **Physical feasibility** | Collective fit, travel/hard filters in DSI | Private ranking; surface only 1–2 choices |
| **Execution** | Execution/live experience, follow-through, provider handoffs | Execute only with real confirmation |
| **Readiness / gaps** | Meaning `still_open`, experience readiness items, coordination residue | What still needs a human |
| **Set authority** | **`AlignmentAuthority` only** | Protected — UI must not redefine |
| **Surface projection** | `ProductShell` Needs You / Coming Up, `ProductSignals` | Shell inventory → now human presentation |
| **Quiet / smallest** | Ambient quiet law, 0–3 output (Alignment Loop OS) | Show less, know more |

**Intentionally not created:** `SharedRealityAuthority`, `PlanCompletenessEngine2`, `SocialContractEngine2`, new calendar, new feed, new status taxonomy.

**Thin addition:** `SharedRealityPresentation` — evidence → headline/gaps/sufficiency/ui_job. Presentation only.

---

## 2. What Set means vs what humans need

| Layer | Meaning |
|-------|---------|
| **Internal `lifecycle_stage: set`** | AlignmentAuthority: ≥2 members affirmed active proposal; plan evidence; no cancel/block/private invalidation |
| **Usable Shared Reality** | Enough of WHAT + WHEN (+ WHERE when place matters) that a human no longer has consequential open questions |
| **UI label** | Composed reality: `Dinner · Thursday · Harbor Table` — **not** the word `Set` |

Set can be true while place is still open (dinner). UI must show **remaining gap** (`· place still open`) rather than celebrating with a hollow badge.

---

## 3. Progression (internal; UI becomes more concrete)

```text
intent → convergence → sufficiently resolved reality → execution → recall
```

| Stage | Plans weight | Home |
|-------|--------------|------|
| Weak intention (“coffee sometime”) | **Not** on Plans | Conversation only |
| Converging (Tuesday + coffee, place open) | “Coming together” | Needs you if one decision |
| Usable Set (time + place + people) | “Shared” | Coming up |
| Execute window | Directions / reserve when real | Execute asset |
| After | History / shared moment | Recall |

---

## 4. Founder journey mapping

### Maya (1:1 coffee)

| Step | Backend | UI job |
|------|---------|--------|
| Open relationship | Conversation + peers | Reveal peer |
| Coffee plan forming | ProductSignals plan_forming + presentation | Reveal / Resolve |
| Exact time/place if known | extract when/where → headline | Reveal |
| Jump to how it came together | Open conversation thread | Recall causal |
| Historical | handled / completed plan (existing shell states) | Recall |

### Jordan (dinner)

| Step | Backend | UI job |
|------|---------|--------|
| Upcoming dinner | still_open / set + Thursday extract | Reveal |
| Location/time | gaps include `where` until place in evidence | Resolve one choice |
| Travel when simulated | LiveExperience / ETA (existing; not new) | Execute when due |

### Friends (group dinner + Olivia)

| Step | Backend | UI job |
|------|---------|--------|
| Participant set | GroupSharedPlan / members | Reveal |
| Saturday dinner | presentation + place fit | Reveal / Resolve |
| Add Olivia | **Do not restart** — recompute capacity/booking/context only (existing recovery principle; wire when invite path touches plans) | Resolve only affected dims |

---

## 5. Surgical repairs shipped

1. **`SharedRealityPresentation`** — WHAT/WHEN/WHERE, gaps, sufficiency, ui_job, headline  
2. **`ProductSignals`** — human `label` from presentation; authority remains `lifecycle_stage` + AlignmentAuthority  
3. **`AlignmentState.public_label`** — no “Set” / “Still open” as primary human copy  
4. **Web `sharedReality.ts`** — surfaceLabel, Plans durability filter, one-signal-per-conversation, human time  
5. **`OpalApp`** — Needs you = consequential only; Plans = Shared / Coming together; cards open conversation; Coming up from live set/usable  
6. **Demo `data.ts`** — human shared-reality labels for unauthenticated preview  
7. **Tests** — authority asserts `lifecycle_stage`; presentation tests for Maya/friends gaps  

---

## 6. Remaining (not this PR — compose later, do not invent engines)

- Wire SharedPlan rows into ProductShell Coming Up when plans exist in DB (prefer plan contract over message extract).  
- Participant-add journey end-to-end in product shell (group recovery already in domain).  
- Temporal “Leave in 16 min” — LiveExperience + device; only when execution-ready.  
- Social context private features for travel tolerance (date vs acquaintance) — DSI SocialContext already holds shape.  

---

## 7. Success bar (founder click-through)

Unprimed human should read:

- “Dinner with Jordan · Thursday · after 6:30” (and if place open: need a place)  
- “Coffee with Maya · Tuesday · 10:30 · Communal” when evidence supports it  
- “Saturday dinner · Harbor Table · after 7”  

Not:

- “What does Set mean?”  
- “Why is this not clickable?”  
- Eight equal task cards for one relationship  

---

## 8. Final law (locked)

> **Opal’s job is not merely to identify possibility.  
> It is to keep collapsing consequential gaps until people have a usable Shared Reality.  
> The UI must make that reality obvious.**  
>  
> **Person × Relationship × Time × World** — every asset is a projection or action on that matrix.  
> **Reveal · Resolve · Execute · Recall** — if none, it does not belong.

---

## 9. Canon append — delegated curation + Extend + authorship (2026-08-10)

**Full product laws (grep anchors):**  
[`docs/product/SHARED_REALITY_CURATION_AND_PRESENTATION_LAWS.md`](../../product/SHARED_REALITY_CURATION_AND_PRESENTATION_LAWS.md)

| Law | One-liner |
|-----|-----------|
| Three paths | Known intent · known vibe · **explicit** delegated curation |
| Delegation | Authority only when humans hand it; never auto-take control |
| Curate | One coherent experience, compressed — not a recommendation feed |
| Vibe | Experience intent survives selection; logistics alone ≠ quality |
| Extend | Explicit continuation mid-experience; may return nothing |
| Language | Reality speaks; do not lead with Set/Open/Needs you |
| Chronology | Opal actions timestamped in conversation history |
| Visual | Humans occupy space; Opal changes the space |
| Authorship | Decision ≠ social authorship ≠ payment; never falsify chooser |
| Time/place | Event IANA TZ + UTC; travel ≠ mutate event time; no ISO in UI |

**PR #112:** presentation/legibility only. **Do not** implement full Curate/Extend in #112.