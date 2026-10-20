# Repair #19 — Wave W24-DIFF Report: Make the Relationship Layer Legible

**Branch:** `muse/r19-diffix` (worktree `~/workspace/opal-graph/wt-r19-diffix`), off final tip `9a0a1be4`. **Not pushed** — coordinator merges, pushes, recaptures.
**Commits (7):**
- `be52be25` DL-02 + DL-12 foundation: subtype round-trip + one label truth
- `5bd7874e` DL-01/03/04/08/09/12/14: picker, one people universe, tie rendering
- `26b3906a` DL-06 + DL-07: graph roster ties; Add people wired
- `cf27c995` DL-13: seed cast typed mix
- `cba1d1d7` format hygiene (`mix format` line wrap in the touched test file)
- `3f3d59e0` persona-spectrum steer: the identification sheet restaged as progressive depth (see the addendum at the end)
- `43409998` DL-13 correction: no seed family tie — it breaks FR-B3-01's sweep world (see DL-13 and the Floors correction note)

---

## Per-item fix + proof

### DL-01 — Identification affordance (the core fix) ✅
- **One picker, one write path:** new `apps/opal_web/src/c2/shell/RelationshipPicker.tsx` — the quiet sheet titled "How do you know {name}?", offering the 7 real types in human words (Spouse, Partner, Family, Close friend, Friend, Business, Acquaintance), radio rows, Save/Cancel. Saving runs the host's single write.
- **Moments of need:** (a) **Person profile (primary)** — `PersonProfileSheet` gains an editable **"Who they are to you"** section: a row showing the current tie (or "How do you know them?") that opens the picker (`r19-profile-identify-row`). (b) **Person-add/connect completion** — the new-chat picker is the served shell's person-add moment; its rows now carry ties, and a picked person lands in their thread, where the same profile sheet + picker is one avatar tap away (no second identification implementation was built for the picker itself — identification lives in exactly one sheet). (c) **Thread profile path** — the thread avatar opens the same `PersonProfileSheet`; it is the same component, not a copy.
- **The write:** `ChatsHost.saveRelationship(personId, …)` → `setRelationshipType(contactUserId = the PERSON's id, …)` (PUT `/api/v1/product/relationships/:contact_user_id`, family leg included). The client never needs a stored relationship id — the write resolves from the person, per the existing contract. After the write, relationship rows are **re-read from the server** (`listRelationships`) and every tie on screen re-renders from the read-back.
- **Proof:** `r19Diffix.test.tsx` — "profile row opens the picker; saving Partner writes by person id; the thread header then shows the tie" (asserts the exact `setRelationshipType` call args incl. bearer + family leg, picker closure, and the DL-14 header result).

### DL-02 — Family subtype round-trips ✅ (backend + web)
- **Backend:** `RelationshipController.upsert` now applies `family_subtype` / `family_minor` through `Relationships.set_family_subtype/4` in the same PUT (via `with`). Unknown slug → changeset 422; a non-null subtype under a non-family type → 422 (`:not_family`) — **never a silent 200 drop**. Absent keys leave the stored subtype under the type write's own rules (changing away from family still clears it, in `set_type`). Index now serves `family_subtypes` (the backend's real vocabulary in picker order, from the new `FamilySubtype.options/0`: parent, child, sibling, grandparent, aunt_uncle, cousin, niece_nephew, co_parent).
- **Web contracts:** `RelationshipRow` / `RelationshipContact` carry `family_subtype` / `family_minor`; `listRelationships` types `family_subtypes`; `setRelationshipType` gained an optional 5th `family` param — subtype keys are sent only when the caller makes a subtype statement.
- **Picker:** choosing Family reveals the subtype step (the 8 real slugs in human words) **and the minor flag** ("{name} is a minor" toggle) — the vocabulary carries `family_minor` as a user-meaningful flag (it drives nudge restraint in `Relationships.Behavior`), so it is included, under Family only, in the same sheet and the same write.
- **Proof (round-trip test):** `test/opal_core_web/relationship_api_test.exs` — "PUT family + family_subtype round-trips (DL-02)": PUT `{type:"family", family_subtype:"sibling"}` → response contract carries `family_subtype:"sibling"`; fresh GET carries it on **both** the relationship row and the contact contract; the index names the vocabulary; `family_minor:true` + subtype change round-trips; unknown slug → 422; subtype under `friend` → 422; changing to `friend` clears subtype + minor (read-back). Suite: **4/4 pass** in that file.

### DL-03 + DL-12 + DL-14 — One label truth, ties render ✅
**The label map (quoted, the single source — `apps/opal_web/src/opalUi/relationshipTypes.ts`):**
```ts
RELATIONSHIP_TYPE_OPTIONS = [
  { value: "spouse",       label: "Spouse" },
  { value: "partner",      label: "Partner" },
  { value: "family",       label: "Family" },
  { value: "close_friend", label: "Close friend" },
  { value: "friend",       label: "Friend" },
  { value: "business",     label: "Business" },
  { value: "acquaintance", label: "Acquaintance" },
]
tieLabel(type, familySubtype)  // SINGULAR; family+subtype → "Family - Sibling" style
                               // (subtype labels: Parent, Child, Sibling, Grandparent,
                               //  Aunt / Uncle, Cousin, Niece / Nephew, Co-parent)
RELATIONSHIP_GROUP_LABELS      // plural, circle GROUP headers only:
                               // Partners, Family, Close friends, Friends, Work,
                               // Acquaintances, Spouse
```
`tieLabel` returns **null for unset or unknown types — absent renders nothing, never a guessed label, never a raw slug.** The duplicated plural map inside `C1ShellHosts.tsx` is **deleted**; its B-17 export `relationshipTypeLabel` now delegates to the one group map (circle headers unchanged), and W13's profile assertion was corrected from the buggy `"Close friends"` to `"Close friend"` (the DL-12 fix itself).

**Renders, per surface:**
| Surface | Rendering |
|---|---|
| Person profile | Tie line under name/handle, now singular incl. subtype ("Family - Sibling"); plus close-circle cue (DL-09) |
| Thread header sub-line (DL-14) | 1:1 thread: the tie **replaces** the repeated peer name when set; unset falls back to the old line; group threads keep peer names |
| Chats list row | Quiet tie cue beside the name in the title line (`chats-row-tie`, ink-3, same line — row grammar unchanged; W5/JA-03 breadth pins green) |
| Graph detail roster (DL-06) | `who[].relationshipLabel` rendered beside the name (`c2-detail-who-tie`); counts stay for attendance |
| Graph list cards (DL-06) | `peopleLine` populated from the plan's own finished `who_label` (adapter-level `cardFromPlan` untouched, so Center/Home cards are byte-identical) |
| Orbit header/sheet | Tie beside the anchor person's name (`orbit-sheet-tie`) on both mounts (thread orbit + Center orbit; Center resolves from its contacts read, which now carries the tie) |
| New-chat picker / Add-people picker rows | Tie as the row's quiet sub-line |
| Check-in circle headers | Group (plural) labels — unchanged, now from the one map |

**Home cards — NOT done, stated plainly:** Home plan cards name people only through the plan contract's `organizer_name` / `who_label`; the contract carries **no person id for the named person** (only `created_by_user_id`, the creator, who is not necessarily the named organizer), and the W9 card grammar (faces row + who_label) has no tie slot that wouldn't crowd it. Matching ties to cards by display name would be a guess — the exact failure this wave exists to kill. Home joins the tie map the moment the plan contract names a person by id.

### DL-04 + DL-08 — One people truth for pickers ✅
- New exported adapter `peopleUniverse({conversations, contacts, relRows})` in `C1ShellHosts.tsx`: **conversation peers ∪ relationship contacts/rows ∪ `GET /people.connected` establishments**, deduped by person id; a person with a conversation always carries its `conversationId`; ties attached from the rows.
- The new-chat picker (`ChatsHost.openPicker`) reads the union — conversations from the host's own props, relationships + establishments read fresh at open. A contact with no conversation **ensures the real direct conversation** (`ensureDirectConversation`) and opens it. C2Shell's Add-people sheet reads the same `peopleUniverse`.
- **Pin (picker-served test):** `r19Diffix.test.tsx` — with conversations populated and **`listPeople` returning `connected: []` (the audit's exact dead-end setup)**, the picker lists both people and "No one connected yet" never renders. Plus a unit pin on the union/dedupe/tie behavior.

### DL-07 — "Add people" wired ✅ (real path, not removed)
- Both `C2Shell` sites (`addPeople: () => undefined` ×2) now open an Add-people sheet over `peopleUniverse` (people already on the plan filtered out via the roster's new `userId`). A tap runs **`journeyAddPeople` → POST `/api/v1/product/journeys/:id/add-people`** (`JourneyAuthority.add_people` — real `PlanParticipant` writes, lead-gated server-side), then re-reads the detail history + plans from the server. A refusal stays in the sheet as a plain line ("Only the plan's lead can add people."). The backend path has its own suite coverage (`journey_authority_test.exs`, green in the full run).
- **Proof:** detail test — the rendered "Add people" button fires the wired event with the plan id; source pin — `C2Shell.tsx` contains no `addPeople: () => undefined` and does contain `journeyAddPeople` + the sheet.

### DL-09 — Close circle (bounded leg) ⚠️ read-side cue built; no write toggle exists to wire
**Truth found:** there is **no per-person close-circle write path**. Close-circle membership is *derived from the type* on the backend (`Lives` and `TemporaryStoryPublishing`: `spouse / partner / family / close_friend`, checked in either direction). No audience-membership record exists per person.
- **Built (read side, honest):** the profile renders **"In your close circle"** when the person's type is in the derived set (`isCloseCircleType`, mirroring the backend list). Choosing such a type **is** the membership write, through the one real write.
- **The sheet's toggle (steer restage, `3f3d59e0`):** the picker now carries a quiet close-circle toggle below the choices with real semantics through the type — ON for a friend / business / acquaintance / untyped person chooses **Close friend**; OFF from Close friend steps back to **Friend**; for spouse / partner / family it reads ON and locked ("Always on for family and partners — it follows who they are to you"), a cue rather than a pretend write. See the addendum.
- **Declared:** a close-circle membership *independent of type* (an audience-picker surface) is **not built** — it would need a backend audience record first (next build, alongside DL-10).

### DL-11 — Inference suggestion ⚠️ declared, not faked
**Truth found:** `Relationships.Inference.pending_prompt/1` exists in the domain and `Intelligence.ProductSurface.memory_transparency/1` wraps it — but **no HTTP route serves it** (the router exposes only `/memory/facts` from that area; no controller action calls `memory_transparency/1`, verified by grep), and no web contract carries a provisional prompt. The relationships index also does not expose provisional rows' inference state to the picker in a form the picker could label. **There is no served data source.**
- The picker therefore accepts an optional `suggestion` prop (pre-selects + labels "Opal's suggestion" when a host passes a real one) and **no host passes one**. DL-11 remains **declared**: it needs one served read (e.g. `inference_prompt` on the relationships index or a transparency endpoint) before any surface may show it.

### DL-13 — Seed types ✅
`HumanSeedWorld.ensure!/2`, through the real `Relationships.set_type` / `set_family_subtype` path (upserts, re-seed safe):
| Person | Tie |
|---|---|
| Chanelle Brooks | `partner` |
| Maya Torres | `close_friend` (unchanged — ABS-1 proposal leg) |
| Sabrina Nguyen | `friend` |
| Alex Rivera | `business` |
| Jordan Ellis, Nina Patel, Priya Shah, Marcus Lee | untyped — honest absence is part of the demo |

**Proof:** `human_seed_world_test.exs` pins the mix on the `contacts_with_types` read. Machine-speak gate stayed clean (see API battery below — it runs against this seeded world).

**The family-sibling leg was built, then removed after proof it breaks the battery (commit `43409998`).** As first seeded, Jordan Ellis carried `family` + subtype `sibling`. A log-verified battery run on a fresh DB then read **100/101**: FR-B3-01 (the family check-in sweep) asked **6 targets, expected 5**, with its summary counts and headline copy off by the same one. Mechanism, traced in the battery DB: the sweep resolves the organizer's **entire** family set (`SocialFlow.Checkin`); the case's five members are battery phone-pool accounts, disjoint from the seed cast, so any seed-typed family row for the viewer becomes a sixth sweep target (Jordan sat in the sweep's member rows, status `asked`). DL-13's family leg and the brief's 101/101 floor cannot both hold through the only seed path that writes types. The floor stands; the family tie is one tap away in the pack through the DL-01 picker itself, and the subtype machinery is proven by the DL-02 round-trip test. The constraint is recorded in a comment in `human_seed_world.ex` so a future wave does not re-add it blind. If the founder wants family pre-seeded, FR-B3-01's organizer-set assumption is the thing to revisit — by its owner, not by quietly editing the case.

### Declared remainders (out of scope, per brief)
- **DL-05:** the fuller first-run redesign is *not* built. This cycle's answer is DL-01 at moments of need + DL-03 rendering + DL-13 seed. Remainder: a deferrable post-Meet-Opal "Who's in your world?" step / people-first fresh landing — founder call, next build, under the 60-second law.
- **DL-10:** a standalone People hub surface is *not* built (named next build). This wave gives people a legible presence on the surfaces that already name them.
- **DL-09 write leg / DL-11 serving leg:** declared above with the exact backend step each needs.

---

## Floors (verbatim)

- **Backend full suite:** `3221 tests, 1 failure` — the one failure is `OpalCore.OtpRateLimitTest` ("does not count resend against the second phone challenge quota while first remains in quota"), a governed-clock/quota test in code this wave never touched; **re-run in isolation (with the relationship + seed files) it passes: 13 tests, 0 failures.** Count check: 3,220 baseline + 1 new DL-02 test = 3,221 — no test loss.
- **API regression (fresh dev DB, human seed):** 
  ```
  founder seed: communication status=200 graph status=200
  seed world machine-speak gate: clean (0 hits)
  summary: 101/101 PASS
  ```
  Read directly from the final run's own log (`/tmp/battery-final.log`: 101 `[PASS]` lines, zero `[FAIL]` lines, FR-B3-01 green at 88 checks). **Correction note (verification integrity):** an early battery completion notification quoted 101/101, but a duplicate delivery for the same session later contradicted it (46/101 — the server had died mid-run). I re-ran the battery cleanly and read the log myself; that verified run read **100/101** (FR-B3-01, caused by the DL-13 seed's family leg — see DL-13). Commit `43409998` corrected the seed and the final fresh-DB re-run is the 101/101 quoted here. The earlier notification's figure should be disregarded.
- **Web suite:** `Test Files 16 failed | 84 passed (100)` / `Tests 23 failed | 833 passed (856)` — failing set **exactly the baseline 23/16** measured on this branch before any change; the passing side includes the 10 new W24 pins in `r19Diffix.test.tsx`. The only baseline assertion changed anywhere is the one DL-12 pin (W13 profile: `"Close friends"` → `"Close friend"`), corrected to the singular truth the fix establishes. The 23 failing test names were also listed and checked individually: all live in legacy exact-authority / copy-guard / token files (activation, availability, designTokens, waveB*Exact, graphScroll, technicolor, …) — **none in any file or surface this wave touched**. W5 chats layout pins, W13 profile tests, W14 orbit tests: green (run explicitly, all pass).
- **Typecheck:** `9` errors — exactly baseline, all pre-existing (OpalApp ×3, productClient duplicate identifiers ×5, YouSettingsDestination ×1); none in files this wave touched.
- **Build:** `✓ built in 5.33s` (green).

**Verification-environment note (for the coordinator's rerun):** mid-session the shared Postgres on :5433 (another wave's scratch cluster) and the /tmp deps cache both disappeared. Final verification ran on a **self-owned Postgres 16 cluster on :5434** (trust auth, DBs `opal_core_test` + `opal_dev_r19diffix` created UTF8/template0) with `MIX_DEPS_PATH=~/workspace/.opal_deps_r19` (restored via `mix deps.get`, 35 packages, mix.lock versions) and `DATABASE_URL` pointing at :5434. The API battery ran the brief's recipe (`OPAL_CLOCK_OVERRIDE=2026-10-18T21:00:00Z`, synthetic provision, seed mode) against Phoenix from this tip on :4000.

## Pack recapture list (frames to re-shoot to show ties)
1. **Profile** — Chanelle's profile sheet: "Partner" tie line + "In your close circle" cue + the "Who they are to you" row. Also the **picker open on the profile** (first face: 7 human words + quiet close-circle row; tap Family → subtype step). **For a "Family - Sibling" frame:** Jordan is deliberately *not* family-seeded (see DL-13) — set it live during capture through the picker on Jordan's profile (Family → Sibling → Save), then shoot Jordan's profile reading "Family - Sibling"; that sequence is itself the DL-01/DL-02 product-path proof.
2. **Thread** — Chanelle's 1:1 thread header: sub-line reads "Partner" (was her name repeated); Jordan's thread reads "Family - Sibling" after the same live picker step.
3. **Chats list** — rows for Chanelle (· Partner), Maya (· Close friend), Sabrina (· Friend), Alex (· Business) beside the names; Jordan's row gains "· Family - Sibling" after the live picker step.
4. **New-chat picker open** — populated list (was "No one connected yet") with tie sub-lines.
5. **Graph detail** — a roster containing Jordan/Maya/Chanelle: "Name · Tie" rows; counts unchanged; plus the **Add people sheet open** over the picker (was a dead button).
6. **Orbit sheet** — Chanelle's orbit: "Chanelle Brooks · Partner" beside the name.
7. **Graphs list** — cards' people line now names people (who_label) instead of counts-only.

---

## Addendum — persona-spectrum steer applied (founder, 2026-10-19 13:53 PDT; commit `3f3d59e0`)

The identification sheet was restaged to the journey standard — brand-new,
confused, smart, and super users; **progressive depth: simple on the
surface, power underneath**:

- **First face = the plain question + the seven choices in human words.
  Nothing else competes.** The always-visible Save button is gone, the
  standalone suggestion paragraph is gone (a DL-11 suggestion, when a
  served source ever exists, now lives as a small label inside its own
  choice row and never auto-saves).
- **One tap finishes.** Tapping any type other than Family saves it
  through the one write and closes the sheet — a new user is never
  examined, never asked to confirm what they just said. The only path
  that earns an explicit Save button is a *failed* one-tap save (retry)
  and the Family depth below.
- **Depth opens only on choice.** Tapping Family does not save; it opens
  the subtype step + minor flag below the choices, with the sheet's one
  Save. A super user finds subtype + close-circle without hunting;
  nobody else ever sees the depth.
- **Close circle sits quietly below**, one plain line ("The people your
  closest moments are shared with."), as a real toggle whose semantics
  run through the type (DL-09 section, updated above).

**Proof:** 3 new pins in `r19Diffix.test.tsx` (clean first face — no
subtype step and no Save before any choice; one-tap Partner save +
close; toggle ON writes `close_friend`; partner reads ON + locked and a
tap writes nothing). File now **13/13**. Floors re-verified after the
restage: web **23 failed / 16 files (baseline exact)**, 836 passed;
typecheck **9**; build green. Backend untouched by the restage.
**Pack recapture addition:** the picker-open frame (report list item 1)
should now be shot in three states — first face (question + choices +
quiet close-circle row), Family depth open (subtype step), and the
close-circle row ON for a partner.
