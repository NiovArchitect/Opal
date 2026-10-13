# Opal steward checkpoint — hold period

**Date:** 2026-10-13  
**Mission:** Preserve coherence and prepare production readiness without introducing new intelligence layers.

```text
PASS 1 — CLOSED ✅
PASS 2 — LOCKED 🔒

PRODUCTION READINESS — ACTIVE
SURFACE COHERENCE — ACTIVE REMEDIATION (1H+1I SHIPPED)

RELATIONSHIP INTELLIGENCE — NOT IMPLEMENTED
CAPABILITY MAP — BLUEPRINT ONLY
ENTRY CONTRACT — ACTIVE
UNDERSTANDING LAW — ACTIVE (constitution)
CONTEXT MODEL — ACTIVE (blueprint)
PERMISSION ARCHITECTURE — ACTIVE (YOU Trust Layer; not generic settings)
PASS 2 ENTRY REVIEW — CAPTURED (inventory only)
YOU PAGE CAPABILITY AUDIT — CAPTURED (docs/evidence/u_page/)
CONSUMER REALITY GATE — GATE_GREEN (human loop proven; Pass 2 still locked)

MEMORY EXPANSION — STOPPED
ASSUMPTION SYSTEMS — STOPPED
SCORING — STOPPED
PROFILE INFERENCE — STOPPED
```

The capability map, Understanding Law, Context Model, and Entry Review are **architecture preparation**, not an intelligence unlock.

## Active work boundaries

### Allowed

- Coherence preservation  
- Regression protection  
- Production readiness  
- Infrastructure validation  
- Honest capability verification  
- UI/UX fixes that preserve existing authority  

### Not allowed yet

- Relationship graph implementation  
- Memory promotion  
- Preference learning  
- Partner intelligence  
- Emotional inference  
- Personality scoring  
- Automated assumptions about people  
- Automated life management  

## Coherence rule (highest priority)

Before any future change:

```text
Fact owner?
Source?
Current state?
Permission?
Surface projection?
Regression?
```

If any surface disagrees with reality: **fix the authority path, not the display.**

Governing question:

> Does every surface represent the same reality?

## Production path

```text
Local development
        ↓
Render payment restored
        ↓
api.opal.niovlabs.com /health = 200
        ↓
TestFlight upload
        ↓
Install validation
        ↓
Smoke tests
        ↓
Two-device proof
```

**Closure matrix (hold-period):** `shots/steward/PRODUCTION_READINESS_CLOSURE_MATRIX.md`  
Infrastructure · real-user journeys · surface contracts. Live snapshot 2026-10-13: local `/health` 200 · Vite 200 · prod API **503** (payment).

**Hosting fitness:** `shots/steward/RENDER_FREE_TIER_FITNESS_AUDIT.md`  
Render **Free** is **insufficient** for TestFlight (spin-down kills channels; free Postgres 30-day fuse). Prefer restore paid Render (~$13+/mo minimum). Fly = future infra option only — do not migrate from fear.

**Founder staging tunnel (while Render down):** `shots/steward/CLOUDFLARE_FOUNDER_STAGING_TUNNEL.md`  
`cloudflared` → Vite `:5173` (proxies Phoenix `:4000`). Not production.  
**Reality walk:** `FOUNDER_STAGING_REALITY_WALK.md` · **Recovery:** `scripts/opal_founder_staging_up.sh --with-tunnel --caffeinate`

**Surface fragmentation re-audit:** `shots/steward/SURFACE_FRAGMENTATION_REAUDIT.md`  
**Pass 1H:** `PASS1H_PREFER_REAL_REMEDIATION.md` — Stories / person temporal / Full Live REDs closed.  
**Pass 1I:** `PASS1I_ATTENTION_COPY_AUTHORITY.md` — Attention empty copy unified.  
SURFACE COHERENCE — ACTIVE (1H+1I shipped). Residual YELLOW: Center sample day / dual ask pipes.

## Standing architecture principles

| Layer | Role |
|-------|------|
| **PostgreSQL** | Truth |
| **Phoenix** | Realtime authority |
| **UI** | Projection |
| **AI** | Subordinate to reality |

The AI cannot create truth. It may only **interpret · assist · explain · propose** within system boundaries.

Keep integrations honest (Phoenix, Postgres, Oban, events, WebRTC/Twilio TURN, Deepgram, ElevenLabs, DeepSeek, Brave, Twilio, Duffel test, etc.). **Do not claim production readiness** until physical/prod gates pass.

## Future unlock (exact)

Founder must say:

> "Opal is ready to begin understanding people."

Then Pass 2 first work is **not** “add memory.” Order:

1. Define relationship graph authority  
2. Define permission boundaries  
3. Define candidate lifecycle  
4. Define correction flows  
5. Define explanation surfaces  
6. **Then** implement intelligence  

Until then: steward role is **preservation, validation, and production readiness only.**

## Product advantage

Opal’s value depends on users trusting that when it remembers something, it remembers the **right thing**, for the **right reason**, with the **right permission**.

## Pass 2+ Capability Map (blueprint only)

Gate blueprint authored; **no implementation**:

`docs/authority/PASS2_PLUS_CAPABILITY_MAP.md`

Defines proven Pass 1 foundation vs vision domains (Relationship · Commerce · Calendar · Fitness · Email · Context Engine · Memory lifecycle · Action Authority). Does **not** unlock Pass 2.

## Related

- `docs/authority/RELATIONSHIP_INTELLIGENCE_ENTRY_CONTRACT.md`
- `docs/authority/PASS2_PLUS_CAPABILITY_MAP.md`
- `shots/steward/PRODUCTION_READINESS_CLOSURE_MATRIX.md`
- `shots/steward/RENDER_FREE_TIER_FITNESS_AUDIT.md`
- `shots/steward/CLOUDFLARE_FOUNDER_STAGING_TUNNEL.md`
- `shots/steward/FOUNDER_STAGING_REALITY_WALK.md`
- `scripts/opal_founder_staging_up.sh`
- `shots/steward/SURFACE_FRAGMENTATION_REAUDIT.md`
- `shots/steward/PASS1H_PREFER_REAL_REMEDIATION.md`
- `shots/steward/PASS1I_ATTENTION_COPY_AUTHORITY.md`
- `shots/steward/PASS1_FINAL_CHECKPOINT.md`
- `docs/authority/MASTER_PRODUCTION_CONTINUITY_HANDOFF.md`
- `BLOCKED.md`
