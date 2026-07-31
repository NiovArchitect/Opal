# Opal — Product Truth

**Status:** Phase 0 foundation (authoritative for new build)  
**Repository:** `NiovArchitect/Opal`  
**Last updated:** 2026-07-31  

---

## One-sentence definition

**Opal is a private Social Operating System:** WhatsApp-like personal communication with relationship intelligence underneath—not bolted on as a chatbot dashboard.

## What Opal is

- A **phone-number-based**, private communication network for real people and real relationships.
- An interaction model that feels immediately familiar: messages, voice notes, presence, delivery state, circles, plans.
- A system that **understands, maintains, repairs, coordinates, and improves** relationships—with explicit consent.
- Relationship intelligence **embedded inside private communication**, not a separate AI product with a chat skin.

## What Opal is not

| Not this | Why |
|----------|-----|
| Generic chatbot | Conversation is primary; AI is contextual |
| Social media feed | No public posts, likes economy, or virality loops |
| Enterprise productivity suite | Personal life and relationships, not work OS |
| Dating / relationship scoring app | No health scores that alarm or manipulate |
| Covert surveillance | Informed consent, visibility, revocation |
| Autonomous impersonation engine | No voice cloning or “act as user” without event-specific approval |

## Product promise

> Turn communication into understanding, and understanding into stronger relationships.

Legacy lineage phrase (historical, not mandatory UI copy):  
*“Turn every message into a meaningful relationship.”*

## The essential product loop

A person communicates naturally (text, voice, calls, reactions, plans, shared activity). Opal then:

1. Understands what happened.
2. Understands who is involved.
3. Remembers relevant relationship context (scoped, consented).
4. Detects what may have been misunderstood or left unresolved.
5. Helps the user communicate more clearly.
6. Coordinates commitments and follow-through.
7. Learns communication style **without impersonating** without approval.
8. Makes the **relationship** easier—not the interface busier.

## Signal vs noise

### Under the hood (never as primary UI chrome)

Sentiment analysis, relationship scoring, agent orchestration, vector search, memory capsules, workflow state, behavioral classification, emotional inference labels for engineers.

### What people should see

- She may have read this differently than you intended.
- You said you would call tonight.
- This still needs an answer.
- You both seem free after 6:30.
- Translate naturally.
- Help me say this better.
- What did we decide?
- What has felt different lately?
- Remind me what matters to her before I respond.
- I’m upset. Don’t let me send something destructive.

## Four original foundations (preserved)

1. **Resonance Messaging** — voice/text that preserves tone, intent, and eventually consented voice identity.
2. **Social Flow Calendar** — coordination without rigid calendar-first UX.
3. **AI Agents and Translation** — modular agents for understanding, scheduling, translation, drafting, safety.
4. **Social Circles** — context boundaries (family, close friends, romantic, custom), not mere chat folders.

## Stronger product center (founder requirement)

Opal is **not merely AI-enhanced messaging**.  
It is **relationship intelligence embedded inside private communication**.

## Hard technical center (locked)

| Layer | Technology |
|-------|------------|
| Realtime / app authority | Elixir + OTP + Phoenix on BEAM |
| AI intelligence | Python (jobs in, structured results out) |
| Mobile client | React Native + Expo + TypeScript |
| Identity | Phone number |
| Orchestration | No Node.js as messaging/AI orchestration core |
| Repos | One clean monorepo; no blind import of old codebases |

## Uncertainty doctrine

Opal **interprets signals**. It does **not** claim certainty about another person’s private thoughts.

- Prefer: *“This may suggest distance or uncertainty.”*
- Reject: *“He is definitely breaking up with you.”*
- Never assign a simplistic **relationship health score**.

## Autonomy and impersonation doctrine

- Drafting and suggestions require user send approval.
- Voice cloning, outbound calls “as the user,” and acting as the user are **deferred**, heavily governed capabilities—not MVP defaults.
- Durable approval records, visible disclosure, and legal review are required before those capabilities ship.

## Related documents

- [SOURCE_EXTRACTION.md](./SOURCE_EXTRACTION.md)
- [FEATURE_INVENTORY.md](./FEATURE_INVENTORY.md)
- [MVP_BOUNDARY.md](./MVP_BOUNDARY.md)
- [CONSENT_MODEL.md](./CONSENT_MODEL.md)
- [RELATIONSHIP_SAFETY_RULES.md](./RELATIONSHIP_SAFETY_RULES.md)
- [GAPS_AND_OPEN_DECISIONS.md](./GAPS_AND_OPEN_DECISIONS.md)
