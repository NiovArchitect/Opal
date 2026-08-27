# EXPERIENCE WORLD V2 — COMPLETE SURFACE INVENTORY

**HOLD. DO NOT MERGE.**  
**Branch:** `build/v2-coded-experience-closure`  
**File key:** `fy69K8cCug9prf5GLwQ7Hy`  
**Inventory method:** Figma Plugin API (`use_figma`) + `get_metadata` — **not** page-list alone.

**No broad implementation this pass.** Per directive §38: inventory first.

---

## CRITICAL DISCOVERY

`get_metadata` without nodeId returned **only** page `0:1`.  
Plugin API `figma.root.children` returned **7 pages**.  
Missing Experience World surfaces live on page **`5:2`**, not the primary surfaces page.

| Page ID | Name | Accessible? | Notes |
|---------|------|-------------|-------|
| `0:1` | V2.0 — FOUNDER APPROVED BASELINE — Art Direction + Surfaces | **YES** | Home/Chat/SR/Curate/Social Moment + brand + lock |
| `5:2` | V2.0 — FOUNDER APPROVED BASELINE — **Extend Plans Group Motion** | **YES** | Temporal, Extend, Group, Motion, Plans |
| `12:2` | V2.1 — ADDITIVE EXPLORATION (do not mutate V2.0) | **YES** | Scope text only; no product frames |
| `38:2` | FINAL POLISH — P7.1 | **YES** | Logo craft board; **not** V2.0 product world |
| `26:2` | LOGO STUDY V3 — HISTORY | empty/unloaded | Superseded exploration |
| `17:2` | LOGO STUDY V2 — SUPERSEDED | empty/unloaded | Do not use |
| `13:2` | LOGO STUDY V1 — FOUNDER REJECTED | empty/unloaded | Do not use |

**Law:** Absence from MCP page listing ≠ absence from file.

---

## FIGMA INVENTORY (CONFIRMED NODES)

### Page `0:1` — Art Direction + Surfaces

| Node ID | Name | W×H | Status | Implemented? | Route/State |
|---------|------|-----|--------|--------------|-------------|
| `11:2` | 🔒 V2.0 FOUNDER APPROVED — IMMUTABLE BASELINE | 518×130 | **LOCK** | N/A | Spec lock only |
| `1:12` | V2 — COVER | 1280×580 | Spec cover | N/A | Art direction |
| **`2:2`** | **V2 HOME — living social field** | **390×844** | Immutable product | **Partial** | `tab=home` member shell |
| **`3:2`** | **V2 CHAT — human primary + Opal filament** | **390×844** | Immutable product | **Partial** | Chat thread in `tab=chats` |
| **`4:2`** | **V2 SHARED REALITY — signature object** | **390×520** | Immutable product | **Partial** | In-thread SR plate / resolution |
| **`4:11`** | **V2 CURATE — composition resolve** | **390×640** | Immutable product | **Partial** | Curate overlay (private Looks good) |
| **`4:23`** | **V2 SOCIAL MOMENT — media primary** | **390×700** | Immutable product | **Minimal / stub** | `socialMoment` string state only |
| `57:2` | CANONICAL — WHAT OPAL IS — GROK READ HERE | 1120×900 | Language law | Partial (copy) | Product language source |
| `63:2` | OPAL — CURRENT BRAND ASSETS — FOUNDER REFERENCE | 2400×1900 | Brand ref | **Not product-wired to 63:7** | Brand |
| **`63:7`** | **IMAGE — CURRENT OPAL LOGO REFERENCE** | **1000×1000** | **IMAGE fill** (hash `39efe3bc0861`) | **Not downloaded** | Opening / Home mark |
| `63:9` | IMAGE — OPAL BRAND IDENTITY APPLICATION STUDY | 1160×1450 | Application study | Not product | Reference only |
| `47:2` | ADDITIVE ONLY — FINAL POLISH P7.1 | 1400×1100 | Logo strip | Do not restyle V2 | Additive brand |
| `51:2` / `56:2` | B1–B4 rejected / C1–C4 | various | Geometry exploration | **DO NOT USE** as product mark | Rejected paths |

### Page `5:2` — Extend Plans Group Motion (**FOUND**)

| Node ID | Name | W×H | Status | Implemented? | Route/State |
|---------|------|-----|--------|--------------|-------------|
| **`5:3`** | **TEMPORAL MATURATION** | **890×168** | Immutable grammar | **Partial domain; no exact UI** | Same SR object states FAR→NOW |
| **`5:20`** | **EXTEND from active Shared Reality** | **420×200** | Immutable | **Partial** (private Extend; not Figma-exact plate) | Overlay from active SR |
| **`5:24`** | **GROUP — add person without restart** | **420×220** | Immutable | **Domain partial** (group composition); UI not Figma | Group recompose |
| **`5:28`** | **MOTION LANGUAGE** | **900×252** | Spec text | Partial motion | Semantic motion law |
| **`5:31`** | **PLANS — field of Shared Realities** | **390×500** | Immutable product | **Partial** | `tab=plans` |

### Page `12:2` — V2.1 additive (scope only)

No product screen frames. Text locks V2.0 primitives and lists workstreams: Social Moments+, Curate states, Extend+Group, Temporal/Recall.

### Page `38:2` — FINAL POLISH P7.1

Logo craft only. Status text: **LOGO APPROVED FOR FINAL POLISH · NOT FINAL BRAND ASSET**.  
B1–B4 rejected; C1–C4 exploration. **Do not mutate V2.0 product frames.**

### Logo history pages `13:2` / `17:2` / `26:2`

**Unresolved for product use** (rejected/superseded). Do not implement from these.

---

## MISSING / UNRESOLVED NODES

| Expected | Resolved? | Notes |
|----------|-----------|-------|
| Temporal maturation | **YES** `5:3` | On page `5:2` |
| Extend from active SR | **YES** `5:20` | On page `5:2` |
| Group / add person | **YES** `5:24` | On page `5:2` |
| Plans field | **YES** `5:31` | On page `5:2` |
| Motion language | **YES** `5:28` | Spec, not a screen |
| Walkthrough frames in Figma V2 | **NOT FOUND** as named V2 product frames | Product walkthrough is code `FirstRunExperience` — brand continuity gap |
| Activation phone screen in Figma V2 | **NOT FOUND** as V2 frame | Code `ActivationFlow` |
| Recall / Last Together dedicated frame | **NOT FOUND** as top-level frame | Hint in Home Maya row “Moment · recall”; V2.1 lists Temporal/Recall workstream |
| Next Together dedicated frame | **NOT FOUND** | Unresolved |
| Production vector master of logo | **NOT CLAIMED** | `63:7` is **IMAGE** raster reference; Figma text: working nuance, not final brand lock |

**No node was invented.** Unresolved items stay open.

---

## BRAND ASSET STATUS

| Item | Truth |
|------|--------|
| V2.0 product layout / Living Void | **Locked** (`11:2`) |
| Current logo for product | Use **`63:7`** working reference (IMAGE fill) |
| Final brand lock | **NO** — Figma: “CURRENT WORKING NUANCE, NOT FINAL BRAND LOCK” |
| P7.1 craft page `38:2` | Logo polish path; geometry families B/C **not** final lock |
| P7 explorations / halo / gemstone | **Forbidden** in product |
| Code assets today | `public/brand/opal-mark*.svg`, `public/figma-v2/opal-mark.svg` — **not verified as 63:7 bytes** |
| 63:7 download | **Required next** via `download_assets` before brand implementation |
| Accidental AI text in brand images | Do not copy; public language = `57:2` |

---

## WALKTHROUGH MAP

| Phase | Product truth | Figma V2 node | Status |
|-------|---------------|---------------|--------|
| A. Brand / opening | Should show current logo + void | `63:7` + Living Void energy | **Gap** — not unified to 63:7 |
| B. Walkthrough | `FirstRunExperience` 5 steps; unauthenticated; Skip; final Join | **No V2 frame found** | Content laws hold; brand continuity P1 |
| C. Activation | `ActivationFlow` phone → OTP → session | **No V2 frame found** | Functional |
| D. Living Void member | Dock Home/People/Plans/You | `2:2` dock | Partial fidelity |

Laws preserved: no member nav pre-auth; no “demo”; Join → activation → session → member.

---

## SURFACE → ROUTE MAP

| Surface | Node | Product route/state |
|---------|------|---------------------|
| Home | `2:2` | Authenticated `tab === "home"` |
| People | dock | `tab` people (if present) / chats list |
| Plans | `5:31` | `tab === "plans"` |
| You | dock | `tab === "you"` |
| Chat | `3:2` | Selected conversation in chats |
| Shared Reality | `4:2` | In-thread SR presentation / resolution plate |
| Curate | `4:11` | Overlay `curateOpen` (or equivalent) |
| Extend | `5:20` | Overlay from active SR (`extendOpen`) |
| Group add | `5:24` | Group membership / add-person flow (domain) |
| Temporal | `5:3` | **Same** SR object state, not new route |
| Social Moment | `4:23` | Home/universe placement TBD; code stub `socialMoment` |
| Opening | brand | Pre-walkthrough / walkthrough welcome |
| Activation | — | `ActivationFlow` pre-member |

---

## SURFACE → DOMAIN MAP

| Surface | Domain source of truth |
|---------|------------------------|
| Home field | ProductSignals, relationship presence, alignment heat, chronology |
| Awaken card | Consequential unresolved decision (not every inference) |
| Chat bubbles | Messages |
| Filament awaken | AvailabilityComposition / alignment evidence — consequence only |
| Filament transform | Settled dimension (time/place) via AlignmentAuthority / SharedPlan |
| PRIVATE OPAL | PrivateParticipation, private draft, private availability |
| Shared Reality | SharedRealityPresentation + ProductSignals; **one lineage object** |
| Leave-around | Travel/leave_by domain (`delivery_compose`, feasibility, location grants) — **omit if untrusted** |
| Curate | Experience composition / private draft; authorship truth |
| Extend | Ambient/execution continue options; **private select until Share** |
| Group | GroupComposition, ConversationMember, capacity |
| Plans | Durable shared realities / plans_durable |
| Social Moment | Lived/media lineage → interest → own-circle possibility (domain incomplete) |
| Chronology | OpalChronologyMoment durable causal moments |

---

## SURFACE → TRIGGER MAP

| Object | Appears when | Updates when | Disappears / transitions |
|--------|--------------|--------------|---------------------------|
| Home awaken | One high-value decision needs human | Decision resolves or superseded | Becomes presence/settled or vanishes |
| Presence row | Relationship has current strongest signal | Signal changes type | Stale → quiet / recall |
| Filament awaken | Useful alignment not yet settled | — | Becomes transform or recedes |
| Filament transform | Dimension becomes real (time/place) | Further settles | Recedes to calm |
| PRIVATE OPAL | One-human assistance | User acts/dismisses | Never shared by default |
| Shared Reality | Authority + usable WHO/WHAT/WHEN/WHERE | Place/time/people change **same object** | Completes → Recall / Last Together |
| Temporal FAR→NOW | Clock vs start_at | As event approaches | NOW → Directions / active / complete |
| Curate | Explicit or clear plan burden + context | Recompose vibe | Looks good → **same SR object** |
| Extend | Active/post-active SR; night open | One continuation or quiet | Quiet if night already good |
| Group add | “Can X come?” without restart | Capacity/booking recompute | Decision on upgrade/other night |
| Plans row | Durable usable reality | Maturation | Past → recall field |
| Social Moment | Lived/shared media allowed | Interest threshold | CTA → own SR possibility; collapse when irrelevant |

---

## SURFACE → ACTION MAP

| Surface | Primary taps | Side effects | Privacy |
|---------|--------------|--------------|---------|
| Home awaken | Choose / open chat or SR | May open resolve path; **no Set alone** | Shared-safe only |
| Presence | Open chat / SR / moment | Navigate | No peer private calendar |
| Chat send | Message | Message store + realtime | Human content |
| Filament | Optional confirm | Only if action contract allows | Shared consequence only |
| PRIVATE OPAL | Propose / dismiss | Private only until explicit share | **ONLY YOU** |
| SR | Directions / open map when truth | External nav if authorized | No fabricated travel |
| Curate Looks good | Accept composition | Settle into SR; **no auto peer message** | Authorship-truthful |
| Curate Change vibe | Recompose private | Private recompose | Private |
| Extend option | Private select | **No auto-message** | Private until Share |
| Extend Share | Explicit share | Message/share path | Intentional |
| Group add | Upgrade / other night | Capacity recompute; no full restart | Shared decisions only |
| Social Moment media | Media detail | View only | No unauthorized geo |
| Social Moment CTA | “Do this with your people” | Starts **own-circle** possibility → SR lineage | Not commerce |
| Plans row | Open SR | Same lineage object | Shared realities only |

---

## SIDE-EFFECT RISKS

| Risk | Severity | Mitigation |
|------|----------|------------|
| Extend option → auto peer message | P0 (already repaired private-first) | Keep Share explicit |
| Curate “You both asked” when only one delegated | P0 truth | Authorship-aware copy |
| Fabricated leave-by / 18 min | P0 | Omit temporal travel line without location+ETA truth |
| Duplicate cards per SR state | P0 product | One lineage object; temporal mutates plate |
| Social Moment → Book this commerce | P0 | CTA → own people possibility only |
| Majority-free group Set without required | P0 | GroupComposition required/optional |
| Calendar disclosure via fit labels | P0 | AvailabilityComposition disclosure rules |
| Hardcoding Chanelle/Juniper | P1 | Domain content only |
| Reverting to P7 rejected geometry / halo logo | P0 brand | Use 63:7 working ref; replaceable path |
| Claiming all V2 screens done | Process | Inventory must stay complete |

---

## FIGMA ASSET DOWNLOAD PLAN

Before next implementation wave:

1. **`download_assets`** on `63:7` → `apps/opal_web/public/brand/opal-logo-current-ref.{png|jpg}` (hash-stamped)  
2. **`download_assets`** on `63:9` → brand application study (reference only)  
3. **`download_assets` / design context assets** for `2:2` ambient field if SVG/export differs from `figma-v2/ambient-home.svg`  
4. Home mark: prefer **current 63:7** over old P7/halo; keep path swappable  
5. Screenshots 390px: `2:2`, `3:2`, `4:2`, `4:11`, `4:23`, `5:31`, `5:20` into `docs/evidence/v2-coded-experience/figma-diff/`  
6. **Do not** export rejected B1–B4/C1–C4 as product marks  

---

## SHARED REALITY SIGNATURE OBJECT (LOCKED DEFINITION)

> The Shared Reality signature object is the durable visual representation of the social possibility that has become real enough to live in.

Not: Set badge · DB status card · generic event card · calendar tile.

Carries: WHO · WHAT · WHEN · WHERE + live-context (distance, leave-by **only when trustworthy**).

Lifecycle: possibility → settle → same object updates → temporal maturation FAR→TOMORROW→TONIGHT→NOW → active → complete → recall.

---

## IMPLEMENTATION PRIORITY (POST-INVENTORY)

Per directive §39 — **not started this pass**:

1. Brand/opening continuity from `63:7`  
2. Exact Home `2:2`  
3. Exact Chat + filaments `3:2`  
4. Exact Shared Reality `4:2` + leave-by truth  
5. Exact Curate `4:11`  
6. Exact Extend `5:20`  
7. Exact Temporal `5:3` (same object)  
8. Exact Group `5:24`  
9: Exact Plans `5:31`  
10. Social Moment `4:23` lineage (not Instagram)  
11. Trigger/side-effect audit  
12. 390px visual diff  
13. Smoke  

---

## CLAIM DISCIPLINE

**Do NOT claim “all V2 screens implemented.”**

| Claim | Reality |
|-------|---------|
| Confirmed product frames inventoried | **YES** (pages 0:1 + 5:2) |
| Pixel-perfect implementation | **NO** |
| Extend/Temporal/Group/Plans layouts known | **YES — nodes found** |
| Walkthrough/Activation Figma V2 frames | **NOT FOUND** (code paths exist) |
| Final logo lock | **NO** — working reference only |

**FIGMA CONTROLS PRESENTATION. DOMAIN CONTROLS TRUTH. PERMISSIONS CONTROL DISCLOSURE. AUTHORITY CONTROLS ACTION.**

HOLD.
