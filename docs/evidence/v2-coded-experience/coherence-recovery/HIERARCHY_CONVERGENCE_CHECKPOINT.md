# Hierarchy / lifecycle convergence — checkpoint

**Status:** HOLD for founder validation  
**MERGE:** NO  
**LIVE:** NO  
**A8_FROZEN_GREEN:** held (physical walk found hierarchy/lifecycle defects)

**Base HEAD (tracked):** `fc1572aa65655643d2e29b993d6acbc8836d11e7`  
**Branch:** `build/v2-coded-experience-closure`  
**Dirty:** hierarchy pass edits + pre-existing Track B `call*` untracked

## Founder walk

- **URL:** `http://192.168.86.156:5173/?opal_native_host=1`
- **Identity:** Walk B · `+12025550102` · OTP `222222`
- **Proof path:** Login → Home → Chats → Walk A thread → Graphs (All/Action/Ready/**Past**) → Bell/Attention → You  
- Center Opal optional

### Must prove

1. **Home** — social-first (Stories/people/social stream lead; **Earlier together** = Past Shared Reality, not Durable/Published Memory; CHOOSE does not open as itinerary dashboard)
2. **Dock** — pill materially lower toward safe area; orb may protrude; content runway recovered
3. **Chats** — labels are composition-only (`Direct` / `Group · N`); no invented Following/Connection
4. **Thread (Walk A)** — compact past Reality for Fort Oak (EARLIER TOGETHER); not Next Together; no future execution CTA
5. **Thread (Deep Smoke Friends)** — Shared Graph shows committed WHEN; pending labeled as proposed (one Reality)
6. **Graphs** — All · Action · Ready · **Past**; Fort Oak Sep 29 under Past (neutral historical)
7. **Bell** — calm; time→past alone does **not** create “became a Memory”; proposals still deep-link when present
8. **Reality** — Fort Oak remains as Past Shared Reality / relationship history; attendance unverified unless evidence says otherwise

## Implementation (minimal compound)

| # | Change | Owner |
|---|--------|-------|
| 1 | `--opal-dock-lift` 8px → **2px**; content-gap 10→8 | `styles.css` native host tokens |
| 2 | Home rhythm: presence → continuity → awaken; past as **Earlier together** (Past Shared Reality) | `OpalApp` living field · `HomePlanContinuity` · `HomeProjection` |
| 3 | Graphs lens **Past** + neutral pill/status; `planSurfaceState` → past | `GraphsHome` · CSS · liveGraphs map |
| 4 | Thread past strip via `pastPlanKicker`; Shared Graph pending labeled | `OpalApp` header + sharedGraphLine |
| 5 | Attention: ingest pending proposals; **no** time→Memory spam; clear `plan_update:memory:` residue | `Inbox.fanout_plan` · `AttentionCenter` |
| 6 | Chats `defaultRelLabel` → Direct / Group · N | `ChatsHome` |
| 7 | Opal center preserved; create + paths retained (audit only) | docs |
| 8 | Past Shared Reality ladder + occurrence_state + law zeros | `PlanStateArbitration` · `PAST_SHARED_REALITY_CHECKPOINT.md` |
| 9 | Blind-spot report below | this file |

## Automated verification (this pass + lifecycle reconcile)

- `vitest` iphoneLayoutSystem + nextPlan + chatsHome + authorityRejectedStates — GREEN (**56**)
- `mix test` PSA + AttentionCenter — GREEN (**41 / 0**)
- Live Fort Oak: `past_shared_reality=true`, `occurrence_state=past_unverified`, Home kicker `Earlier together`, `memory_label=false`
- Walk B Attention after refresh: **needs/waiting/updated = 0/0/0** (no “became a Memory”)
- Phoenix `:4000` / Vite `:5173` / LAN `192.168.86.156:5173` — up

## Blind spots / residual risks

| Area | Finding | Status |
|------|---------|--------|
| Stale Graph after scheduled time | Past lens + surface state past | Fixed in UI; confirm Fort Oak DB `temporal_state`/start_at on walk |
| Graph/thread sync | Past strip restored; Shared Graph uses planProjection | Fixed |
| Proposed vs confirmed WHEN | Shared Graph appends `· {value} proposed` | Fixed presentation; Accept/Keep ownership unchanged |
| Notification propagation | Was resolve-only; now ingest on fanout + feed refresh | Fixed path; empty bell if no pending/past in window |
| Relationship-label authority | Chats + GraphSocialHome fallbacks demoted | Seed chrome may still say Connection in founder seeds when seed mode on |
| Group ≠ Journey | Untouched | Hold |
| Interested ≠ Going | Untouched | Hold |
| Dock across heights | Token change global native host | Founder physical heights still authority |
| Home ranking | Social feed owner unchanged; continuation reordered | If social feed empty, Memory/CHOOSE still visible but after presence |
| Empty states | Attention empty copy retained | OK |
| Activity deep links | Existing Attention deep_link path | Reuse |
| Memory transition | Time→past must **not** bell “became a Memory”; Past Shared Reality feeds MemoryCandidate only | Reconciled 2026-10-02; see `PAST_SHARED_REALITY_CHECKPOINT.md` |
| Duplicate create affordances | Documented; not removed | Audit only |
| Demo/placeholder leak | No new fake social cards | Seed Connection labels residual if seed on |
| Parallel domain owner | None introduced | OK |

## Ontology violations still visible if seed mode on

- `founderGraphSeed` relationshipLabel strings still include `Connection ·` / `Following ·` for design chrome. Authenticated product path uses composition-honest labels. Do not treat seed chrome as relationship truth.

## Non-goals honored

- No dock slot redesign  
- No fake SocialFeedBrain  
- No Track B WebRTC work in this pass  
- No Journey feature build  
- No merge / live  
- No polish pass into a beautiful planner
