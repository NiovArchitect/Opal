# Production Readiness Closure Matrix

**Status:** HOLD-PERIOD AUTHORITY — production readiness active; Pass 2 LOCKED  
**Synced:** 2026-10-13  
**Tip at authoring:** `07b4b906` (hold) · matrix tip follows commit  
**Sources:** `BLOCKED.md` · `MASTER_PRODUCTION_CONTINUITY_HANDOFF.md` · Pass 1 steward shots · live curl 2026-10-13  
**Purpose:** Close the lab → prove the organism works → leave the lab safely. **Not** intelligence expansion.

```yaml
authority_class: PRODUCTION_READINESS_CLOSURE_MATRIX
pass_1: CLOSED
pass_2: LOCKED
intelligence: NOT_STARTED
production_readiness: ACTIVE
```

## Operating law

```text
Reality
   ↓
Authority
   ↓
Consistency
   ↓
Production readiness
   ↓
Intelligence expansion
```

Opal must keep answering **“Why is Opal showing me this?”** before **“What does Opal know about me?”**

Biggest remaining risk class: **surface fragmentation** (past-as-current, seed-as-live, bell vs resolve, chat≠plan) — more dangerous than missing AI features.

---

## Closure sequence (hold-period)

| Phase | Name | Status |
|-------|------|--------|
| **1** | Infrastructure truth matrix | THIS DOC — fill/verify continuously |
| **2** | Real user journey validation | CHECKLIST below — founder-gated where physical |
| **3** | Surface contract audit | CONTRACTS below — Pass 1 green; re-check on every ship |
| **4** | Pass 2 preparation | Person Graph Spec — **later**; only after founder unlock phrase |

Immediate work = Phases 1–3. Phase 4 is design-only when asked; implementation waits for unlock.

---

# Phase 1 — Infrastructure truth

## Live snapshot (agent-checked 2026-10-13)

| Probe | Result |
|-------|--------|
| `GET http://127.0.0.1:4000/health` | **200** · `phone_verify_mode=production_sms` · `sentry_configured=false` |
| `GET http://127.0.0.1:5173/` | **200** |
| `GET https://api.opal.niovlabs.com/health` | **503** Service Suspended (Render payment) |

## Service matrix

Legend: ✅ proven · 🟡 lab / partial · 🔒 founder-gated · ❌ blocked · ? unknown / not re-proven this session

| Service | Local | Production | Mobile / TestFlight | Status | Notes |
|---------|-------|------------|---------------------|--------|-------|
| **Phoenix API** | ✅ | ❌ 503 | ❌ blocked by prod | **BLOCKED prod** | Local authority until Render payment |
| **PostgreSQL** | ✅ | ? (suspended host) | n/a | Local OK | Prod DB behind suspended API |
| **Oban** | ✅ | ? | n/a | Lab OK | Push/workers depend on healthy API host |
| **Realtime channels** | ✅ | ❌ | ❌ | Lab OK | Prod socket URL baked in IPA; needs healthy API |
| **Auth / OTP (Twilio Verify)** | ✅ `production_sms` | ❌ | 🔒 | LIVE local | Fixture OTP must not run on live BEAM |
| **Messaging (Twilio SMS invites)** | ✅ | ❌ | 🔒 | LIVE local | Founder-confirmed 2026-10-07 |
| **Push (Expo / APNs)** | 🟡 enqueue path | ❌ | 🔒 physical | **GATED** | APNs key on EAS; needs TestFlight + token + prod API |
| **Calls (WebRTC / Twilio TURN)** | 🟡 lab matrix | ❌ | 🔒 two-device | **GATED** | Lab TURN PASS; physical WiFi↔cellular unproven |
| **Voice STT (Deepgram)** | ✅ | ? | 🟡 | LIVE local | Prod needs healthy API + keys on Render |
| **Voice TTS (ElevenLabs)** | ✅ Matilda | ? | 🟡 | LIVE local | Premade voices deprecate 2026-12-31 |
| **LLM (DeepSeek)** | ✅ | ? | 🟡 | LIVE local | Templates = floor on failure |
| **Brave Search** | ✅ | ? | 🟡 | LIVE local | |
| **Duffel** | ✅ test mode | ? | 🟡 | TEST only | No live money token |
| **OpenTable** | 🟡 call-to-book | ❌ reserve API | 🟡 | BLOCKED full book | Partnership for live reserve |
| **Google Places** | ❌ API_NOT_ENABLED | ❌ | ❌ | **GATED** | Enable Places API (New) + billing on GCP `449126891803` |
| **Google OAuth (Cal/Gmail)** | 🟡 client LIVE | ? | 🔒 consent walk | **GATED** | In-app Connect calendar still founder walk |
| **Stripe wallet loads** | 🟡 key LIVE / loads OFF | 🔒 legal | 🔒 | GATED | `OPAL_WALLET_LOADS_ENABLED=false` |
| **Sentry** | ❌ | ❌ | ❌ | BLOCKED | No DSN in BEAM |
| **EAS iOS IPA (W9)** | n/a | ✅ Finished | 🔒 upload | IPA ready | `0.13.0` / build 5 · upload = Transporter |
| **Web shell (Vite)** | ✅ | ? (`app.opal…`) | n/a | Local OK | Prod web host not re-proven this session |

## Dependency chain (must stay coherent)

```text
Phoenix API
    ↓
Postgres
    ↓
Realtime channels
    ↓
Mobile client (TestFlight IPA)
    ↓
Push services
    ↓
External APIs (Twilio, Deepgram, ElevenLabs, DeepSeek, Brave, Duffel, Google…)
```

**Critical path to leave the lab**

```text
Render payment restored   (Free tier ≠ TestFlight — see RENDER_FREE_TIER_FITNESS_AUDIT.md)
        ↓
api.opal.niovlabs.com /health = 200
        ↓
TestFlight upload (W9 IPA)
        ↓
Install + identity + smoke
        ↓
Push verify checklist
        ↓
Two-device call proof
```

Hosting note: single BEAM (Phoenix+Channels+Oban) + one Postgres. Minimum always-on ≈ web $7 + paid Postgres $6+. Fly deferred.

## Founder-only gates (agent cannot close)

1. Render billing restore + re-auth Render CLI  
2. ASC / Transporter TestFlight upload  
3. Physical push on device  
4. Two-device calling walk  
5. Google Places enable + billing  
6. Google OAuth in-app consent walk  
7. Legal approval before wallet loads  

---

# Phase 2 — Real user journey validation

Not feature-unit testing. Human organism proof.

## New user

```text
Download
 ↓
Open
 ↓
Understand Opal
 ↓
Create identity
 ↓
Invite someone
 ↓
Conversation begins
 ↓
A shared moment forms
```

| Checkpoint | Lab / local | Production / TestFlight | Pass criterion |
|------------|-------------|-------------------------|----------------|
| First-run / Holy Shit communicates relationship value | 🟡 | 🔒 | User understands: helps connect with people I care about |
| Identity create (phone OTP) | ✅ local SMS | 🔒 needs prod API | Real number → session; no fixture theater on prod |
| Production seed empty | ✅ prefer-real | 🔒 | Zero founder-universe cards for new install |
| Invite someone | ✅ Twilio invite SMS | 🔒 | Invite delivers; join path honest |
| Conversation begins | ✅ | 🔒 | Thread is real dyad, not seed Chanelle-as-self |
| Shared moment / plan forms | ✅ A8 lab | 🔒 | Conversation → SharedPlan → Graph/Home agree |

## Returning user

```text
Open app
 ↓
See current reality
 ↓
See conversations
 ↓
See moments
 ↓
Take action
```

| Checkpoint | Lab / local | Production / TestFlight | Pass criterion |
|------------|-------------|-------------------------|----------------|
| Cold launch → current reality | ✅ | 🔒 | No past-as-current; no seed impersonation |
| Conversations list prefer-real | ✅ | 🔒 | Seed-off composers; honest empty |
| Moments / Graphs | ✅ | 🔒 | Active vs history correct |
| Action (Accept / Attention resolve) | ✅ Seen≠resolved | 🔒 | Badge clears on resolve, not mere open |

---

# Phase 3 — Surface contract audit

Before intelligence: every major surface has a contract. Pass 1 closed these as laws; re-verify on each production ship.

## Home

**Answers:** What is happening in my world?

| Need | Pass 1 status | Prod re-proof |
|------|---------------|---------------|
| Social presence / moments / conversations / relevant activity | GREEN prefer-real + invitation empty | 🔒 |
| Never seed-as-live when seed off | GREEN | 🔒 |
| Empty = “Your world starts here.” | GREEN | 🔒 |

## Chats

**Answers:** Who am I talking to?

| Need | Pass 1 status | Prod re-proof |
|------|---------------|---------------|
| Direct conversations | GREEN | 🔒 |
| Groups | Partial / as shipped | 🔒 |
| Relationship context | **Future (Pass 2)** | LOCKED |
| Prefer-real list | GREEN | 🔒 |

## Graphs

**Answers:** What realities do I share with people?

| Need | Pass 1 status | Prod re-proof |
|------|---------------|---------------|
| Active / history / shared experiences | GREEN | 🔒 |
| Prefer-real; no seed reality as current | GREEN | 🔒 |
| SharedPlan lineage / Fort Oak lifecycle | GREEN | 🔒 |

## Attention

**Answers:** What matters right now?

| Need | Pass 1 status | Prod re-proof |
|------|---------------|---------------|
| Actionable · calm · permissioned | GREEN journey | 🔒 |
| Seen ≠ resolved | GREEN | 🔒 |
| Deep-link to chat/plan | GREEN | 🔒 |
| Physical push entry | GATED | 🔒 |

## Center Opal

**Answers:** Help me do something.

| Need | Pass 1 status | Prod re-proof |
|------|---------------|---------------|
| Create / ask / understand / navigate | Lab paths exist | 🔒 |
| AI subordinate to reality (interpret·assist·explain·propose) | LAW | Hold |
| No inventing durable private facts | LAW + Entry Contract | Hold |

## Fragmentation watchlist (highest risk)

| Failure class | Mitigation already | Still watch |
|---------------|--------------------|-------------|
| Past event as current | Reality source priority · lifecycle restore | Prod cold launch |
| Bell unresolved vs open | Seen ≠ resolved | Push + badge on device |
| Graphs seed reality | Prefer-real composers · production_default | TestFlight new install |
| Chat ≠ plan | ConversationAlignment · A8 | Two-user smoke |

**Re-audit 2026-10-13:** `SURFACE_FRAGMENTATION_REAUDIT.md`  
**Pass 1H+1I shipped:** Stories / person temporal / Full Live REDs closed; Attention empty copy unified. Residual YELLOW: Center sample day / dual ask pipes.

---

# Phase 4 — Unlock Pass 2 preparation (later)

**Do not start implementation.** When founder asks for design prep (still hold-safe as docs):

## OPAL PERSON GRAPH SPECIFICATION (constitution — not code)

```text
Person
 |
 ├ Identity
 ├ Relationship
 ├ Shared History
 ├ Preferences
 ├ Boundaries
 ├ Commitments
 ├ Moments
 ├ Communication Patterns
 └ Permissions
```

Must define: what can be learned · what requires confirmation · what expires · what is private · what may influence recommendations · what must never influence decisions.

First Pass 2 **capability** after unlock (not “memory”):

### Relationship Context Resolution

Example: “What should Chanelle and I do tonight?” → resolve speaker · person · relationship · context · known · unknown · action (ask/suggest) **before** restaurant dump.

Unlock phrase remains:

> "Opal is ready to begin understanding people."

Then: Authority → Permissions → Candidate lifecycle → Correction → Explanation → Intelligence.

---

## Honest capability rule

A row is ✅ only when:

```text
Data authority
+ Backend behavior
+ Realtime propagation
+ UI projection
+ Regression proof
```

agree. Lab ✅ does not equal Production ✅.

---

## Allowed vs locked (unchanged)

**Allowed:** coherence fixes · production readiness · infrastructure validation · regression · capability verification · honest UI · endpoint integrity  

**Locked:** relationship graph · memory expansion · preference learning · partner intelligence · emotional inference · scoring · autonomous life management  

---

## Related

- `BLOCKED.md` — credential / billing runtime truth  
- `docs/authority/MASTER_PRODUCTION_CONTINUITY_HANDOFF.md`  
- `docs/authority/CURRENT_OPAL_STATE.md`  
- `shots/steward/HOLD_PERIOD_CHECKPOINT.md`  
- `shots/steward/PASS1_FINAL_CHECKPOINT.md` · `PASS1G_ENDPOINT_JOURNEY_AUDIT.md`  
- `docs/authority/PASS2_PLUS_CAPABILITY_MAP.md` — vision blueprint (not unlock)  
- `docs/TESTFLIGHT_UPLOAD.md` · `shots/PUSH_VERIFY_CHECKLIST.md`  
- `docs/authority/RELATIONSHIP_INTELLIGENCE_ENTRY_CONTRACT.md`  
