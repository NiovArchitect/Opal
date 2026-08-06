# Claude — Repository Understanding

**Status:** Independent orientation report (Claude, deep-review partner)
**Repository:** `NiovArchitect/Opal`
**Worktree:** `architecture/speed-to-alignment-and-complete-journey`, HEAD `c177ba6` (= `origin/main`)
**Last updated:** 2026-08-05

---

## 1. Purpose

Before writing anything else, this document records what I actually found by reading the repository — code, tests, CI, migrations, and docs — rather than what any single document claims. Where a doc's claim and the code disagree, the code wins and the disagreement is flagged. This is the shared ground truth the rest of the docs in this handoff build on.

Method: read `README.md`, all 11 ADRs, all 25 `docs/architecture/*.md`, all 27 `docs/product/*.md`, `docs/evidence/*` (18 social-flow folders, 4 DSI phase folders, activation/relationship-universe/walkthrough-conversion folders), `docs/build/*`, `docs/decisions/*`, `docs/release/*`, `docs/scenarios/*`, `docs/ux/*`, `docs/source-material/*`; and the Elixir core, Python AI service, web client, mobile client, `packages/contracts`, `tests/`, CI workflows, and `infra/`.

## 2. Status legend

| Label | Meaning |
|---|---|
| **LIVE** | Real production traffic, real users |
| **HOSTED** | Deployed to a real environment, but synthetic identities / no real users |
| **SOURCE-COMPLETE** | Code merged, tested (unit/integration), not deployed as product |
| **SYNTHETIC** | Runs against fixture/deterministic data by design, not real inference or real people |
| **DOCUMENTED-ONLY** | Spec/product-truth exists; no feature code |
| **ABSENT** | Not present at all |
| **BLOCKED** | Explicitly gated on founder, legal, or external-provider approval |

**The single most important fact in this repository:** nothing is LIVE. The high-water mark is **HOSTED + SYNTHETIC** — a real Elixir/Phoenix API and Postgres running on Render, a real static web shell on GitHub Pages, exercised only with approved test phone numbers (`+1 202 555 0101`–`0108`) and development OTP codes. No SMS has ever been sent (blocker **B001**, still open). No real person has activated an account. The repository is unusually disciplined about saying this itself — most evidence docs carry an explicit "what must not be claimed" section.

## 3. System topology (who is authoritative for what)

Elixir/Phoenix (`apps/opal_core`) is the single writer of social truth. Everything else is a projection or a proposal:

| Layer | Owns | Authority |
|---|---|---|
| Elixir/OTP/Phoenix (`opal_core`) | Sessions, devices, message order/delivery/presence, consent, confirmed commitments, conversation membership, AI job dispatch | **Authoritative** |
| PostgreSQL (via Ecto) | Transactional store | Authoritative (ADR-0005, provisional) |
| Python (`opal_ai`) | STT, translation, drafting, plan-extraction, safety triage — all deterministic/rule-based today, no ML/LLM dependency in the repo | Proposes only; outputs are "ephemeral until accepted into Elixir state" |
| Mobile (RN/Expo) & Web (React) | Local SQLite cache, offline queue, UI projections | **Never authoritative** |

Locked design constraints, confirmed in both docs and code: no Node.js in the messaging/AI orchestration core; Python "cannot approve, grant, or authorize consent" and holds no long-term plaintext; sending a drafted message always requires explicit user action; commitments are candidates until Elixir-confirmed.

## 4. Component-by-component status

### Elixir core (`apps/opal_core`) — SOURCE-COMPLETE, the center of gravity
99 `social_flow/` schema modules, 18 migrations (2,516 lines), one real Phoenix Channel (`conversation_channel.ex`, 1,868 lines, with Presence and social-flow visibility gating), custom cookie/socket-ticket auth (no Guardian/JWT lib), Oban for background jobs, `contracts.ex` validating every payload against `packages/contracts` at runtime. 30 ExUnit test files, 7,102 lines — real, not stubs (`onboarding_test.exs`, `trust_safety_test.exs`, `consent_ai_test.exs`, `foundation_adapter_test.exs`, etc.).

### Python AI (`services/opal_ai`) — SOURCE-COMPLETE, SYNTHETIC by design
FastAPI service, 20 modules / 2,169 lines. **Every worker is deterministic regex/rule logic — no OpenAI/Anthropic/torch/transformers/sklearn dependency anywhere in the repo.** `worker.py`: "Deterministic AI workers — no external providers, no persistence." This is a bounded, privacy-constrained rules engine standing in for AI, not an LLM integration. 581-line test file.

### Web (`apps/opal_web`) — SOURCE-COMPLETE
React 19 + Vite + TS, ~3,900 lines across onboarding, activation, realtime, theme/brand, people, experience. 11 test files. Real Phoenix-socket realtime client, not a mock.

### Mobile (`apps/opal_mobile`) — SOURCE-COMPLETE
Expo/RN, ~4,460 lines, real SQLite persistence, SecureStore, Contacts integration, 18 Jest test files. Dev-client build; no EAS/store config.

### `packages/contracts` — real, cross-language enforced
11 JSON Schemas loaded at runtime by **both** Elixir and Python, with rejection tests on both sides. One of the most genuinely productionized parts of the repo.

### `tests/` (top level) — mixed
`tests/journeys/` is real (two-client WebSocket E2E, container roundtrip). `tests/contracts/`, `tests/load/`, `tests/privacy/`, `tests/safety/` contain only `.gitkeep` — the *concerns* are tested (inside the Elixir/Python suites), but these top-level directories are empty scaffolding.

### CI (`.github/workflows/ci.yml`) — real
5 jobs: Python (ruff/mypy/pytest + secret scan), Elixir (Postgres service container, `mix test`, credo, hex.audit), Docker builds, mobile (tsc + jest), web (vitest + vite build, uploads artifact — **does not publish**).

### Deployment
- **API:** hosted on Render via `deploy-opal-api.yml` (manual `workflow_dispatch` → GHCR → Render API patch). Real, but imperative (no `render.yaml` in repo) and confirmed only as *configured*, not continuously verified live from a static read.
- **Web:** `https://opal.niovlabs.com`, served from a `gh-pages` branch — genuinely deployed and live-reachable as a *static shell*. `docs/release/PUBLIC_WEB_DEPLOY.md` describes a Cloudflare Pages runbook that does not match the actual GitHub Pages mechanism used — doc/reality drift, not a functional problem.
- **Kafka:** DEFERRED-STUB. `lib/opal_core/events/adapters/kafka_adapter.ex` is 17 lines and returns `{:error, :kafka_not_operational}`. No Kafka client dependency anywhere (`mix.exs` has no brod/kaffe). `docs/architecture/KAFKA_ACTIVATION_ADR.md`: "Accepted direction. Not operationally deployed." This is exactly why the operating rules for this worktree forbid connecting Kafka to production — the transport is deliberately abstracted (`OpalCore.Events.Publisher` → outbox → `LocalAdapter`) so that swapping in a Kafka publisher is a small, tempting, and currently-prohibited change.
- **Foundation bridge:** a real 332-line HTTP adapter exists (`foundation_http_adapter.ex`) but is disabled by default, allowlisted to exactly two event types (`invitation.accepted`, `relationship.accepted`), and explicitly forbidden on hosted Render (`OPAL_FOUNDATION_INGRESS_URL` "Must never" be set there). "Foundation" here is a separate/sibling platform Opal is designed to be *compatible with*, not a legacy system being migrated off.

## 5. Product-truth shape (what's decided vs. open)

The `docs/product/` corpus is unusually disciplined: **concepts are locked, numbers are open.** Nearly every doc on minors, groups, location, or money carries an explicit "not shipped" / "conceptual, not a shipping authorization" header, even while stating strong design principles as settled law.

**Settled (Phase 0 product truth), in the docs' own words:**
- North star: *"Opal understands how you relate to people and the world around you, then helps the right experiences take shape with almost no work."* (`Opal_PRODUCT_TRUTH.md`)
- User-effort doctrine: the user should experience nothing, one confirmation, one correction, or one private choice — never configuration homework.
- Uncertainty doctrine: no relationship health scores, ever, visible or hidden — "Rejected forever."
- Consent flagship rule: "Opal must never surprise User B with User A's private reflections." (`CONSENT_MODEL.md`)
- Elixir owns all authority; Python proposes only; drafting/sending always requires user approval; no silent commitments, no silent RSVP, no silent calendar writes.

**Explicitly open** (see `GAPS_AND_OPEN_DECISIONS.md`, G001–G064, and `OPAL_OPEN_DECISIONS_RELATIONSHIP_UNIVERSE.md`, RU-001–RU-053): phone-verification provider, AI-master default (stated inconsistently as "off," "soft-on," and "opt-in" across three docs), server-visibility-during-AI-processing vs. the E2EE promise, all numeric age cutoffs, guardian visibility defaults, monetization, child-to-child messaging (RU-030: **"ACCEPTED direction: NO"** for the first slice).

**Scope reality that must not be blurred:** parents/children/child-to-child/groups/creator-following are described as **first-class in the product model** but are **ship-gated** — "MVP / first engineering populations remain adult-only until legal and child-safety gates close" (`RELATIONSHIP_SAFETY_RULES.md`). Only adult 1:1 messaging is actually in MVP scope today. Every document in this handoff that describes broader journeys (groups, solo/local discovery, network effects) says so explicitly rather than implying build authorization.

## 6. Evidence-directory status (representative, not exhaustive)

| Workstream | Status | Note |
|---|---|---|
| Phase 0 (product/architecture truth) | DOCUMENTED-ONLY by design | `PHASE_0_REPORT.md`: "Implementation begins only on next-slice criteria." |
| Build Slice 1 (contracts + AI round-trip) | SOURCE-COMPLETE, proven locally | Real multi-container E2E, consent-gate 403, idempotency, refusal path all exercised. |
| Build Slice 2 (realtime + mobile shell) | SOURCE-COMPLETE, SYNTHETIC auth | Phoenix Channels + presence proven with DevAuth users, not real accounts. |
| Social Flow 1–15 | SOURCE-COMPLETE (domain/ExUnit) or DOCUMENTED-ONLY, mixed by slice | Evidence pattern = closure report + gate matrix + ExUnit refs, not screenshots. |
| Social Flow 16 | HOSTED + SYNTHETIC | Two synthetic users complete activate/invite/accept/message on Render. |
| Social Flow 17 | HOSTED + SYNTHETIC, **partially complete** | Chrome realtime proven in-browser; Safari gate blocked (needs interactive `safaridriver` auth); durable GHCR image pull failed (403) — live service ran on a 24-hour ephemeral `ttl.sh` tag. |
| Social Flow 18 | HOSTED (API) + SOURCE-COMPLETE (Android APK), **partially complete** | Android APK built clean; never run on a physical device ("no phone attached"); iOS paused, no Apple credentials. |
| Dynamic Social Intelligence Phase 0 | DOCUMENTED-ONLY | Explicitly: "algorithms are not live, location is not live, providers are not live." |
| DSI Phase 1–2 | SOURCE-COMPLETE, SYNTHETIC | Local tests pass against fixture data; "not claimed: live location, real providers, real booking." |
| DSI Phase 3 | SOURCE-COMPLETE, **runtime on hold** | Merged, CI green, 26/26 tests — but explicitly "HOLD proposal-only until founder live review." Git log says "Phase 3 completion"; that means source completion, not a live feature. |
| Real User Activation | Audit only, not started | "Implementation not yet authorized or executed." |
| Walkthrough / conversion copy | HOSTED (live) + SYNTHETIC comprehension testing | The walkthrough copy is genuinely live on the public site; the comprehension research behind it is labeled "simulated, not external human research." |
| Technicolor theme system | HOSTED / LIVE on the public web shell | Real, tested theme tokens (`technicolorProduction.ts/css`), merged via PR #56, deployed to `gh-pages`. |
| Peak Brand Phase 0 | DOCUMENTED-ONLY, isolated, unmerged | See §7. |

**Overclaim watch (verbatim phrases worth reading carefully):**
- `walkthrough-conversion/LIVE_JOIN_AND_AUTH_SHELL_PROOF.md` says *"Join through real authentication is live-proven."* The mechanics are real (real HTTP calls, real session/cookie machinery) but "real authentication" means a synthetic test-fixture number, not a real person — the same doc says so ("clean synthetic fixture"). Read as "hosted synthetic activation proven in-browser."
- `docs/evidence/social-flow-17` closure language calls a container image "durable" while the same evidence file records the GHCR pull failing with 403 and the live instance running on a 24-hour ephemeral tag.
- `CURRENT_STATE_TRUTH_MATRIX.md` (2026-08-02) says "Web → Elixir API: ABSENT" — true on that date, contradicted by SF16–18 evidence one to three days later. Stale, not dishonest, but a trap for anyone who reads it as current.

## 7. The Peak Brand Phase 0 package — where it actually lives

It is **not on `main` and not in this worktree.** It exists as a single commit, `fa44f41` ("docs(design): Peak Brand Phase 0 audit, prototypes, dual-AI handoffs"), on branch `design/opal-peak-brand-prototypes`, reachable only via `git show fa44f41:<path>`. That branch is untouched by this worktree, consistent with the operating rule against editing another agent's worktree — I read it via `git show`, not by checking it out.

Contents (verified firsthand): a program charter (`docs/build/PEAK_BRAND_FIRST_FIVE_SECONDS.md`), a standalone founder-only HTML prototype (`apps/opal_web/public/experiments/peak-brand-review.html`, 587 lines, `noindex`, red "not production" chrome), a nine-defect live-brand audit, three brand-arrival motion concepts, an Opal-moment/execution copy standard, an audience-research memo, and three coordination files (`GROK_CLAUDE_HANDOFF.md`, `CLAUDE_TO_GROK_BRAND_HANDOFF.md`, `GROK_TO_CLAUDE_BRAND_RESPONSE.md`).

One thing worth naming plainly: the `CLAUDE_TO_GROK_BRAND_HANDOFF.md` file's own header reads *"Filled by Grok deep-audit pass when Claude terminal is not online."* That's disclosed, not concealed — but a reader skimming the coordination ledger past that header could mistake a single-party self-review for the two-party review it's formatted to resemble. I verified this firsthand with `git show fa44f41:docs/coordination/CLAUDE_TO_GROK_BRAND_HANDOFF.md`. Full agreement/disagreement with the package's substance is in `CLAUDE_TO_GROK_ALIGNMENT_HANDOFF.md`.

The package's isolation discipline is good: red warning chrome, `noindex`, explicit "Does not: merge production brand changes, close SF18, connect Kafka, enable SMS." It never touched production. Its central finding — that the shipped walkthrough blurs "what a person said" and "what Opal is doing" in the booking scene — is independently confirmed in §8 below and in `OPAL_HUMAN_AND_AI_STATE_MATRIX.md`.

## 8. One verified, live, unresolved copy defect

Confirmed firsthand at `apps/opal_web/src/onboarding/FirstRunExperience.tsx:201-203`, currently live on the public walkthrough:

```
"After 6:30 works for me."          (human bubble)
"I'll book Harbor Table."           (human bubble)
"Thursday · 7:00 PM"                (gold chip, no attribution)
```

Nothing here distinguishes what the person said from what Opal is doing, and nothing distinguishes a proposal from a confirmation — no reservation exists anywhere in the system at this stage. This is a real, live violation of the product's own stated principle that Opal must never let AI or system text read as human speech, and must never claim booking as fact without real execution authority (`EXPERIENCE_COLLABORATION_AND_NUANCE.md`; `OPAL_MOMENT_EXECUTION_COPY.md`). It is cheap to fix (copy + attribution only, no backend dependency), already has a prototyped direction in the Peak Brand package, and is the basis for the recommended first vertical slice in the handoff document.

## 9. What this understanding does *not* cover

I did not run the Elixir/Python/web/mobile test suites myself (no runtime work was in scope for this assignment) — status classifications above come from reading source, tests-as-written, CI config, and migration history, not from executing them. `docs/architecture/CHILD_SAFETY_THREAT_MODEL.md`, `MINOR_AND_FAMILY_PRIVACY.md`, and the youth-specific ADR-adjacent gap matrices (AA-, GB-, CC- series in `docs/product/OPAL_AGE_AUTHORITY_TIERS.md` etc.) were read but are referenced rather than reproduced in full here — they are the authoritative source for any future minor-safety work and should be read directly, not summarized twice.

## 10. Related documents in this handoff

- [OPAL_SPEED_TO_ALIGNMENT.md](../product/OPAL_SPEED_TO_ALIGNMENT.md)
- [OPAL_COMPLETE_SOCIAL_JOURNEY.md](../product/OPAL_COMPLETE_SOCIAL_JOURNEY.md)
- [OPAL_AGE_12_COPY_SYSTEM.md](../product/OPAL_AGE_12_COPY_SYSTEM.md)
- [OPAL_AUTHENTIC_ALIGNMENT.md](../product/OPAL_AUTHENTIC_ALIGNMENT.md)
- [OPAL_SOLO_AND_GROUP_ALIGNMENT.md](../product/OPAL_SOLO_AND_GROUP_ALIGNMENT.md)
- [OPAL_NETWORK_EFFECT_JOURNEYS.md](../product/OPAL_NETWORK_EFFECT_JOURNEYS.md)
- [OPAL_HUMAN_AND_AI_STATE_MATRIX.md](../product/OPAL_HUMAN_AND_AI_STATE_MATRIX.md)
- [ALIGNMENT_GAP_MODEL.md](../architecture/ALIGNMENT_GAP_MODEL.md)
- [MINIMUM_QUESTION_ENGINE.md](../architecture/MINIMUM_QUESTION_ENGINE.md)
- [PERMISSIONED_RELATIONSHIP_KNOWLEDGE.md](../architecture/PERMISSIONED_RELATIONSHIP_KNOWLEDGE.md)
- [LOCATION_ALIGNMENT_ENGINE.md](../architecture/LOCATION_ALIGNMENT_ENGINE.md)
- [CLAUDE_TO_GROK_ALIGNMENT_HANDOFF.md](./CLAUDE_TO_GROK_ALIGNMENT_HANDOFF.md)
