# Accessibility — Social Flow

**Authority:** ARCHITECTURE (a11y requirements) + ACCEPTED PRODUCT TRUTH (inclusive experience)  
**Status:** Social Flow specialization of `ACCESSIBILITY_BASELINE.md`  
**Related:** `VISIBLE_SIGNAL_PRINCIPLES.md`, `SOCIAL_FLOW_VISIBLE_COMPONENTS.md`, `RELATIONSHIP_INTERACTION_PATTERNS.md`  
**Owner (this phase):** Inclusive Visuals / Accessibility

---

## Mandate

Social Flow must remain usable under:

- small phone screens and large dynamic type,
- VoiceOver / TalkBack,
- reduced attention and high cognitive load,
- motor constraints (one-handed use),
- color vision differences,
- age-diverse literacy (adult first slice; youth later under age authority).

Accessibility is **product quality**, not a compliance afterthought.  
Tone: **supportive without patronizing** — especially for ADHD-friendly and family contexts.

---

## Baseline inheritance

All of `ACCESSIBILITY_BASELINE.md` applies:

- Dynamic type / scalable text  
- WCAG AA contrast target  
- Screen reader labels  
- Meaning not by color alone  
- Hit targets ≥ 44pt  
- Reduce motion respected  
- Errors as text  

This document adds **Social Flow–specific** rules.

---

## Age-appropriate readability

| Audience | Readability rules |
|----------|-------------------|
| **Adults (first slice)** | Plain language; short signal lines; no engineering jargon |
| **Youth (later, gated)** | Shorter sentences; concrete verbs; avoid idioms that hide meaning; no “cute baby” patronizing UI for teens |
| **Guardians** | Clear ownership and consequence language (“private,” “shared with family,” “needs your approval”) |

### Copy length targets

| Element | Target |
|---------|--------|
| Primary signal line | ≤ ~90 characters when possible |
| Supporting line | ≤ ~120 characters |
| Primary actions | 1–3 words each (“Accept,” “Not a plan,” “Keep private”) |
| Expanded detail | Progressive; not required for first decision |

Reading level: aim for clear everyday English. Prefer “This still needs an answer” over “Pending bilateral participation acknowledgement.”

---

## Cognitive load

Social Flow fails if the user must hold the whole plan lifecycle in working memory.

### Rules

1. **One primary question per card** (“Is this a plan?” / “Does 6:30 work?” / “Keep this private reminder?”).  
2. **Progressive disclosure** — details behind expand, not on first paint.  
3. **Stable layout** — cards don’t jump when AI finishes thinking; reserve space or append calmly.  
4. **Visible state labels** — Shared / Private / Needs answer / Changed.  
5. **No simultaneous multi-banner stack** — relevance policy picks one primary (see visible signal).  
6. **Undo-friendly dismiss** — “Not a plan” is safe; advanced “never help here” is one confirm, not three.  
7. **Offline clarity** — “Plan changed while you were offline” explains *what*, not a blank sync spinner forever.

### Cognitive anti-patterns

- Nested modals for simple RSVP  
- Multi-step wizards for “turn into a plan” when one consent sheet suffices  
- Dense tables of free/busy for two people  
- Gamified streaks that add shame load  

---

## ADHD-supportive design (without patronizing)

Opal’s flexible / soft-structure scenarios (scenario S6) and real life need:

| Support | Implementation intent |
|---------|------------------------|
| Soft structure | Prefer gentle nudges and easy reschedule over hard guilt blocks |
| Externalized memory | Commitments and deadlines as **visible objects**, not only chat scroll archaeology |
| Low friction resume | Offline reconcile and “needs answer” badges restore context quickly |
| Reduced noise | Relevance policy prevents alert fatigue that destroys trust |
| Clear next action | One obvious button; secondary actions text-linked |
| No shame UX | Never “You failed your streak” or reliability grades |

**Do not** market Social Flow as an ADHD medical product.  
**Do** design coordination that works for distracted, overloaded humans — which is most humans.

Copy tone: peer and calm. Not: “Let’s focus, buddy!” Not: clinical treatment language.

---

## Screen reader and assistive tech

### Announcement rules

| UI object | Announcement intent |
|-----------|---------------------|
| Soft proposal card | “Suggestion from Opal, not a message from {contact}. Dinner next week? …” |
| Shared plan card | “Shared plan. Dinner Saturday 7 PM. You and Maya accepted.” |
| Private card | “Private. Only you can see this. Gift reminder …” |
| Needs answer | “Action needed. This still needs an answer.” |
| Plan changed | “Plan updated while you were offline. Time changed from 7 to 7:30.” |
| Availability line | “Suggestion. You both appear free after 6:30.” |

### Critical distinctions

1. **Opal suggestions ≠ contact messages** — always.  
2. **Private ≠ shared** — announced, not only color.  
3. **Uncertainty preserved** — do not “correct” “appear free” to “are free” in accessibility strings.  
4. **Consent controls** fully focusable and labeled with scope (“Allow for this plan”).  
5. **Dismiss controls** discoverable (“Not a plan,” “Dismiss private reminder”).

### Focus order (in-thread card)

1. Card title / summary  
2. Primary action  
3. Secondary actions  
4. Dismiss / not a plan  
5. Expand details (if present)

Composer remains reachable; AI cards must not trap focus.

---

## Contrast, color, and non-color meaning

| Requirement | Spec |
|-------------|------|
| Contrast | WCAG AA for text and essential icons on light/dark themes |
| Private badge | Icon + “Private” text; sufficient contrast against card surface |
| Shared badge | Icon + “Shared” text |
| Needs answer | Icon + text; avoid red-only panic for routine RSVP |
| Changed | Icon + “Changed” |
| Participation | Text states; optional icons; color only as enhancement |
| Charts (if any later) | Not primary; if used, patterns/labels required |

Dark mode: private/shared badges re-checked for contrast — badges often fail first.

---

## Mobile interaction

| Concern | Requirement |
|---------|-------------|
| Hit targets | ≥ 44×44 pt for Accept / Decline / Not a plan / Keep private |
| Thumb zone | Primary actions in lower half of card when cards sit above composer |
| Gestures | Swipe-to-dismiss optional; always provide visible dismiss control |
| One-handed | No critical action only in top corners |
| Keyboard (tablet/desktop support) | Focus rings; Enter activates primary; Escape dismisses sheet where platform-appropriate |
| Haptics | Optional light success; never required to understand state |
| Motion | Respect reduce-motion; no essential info only in animation |
| Offline | Queue user actions; announce sync failures as text |

Device class (phone vs tablet) may change layout density; **hit targets and labels do not relax**.

---

## Family and youth (gated)

When youth UI exists under legal/product gates:

| Rule | Intent |
|------|--------|
| Larger default type option | Easier scanning for younger readers without forcing childish chrome |
| Explicit private/shared education | Short plain labels, not legal essays |
| Guardian approval actions | Large, clear, high-contrast; consequence stated |
| No dark-pattern consent | No pre-checked “share with parent forever” |
| Peer plan requests | Readable path: ask → pending → approved/denied |

Until youth ships, adult a11y remains the implementation bar for Social Flow slice 1.

---

## Testing requirements (Social Flow)

| Test | Scope |
|------|-------|
| VoiceOver smoke | Proposal card, shared plan, private reminder, consent sheet, needs-answer |
| TalkBack smoke | Same |
| Dynamic type XL | Cards remain usable; no clipped primary actions |
| Contrast audit | Private/shared badges, needs-answer, changed chips |
| Reduce motion | Offline banner and card entrance still comprehensible |
| Cognitive walkthrough | Partner trip + private gift; family pickup change (design review) |
| Motor | One-handed RSVP on phone frame |

Status semantics for automation: use `SOCIAL_FLOW_1_ACCEPTANCE_MATRIX.md` (`PASS` / `FAIL` / `NOT_RUN` / …).

---

## Explicit non-goals

- Shipping a separate “accessibility mode” that hides Social Flow value  
- Patronizing ADHD or youth copy  
- Relying on color-only privacy meaning  
- Blocking message send while screen reader focuses a suggestion  

---

## Summary lock

| Statement | Label |
|-----------|--------|
| Social Flow a11y specializes baseline for plan cards and privacy chrome | **ARCHITECTURE** |
| Age-appropriate readability; cognitive load control | **ACCEPTED PRODUCT TRUTH** |
| ADHD-supportive without patronizing or medical claims | **ACCEPTED PRODUCT TRUTH** |
| Screen reader distinguishes Opal vs contact; private vs shared | **ARCHITECTURE** |
| Contrast + mobile hit targets non-negotiable | **ARCHITECTURE** |
