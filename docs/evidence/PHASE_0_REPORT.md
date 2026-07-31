# Phase 0 Report — Opal Foundation

**Date:** 2026-07-31  
**Author:** Grok (Agent Zero role)  
**Repo:** `NiovArchitect/Opal`

---

## A. Repository proof

| Check | Result |
|-------|--------|
| Exact root | `/Users/genghishameha/Developer/NIOVI-Architect/Opal` |
| Remote | `https://github.com/NiovArchitect/Opal.git` (private) |
| Branch | `main` |
| Starting SHA | `77ad5c77894c72bececd70be6df13f78f4a95883` |
| Isolation | **PASS** — git root is Opal, not `$HOME`, not NIOV Foundation / Otzar / Caretaker |
| Note | Parent `$HOME` has an accidental git repository covering the tree; Opal is a **nested, authoritative** repo for all Opal work |

Authenticated GitHub user: **`NiovArchitect`** (Sadeil Lewis).

---

## B. Source truth

### Preserved concepts

Resonance Messaging; Resonance Translation; Social Flow; Social Circles as context boundaries; personal AI assist; modular agent family (expanded); phone-number identity; WhatsApp-like interaction; original-text translation transparency; commitment awareness; consent-forward relationship help.

### Rejected assumptions

Node/Express/Socket.io core; React web as primary; Mongo/Scylla as mandatory primary; blind old-repo continuation; AI dashboard home; certainty mind-reading copy; default voice cloning / call-as-user; relationship health scores; Python as messaging authority; Azure lock-in.

### Contradictions (resolved)

See `docs/product/SOURCE_EXTRACTION.md` C1–C10. Authoritative: Elixir + Python AI + RN Expo + monorepo + relationship intelligence center.

### Newly introduced founder requirements

Isolated clean repo; BEAM authority; no Node orchestration; no autonomous impersonation; no AI surveillance without consent; Grok + Agent Zero + Agency Agents; Phase 0 before UI; no paid/prod without approval.

### Unanswered decisions

G001–G064 in `GAPS_AND_OPEN_DECISIONS.md` (provider, E2EE, dual consent details, minors, monetization, etc.).

---

## C. Architecture recommendation

| Area | Recommendation |
|------|----------------|
| Elixir/OTP | Own sockets, presence, messaging, consent, commitments, job dispatch, supervision |
| Python | Own STT/translation/embeddings/understanding/drafting/safety inference |
| Mobile | RN Expo TS; SQLite offline queue |
| Data | PostgreSQL authoritative (provisional); object store for media later |
| Concurrency | ConversationServer + Oban + circuit breakers; no heavy inference on BEAM schedulers |
| AI job flow | ConsentGate → bounded context → Oban → HTTP Python → schema validate → PubSub |
| Offline | Append-mostly; `client_msg_id` idempotency; `server_seq` order |
| Security | TLS + at-rest; phased E2EE honesty; consent tokens; isolation tests |

ADRs 0001–0008 accepted (0005–0008 provisional/phased as noted).

---

## D. Product

| Item | Statement |
|------|-----------|
| Core problem | Constant messaging still loses meaning, commitments, and repair opportunities—without wanting surveillance or scores |
| Primary user | Adults in important personal relationships |
| First value moment | Realtime message works **and** one dismissible, consented assist (transcript/translate/rephrase/commitment) helps |
| Nav candidates | Conversations · People · Flow · Opal (unfrozen) |
| MVP | 1:1 realtime + offline + voice note STT + translation + drafting + commitment candidates + consent/revoke + private isolation |
| Deferred | Circles product, full Flow calendar, groups, voice clone, call-as-user, interpreter mode, monetization, full E2EE |

---

## E. Agent execution

See `AGENT_EXECUTION.md`. Minimal role set; no performative 200-agent run. No unresolved multi-agent edit conflicts (single-writer Phase 0).

---

## F. Blockers

| Class | Examples |
|-------|----------|
| INTERNAL | Home git nesting (mitigated); remaining eng defaults |
| FOUNDER_DECISION | Providers, dual consent confirm, AI defaults, monetization, brand |
| EXTERNAL_PROVIDER | SMS, push, model APIs, telephony |
| LEGAL_OR_POLICY | Minors, recording, clone disclosure, retention |
| PRODUCT_RESEARCH | Nav freeze, copy deck, discovery UX |
| NOT_A_BLOCKER | GitHub owner resolved for bootstrap (`NiovArchitect`) |

Full table: `BLOCKER_LEDGER.md`.

---

## G. Exact next build slice

### Files / services to create

1. `packages/contracts/` — JSON Schema for Message, AiJobRequest, AiJobResponse, ConsentProof  
2. `apps/Opal_core/` — `mix phx.new` umbrella or app; health endpoint; Channel stub; Oban; Ecto users/conversations/messages migrations (minimal)  
3. `services/Opal_ai/` — Python package; `/health`; `/v1/jobs` echo + `safety_check` stub  
4. `infra/local/docker-compose.yml` — postgres + core + ai  
5. `tests/contracts/` — schema validation + HTTP round-trip  

### Tests to write first

- Contract: job request/response schema  
- Integration: Elixir enqueues → Python returns → artifact stored  
- Isolation: user A cannot join user B conversation  
- Consent: job without consent → refused  

### Acceptance criteria

- `docker compose up` local happy path  
- Round-trip AI echo job green in CI (local)  
- No Node messaging server in tree  
- Still no production spend  

### Expected evidence

- CI log or script output of contract tests  
- Sequence diagram updated if transport differs  

### Explicit non-goals of next slice

- Pixel UI marketing screens  
- Real SMS  
- Voice cloning  
- Import of legacy Opal code  

---

## Conclusion

Phase 0 establishes **product truth and architecture** so Opal is not a revival of the Node MVP roadmap. It is a BEAM-native, Python-intelligent relationship operating system built from valid Opal ideas with stronger consent and clarity.

**Phase 0 documentation is complete.** Implementation begins only on the next-slice criteria above.
