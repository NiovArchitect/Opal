# Current-State Truth Matrix

**Date:** 2026-08-02  
**Repository root:** `/Users/genghishameha/Developer/NIOVI-Architect/Opal`  
**Remote:** `https://github.com/NiovArchitect/Opal.git`  
**Branch:** `main`  
**HEAD / origin/main:** `2f2c3e35a53dd6df87912d8312744bca7adde1e4`  
**Worktrees:** single worktree at repo root  
**Disk:** ~25 GiB free on volume (95% used). Residual ops risk only.

## Verified baseline (independent)

| Claim | Verification | Classification |
|-------|--------------|----------------|
| SF14 closed and merged | PR #19 merge `b0c7691` on main; closure doc `2f2c3e3` | **PROVEN IMPLEMENTATION** (docs + git history) |
| SF13 public product UI | PR #18 merge `d2fe124` is ancestor of HEAD | **PROVEN IMPLEMENTATION** |
| Live HTTPS | `curl https://opal.niovlabs.com` → 200; theme `#05060A`; assets `index-j2VJPDBI.js` | **PROVEN IMPLEMENTATION** (live-runtime evidence) |
| Lumen Lens brand on live | favicon + `/brand/opal-mark.svg` 200; JS contains product tagline and first-run key | **PROVEN IMPLEMENTATION** |
| CI run 30728632496 | Reported for SF14 PR; not re-run in this audit; SF14 merge is on main | **REPORTED IMPLEMENTATION** (historical) |

---

## Capability matrix

Labels: **PROVEN** · **REPORTED** · **FOUNDER-DIRECTED** · **MOCKED** · **SEEDED** · **SYNTHETIC** · **NON-AUTHORITATIVE SURFACE** · **AUTHORITATIVE DOMAIN PATH** · **EXTERNALLY BLOCKED** · **RESIDUAL RISK**

### Product surface (public web)

| Capability | State | Evidence | Notes |
|------------|-------|----------|-------|
| First-run walkthrough | PROVEN + SEEDED surface | `apps/opal_web/src/onboarding/FirstRunExperience.tsx`; tests | Motion intro; local only |
| Walkthrough completion persistence | PROVEN (browser only) | `localStorage` key `opal.firstRun.v14.completed` | Not server-side |
| Begin / Get Started after walkthrough | FOUNDER-DIRECTED gap | Enter Opal only dismisses intro | No phone activation UI |
| Chats-first shell | PROVEN UI / SEEDED data | `OpalApp.tsx`, `data.ts` | Static CHATS/THREADS |
| Signal chips in UI | SEEDED + NON-AUTHORITATIVE | Hardcoded in `data.ts` | Not Elixir `AttentionSignal` live |
| Lumen Lens logo / futuristic UI | PROVEN | brand assets, MASTER.md, live | Preserve |
| Web → Elixir API | ABSENT | No `fetch` / `api/v1` in `opal_web/src` | Shell is non-authoritative |
| Web → Phoenix Channels | ABSENT | No socket client in opal_web | |
| Em-dash free product copy | FOUNDER-DIRECTED residual | Em dashes remain in brand/onboarding copy | Founder rule: no em dashes |

### Identity and activation (Elixir domain)

| Capability | State | Evidence | Notes |
|------------|-------|----------|-------|
| Phone normalize E.164 | PROVEN (domain) | `Onboarding.normalize_e164/1` | +1 region |
| Verification challenge request | PROVEN + SYNTHETIC | `Onboarding.start_verification/1` | Codes from `@synthetic_codes` |
| Verification confirm | PROVEN + SYNTHETIC | `Onboarding.complete_verification/1` | Creates/restores User |
| Synthetic SMS provider | PROVEN SYNTHETIC | `provider_reference: "synthetic-sms-…"`; codes map | Not production SMS |
| Production SMS provider | EXTERNALLY BLOCKED | Blocker B001; TELEPHONY/identity honesty SF10 | No Twilio/etc. adapter wired for prod |
| Rate limiting (verify/resolve) | PROVEN domain | `check_rate_limit/3`, buckets | Tested |
| Account create / restore | PROVEN domain | `finish_verified/5` | HumanAccount = User |
| Session registration | PROVEN domain | `TrustSafety.register_session/1`, `DeviceSession` | On verify complete |
| Session refresh tokens (production auth) | RESIDUAL / partial | DeviceSession has refresh_family; socket uses DevAuth | No Bearer session API on public routes |
| Sign-out / revoke session | PROVEN domain | `TrustSafety.revoke_session/1` | Not exposed as product HTTP |
| Device registration | PROVEN domain (label) | session + device_label | Not full device attestation |
| Profile / display name | PROVEN partial | `display_name` on complete_verification | No full profile product API |
| HTTP routes for onboarding | ABSENT | `router.ex` has health, messages, ai-jobs, dev only | Domain not product-routed |
| Socket auth for real sessions | SYNTHETIC / blocked in prod | `UserSocket` requires `dev_auth_enabled` | Production connect returns `:error` |

### Social graph

| Capability | State | Evidence | Notes |
|------------|-------|----------|-------|
| Manual contact resolve | PROVEN domain + SYNTHETIC | `Onboarding.resolve_contact/1` | Digest match; rate limited |
| Full address-book sync | ABSENT by design | SF10 honesty; mobile prohibited copy | FOUNDER allows selective only |
| Invitation create / view / accept / decline / revoke | PROVEN domain | `Onboarding.create_invitation` … | ExUnit onboarding_test |
| Invitation delivery (SMS/push) | SYNTHETIC / EXTERNALLY BLOCKED | In-app invitation record; no prod SMS | |
| Relationship context on accept | PROVEN domain | accept creates establishment + conversation membership | |
| Conversation create | PROVEN domain + messaging | Messaging schemas + accept path | |
| Message persist | PROVEN AUTHORITATIVE | `Messages.accept_message/1`, Postgres | |
| Realtime delivery | PROVEN in dev auth | ConversationChannel `message:send` / broadcast | Two-client journey script exists |
| Reconnect / history | PROVEN partial | channel history handlers; slice-2 WS journey | |
| Block / report | PROVEN domain | `TrustSafety.create_block/report` | |
| Isolation | PROVEN tests | Taylor denied, blocks override invite | |

### Social signals / AI

| Capability | State | Evidence | Notes |
|------------|-------|----------|-------|
| Plan extract proposal (Python) | PROVEN bounded | opal_ai social_flow_plan_extract; lifecycle tests | Proposal only |
| Follow-through / open-loop domain | PROVEN domain | SocialFlow modules SF2–7 | |
| First signal in **live public product** | SEEDED | Web UI chips not wired to domain | Gap for real journey step 20–22 |
| AI required for messaging | Must not | Architecture | Messaging independent of Python |

### Clients

| Surface | State | Notes |
|---------|-------|-------|
| `opal_web` | NON-AUTHORITATIVE + SEEDED | Polished SF14; no auth/API |
| `opal_mobile` | SYNTHETIC fixtures + shell | Fixed Alex/Jordan IDs; DevAuth-style realtime; SF modules local |
| Elixir API (dev) | SYNTHETIC auth | `X-Opal-Dev-User-Id` header |
| Elixir API (prod config) | Auth required without product session path | DevAuth disabled → 401 |

### Tests (existence, not re-executed in full this audit)

| Suite | Classification | Notes |
|-------|----------------|-------|
| `onboarding_test.exs` (~10 tests) | PROVEN domain tests | Verify, invite, accept, reassign |
| `conversation_channel_test.exs` | PROVEN domain tests | Messaging realtime |
| `lifecycle_test.exs` | PROVEN domain tests | Plan social flow |
| `opal_web` vitest 22 | PROVEN UI tests | Identity/copy/smoke only |
| Two-user WS journey script | REPORTED / available | `tests/journeys/slice_2_two_client_websocket.mjs` |
| Full production telecom E2E | ABSENT | |

---

## Real vs demonstrated (executive)

| Layer | Verdict |
|-------|---------|
| Visual product (live web) | Real polish; **seeded journey** |
| Elixir social + messaging domain | **Substantial AUTHORITATIVE DOMAIN PATH** under tests |
| Product HTTP/session surface for real users | **Not productized** |
| Production phone verification | **EXTERNALLY BLOCKED** |
| End-to-end real relationship for strangers on opal.niovlabs.com | **Not proven** |

**Plain statement:** The current public Opal experience is an impressive **non-authoritative seeded shell** with a Motion walkthrough. Real identity, invitations, relationships, and messaging **exist in Elixir** and are proven under **synthetic** providers and **dev auth**, but they are **not** the primary path of the live public UI.

---

## Architecture authority (unchanged)

| Layer | Role | Status |
|-------|------|--------|
| Elixir/Phoenix/BEAM | Identity, sessions, relationships, messages, plans authority | ADR-0002 accepted |
| PostgreSQL | Authoritative persistence | ADR-0005 |
| Oban | Durable jobs | Present |
| Phoenix Channels | Realtime | Present (dev auth) |
| Python | Bounded proposals only | ADR-0003 |
| Expo mobile | Primary client architecture | ADR-0004 |
| Vite web | Public surface; non-authoritative unless wired | SF13–14 |
| Vibra | Study only | Locked |
| UI/UX Pro Max | Design intelligence | Locked |

---

## First complete journey (28 steps) vs repository

| # | Required step | Classification today |
|---|---------------|----------------------|
| 1–3 | Open Opal, walkthrough, skip/complete | PROVEN web UI |
| 4–9 | Account, phone, verify, session, device | PROVEN domain SYNTHETIC; **no product UI/API** |
| 10 | Profile | PARTIAL domain |
| 11–16 | Contact, invite, accept, relationship, conversation | PROVEN domain SYNTHETIC; **no product UI** |
| 17–19 | Persist + realtime messages | PROVEN domain + channel (dev auth) |
| 20–23 | Bounded signal + act + Home/Chats/Plans | Domain partial; **web seeded** |
| 24–27 | Survive restart, sign-out, block, isolation | Domain partial/proven tests; **not web product** |
| 28 | Seed not primary journey | **FAIL on live web** (seed still primary) |

---

## Residual risks

1. Live web teaches a product that does not yet activate real accounts.  
2. Production SMS unset (B001).  
3. Socket/API auth is development-only.  
4. Mobile still fixture-oriented for identity.  
5. Disk space low on builder machine (ops).  
6. Em-dash copy remains in some SF14 strings (founder rule).  

---

## What must not be claimed

- Production telecom live  
- Real users end-to-end on public host  
- Full address-book sync  
- Seeded shell = social graph  
- Synthetic OTP = carrier ownership  
- Passing unit tests alone = complete public user journey  
