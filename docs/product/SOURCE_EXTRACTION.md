# Source Extraction — Valid Ideas, Contradictions, Rejections

**Status:** Phase 0  
**Purpose:** Preserve every valid Opal idea; classify contradictions; prevent old assumptions from silently becoming architecture.

---

## 1. Sources considered (conceptual)

| Source class | Content | Authority today |
|--------------|---------|-----------------|
| Original product mission | “Turn every message into a meaningful relationship”; Resonance; Social Flow; Circles; agents | **Lineage** — preserve concepts, not wording mandates |
| Older developer documentation | Four foundations; RN Expo; Elixir/Phoenix; ScyllaDB; local-first | **Partial** — RN+Elixir direction kept; ScyllaDB not locked |
| 49-page roadmap | React web; Node/Express; Socket.io; Python AI; Postgres/Mongo; Azure | **Rejected as runtime architecture** |
| Commercial / narrative product | Real-time interpreter; tone/intent help; drafting; personal assistant; voice-as-user call | **Partial** — UX aspirations kept; certainty language and impersonation **rejected as defaults** |
| Founder lock (this bootstrap) | Elixir/BEAM + Python AI + RN Expo; relationship intelligence center; consent; monorepo Opal | **Authoritative** |

No code has been imported from older Opal repositories. Extraction is conceptual only.

---

## 2. Preserved concepts

### Communication core

- 1:1 messaging, history, realtime delivery
- Contact discovery (privacy model TBD)
- Presence and multi-device awareness
- Voice messages, TTS, STT, in-thread audio playback
- Message status; async media processing
- Offline storage and sync
- Future groups and Social Circles
- Translation with original-text visibility and transparent labels

### Resonance Messaging

- Carry tone, cadence, emotional intent, preferred phrases, speaking style
- Eventually: consented sender voice representation
- Voice samples → user voice model → iterative improvement
- Voice models as highly sensitive personal data

### Resonance Translation

- Auto language detection
- Translate to recipient preferred language
- Preserve tone/intent (not only literal)
- Translated text + optional generated audio
- Real-time spoken translation (aspirational / phased)
- Inspect original; graceful failure

### Relationship interpretation (responsible form)

- Help users understand possible tone/intent and indirect wording
- Draft responses adapted to user style
- User control before send
- **Uncertainty language mandatory**

### Personal assistant (bounded)

- Retrieve authorized prior material
- Format/improve personal work with approval
- Recognize missed obligations (candidates, not silent obligations)
- Coordinate timing; summarize; organize day (phased)
- Voice interface (phased)
- **Not:** default outbound call in user’s voice

### Social Flow

- Events, invitations, RSVPs
- Natural-language coordination
- Invisible calendar (not dense productivity-first UI)
- Offline event storage and sync

### Social Circles

- Family, close friends, romantic, custom
- Visual identity: restrained colors/icons
- **Context boundary** — romantic intelligence must not leak into family/work contexts

### Agent family (expanded)

Original roadmap: Voice Synthesis, Translation, Notetaker, Insight.

**New Opal agent family (conceptual product agents, not necessarily 13 microservices day one):**

1. Conversation Understanding  
2. Relationship Context  
3. Misunderstanding Detection  
4. Commitment and Follow-through  
5. Scheduling  
6. Translation  
7. Voice  
8. Drafting  
9. Consent and Permission  
10. Memory  
11. Safety  
12. Notification Relevance  
13. Relationship Reflection  
14. Notetaker (from original)  

---

## 3. Rejected assumptions

| Assumption | Source | Rejection reason |
|------------|--------|------------------|
| Node.js / Express as messaging core | Old roadmap | Founder lock: Elixir/OTP authority |
| Socket.io as primary realtime | Old roadmap | Phoenix Channels + PubSub + Presence |
| React web as primary client | Old roadmap | React Native Expo mobile-first |
| MongoDB as primary store (by default) | Old roadmap option | Not locked; prefer explicit ADR (likely Postgres first) |
| Blind continuation of old repos | Practice risk | Clean monorepo; no code import yet |
| AI dashboard as home | Commercial/tech tendency | Conversation-primary, signal-only UI |
| Definitive mind-reading copy | Commercial exaggeration | Uncertainty doctrine |
| Default voice cloning / call-as-user | Commercial | Deferred + heavy governance |
| Relationship health scores | Common product pattern | Explicitly forbidden |
| Python as messaging runtime | Mis-split risk | Python = intelligence only |
| ScyllaDB mandatory | Later docs | Candidate only; ADR required |
| Separate frontend/backend repos mandatory | Later docs | Monorepo preferred (ADR-0001) |
| Azure as locked cloud | Old roadmap | No production infra without founder approval |

---

## 4. Contradictions classified

| ID | Contradiction | Resolution |
|----|---------------|------------|
| C1 | Roadmap Node vs Docs Elixir | **Elixir/BEAM wins** |
| C2 | React web vs RN Expo | **RN Expo wins** |
| C3 | Socket.io vs Phoenix Channels | **Phoenix wins** |
| C4 | Single vs multi-repo | **Monorepo Opal** |
| C5 | ScyllaDB vs Postgres/Mongo | **Open ADR-0005**; provisional Postgres for relational authority |
| C6 | Product name spelling variants in materials | **Display & repo: Opal** (see gaps if brand “Opal” vs others appears historically) |
| C7 | GitHub NIOV-Labs vs NIOVI Architect | **Current auth: `NiovArchitect`**; repo `NiovArchitect/Opal` |
| C8 | AI-enhanced messaging vs relationship OS | **Relationship intelligence is the center** |
| C9 | Commercial certainty vs safety | **Uncertainty + consent + no scores** |
| C10 | Agents as visible product vs under-the-hood | **Under-the-hood; user language is human** |

---

## 5. Newly introduced founder requirements

1. One clean isolated repository: **Opal** under authenticated owner.  
2. Realtime core: **Elixir, OTP, Phoenix, BEAM**.  
3. AI: **Python** as workers, not authority.  
4. Client: **RN Expo + TypeScript**.  
5. Phone-number identity; private WhatsApp-like UX.  
6. Relationship optimization as product center.  
7. Build system: Grok + Agent Zero + Agency Agents (selected, not performative).  
8. State-of-the-art clean UI; no visual clutter.  
9. No Node orchestration core.  
10. No autonomous impersonation.  
11. No AI surveillance without informed consent.  
12. Do not initialize inside accidental home-level git root.  
13. No production infra / paid providers / real PII without founder approval.  
14. Phase 0 = truth + architecture before generic UI.  

---

## 6. Unanswered decisions (see GAPS_AND_OPEN_DECISIONS.md)

Summary: verification provider, contact privacy model, E2EE design, server visibility with AI on, dual consent for shared analysis, voice/call policies, minors, monetization, multi-device crypto, AI provider retention, etc.

These **do not block** Phase 0 docs or local scaffolding after ADR review.  
They **do block** claims that the product specification is complete.
