# Wave B0 — Canonical Completion Audit + Authority Lock

```yaml
audit_date: "2026-08-30"
audit_mode: READ_ONLY
code_changed: false
head_at_audit: "d2c9bf2"
implementation_lineage: "170679f"
figma_file: fy69K8cCug9prf5GLwQ7Hy
only_universe: "618:2"
brand: V4
WAVE_A_FROZEN: true
JOURNEY_ACTIONS: GREEN
FOUNDER_WALK_READY: NO
MERGE_AUTHORIZED: NO
permissionToStartLive: NO
```

## Operating law (locked)

1. **Figma is exact source of truth** — geometry, paint, type, hierarchy, interaction intent. Not inspiration. See `FIGMA_BRAND_V4_AUTHORITY.md`.
2. **Brand V4 is underlying visual law** — when a state is implied but not drawn, derive from parent Figma + notes + Brand V4 + existing domain owners. No fresh design concepts.
3. **Preserve working intelligence** — extend Graph / Messages / Journey / Reality / seed / routing owners. `PARALLEL_*_OWNER = 0`. Product thesis: `OPAL_PRODUCT_OPERATING_SYSTEM.md`.
4. **AI-mediated reward architecture** — optimize for meaningful social/experiential outcomes, not compulsive engagement. See `OPAL_AI_REWARD_ARCHITECTURE.md`. Pixel work must not destroy product psychology.
5. **GitHub is durable institutional memory** — closure = implementation + evidence + ledger, clean checkpoint. Chat is not authority.
6. **Founder verification is a separate gate** — engineering GREEN ≠ founder acceptance. Requires clickable local verification URL.

Execution model: **Know the whole map. Touch only the authorized square.**

### Persistent product charter (docs-only, pre-B1)

| Doc | Role |
|-----|------|
| `docs/authority/OPAL_PRODUCT_OPERATING_SYSTEM.md` | Thesis, solo-first-class, outcome/negative/combination intelligence, network effects, stop laws |
| `docs/authority/OPAL_AI_REWARD_ARCHITECTURE.md` | Meaningful reward layers + purpose/reward matrix |
| `docs/authority/FIGMA_BRAND_V4_AUTHORITY.md` | Figma absolute + Brand V4 derivation + parity method |

---

## Product purpose + reward / alignment moment

Conceptual columns — **do not override Figma**. Prevent “controls match, psychology dies.”

| Surface | Product purpose | Reward / alignment moment |
|---------|-----------------|---------------------------|
| Home | Surface socially and personally relevant possibility | “Something relevant to my life is happening.” |
| Chats | Relationship communication and signal | “We understand each other and something can progress.” |
| Graphs | Reveal meaningful overlap and future possibility | “I didn’t know we aligned on this.” |
| Journey | Turn intent into coordinated reality | “This is actually happening.” |
| Live | Real-time social immediacy | “My people / this experience are happening now.” |
| Global Opal | Convert ambiguity/context into useful alignment/action | “Opal understood what actually matters.” |
| You | Identity, preferences, privacy, control | “Opal knows me while I remain in control.” |
| Create | Express or introduce possibility with minimal friction | “I can put this into my social world immediately.” |
| Direct | High-context relationship communication | “This conversation can become understanding or action.” |
| Group | Collective communication and alignment | “We are converging.” |

Full reward law: `OPAL_AI_REWARD_ARCHITECTURE.md`.

---

## Status vocabulary

| Status | Meaning |
|--------|---------|
| **GREEN** | Objective browser/unit proof exists; formal evidence present or smoke + stamps sufficient for this matrix cell |
| **PARTIAL** | Runtime exists and some proof exists, but formal Figma↔runtime↔overlay↔diff package incomplete OR polish gap remains |
| **RED** | Broken / unreachable / wrong destination |
| **NOT_BUILT** | No runtime owner / route for an inventory-required state |
| **FOUNDER_REVIEW** | Visual judgment reserved for founder (not a mechanical blocker by itself) |

---

## Complete Wave B inventory matrix

Evidence root: `docs/evidence/v2-coded-experience/p0-05-12-wave-b/`

Legend for packages: F=figma ref · R=runtime · O=overlay · D=diff · E2E=browser path

| # | Surface | Figma node | Runtime owner | Entry | States to account | F | R | O | D | E2E | Final |
|---|---------|------------|---------------|-------|-------------------|---|---|---|---|-----|-------|
| 1 | Home | 618:44 | `GraphSocialHome.tsx` | Dock Home | continuous feed; empty; gate notes | Y | Y | Y | Y | Y | **PARTIAL** — structure/timeline/media GREEN; formal package aged vs post-correction Live |
| 2 | Home Rare Live card | 618:211 | `GraphSocialHome` live card | Home feed | Open Live CTA | Y | Y | — | — | Y | **GREEN** paints + Open Live routing |
| 3 | Graph soft interest | 618:149 | same + `graphParticipation` | Home Graph | Interested only | — | Y | — | — | Y | **GREEN** (prior approval) |
| 4 | Graph lock-in | 738:2 | same | Home Graph | I'm going; no forced nav | Y | Y | — | — | Y | **GREEN** |
| 5 | Going / Open Journey | 738:35 | same | Home Graph | Going ✓; Open Journey | Y | Y | — | — | Y | **GREEN** |
| 6 | Chats Home | 618:271 | `ChatsHome.tsx` | Dock Chats | empty; seeded rows; New+ | Y | Y | Y | Y | Y | **PARTIAL** — chrome+New+ GREEN; formal overlay aged; row matrix needs seeded formal package |
| 7 | Search PEOPLE | 618:2299 | `SearchDestination.tsx` | Chats New+ / Home search | People mode; add_members; back | Y | Y | — | — | Y | **PARTIAL** — E2E GREEN; formal overlay missing |
| 8 | Direct | 618:348 | `GraphPeopleThread` + `DatedConversationContent` | Chats row | Call/Video/Plan; composer; Chats-active | Y | Y | — | — | smoke | **PARTIAL** — smoke GREEN; formal O/D missing |
| 9 | Group | 618:451 | same | Chats row | Call/Video; Shared Graph plate | Y | Y | — | — | smoke | **PARTIAL** — smoke GREEN; formal O/D missing |
| 10 | Group Info | 618:521 | `GroupInfoDestination.tsx` | Group header | Add people → Search; back | Y | Y | — | — | smoke | **PARTIAL** — present; formal O/D missing |
| 11 | Graphs overview | 618:674 | `GraphsHome.tsx` | Dock Graphs | lenses All/Action/Ready; empty lens | Y | Y | Y | Y | Y | **PARTIAL** — content/filters GREEN; formal package may need refresh |
| 12 | Graph Detail | 618:758 | `GraphDetailSheet.tsx` | Graph tap | persistent; no Enter Journey; back restore | Y | Y | — | — | Y | **PARTIAL** — E2E GREEN; formal O/D missing |
| 13 | Graph Create media | 863:284 | `GraphCreateFlow.tsx` | Graphs Create+ | camera gate; library; back | Y | Y | — | — | stamp | **PARTIAL** — stamps GREEN; camera/library polish incomplete |
| 14 | Add to Graph | 863:338 | `GraphCreateFlow.tsx` | after media pick | caption; audience; submit | Y | Y | — | — | stamp | **PARTIAL** |
| 15 | Journey | 618:816 | `JourneySurface.tsx` | Open Journey | Maps; Add; Manage; Can't; leave/arrive | Y | Y | — | — | Y | **GREEN** browser (`JOURNEY_ACTIONS`) |
| 16 | Journey Manage | 863:88 | `JourneyManageSheet.tsx` | Journey Manage | lead gate; roles; suggest; back | Y | Y | — | — | Y | **GREEN** E2E; formal O/D still missing |
| 17 | Journey Can't | 863:195 | `CantMakeItSheet.tsx` | Journey Can't | only-you; lead handoff; Keep going | Y | Y | — | — | Y | **GREEN** E2E; formal O/D still missing |
| 18 | Journey Add People | 863:394 | `JourneyAddPeople.tsx` | Journey Add people | circular grid; Continue; back | Y | Y | — | — | Y | **GREEN** E2E; formal O/D still missing |
| 19 | Full Live | 863:2 | `GraphLivePanel.tsx` + `OpalApp` shell | Home Open Live | same Reality 618:211; media 863:10; Graphs-active | Y | Y | Y* | Y* | Y | **PARTIAL** — identity/semantics GREEN; *overlay/diff vs pre-correction Figma; need formal refresh vs `FIGMA_FULL_LIVE_863_2.png` |
| 20 | Global Opal | 618:902 | `OpalAmbient.tsx` | Center Opal | full-screen; close; feature paused | Y | Y | Y | Y | Y | **PARTIAL** — mount GREEN; may need package refresh |
| 21 | Person Profile | 618:1257 | `GraphProfilePage.tsx` | avatar/person | Home-active dock; Message/Call/Video/Plan | Y | Y | — | — | — | **PARTIAL** — implemented; formal package missing |
| 22 | You | 618:1344 | `OpalApp` YouPane | Dock You | sparse accents; hub rows | Y | Y | — | — | Y | **PARTIAL** — paint GREEN; formal O/D missing |
| 23 | Settings Hub | 618:1430 | YouPane hub (no separate root attr) | You | row list | Y | Y† | — | — | Y | **PARTIAL** — †painted inside You; no dedicated `data-figma-node=618:1430` |
| 24–35 | Section 06 ×12 | 618:1524…2243 | `YouSettingsDestination.tsx` | You hub | back stack; semantic notes; Delete nest | 1‡ | 6§ | — | — | Y | **PARTIAL** — ‡Spending Figma only in evidence; §privacy/location/spending/notifications/safety/delete runtime |
| 36 | Activity | 618:2384 | `ActivityDestination.tsx` | Home Activity | title Activity; FOUNDER_REVIEW icon | Y | Y | — | — | — | **FOUNDER_REVIEW** + package incomplete |
| 37 | Calls surfaces | 618:581/599/620/642 | `CallSurfaces.tsx` | Direct/Group Call/Video | no dock; no Flip | Y | Y | — | — | prior | **PARTIAL** — prior geometry proof; not in Wave B formal package set |

† Settings Hub is not a separate mount — inventory keeps it as a logical destination of You.  
‡ Only Spending Figma captured under evidence/figma so far among nested settings.

---

## Implied states (must remain accounted for)

Derived from Figma parents + notes + Brand V4 + domain law — not free design:

| Implied state | Parent | Runtime | Status |
|---------------|--------|---------|--------|
| Chats empty | 618:271 | `chats-home-empty` | implemented; formal package N/A for empty |
| Graphs empty lens | 618:674 | empty copy | implemented |
| Home empty feed | 618:44 | EMPTY mode | implemented |
| Create camera dependency | 863:284 | camera gate note | **PARTIAL** polish |
| Manage forbidden (non-lead) | 863:88 | `journey-manage-forbidden` | **GREEN** observed |
| Can't lead handoff gate | 863:195 | `cant-make-it-lead-gate` | wired; founder path is non-lead |
| Full Live location disclosure | 863:2 | disclosure copy | present |
| Search add_members context | 618:2299 | `data-search-context` | E2E wired |
| Journey maps unavailable | 618:816 | disabled Open Maps | conditional |
| Live capability gated | 863:2 / Open Live | no fake stream | intentional |

**Missing Figma coverage does not grant design freedom.** Any new implied state must be derived from approved parent + Brand V4 + domain owner.

---

## Recommended closure order (authorized squares)

| Slice | Focus | Why |
|-------|-------|-----|
| **B1** | Full Live `863:2` formal parity | Identity GREEN; formal overlay/diff vs fresh Figma still PARTIAL — next authorized visual closure |
| **B2** | Direct / Group / Group Info formal packages | Smoke GREEN; formal O/D missing |
| **B3** | You + all 12 Section 06 formal packages | Paint GREEN; full matrix incomplete |
| **B4** | Create `863:284`→`863:338` camera/library polish | Stamps GREEN; polish PARTIAL |
| **B5** | Remaining PARTIAL refresh (Chats/Graphs/Opal overlays, Activity) | |
| **B6** | Legacy proof-script marker reconciliation | tooling truth |
| **B7** | Full regression / mobile / console / founder URL eligibility | only when inventory has no unexplained RED/PARTIAL/NOT_BUILT |

---

## Counts (at audit time)

| Bucket | Count |
|--------|-------|
| Inventory rows (primary) | 37 |
| GREEN (mechanical for primary purpose) | ~12 including Journey stack + commitment + Live card routing |
| PARTIAL | majority of formal visual packages |
| RED | 0 (Journey RED closed) |
| NOT_BUILT | 0 for listed primary destinations |
| FOUNDER_REVIEW | Activity icon |

---

## Authority lock statements

```yaml
WAVE_A:
  status: FOUNDER_ACCEPTED_DEMO
  accepted_checkpoint: 3b4c000
  do_not_reopen_without_proven_regression: true

JOURNEY_ACTIONS: GREEN  # frozen unless proven regression

FULL_LIVE_IDENTITY: GREEN
FULL_LIVE_FORMAL_PARITY: PARTIAL  # next slice B1

FOUNDER_WALK_READY: NO
# Eligible only when OBJECTIVE_PARTIAL = 0 except Activity FOUNDER_REVIEW
# and any explicit SOURCE_DENSITY_GAP
```

---

## What this audit does **not** authorize

- Full Live pixel work (await B1 slice authorization)
- Direct/Group/Section06/Create implementation in this turn
- Merge / live / production
- Redesign of any GREEN surface
- Parallel product owners

---

## Next authorized action

**Wave B1 — Full Live formal Figma closure for `863:2` only** (authorized after durable charter commit), with:

1. Re-read committed product operating charter (`OPAL_PRODUCT_OPERATING_SYSTEM.md`, `OPAL_AI_REWARD_ARCHITECTURE.md`, `FIGMA_BRAND_V4_AUTHORITY.md`)
2. Full Live **intent lock** (focal point, hierarchy, immediacy, host/viewer/broadcaster, next action, Brand V4 cues, reward moment)
3. Measured reconciliation vs fresh `FIGMA_FULL_LIVE_863_2.png`
4. Refreshed overlay/diff + browser proof
5. Tested clickable founder verification URL to Full Live
6. **STOP** — do not start B2+

```yaml
HOLD: true
DO_NOT_MERGE: true
permissionToStartLive: false
NO_LIVE: true
FOUNDER_WALK_READY: NO
Activity_icon: FOUNDER_REVIEW  # do not auto-resolve
```
