# FACT OWNERSHIP + VISIBILITY LAW

**Status:** CURRENT AUTHORITY (steward Pass 1 — formalized before Pass 2)  
**Synced:** 2026-10-13  
**Composes with:** `STATE_OWNERSHIP_LAW.md` · `REALITY_SOURCE_PRIORITY_LAW.md` · Memory Observed→Candidate→Confirmed→Durable

```yaml
authority_class: FACT_OWNERSHIP_VISIBILITY_LAW
privacy_is_architecture: true
intelligence_requires_visibility: true
expand_schema_before_pass_2: note_only_until_substrate
```

## Law

> AI that remembers the right things, at the right time, with the right permission, and never confuses the user about reality.

Every durable or candidate fact in Opal eventually carries:

```text
Fact
 |
 ├── Owner
 ├── Source
 ├── Confidence
 ├── Scope
 ├── Visibility
 ├── Expiration
 └── Correction path
```

## Field meanings

| Field | Meaning |
|-------|---------|
| **Owner** | Who the fact is about / who can correct it (person or system object) |
| **Source** | Where it came from (conversation, explicit form, GPS permission, import, AI candidate) |
| **Confidence** | Observed · Candidate · Confirmed · Durable (memory law) — never Observed→Permanent |
| **Scope** | Relationship-private · dyad · graph members · self-only · public product |
| **Visibility** | Who may see it projected on which surfaces |
| **Expiration** | When it stops being current (or must reconfirm) |
| **Correction path** | How the owner updates or removes it |

## Example

```text
Fact:        Chanelle ring size
Owner:       Chanelle
Source:      Conversation
Confidence:  Confirmed
Scope:       Relationship-private
Visibility:  Partner context only (not graph-wide)
Expiration:  Until Chanelle corrects/removes
Correction:  Chanelle update/remove
```

Wrong: available to everyone in a Graph.

## Why this is Pass 1 (before intelligence)

Relationship intelligence without visibility law turns privacy into an afterthought.  
Permission is part of the **reality architecture**, not a Pass 2 feature add-on.

## Required zeros

- `PRIVATE_FACT_PROJECTED_GRAPH_WIDE = 0`
- `AI_CANDIDATE_TREATED_AS_CONFIRMED = 0`
- `NO_CORRECTION_PATH_ON_DURABLE_FACT = 0`
- `FACT_WITHOUT_OWNER_IN_DURABLE_STORE = 0` (target as schema lands)

## Implementation posture (now)

- **Formal law:** this file (authority).
- **Schema expansion:** deferred until Pass 1E–G close; do not unlock Pass 2 intelligence that invents durable private facts without these fields.
- Existing memory ladder (Observed→Candidate→Confirmed→Durable) remains the confidence spine.

## Related

- One authority owner per fact class: `STATE_OWNERSHIP_LAW.md`
- Source priority: `REALITY_SOURCE_PRIORITY_LAW.md`
- Surface agreement: `STATE_SURFACE_CONTRACT.md`
