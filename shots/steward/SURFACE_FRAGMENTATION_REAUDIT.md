# Surface Fragmentation Re-Audit

**Status:** HOLD-PERIOD — system validation (not intelligence)  
**Date:** 2026-10-13  
**Tip base:** `8fb3d8ef`  
**Mode:** Code + Pass 1 evidence re-audit (no Pass 2; no Person Graph)  
**Unit proof this pass:** vitest prefer-real / attention / empty — **43/43 PASS**  
**Prior browser proof:** `shots/steward/seed_off_prefer_real/VERIFY.json` — Graphs/Chats seed-off **PASS**

```yaml
authority_class: SURFACE_FRAGMENTATION_REAUDIT
pass_1: CLOSED
pass_2: LOCKED
purpose: prove_reality_representation_before_intelligence
```

## Why this audit

Pass 1 closed the hardest failure class: **multiple truths competing for attention**.

While production API is **503 payment-suspended**, the highest-value hold-safe engineering work is proving existing intelligence is **represented correctly** — not adding new intelligence.

Governing sequence remains:

```text
Reality → Authority → Consistency → Production readiness → Intelligence
```

---

## Verdict summary

| Surface | Grade | One-liner |
|---------|-------|-----------|
| **Home** | **GREEN after 1H** | Stories seed fallback closed; feed prefer-real held |
| **Chats** | **GREEN** | Prefer-real list/open holds; VERIFY seed-off PASS |
| **Graphs** | **GREEN after 1H** | Person temporal gated; Full Live seed default closed |
| **Attention** | **GREEN after 1I** | Seen≠resolved held; empty copy unified to PRODUCT_COPY |
| **Center Opal** | **YELLOW** | Chat move-forward GREEN; sample day + dual ask pipes remain |
| **Settings** | **GREEN** | Pass 1C honesty held; nearby-range still HONEST_GATE |

**Remediation:** Pass 1H (`PASS1H_PREFER_REAL_REMEDIATION.md`) + Pass 1I (`PASS1I_ATTENTION_COPY_AUTHORITY.md`).  
**No Pass 2 unlock.** Residual YELLOW: Center sample day / dual ask pipes; Home awaken vs Attention dual projection watch.

---

## Failure-class findings

| Class | Status | Where |
|-------|--------|-------|
| Stale / historical-as-current chrome | **CLOSED 1H** | `personNodeTemporal` gated on founder seed |
| Seed leakage (Stories) | **CLOSED 1H** | `resolveHomeStories` → `[]` when seed off |
| Seed leakage (Full Live) | **CLOSED 1H** | Seed-off gate + `full-live-empty` honest state |
| Seed leakage (Chats/Graphs list) | **GREEN closed** | `composeChatsList` / `composeGraphsList` / VERIFY |
| Seen ≠ resolved | **GREEN closed** | Attention Center + OpalApp badge from `actionable_count` |
| UI implies gated control | **GREEN closed** | Settings `settingsWireClass` + blockedReason |
| Competing empty copy | **CLOSED 1I** | PRODUCT_COPY + Attention Center + ActivityDestination aligned |
| Dual “needs you” projections | **YELLOW** | Home awaken (`attentionAuthority`) vs server Attention Center |
| Actions without durable authority | **YELLOW** | Local `createdPlanSurfaces` overlays; Attention no-link honest fallback |

---

# Surface contracts

## Home — Does Home represent my current world?

### GREEN (stayed closed)

- `composeHomeFeed` modes: `FOUNDER_FIXTURE` / `PRODUCTION_HYDRATION` / `EMPTY` — `homeHydration.ts`
- Seed-off production never paints `FOUNDER_HOME_FEED` into feed cards
- `resolveFounderSeedGate` → `production_default` — `founderGraphSeed.ts` + tests
- Invitation empty: `PRODUCT_COPY.emptyHomeTitle` / body — Pass 1F

### RED — fix under coherence (hold-safe)

1. **Stories rail seed fallback**  
   `resolveHomeStories` (`socialAuthority.ts`) returns `FOUNDER_STORIES` whenever production stories are empty — including EMPTY / PRODUCTION_HYDRATION.  
   **Required zero:** `HOME_STORIES_SEED_WHEN_SEED_OFF = 0`  
   **Fix direction:** return `[]` when founder seed off; only use `FOUNDER_STORIES` when seed on.

2. **Person temporal seed chrome**  
   `GraphSocialHome` calls `personNodeTemporal(card.person)` with **no** seed gate — Chanelle/Maya/… names get fixture upcoming/open-loop lines on production cards.  
   **Required zero:** `PERSON_TEMPORAL_SEED_ON_PRODUCTION_CARD = 0`  
   **Fix direction:** gate on `isFounderSeedEnabled()` or replace with live person/plan API only.

### YELLOW watch

- Authenticated EMPTY feed can still show presence / awaken / continuity strips (real signals vs “empty world” storytelling).
- `lookupHomeFeedCard` still searches fixture pools after production memories (detail path residual).

---

## Chats — Does this represent my actual relationships and conversations?

### GREEN (stayed closed)

- `composeChatsList` / `filterLiveChatsForProduct` — seed-off drops `seed-chat-*` and seed-fixture peers
- Unread from server `unread_count`
- `openChat` seed thread paint gated by `isFounderSeedEnabled()`
- Plan open blocks unknown `seed-*` with honest gate note
- Empty: `PRODUCT_COPY.emptyChats` / invite
- Browser: `CHATS_NO_SEED_ROW_IDS` PASS

### YELLOW watch

- Calls continuity seed merge is seed-on only (correct) — keep gate discipline
- Seed-on remapped UUID + fixture thread body is intentional lab theater

### RED

None new on seed-off Chats list/body path.

---

## Graphs — Does this represent shared reality?

### GREEN (stayed closed)

- `composeGraphsList` — seed-off live + created overlays only; never authority seed cards
- Lenses All / Action / Ready / **Past** (`status === "past"`)
- Pending vs forming signal lines from plan projection
- Empty invitation + lens empties — Pass 1F
- Browser: `GRAPHS_NO_SEED_CARDS` / `PRODUCTION_HYDRATION` PASS

### RED — fix under coherence

1. **Same `personNodeTemporal` ungated** in `GraphsHome.tsx` — Past/Ready cards can show seed “upcoming” for known names.  
2. **Full Live fixture default** — `OpalApp` `onOpenLive` sets `liveCardId` to `"seed-live-sabrina"`; portal falls back to `FOUNDER_LIVE_FEED` (fake here/eta/table-ready).  
   **Required zero:** `FULL_LIVE_SEED_DEFAULT_WHEN_SEED_OFF = 0`

### YELLOW watch

- Local `createdPlanSurfaces` paint `real: true` without server SharedPlan lineage
- `GraphsTemporalTimeline` default `SEED_TIMELINE_ITEMS` footgun (mitigated when GraphsHome always passes composed items)

---

## Attention — Does this deserve my attention right now?

### GREEN (stayed closed)

- Server `AttentionCenter` owns feed + `actionable_count`
- Badge = unresolved needs-you with `badge_eligible && action_required`
- **Seen ≠ resolved:** opening does not clear badge; resolve paths refresh `actionable_count`
- Deep link: `onOpenAttentionItem` → `void openChat(conversationId)` / `openGraphDetail`
- Missing link → honest “Plan link unavailable” / Home scroll — no silent crash

### YELLOW — competing truths (copy + dual projection)

| Source | Copy / behavior |
|--------|-----------------|
| `PRODUCT_COPY.emptyNeedsYou` | “Nothing needs a decision right now.” — **not used by ActivityDestination** |
| Backend `empty_needs_you_copy` | “Nothing needs your attention right now.” |
| ActivityDestination fallback | “Nothing yet. When your people move, you'll see it here.” |
| Home presence empty | Reuses `PRODUCT_COPY.emptyNeedsYou` (Attention decision copy on presence) |
| Home awaken vs Attention Center | Client `attentionAuthority` vs server badge — two “needs you now” projections |
| `IntelligenceForYouExtras` | Can paint busy For-you while `actionable_count` is 0 |

**Steward drift:** Pass 1E/1F claimed Attention quiet empty uses `PRODUCT_COPY.emptyNeedsYou`. Re-audit: **claim false for ActivityDestination**. Correct docs or unify copy under hold-safe coherence.

Physical push entry still **GATED** (TestFlight).

---

## Center Opal — Does Opal help me move forward?

### GREEN

- Chat hydrate/send/retry honest failure UI
- Seed-local plan invent gated by `isFounderSeedEnabled()`
- Voice mic/TTS blocked/offline copy honest
- AI subordinate law: UI must not invent durable private facts

### YELLOW

- Life Graph **sample day** until calendar linked (labeled via `SAMPLE_DAY_ATTRIBUTION` — dual day reality)
- Dual ask pipes: Life Graph DI `resolveDecision` vs OC chat `opal_messages`
- Some Center chips inventory UNTESTED as distinct intents (`OPAL_CENTER_INVENTORY.md`)

---

## Settings honesty (adjacent)

### GREEN (Pass 1C stayed closed)

- `settingsWireClass`: GREEN live wires + HONEST_GATE (incl. `nearby-range`)
- No fake “25 mi”; no “Coming soon” theater (guard tests)
- Gated rows non-interactive with `blockedReason`

---

## Integration truth table (hold)

| Capability | Local | Production | Device | Real? |
|------------|-------|------------|--------|-------|
| Auth / OTP | ✅ | ❌ 503 | pending | **No** |
| Messaging | ✅ | ❌ | pending | **No** |
| Realtime | ✅ | ❌ | pending | **No** |
| Prefer-real Home/Chats/Graphs lists | ✅ | pending | pending | Lab only |
| Attention Seen≠resolved | ✅ | pending | pending | Lab only |
| Voice | lab ✅ | pending | pending | **No** |
| Calls | lab / physical pending | pending | pending | **No** |
| Push | enqueue path | pending | pending | **No** |
| Calendar | OAuth client partial | pending | pending | **No** |
| Providers (Places/book) | gated | pending | pending | **No** |

Rule: a capability is **real** only when Local · Production · Device agree.

---

## Pass 1 laws — stayed vs residual

| Law / prior | Status |
|-------------|--------|
| Prefer-real composers (Home feed / Chats / Graphs lists) | **STAYED GREEN** |
| Production seed default empty | **STAYED GREEN** (gate) |
| Seen ≠ resolved | **STAYED GREEN** |
| Settings honesty / nearby-range | **STAYED GREEN** |
| A8 / openChat deep-link | **STAYED GREEN** |
| Stories / person temporal / Full Live seed chrome | **NEW/CONFIRMED RED residual** |
| Attention empty-copy single source | **YELLOW claim drift** |

---

## Remediation status

### A. Coherence fixes — **DONE (1H + 1I)**

1. ~~Gate or empty `resolveHomeStories` when seed off~~ **1H**  
2. ~~Gate `personNodeTemporal` chrome behind seed~~ **1H**  
3. ~~Block Full Live open when seed off~~ **1H**  
4. ~~Unify Attention quiet empty~~ **1I**  

### B. Production path (founder-gated) — NEXT

```text
Render payment → prod /health 200 → TestFlight → install → push → two-device
```

### C. After unlock phrase only

> "Opal is ready to begin understanding people."

Then Person Graph Spec → authority → permissions → candidate → correction → explanation → intelligence.

---

## Related

- `shots/steward/PASS1E_SURFACE_CONTRADICTION_SWEEP.md`  
- `shots/steward/PASS1F_EMPTY_STATE_QUALITY.md` · `PASS1G_ENDPOINT_JOURNEY_AUDIT.md`  
- `shots/steward/PRODUCTION_READINESS_CLOSURE_MATRIX.md`  
- `shots/steward/HOLD_PERIOD_CHECKPOINT.md`  
- `docs/authority/PASS2_PLUS_CAPABILITY_MAP.md` (blueprint only)  
- `BLOCKED.md`  
