# Opal Continuity Doctrine

**Status:** CURRENT PRODUCT DOCTRINE (behavioral)  
**Synced:** POST-B7 founder correction · 2026-09-01  
**Does not promote:** Figma proposals `928:3` / `965:2` / `975:2` to production screens

```yaml
authority_class: PRODUCT_DOCTRINE
figma_universe: "618:2"
proposals_remain_founder_review:
  - "928:3"  # Calls / Communication Continuity
  - "965:2"  # Signal Grammar
  - "975:2"  # Decision Intelligence / Curate-for-me
```

## Two complementary superpowers

| Superpower | Question | Primary surface |
|------------|----------|-----------------|
| **Communication continuity** | “Where did we leave off?” | Calls / Chats / relationship context |
| **Decision continuity** | “What should happen next?” | Global Opal behavior (not a Curate tab) |

The strongest Opal loop:

```
call → consequence → decision → Graph → Journey → Memory
  → better next call / better next decision
```

Protect this loop above feature count.

## Communication continuity (Calls)

Traditional call logs answer WHO / WHEN / HOW LONG.  
Opal should answer:

1. Who did I actually speak with or miss?  
2. Where did we leave off?  
3. Did anything meaningful change?  
4. What is the smallest next move?

**ONE signal slot** per relationship row. Zero is valid. Never fill for AI vanity.

Eligible: Ready · Graph updated · Call back · Reservation confirmed · Needs your answer  
Not eligible by default: AI summary, sentiment, scores, streaks, “Opal listened.”

Provider machine calls ≠ user call-log events. Surface outcomes on Graph/Journey.

## Decision continuity (Curation is a behavior)

Do **not** build a giant Curate feature or nav tab.

Users should eventually say “you decide” wherever intent already lives — Center Opal, Direct/Group Plan, call consequence, Graph gaps, Journey rescue — and Opal removes decision work.

Known context deletes questions.  
High confidence → one best fit.  
Medium → one material question.  
Low → smallest useful tradeoff.

Private ≠ social. Hard constraints never sacrificed for soft averages. Solo is first-class (`902:2` additive direction).

Detailed contracts: `OPAL_DECISION_INTELLIGENCE.md` (FOUNDER_REVIEW proposal) · `STATE_COMPLETENESS_LAW.md` · `OPAL_AI_REWARD_ARCHITECTURE.md`.

## Reward

Dopamine = **relief and consequence**, not stimulation.  
No points, streaks, trophies, confetti, fake urgency.

## Doctrine lines

> A traditional call log remembers that you spoke.  
> Opal remembers where the relationship left off — only when that changes what should happen next.

> A traditional planner asks the user to construct the answer.  
> Opal uses legitimately earned context to remove unnecessary decisions.

> “I don't have to reconstruct my life after I communicate.”  
> “I don't have to solve every decision from zero.”
