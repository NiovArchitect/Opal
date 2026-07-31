# Feature Inventory

**Status:** Phase 0  
**Legend:** `MVP` | `POST-MVP` | `DEFERRED` | `GOVERNED` (policy-heavy) | `RESEARCH`

---

## A. Communication

| Feature | Horizon | Notes |
|---------|---------|-------|
| Phone-number signup / verification | MVP | Provider TBD (FOUNDER_DECISION) |
| 1:1 messaging | MVP | Authoritative on BEAM |
| Message history | MVP | Server + local SQLite |
| Realtime delivery (Phoenix Channels) | MVP | |
| Delivery / read / pending states | MVP | Exact semantics in messaging runtime doc |
| Presence (online/device) | MVP | Phoenix Presence |
| Multi-device sessions | MVP | Key/sync open (gap) |
| Voice notes | MVP | Upload + playback |
| Speech-to-text (transcript) | MVP | Python worker |
| Text-to-speech | POST-MVP | Resonance path |
| Attachments (images first) | POST-MVP | |
| Reactions | POST-MVP | |
| Group messaging | POST-MVP | Circles-linked |
| Calls (audio) | POST-MVP / GOVERNED | Telephony boundary |
| Calls (video) | DEFERRED | |
| Offline compose / queue | MVP | Local-first client |
| Online/offline sync | MVP | ADR-0007 |
| Message delete / unsend | MVP | Semantics TBD |
| Block user | MVP | Safety critical |

## B. Resonance Messaging

| Feature | Horizon | Notes |
|---------|---------|-------|
| Tone/intent metadata (structured, private) | RESEARCH → POST-MVP | Not user-facing jargon |
| Style preferences learning | POST-MVP | Consent-gated |
| Consented voice model | GOVERNED / DEFERRED | Highly sensitive |
| Voice model training from samples | GOVERNED / DEFERRED | |
| Fail-soft when voice gen fails | MVP when feature exists | Transparent fallback |

## C. Resonance Translation

| Feature | Horizon | Notes |
|---------|---------|-------|
| Language detection | MVP | Python |
| On-demand translation | MVP | Preserve original |
| Preferred language per user | MVP | |
| Tone-preserving translation | POST-MVP | Quality ramp |
| Translated audio | POST-MVP | |
| Real-time spoken interpreter mode | DEFERRED | Commercial aspiration |
| “Translated from X” label | MVP | Required transparency |

## D. Relationship intelligence

| Feature | Horizon | Notes |
|---------|---------|-------|
| Private reflection (one-sided) | MVP | Never auto-shared |
| “Help me say this better” drafting | MVP | User must approve send |
| Misunderstanding / ambiguity hints | MVP | Uncertainty language |
| Unresolved thread detection | MVP | Candidate surfaces |
| Commitment candidates | MVP | Confirm before obligation |
| Commitment reminders | MVP | |
| Conversation recap | POST-MVP | |
| “What has felt different” reflection | POST-MVP | No scores |
| Shared relationship memory | POST-MVP / GOVERNED | Dual consent gap |
| Relationship health score | **REJECTED** | Never |

## E. Social Flow

| Feature | Horizon | Notes |
|---------|---------|-------|
| Natural-language plan detection | POST-MVP | |
| Event create / invite / RSVP | POST-MVP | |
| Availability hints | POST-MVP | |
| Invisible calendar surface (Flow) | POST-MVP | Not grid-first |
| Offline events | POST-MVP | |

## F. Social Circles

| Feature | Horizon | Notes |
|---------|---------|-------|
| Circle types (family, friends, romantic, custom) | POST-MVP | Context boundaries |
| Circle permissions | POST-MVP | |
| Restrained visual identity | POST-MVP | |
| Context isolation rules | MVP design / POST-MVP impl | Critical for trust |

## G. Agents (capability map → implementation)

| Product agent | Horizon | Runtime owner |
|---------------|---------|---------------|
| Conversation Understanding | MVP | Python + Elixir dispatch |
| Relationship Context | MVP (private) | Python + Elixir consent gate |
| Misunderstanding Detection | MVP | Python |
| Commitment / Follow-through | MVP | Elixir state + Python extract |
| Scheduling | POST-MVP | Elixir + Python |
| Translation | MVP | Python |
| Voice (STT first) | MVP STT / DEFERRED clone | Python |
| Drafting | MVP | Python + Safety |
| Consent and Permission | MVP | **Elixir authority** |
| Memory | MVP private / POST shared | Elixir policy + Python retrieval |
| Safety | MVP | Python classifiers + Elixir enforce |
| Notification Relevance | POST-MVP | Elixir |
| Relationship Reflection | POST-MVP | Python |
| Notetaker | POST-MVP | Python |

## H. Platform / trust

| Feature | Horizon | Notes |
|---------|---------|-------|
| Per-feature AI consent | MVP | |
| Per-conversation AI consent | MVP design | Exact UX TBD |
| Consent revocation | MVP | |
| Data export | POST-MVP | Legal readiness |
| Account deletion | MVP | |
| Relationship memory deletion | MVP | Must be testable |
| Abuse reporting | MVP baseline | |
| Age / minors policy | LEGAL | Blocks public launch |
| E2EE | RESEARCH / phased | ADR-0008 |
| Push notifications | MVP | Provider later |

## I. Explicitly out of MVP UI

- AI orchestration dashboards  
- Vector search admin views  
- Sentiment heatmaps  
- Agent topology screens  
- Relationship scoring widgets  
- Dense settings before first value  
