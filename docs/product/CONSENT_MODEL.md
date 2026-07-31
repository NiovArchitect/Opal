# Consent Model

**Status:** Phase 0 draft — product law for implementation  
**Authority for consent state:** Elixir / Opal core (not Python)

---

## Goals

1. Users understand **what** Opal does with their communications.  
2. Users can enable features **granularly**.  
3. Users can **revoke** without trapping data in dark corners.  
4. AI never becomes silent surveillance.  
5. Shared intelligence cannot be unilaterally forced on another person.

---

## Consent layers

```
Account
  └── Feature consent (AI master, translation, STT, drafting, memory, …)
        └── Conversation consent (process this thread with AI?)
              └── Action consent (send this draft? create this commitment?)
                    └── Governed event consent (voice clone sample; call-as-user) [DEFERRED]
```

### L0 — Account / legal

- Terms, privacy policy, age attestation (LEGAL).  
- Without L0, no account.

### L1 — Feature consent

Examples:

| Feature key | Default (proposed MVP) | Notes |
|-------------|------------------------|-------|
| `ai.master` | Off or soft-on with education | FOUNDER_DECISION |
| `ai.transcription` | Off until needed | Can prompt on first voice note |
| `ai.translation` | Off until requested | On-demand still needs processing consent |
| `ai.drafting` | Off until used | |
| `ai.private_insights` | Off | Misunderstanding / reflection |
| `ai.commitment_detect` | Off or on-with-confirm | Candidates only |
| `ai.memory.private` | Off | |
| `ai.memory.shared` | Off | Requires dual consent when built |
| `voice.model` | Off | DEFERRED |
| `telephony.record` | Off | GOVERNED |

### L2 — Conversation consent

- Some features may require enabling AI **for this conversation**.  
- One party enabling private insights on **their side** must not process the other party beyond what is necessary for the requester’s client-side help—**server visibility rules are an open ADR** (ADR-0008).  
- Shared analysis requires **both** users (when that product exists).

### L3 — Action consent

- Sending a message always remains user action (or explicit future automation with separate governance).  
- Confirm commitment before it becomes a tracked obligation.  
- Approve draft before send.  
- Approve outbound AI actions.

### L4 — Governed event consent

- Voice sample capture; model training; call-as-user; recording.  
- Requires durable audit record: who, what, when, scope, expiry if any.

---

## Private vs shared intelligence

| Type | Who sees | Who consents | Example |
|------|----------|--------------|---------|
| Private reflection | Only requesting user | That user | “How might this sound?” |
| Private commitment list | Only owner | Owner | “Call Mom Sunday” |
| Shared decisions | Both (when accepted) | Both for AI-shared surfaces | “We decided on Saturday 6pm” |
| Shared relationship memory | Both | Dual | POST-MVP |

**Rule:** Opal must never surprise User B with User A’s private reflections.

---

## Visibility (“what did Opal use?”)

MVP design requirement:

- For any AI suggestion, user can inspect a **simple** explanation: sources in thread (message refs), feature used, not raw embedding dumps.  
- Engineering terms stay out of primary UI.

---

## Revocation and deletion

| Action | Expected behavior |
|--------|-------------------|
| Turn off feature | No new jobs of that type |
| Turn off conversation AI | No new AI jobs for that conversation |
| Delete relationship context | Removes stored relationship memory in scope; messages may remain as chat unless user deletes messages |
| Delete account | Full erasure path (timeline TBD with legal) |
| Revoke shared memory | Shared store tombstoned; each user keeps only what policy allows privately |

Exact retention after revoke: FOUNDER_DECISION + LEGAL.

---

## Server processing boundary (provisional)

Until E2EE + AI design is finalized:

1. **Transport encryption** (TLS) always.  
2. **At-rest encryption** for stored content.  
3. AI features that need content will process **ciphertext-decrypted server-side or on-device**—choice is ADR-0008.  
4. Prefer **on-device or minimal plaintext window** where feasible for future.  
5. Provider calls must use vendors with **no training on customer data** or explicit contractual controls (FOUNDER_DECISION).

---

## Consent UX principles

- Plain language.  
- No dark patterns to force AI on.  
- Revoke as easy as enable.  
- Contextual ask beats settings maze.  
- Never bury dual-consent for shared features.

---

## Implementation ownership

| Concern | Owner |
|---------|-------|
| Consent records, audits, enforcement | Elixir `Opal_core` |
| Checking consent before job dispatch | Elixir |
| AI refusing unsafe content | Python Safety + Elixir policy codes |
| Client prompts and settings | Mobile app |
| Legal copy | FOUNDER + counsel |

---

## Open consent decisions

See [GAPS_AND_OPEN_DECISIONS.md](./GAPS_AND_OPEN_DECISIONS.md):

- Default AI master on/off  
- Whether both must approve shared analysis  
- SMS invite to non-users  
- Provider retention  
- Minors  
