# Repair #19 — CLOSING HANDOFF (W11, 2026-10-19)

**Gates unchanged: FOUNDER_ACCEPTED = NO · FREEZE = HOLD · PASS2 = NO.**
Nothing merged to a protected branch; no production deploy; no walk
link issued — the founder reviews Pack V2 first.

## What shipped, by catalog

- **WALK-5 (W5-01…W5-28):** 26 GREEN, 2 DECLARED in part — W5-02
  (imagery leg fails at the rendered layer, finding F1) and W5-15
  (connected in-call frames owed, finding F5). Full table with
  evidence: `shots/repair19/WALK_ACCEPTANCE.md` §1.
- **Blind spots (BS-01…BS-12):** 9 fixed, BS-07 fixed in part
  (JA-05 rider), 2 named exceptions carried (BS-06, BS-10). BS-01
  closed on the final tip by the battery's step zero.
- **Journey audit (JA-01…JA-13):** JA-01…JA-12 fixed in W20-FIX
  (incl. the JA-01 joint contract test and JA-03 served-breadth
  pin); JA-13 is a named exception.
- **Companions:** retrospective (`retrospective-report.md`: 0/14
  charged checks at full breadth; 36 widenings recorded) and the
  capability totality trace (`totality-trace.md`: 43 rows, 0
  silently missing) ship with the delivery, referenced from the
  acceptance record.

## Final battery — verbatim results (tip `3e230af0`)

| Leg | Result |
|---|---|
| Step zero fresh-DB migrations | **113 files = 113 schema_migrations rows = 113 distinct versions, max `20261030010002`; both R19 legs present** (orbits `20261030010001`: 9 `opal_conversations` columns; graphs `20261030010002`: `shared_plans.is_private/place_lat/place_lon`, `graph_locks`, `plan_location_shares`) |
| Backend unpinned | **3220 tests, 0 failures** (132.8s) |
| Backend pinned 02:00 LA (`2026-10-18T09:00:00Z`) | **3220 tests, 0 failures** (145.3s) |
| Backend pinned 14:00 LA (`2026-10-18T21:00:00Z`) | **3220 tests, 0 failures** (144.5s) |
| FollowThrough forewarning | Did not fire in either pinned leg; hazard (test builds its quiet window from real `utc_now`, follow_through_test.exs ~line 108) classified on record in the battery report — nothing retried away |
| API regression (fresh dev DB, human seed) | **101/101 PASS; seed world machine-speak gate: clean (0 hits)** |
| Web suite | **Test Files 16 failed \| 198 passed (214); Tests 23 failed \| 1683 passed (1706)** — failing set exactly baseline. (First run showed a 17th file: stale `node_modules` missing JA-08's `playwright-core`; repaired with `npm ci`, re-run in full, reported in the battery — not hidden.) |
| Typecheck | **Exactly 9 distinct errors, zero delta** |
| Build | **Green** (twice, plus the pack build) |
| Mobile | **105/105, 22/22 suites** |
| Pattern posture | **TOTAL 118** — MP-2 81, MP-6 26, MP-11 11; MP-1/MP-3/MP-4 = 0; no rise |

Full report: `coordination/repair19/final-battery-report.md`.

## Mirror push

`muse/repair-19` (created at the R18 pushed tip, then mirror-pushed
via the established API method): new commit
**`043fe708530165042461ba430f699449d6976a2a`**, tree
**`0358454b517ce3b8647ed4903682860c8d53700a` == local tree**,
**VERIFIED: remote tree == local tree (7,005 entries)**, also
confirmed by direct ref read.

## Pack V2 inventory

`~/workspace/opal-graph/shots/repair19/pack-v2/` — **136 stills +
2 motion files (138 total)**: pack root (Settings family leading,
Home, Center deck + Orbits, chats/thread, calls, graphs family,
share, profile, in-call attempt), `splash/` (settled + living +
reduced-motion + dock close-ups + 2 motion webm), `probes/` (W3
probe frames incl. dock-glass and C2 close-ups both modes).
Manifest: `pack-v2/manifest.json` (badge `seed - 3e230af`, per-frame
surface/mode/probe results, probe + splash summaries, findings).

- **Motion fidelity verdict: PASS** — `videoMethod:
  "cdp-screencast+ffmpeg-vfr"` in both modes (dark 880 frames /
  18.8s / 46.8 avgFps; light 902 frames / 18.5s / 48.6 avgFps).
  No recordVideo fallback anywhere.
- **W3 probe verdict: PASS both modes** — haloGap 3.78px both
  sides; glass `blur(18px) saturate(1.35)` with per-mode tints
  (dark alpha 0.62, light 0.68); glassPixel ratio 0.066 / 0.078;
  glassPerf 60 frames, p95 16.7–16.8ms.
- **Mode truth:** the pack stack serves the pushed-tip code built
  with the documented served-build flag `VITE_OPAL_SHELL=c2`;
  per-mode probes in the manifest prove `data-mode` resolves
  (dark ground #0d0b12). See finding F7 for the hazard this
  uncovered.

## Pack findings (named items — full text in the battery report)

F1 imagery bearer wall (W5-02 declared) · F2 dark-mode primary
buttons illegible · F3 call-log pill clipping · F4 Center queue
title clip (minor) · F5 in-call frames owed (environment) · F6
orbits rail settle observation · F7 `VITE_OPAL_SHELL=c2`
build-config hazard · ABS-1 orbit proposal chip honestly absent.
All are entered as permanent rows in
`shots/repair19/COMPLAINT_LEDGER.md` §P. No app code was changed
in W11.

## Named exceptions carried (7)

1. **J2 Live host/viewer wave unbuilt** — Live journeys beyond the
   shipped surface remain a build wave, not a fix.
2. **J5 capsule edit = W-GAP-03 pipeline** — memory capsule editing
   ships through the wallet-build pipeline, not this repair.
3. **BS-06 distance writer absent** — graph detail shows
   permission-honest location states; no current-position/distance
   writer exists, and none is faked.
4. **F-16 live transcription still not wired** — no live call has
   exercised the transcription path; surfaces state what is real.
5. **JA-13 mobile lockfile / expo-location** — `expo-location@18.1.6`
   missing from the mobile lock file; suite green from installed
   modules; no mobile path changed in R19.
6. **The 36 retrospective widenings** — the gate-building backlog
   (RW/RW2/NC series), named in the retrospective report.
7. **`opal_reset_first_run` references in founder checkpoint
   tooling** — flagged by JA-05; the in-app recovery path was
   redesigned, the tooling references remain for founder-side
   cleanup.

Plus the pack findings F1–F7/ABS-1 above (F1 and F5 are the
exceptions behind the two DECLARED catalog rows).

## Bad-actor / teeth summary

Pattern posture on the final tip is **118, explained, no rise**:
MP-2 81 = the seed-mode fixture sites (19 web seed-flow sites
across 8 files + 62 inline `"seed-*"` literals; backend 0) — the
W1 human seed world itself, behind the permanent machine-speak
gate that ran clean in this battery; MP-6 26 = the annotated
unscoped-memory read sites (incl. R19's owner-erasure additions,
each annotated at the site); MP-11 11 = indicator-drift files on
record. The teeth that matter stay at **zero: MP-1 (scripted
responder reachable) 0, MP-3 (per-surface re-derivation) 0,
MP-4 (canned provider output) 0**. The final battery's API leg
re-ran the seed gate against a fresh DB (clean, 0 hits), and the
journey audit's JA-02 seal closed the private-plan shadow class
with its two bounded exceptions on record.

## FOUNDER-GATED list — unchanged, plus deltas

Everything on R18's founder-gated list still stands, unchanged.
R19 adds:

- **Merge of `muse/repair-19` itself** (and every other merge) —
  founder only; the branch is pushed and tree-verified, nothing
  merged.
- **Orbits name pick** — the concept ships behind one copy
  constant; the final name is the founder's.
- **FOUNDER_ACCEPTED for Repair #19** — stays NO until the
  founder reviews Pack V2.
- **Device walk for the owed in-call frames (F5)** — scheduling
  is the founder's.
- **Disposition of the 7 named exceptions + F1/F2/F3/F4/F7 fix
  scheduling** — next-cycle scope is the founder's call.

## Records written by W11

- `coordination/repair19/final-battery-report.md` (battery + pack findings)
- `coordination/repair19/closing-handoff.md` (this file)
- `shots/repair19/WALK_ACCEPTANCE.md` (W5 + BS + JA dispositions)
- `shots/repair19/COMPLAINT_LEDGER.md` (WALK-5 section + §P rows)
- `shots/repair19/pack-v2/` (pack + manifest)

---

## W22 ADDENDUM (2026-10-19) — Functional Accountability Statement

Wave W22 executed the founder's W5-29 law (whole pipe per journey,
on the served build) against this handoff's final tip `9a0a1be4`
(fresh DB `opal_dev_r19w22`, 113/113 migrations, pinned clock,
two review accounts + foreign account, Chromium 390×844). The full
statement — per-journey chain links with citations or this wave's
own run artifacts (`~/workspace/opal-graph/w22-scratch/`) — is:

**`coordination/repair19/functional-accountability.md`**

Verdicts: J1 PROVEN · J2 EXCEPTION (absence re-verified honest) ·
J3 PROVEN (BS-06 carried) · **J4 CHARGED — FA-01** (served Chats
"Search people or conversations" input is a dead control: no
value/onChange/filter, `C1Surfaces.tsx:1175`; typed query leaves
the list unfiltered at the rendered layer) · J5 PROVEN for forget
(edit leg = W-GAP-03 exception) · J6 PROVEN at stated levels
(API + DB lineage for the in-call pause leg; F5 frames carried) ·
**J7 CHARGED — FA-02** (orbit unlock prompt portals outside the
`[data-design="r18"]` wrappers, so its only CSS rule never
matches: it renders static/clipped under the rail and its submit
button is not tap-hittable; API unlock and keyboard-submit
unlock both proven — the break is the prompt's presentation
link, and it explains W11's uncapturable `orbit-private-gate`
frames) · J8 PROVEN · J9 PROVEN · F1/F7 PROVEN by W21 citation
(citations verified to resolve). FA-01 and FA-02 are entered as
permanent rows in `shots/repair19/COMPLAINT_LEDGER.md` §P, each
with a do-not-ship ruling for its link. Gates unchanged:
FOUNDER_ACCEPTED = NO · FREEZE = HOLD · PASS2 = NO.

**FOUNDER UPDATE folded in (2026-10-19 12:26 PDT):**
(1) **Calls voice leg = FOUNDER-PROVEN** — the founder
personally completed a real Opal call today (computer and
phone in separate rooms, two different accounts); this
supersedes W11's F5 headless ceiling for the voice leg, and
the J6/ingestion gap narrows to exactly one item: **live
graphing/transcription of calls into memory** (batch
transcription works — connections verification; live is the
unwired leg, F-16, declared). The ledger's F5 row carries the
same reframing. (2) The statement gains an **INGESTION
section**: the call chain and the chat chain, link by link,
with where the memory actually sits today IN CODE
(`messages`/`opal_messages` → `intelligence_events` →
memory-wallet capsules read only via `CapsuleRead`, plus
extracted rows across ~10 tables) and, in a separated
paragraph, what the wallet build adds per WALLET_MAP
§D-ING/§F (admitted-capsule store, one SCB, signed audit
chain). (3) **LLM layer:** provider swappable by config
(DeepSeek today, via `OPAL_LLM_PROVIDER`); the
response-quality north star is Claude-grade conversational
behavior (ingest → perceive → respond).

**VISION RECORD (founder, 2026-10-19 13:36 PDT — product
architecture, NOT a build item; recorded north star for the
agentic layer):** the roadmap's north star for the agentic
layer is a **multi-agent coordination layer** — Opal runs
multiple agents on the backend for each user, working in
parallel on that user's behalf, and agents of different
parties coordinate with each other to reach resolutions
(agent-to-agent alignment over the graph). All of it runs
**through the Memory Wallet**: an agent acts only inside its
own user's wallet scope and permissions; cross-party
coordination happens only on shared capsules/plans with
consent lineage — never inside another user's private memory;
every consequential agent action is ledgered and, where the
user's mode requires, approval-gated; surfacing obeys QUIET
(agents work silently; the user sees outcomes and what needs
them, not machinery). This is the intelligence-phase
architecture the wallet build serves; the sequencing law is
unchanged (repairs pristine first). **None of this is built
or claimed as built** — it is recorded here as the roadmap's
north star for the agentic layer.

## Roadmap addendum — monetization model + value loop (founder, 2026-10-19 13:44 PDT)

The wallet data model, stated precisely: users MONETIZE their own first-party data. Opal brokers sharing ON BEHALF of users, out of their memory wallets, only what is permissioned and only at the granted scope. The reward to the user is MONEY and/or experiences and access, calibrated to the data class and the incentive design. The user is the seller; Opal is their broker; the wallet is both vault and brokerage account.

The value loop: the money users earn through wallet brokering is SPENDABLE — within the applications connected to Memory Wallets (the domain family: Opal, Otzar, and future wallet-connected apps) and to pay for things in the real world. The wallet is therefore also the person's portable value account across the federated domain system: earn in one domain, hold in the wallet, spend anywhere the wallet reaches.

(Architecture/roadmap record, aligning with the Sovereign Wallets document in the corpus. None of this is built in Repair #19; it is the model the wallet build serves.)

## Record note — persona spectrum (founder, 2026-10-19 13:53 PDT)

The journey standard spans the human spectrum — brand-new users, confused users, smart users, super users — with onboarding and contact-connection journeys that never confuse: a new user enters their data and connects to their contacts without friction or bewilderment, while a super user is never slowed by the same path (progressive depth: simple on the surface, power underneath). Credited as this lens's evidence: the differentiation audit's cold fresh-user walks (the freshC captures in coordination/repair19/differentiation-audit.md + diff-audit-shots/). Persona attribution for this delivery's journey claims: the W10 journey audit and the W22 functional-accountability chains were walked as the founder-persona/operator on fresh seeded accounts; the cold new-user and investor personas were walked by W23. Ambience + notification wiring and the multi-task agent layer (parallel tasks without noise) are reaffirmed as designed direction, already on record above.

## Design notes — ambience doctrine (founder's formulation, 2026-10-19 13:57 PDT)

The governing statement of the ambient system: ambience is BEHAVIOR, not decoration and not "automation" — it is Opal's proactivity made visible. The ambient lighting, colors, patterns, moving light and shadow around and across screens INFORM the user of what is happening; users LEARN the language (persistent color/pattern scheme) until reading it is instant and rewarding. Doctrine in one line: NOT JUST COOL — INFORMATIVE. Every ambient element must first answer "what does this tell the user?" (the standing ambient justification rule, under which every ambient element in this build carries its recorded reason); beauty is the by-product of it being true. Especially on the social screen, the ambient social light is part of how people perceive each other's activity and Opal's work.

## Design notes — notifications: the bell's absence is deliberate (founder, 2026-10-19 14:06 PDT)

Opal has no notification bell, by design. The ambient identifiers ARE the notification language — preferred over a bell explicitly because, for deaf and hard-of-hearing users, the visual ambient identifiers carry what sound-based systems cannot. The channel is accessible by construction: no cue depends on sound; no cue depends on color alone (pattern and motion are redundant channels); and reduced-motion equivalents carry the same meaning statically, so a reduced-motion user loses no information, only movement. These properties are stated as rules in the Ambient Rulebook and verified as claims in the Ambient Truth Audit (coordination/repair19/).

---

## FINAL BLOCK (W28-CLOSE, 2026-10-19) - the delivery's final state

**Final tip:** `95319bd734e8e487dd450650c66d7378b9dbf921`
(`95319bd7`, merge of W27-ATFIX on top of W25-FAFIX, W24-DIFF, and
W21's `9a0a1be4` + two record commits) on `muse/repair-19`.
**Pushed:** mirror commit `60d6f8b06486a9abe8f766c4d25cc2b50ebc20be`
via the established API mirror method from the integration worktree.
**Tree proof:** pushed commit's tree
`62a6149a3f4a020a597e87e095d36257f6c6217f` == local tip's tree;
the push script's entry-by-entry verification reads **VERIFIED:
remote tree == local tree (7,022 entries)**, and the ref + commit
were independently read back through the GitHub API (ref =
`60d6f8b0`, its tree = `62a6149a`, parent = the W21 pushed commit
`e1154696`).

**Final battery summary (W28, on `95319bd7`; verbatim in
`coordination/repair19/closing-report.md`):** fresh-DB migrations
113 = 113 = 113 distinct (max `20261030010002`, both R19 legs
present); backend **3,224 tests, 0 failures** unpinned and
**3,224 / 0** at the governed clock pinned to 14:00 America/Los_Angeles;
API regression **101/101 PASS** with the seed world machine-speak gate
clean (0 hits); web **23 failed / 16 files - exactly the baseline
failing set** (1,750 passed / 1,773); typecheck **exactly 9**
pre-existing errors, zero delta; `npm run build` **green**; mobile
**105/105, 22/22 suites**; pattern posture **115** (MP-1/MP-3/MP-4 = 0;
MP-2 81 and MP-6 26 unchanged; MP-11 down 11 -> 8 on W27 AT-09's
decorative-canon removals - no line rose).

**Pack V2, final form:** the frames the post-W11 waves changed were
re-shot on the final tip (ties family, the FA-02 gate frames with
hittability probes, the FA-01 search + filtered frames, the W27
ambient surfaces, plus the ignition motion webm); frames for unchanged
surfaces stand as W11/W21 shot them. `pack-v2/manifest.json` carries
the final tip, the pushed SHA, the tree, per-frame replaced records,
and a `w28_recapture` block whose declared-not-recaptured entries
name exactly what could not be re-framed and why (orbit sheet reach,
the light family-profile frame, the live-crossing motion limit).

### AMBIENT TRUTH STATEMENT (post-fix truth, W28)

> **Ambient truth - what is literally true in this build, after the
> W26 audit and the W27 fixes.** Opal has a real state language, and
> it is now ONE language: every plan, on every surface, carries its
> state in the canonical hues - violet forming (dashed), red action
> needed (weighted edge), gold ready, cyan happening, quiet past -
> because the second, divergent hue family was converged into the
> canon (the `--state-*` tokens now alias the canonical family, and
> light-mode derivatives survive only as text ink). Every surface
> renders from the one shared plan projection, and the language now
> moves: when another person moves a plan while you are looking at
> the app, your surfaces repaint live - the shell subscribes to
> owner-scoped plan-state events instead of waiting for your next
> navigation. A completion is an event: the lit reveal ignites when
> it lands - its glow blooms and settles to rest over 900ms, once -
> and the dock orb takes a resting tint in the event's state family
> until you next look at it, so a completion reaches you even on
> another surface. The dock orb itself answers to state: its ambient
> rings run at live rates while something is live and rest when
> nothing is; it no longer loops one state-blind motion forever.
> Fire is scarce and means one thing: the iridescent fire frame marks
> only lit items - Opal speaking, one unanswered reveal per thread,
> and on Home simultaneous lit items coalesce so at most one card
> carries the lit register in steady state; ordinary plan cards carry
> their state as a border rule instead. Canon hues are no longer
> spent as decoration in the places the audit named. No state is
> carried by color alone: the StateStone now carries a pattern
> channel, happening carries a double-ring and pulse pattern that
> ready does not, and every state keeps its glyph and plain-language
> label. Nothing in the language depends on sound - which is why
> there is deliberately no notification bell - and under
> reduced-motion every meaning survives statically: movement is
> lost, information is not.
>
> **What remains declared, not claimed:** the legacy shell's
> unmounted ambient loops still ship unruled in dead code (AT-11 -
> erasure-pass scope); red stays scarce and verb-paired by rule
> because the research says it can drive avoidance (AT-16, kept as a
> constraint); ready gold's warmth is a cultural association, not an
> experimental finding (AT-17, downgraded in the rulebook);
> happening cyan reads calm and approachable, so its urgency is
> carried by pulse and words, not hue (AT-18, reframed in the
> rulebook). The full rule set is a delivery design-note artifact:
> **`coordination/repair19/ambient-rulebook.md`**.

### FOUNDER-GATED list - UNCHANGED, PLUS DELTAS

Everything on the R18/R19 founder-gated lists still stands,
unchanged (merge of `muse/repair-19` and every other merge; the
Orbits name pick; FOUNDER_ACCEPTED for Repair #19; the device walk
for the owed in-call frames (F5); disposition of the named
exceptions and pack findings). W28 adds these deltas from the
post-W11 waves:

- **DL-05 remainder** - the deferrable post-Meet-Opal "Who's in your
  world?" step / people-first fresh landing: founder call, next
  build, under the 60-second law.
- **DL-10 People hub** - whether a standalone People surface joins
  the served nouns: founder call, named next build.
- **DL-09 write leg** - a type-independent close-circle membership
  record (backend audience record) before any audience-picker
  surface may exist.
- **DL-11 serving leg** - one served read for the inference prompt
  before any surface may show "Opal's suggestion"; until then the
  picker shows none and fakes none.
- **AT-11 legacy erasure** - the legacy shell's unmounted ambient
  loops: erasure-pass scope, founder scheduling.
- **J2 Live** - the Live host/viewer build wave (unchanged).
- **J5 edit** - capsule edit through the W-GAP-03 wallet pipeline
  (unchanged).
- **BS-06** - the distance writer (unchanged: no current-position or
  distance writer exists, and none is faked).
- **F-16 live transcription** - still not wired (unchanged; batch
  transcription works, live graphing/transcription of calls into
  memory is the named remaining calls gap).
- **JA-13 mobile** - the mobile lockfile / `expo-location` exception
  (unchanged; suite green from installed modules).
- **The 36 retrospective widenings** - the gate-building backlog
  (unchanged).

**Gates line, unchanged: FOUNDER_ACCEPTED = NO - FREEZE = HOLD -
PASS2 = NO - FOUNDER_PHONE_PASS = NOT_CLAIMED. NO walk link - the
founder reviews the pack first.**
