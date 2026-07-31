# Privacy and Encryption

**Status:** Phase 0 preliminary model  
**Related ADR:** 0008

---

## Threat-relevant assets

- Message bodies and media  
- Voice samples and future voice models  
- Private reflections and relationship memory  
- Contact graphs  
- Location of presence  
- AI prompts/results that restate intimate content  

---

## Baseline (MVP-capable)

| Control | Requirement |
|---------|-------------|
| TLS 1.2+ in transit | Mandatory |
| Encryption at rest (DB/disks) | Mandatory in deployed envs |
| Secrets management | No secrets in git |
| Access control | Membership checks on every conversation join/read |
| Audit logs | Auth, consent changes, admin access |
| Least-privilege AI context | Bounded windows |
| Provider contracts | No training on customer data where available |

---

## E2EE posture

**Long-term goal:** end-to-end encryption compatible with modern messengers.

**Tension:** server-side or third-party AI needs content access unless on-device.

### Phased approach (recommended)

1. **Phase A (MVP):** TLS + at-rest + strict authz; AI processes under explicit consent; clear privacy copy.  
2. **Phase B:** Optional on-device AI for sensitive assists.  
3. **Phase C:** E2EE for message bodies; AI either on-device or with explicit client-side unwrap for consented server AI sessions.  

Do not claim E2EE until complete and audited.

---

## AI plaintext window

When user enables a server AI feature:

- Document that content may be processed by Opal AI workers and subprocessors.  
- Scope to conversation + feature.  
- Prefer ephemeral processing; retention policy G033/G035.  
- Consent token encodes scope; workers reject missing/expired tokens.

---

## Private vs shared stores

```text
private_memory (user_id)          — only user
shared_relationship_memory (pair) — dual consent only
message store                     — participants (+ server per encryption phase)
ai_artifacts                      — owner-scoped unless shared feature
```

---

## Deletion

- Message delete: tombstone; media GC.  
- Relationship context delete: remove private/shared memory in scope; verify with tests.  
- Voice model delete: GOVERNED path.  
- Account delete: orchestrated erasure job.

---

## Open items

G020–G024, G031–G035 in gaps doc.
