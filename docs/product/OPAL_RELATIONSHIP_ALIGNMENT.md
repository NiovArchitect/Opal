# Opal — Relationship Availability Alignment

**Status:** Phase 1 product truth (canonical) — **additive capability**  
**Author:** Grok (lead)  
**Date:** 2026-08-08  
**Base:** `origin/main` after PR #61 merge  

## Scope rule (non-negotiable)

**This is an addition to Opal. It is not a makeover, pivot, or replacement.**

Preserve standing product truths:

- People → Conversation → Shared meaning → Experience → Opal assistance  
- Speed to authentic alignment  
- Human conversation central; Opal moments distinct  
- Real People network foundation  
- Full / Controlled Technicolor systems  
- Relationship intelligence broader than planning  
- Set authority is singular (`AlignmentAuthority`)  
- AVP² payments only; Device Capability future action layer; Kafka after decisions  

Availability does **not** redesign Home / Chats / Plans / You, replace conversation-driven alignment, or turn Opal into a calendar or dating app.

### Think

> Opal can now also help us find when.

Not: Opal is a scheduling application.

## One-line promise

> Help people who genuinely want to spend time together find a time—without exposing their lives.

## Availability is one more signal

Existing alignment evidence already includes conversation intent, participation, preferences, relationship context, time language, location, experience interests, private constraints.

**Availability adds:** when someone is genuinely willing and able to participate.

Conceptually:

```text
conversation + relationship understanding + availability
+ preferences + location + real-world opportunities
= faster alignment
```

It is **not** the center of the product.

## Conversation still leads

Do not force users into calendar-manager mode.

Human: “We need to actually see each other this week.”  
Opal may recognize **Becoming a plan**, then offer **Find a time** only when useful.

Most conversations stay ordinary. Opal stays quiet when no coordination need exists.

## Why this exists

Two people want to see each other. Lives are busy. Schedules move. Repeated “When are you free?” creates friction even when interest is real.

Opal reduces that friction by:

1. Letting each person keep a **private** sense of when they could meet.
2. Letting them **intentionally share** only selected windows for a relationship.
3. Computing a **shared-safe overlap**.
4. Letting that overlap feed the **existing** journey: Becoming a plan → Still open → **Set**.

## Not a dating app; not a calendar app

Initial scenarios may be courtship/dating. The domain is **relationship alignment** for:

friends · partners · spouses · family · church · study · travel · collaborators · small groups

Relationship context is additive interpretation—not forked products.

## Phase 1 (manual only)

| In | Out |
|----|-----|
| Two verified users | Google/Apple calendar |
| Manual private windows | Habitual location learning |
| Intentional share into a conversation | Full local discovery engine |
| Deterministic overlap in Elixir | Production Kafka |
| Shared-safe peer projection | Twilio / real-SMS enablement |
| Contextual **Find a time** in conversation | New Availability tab / shell redesign |
| Reuse existing Set authority for agreement | Parallel AvailabilitySet / CalendarSet |

### Shared-safe example

Private A: Thursday after 6 · Friday after 7 · Sunday afternoon  
Private B: Thursday after 6:30 · Saturday afternoon · Sunday after 4  
After both share selected windows, Opal may say:

> You both have Thursday evening and Sunday after 4 open.

No event titles, reasons, or unshared windows.

## Privacy rules (standing)

- Private by default.
- Share is intentional and scoped to a conversation/relationship.
- Peer sees only shared-safe ranges (and soft display labels).
- Forbidden by default: event titles, unavailability reasons, work/doctor/church/date details, home/work addresses, habitual or precise location.

## Clean wingman (courtship contexts)

Good: “You both have Thursday evening open. Want a couple ideas?”  
Bad: “She is free Thursday anyway.” · “She usually spends Thursdays near Carlsbad.”

Support the relationship. Do not judge it.

## Product entry (simple language)

- Find a time  
- Share when you're free  
- When could work for you?  
- Share these times  
- Two times work for both of you  

## Network invitation (future shape)

> Sadeil wants to find a time that works for both of you. Share a couple times that work.

Phase 1 does not build a viral growth system; domain must allow this invite context later.

## Related

- Architecture: `docs/architecture/AVAILABILITY_ALIGNMENT_ENGINE.md`
- Location privacy interface: `docs/architecture/LOCATION_PRIVACY_AND_FAMILIARITY.md`
- Social Flow product truth (availability grants lineage): `OPAL_SOCIAL_FLOW_PRODUCT_TRUTH.md`
- Set authority: Real People vertical / `AlignmentAuthority`
