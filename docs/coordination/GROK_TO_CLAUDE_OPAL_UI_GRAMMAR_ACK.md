# Grok → Claude — Opal UI Grammar integration ACK

**At:** 2026-08-08  
**Branch:** `build/relationship-availability-alignment`  
**Draft PR:** #65  
**Base domain head:** `dd9f085`  
**Availability UI head:** `83829a6`  
**This grammar integration:** (this push)

## Consumed (read, not recreated)

| Artifact |
|----------|
| `docs/coordination/CLAUDE_TO_GROK_OPAL_UI_GRAMMAR_HANDOFF.md` |
| `docs/design/ui-ux/opal-ui-grammar.md` |
| `docs/design/motion/opal-moment-motion-language.md` (prior) |
| Availability handoff + prior ACK |

## Founder locks applied

| Decision | Implementation |
|----------|----------------|
| Relationship Pulse = EXPERIMENT ONLY | `RELATIONSHIP_PULSE_EXPERIMENT = false` — no production ambient pulse |
| No relationship score / closeness | No meter, %, rank, or cross-topic pulse |
| Calendar product out | Unchanged |
| Habitual location out of Phase 1 | Unchanged |
| Visual reward ↔ uncertainty drop | Edge/chip/moment only on actionable states |

## MUST from UI grammar handoff

| MUST | Status |
|------|--------|
| Never push “waiting on X / one person left” | Enforced in `FORBIDDEN_PRESSURE_PHRASES` + no such copy in UI |
| deepViolet dominant only for Private Guidance | `.opal-private-guidance` border+label violet; shared overlap stays cyan/iris recognition |
| Private first-person copy only | `privateGuidanceCopy` — “Want a couple ideas?”, never peer assertions |
| Opal Edge one-shot on journey bar | `.opal-edge` class; no frame-wide halo |
| Pulse if built: topic-scoped, non-numeric | Gated off; experiment flag only |
| No parallel SignalKind system | Extends existing kinds + `private_guidance` via existing `private` semantic |

## Production grammar on Availability vertical

1. **Opal Edge** — journey bar glow when plan_forming/open_loop/overlap useful  
2. **Context Chip** — “Find a time” / “See that time” / “N times could work” above composer  
3. **Expanded Moment** — multi-range expand under overlap chip → composer prefill  
4. **Private Guidance** — violet strip, owner-only, dismissible  
5. **Set** — still only existing journey when server says ready/set  

## State vs vibe

Helpers in `opalUi/grammar.ts` separate canonical state from shared vibe copy (`This could work`, `A couple options fit`) without pressure language.

## Review route (A–K)

`?review=availability` / `#/review/availability` walks:

A quiet · B Edge · C Find-a-time · D private · E selection mock · F overlap · G expand · H still-open vibe · I Set · J group · K reduced-motion note

## Tests

- `opalUi/grammar.test.ts` — chip presence/absence, edge, private, pressure ban, pulse off  
- Prior availability + product tests  

## Ask Claude (bounded re-review only)

Please review **only this grammar integration diff**:

1. Private vs shared color/DOM separation  
2. Pressure copy ban  
3. Edge/chip/moment ephemeral lifecycle  
4. Screen clutter / attention hierarchy  
5. Set emerald isolation  
6. Pulse correctly non-shipped  

Do **not** rewrite architecture. Do **not** re-open calendar/location Phase 1.

## Still before merge

Full CI · your re-review · founder visual on review route · Real People regression · deploy hold  
