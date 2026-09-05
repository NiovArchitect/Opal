# P3.1 Global Opal Control Contract — 618:902

**Law:** No control without a user-understandable job. No unexplained dead controls.

| Control | Intent | Owner | Outcome | Status |
|---------|--------|-------|---------|--------|
| Settings | Open You / settings | You hub `618:1344` | Navigates to You | **REAL_ACTIVE** |
| History | Recent Opal conversations | Session sheet / future store | Inline sheet; persistent history = dependency | **REAL_ACTIVE** (session) / DEPENDENCY (persistent) |
| Context pods (6) | Inspect what Opal is using | Local Center + P4 recompose | Inline sheet; toggle keep/remove | **REAL_ACTIVE** (inspect) · **P4_REQUIRED** (intelligent recompose) |
| Intent starters (4) | Declare job for Opal | Seed → Graphs path | One-tap seed + note | **REAL_ACTIVE** · **P4_REQUIRED** (true DI answer) |
| Refine / Timing / Budget / Vibe | Mutate one dimension | Correction contract | Local mutate + honest P4 note | **P4_REQUIRED** (full recompose) |
| More ideas | Explicit exploration | Center | Opens multi-card explore mode | **REAL_ACTIVE** |
| Idea cards | Pick a suggestion | Seed → Graphs | Seeds title; human confirm required | **REAL_ACTIVE** |
| View more | Same as More ideas | Center | Explore mode | **REAL_ACTIVE** |
| Composer text + Enter | Message Opal | Seed path | Seeds query | **REAL_ACTIVE** |
| Attach + | Add context/media | System file picker | Honest dependency note | **DEPENDENCY** |
| Voice | Talk to Opal | ASR system | UI listening; ASR dependency | **DEPENDENCY** |
| Response orb | Identity / resonance | Motion | Decorative + &lt;1s resonance demo | **REAL_READ_ONLY** |

## Counts

| Status | Count |
|--------|-------|
| REAL_ACTIVE | 16+ |
| REAL_READ_ONLY | 1 |
| DEPENDENCY | 2 |
| P4_REQUIRED | 5 (correction ops + DI recompose) |
| DEAD_CONTROL | **0** |
| WRONG_OUTCOME | **0** |

## Decision Intelligence reconciliation

Default future P4 Center behavior: High → one answer · Medium → one question · Low → one tradeoff.  
Multi-card ranked carousel is **not** the final default — exploration via **More ideas**.
