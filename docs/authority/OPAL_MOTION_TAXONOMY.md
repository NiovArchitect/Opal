# Opal Motion Taxonomy

**Status:** CURRENT · **FROZEN** (P3 founder accepted 2026-09-05)  
**Freeze doc:** `docs/authority/FOUNDER_P3_ACCEPTED_2026-09-05.md`  
**Do not reopen without proven regression.**  
**Figma note:** `965:2` / `618:902` have **written** motion law but **no playable Figma keyframe tracks**. Runtime proves written timing — do not claim Figma animation parity.  
**Note:** Do not mechanically require 3700ms on every component — preserve the accepted emotional timing family.

## Emotional grammar (CURRENT)

| Tempo | Means |
|-------|--------|
| **Fast** | Immediate / live / needs you now (e.g. incoming call) |
| **Slow** | Intelligence / presence / emergence / understanding |
| **Still** | Settled |

> **Urgency can move quickly. Presence should move slowly.**

Goal feeling: **something quietly came into awareness** — not **something turned on**.

Living · Calm · Organic · Social · Human — **not** flash · alert · blink · button animation · gamified pulse.

## Taxonomy

| Kind | Purpose | Cadence | Semantic? |
|------|---------|---------|-----------|
| **BRAND_AMBIENT_MOTION** | Opal feels gently alive at rest | Continuous, **8–14s full cycle**, low amplitude | **NO** |
| **BEHAVIORAL_SIGNAL_MOTION** | Something meaningful changed | Event-driven, **ONE soft breath ~3.0–4.4s (default ~3.7s)** then REST | **YES** |
| **LIVE_COMMUNICATION_MOTION** | Something is actively occurring | Continues only while incoming/live; **may be fast** | **YES** |
| **INTERACTION_MICRO_MOTION** | Press / sheet / selection feedback | Short, subtle | No (not state) |
| **CONTENT_MEDIA_MOTION** | Video/media | Media-owned | Separate |

## Behavioral breath timing (CURRENT — supersedes &lt;1s orb rule)

Founder verification: **&lt;1 second feels mechanical**. Semantic law remains **one breath then stop**; the breath itself is slower.

| Phase | Duration |
|-------|----------|
| Fade / emerge | **1.2–1.6s** (preferred **~1.4s**) |
| Soft peak hold | **0.2–0.4s** (preferred **~0.3s**) |
| Release / settle | **1.6–2.4s** (preferred **~2.0s**, longer than emerge) |
| **Total** | **~3.0–4.4s** (preferred default **~3.7s**) |

Runtime CSS: `--opal-breath-ms: 3700ms` · keyframe marks ~38% emerge · ~46% peak end · 100% settle.

### Scale

`1.00 → 1.025–1.035 maximum → 1.00` — no dramatic zoom.

### Opacity (living resonance)

Restrained ranges such as `0.55 → 0.80/0.85 → settle` (or glow-equivalent). Prefer not 0→1 unless the component is newly entering. Preserve Brand V4 contrast at rest.

### Easing

Organic ease-in-out (`cubic-bezier(0.37, 0, 0.23, 1)`). **No** linear, bounce, spring, overshoot, or elastic. Release decelerates more gently than emergence.

### No hard reset

Animation must settle naturally into REST. No snap, opacity jump, or transform discontinuity at end (`animation-fill-mode: both` + end keyframe = resting visual).

## Ambient life (Global Opal neural field)

- Full cycle **~8–14s** (orbit default **12s**, particles **10–14s**, shimmer **~11s**)
- Tiny opacity / depth amplitude
- No behavioral hue shifts, no urgent pulse, no layout thrash
- Almost subconscious — no obvious begin/end attention spike

## Lifecycle (965:2 written law — tempo refined)

- Born → Reveal: **one** soft organic breath (~3.7s), not flash pulses
- Acknowledged: motion stops
- Call creates real Graph consequence: center Opal may breathe **once** in same semantic hue (**~3.7s**), then REST
- Never persistent “AI working” glow
- Level 3 time-sensitive: controlled pulse only while time-sensitive (**fast urgency allowed**)
- Level 4 incoming/live: repeating only while genuinely incoming/live (**fast urgency allowed**)

## Reduced motion

Ambient + behavioral animations **off**. Semantic color + plain language + layout remain.

## Proof bar

`MOTION_PRESENT` is insufficient. Required: **`MOTION_FEELS_ORGANIC`** observable as slow emergence → gentle peak → slow release → natural settlement.
