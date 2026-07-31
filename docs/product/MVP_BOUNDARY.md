# MVP Boundary

**Status:** Phase 0  
**MVP name:** Opal MVP-0 — *Private message, understand, follow through*

---

## MVP thesis

Prove that two consenting adults can:

1. Authenticate with phone numbers (or a **local/dev synthetic** path until provider approved).  
2. Exchange realtime text and voice notes reliably.  
3. Use offline-tolerant messaging.  
4. Get **consented**, uncertainty-aware help: transcript, translation, drafting, commitment candidates.  
5. Control and revoke AI permissions.  
6. Keep private reflections private.  
7. Delete relationship context and observe correct behavior.

If this journey fails, more features do not matter.

---

## In MVP

### Messaging

- 1:1 conversations  
- Realtime via Phoenix Channels  
- Ordering, delivery acks, basic presence  
- Multi-device **sessions** (full E2EE multi-device may be incomplete)  
- Local SQLite cache + outbound queue  
- Voice note upload + playback  
- Message status  

### Identity (phased)

- Phone identity **model** in domain  
- Dev/synthetic verification for local  
- Real SMS OTP only after founder approval of provider  

### AI (job-based)

- STT for voice notes  
- On-demand translation with original preserved  
- Drafting assist (“help me say this”) with send approval  
- Commitment **candidate** extraction + confirm  
- Misunderstanding / ambiguity hint (private)  
- Safety checks on AI drafts  
- Consent gates enforced in Elixir before dispatch  

### Trust baseline

- Block user  
- Per-feature consent records  
- Private vs shared memory isolation (shared may be stubbed off)  
- Account/session auth  
- TLS; at-rest encryption plan documented  

### Client

- RN Expo TypeScript shell  
- Conversations list + thread  
- Minimal contextual AI affordances (not dashboard)  
- Consent screens  

### Evidence

- Contract tests for message + AI job schemas  
- Journey tests for the 20-step path (synthetic)  
- Chaos basics: worker down, process restart  

---

## Explicitly deferred (not MVP)

| Item | Why |
|------|-----|
| Social Circles full product | Needs context boundary product design depth |
| Social Flow calendar product | Coordination v1 can be commitment-only |
| Group chat | Complexity |
| Voice cloning / Resonance full voice identity | GOVERNED |
| Call-as-user | GOVERNED |
| Real-time spoken interpreter mode | Hard + commercial |
| Relationship scores | Rejected forever |
| Public web React app as primary | Mobile-first |
| Node orchestration | Rejected |
| Production cloud / paid SMS | Founder approval |
| Full E2EE | Design now; complete later |
| Shared relationship memory product | Dual consent + UX research |
| Monetization | After trust |
| Rich media / video calls | Later |

---

## First end-to-end journey (acceptance spine)

See bootstrap brief §11. Summary:

1–5: accounts, discover/invite, realtime text  
6–8: offline preserve, voice note, transcript  
9–10: translation + original  
11–14: commitment candidate → confirm → surface  
15–17: rephrase help → options → no auto-send  
18–20: permissions revoke; private reflection isolation; delete relationship context  

**MVP is not done until this spine has reproducible evidence.**

---

## Non-goals for MVP polish

- Pixel-perfect brand system freeze  
- Every agent as separate deployable  
- Load test to millions (design for it; test to thousands later)  
- Full legal policy suite (but no public launch without it)  

---

## Next slice after Phase 0 (preview)

1. Monorepo workspace files + `packages/contracts` schemas  
2. `apps/Opal_core` Phoenix skeleton with health + channel stub  
3. `services/Opal_ai` Python FastAPI/worker skeleton with echo job  
4. Contract test: Elixir dispatches job → Python returns schema-valid result  
5. Mobile app shell with synthetic conversation UI (only after contracts green)

No generic placeholder marketing screens before product-truth freeze (this document set).
