# Engine responsibilities — Dynamic Social and Experience Intelligence Phase 0

**Status:** Architecture responsibilities only. **Not implemented.**  
**Authority:** Compounds `docs/product/OPAL_DYNAMIC_SOCIAL_EXPERIENCE_INTELLIGENCE_PHASE0.md`  
**Runtime law:** Elixir admits; Python proposes; UI projects authorized surfaces only.

---

## 1. Dynamic relationship graph

| Item | Definition |
|------|------------|
| Purpose | Model evolving relationships, multi-type edges, overlapping contexts |
| Inputs | Accepted relationships, conversation participation, shared experiences, corrections |
| Outputs | Context candidates, strength signals (internal), multi-label types |
| Must not | Produce visible scores; force exclusive labels; auto-publish sensitive labels |
| Owner layer | Elixir graph truth; Python may propose context candidates |

## 2. Social context engine

| Item | Definition |
|------|------------|
| Purpose | Understand what is happening in a conversation or group **now** |
| Inputs | Recent messages (authorized), journey state, participation, time |
| Outputs | Active topic, forming plan, idle, sensitive/surprise flags |
| Must not | Invent certainty; treat silence as hostility |
| Owner layer | Elixir journey authority; Python topic/intent proposals |

## 3. Nuance and preference engine

| Item | Definition |
|------|------------|
| Purpose | Maintain permitted, time-sensitive preferences and corrections |
| Inputs | Explicit user statements, soft signals, revocations |
| Outputs | Nuance records with scope, confidence, freshness, sensitivity |
| Must not | Treat a one-time mention as forever truth without freshness rules |
| Owner layer | Elixir storage and admission; Python extraction proposals |

## 4. Participation engine

| Item | Definition |
|------|------------|
| Purpose | Determine who is actually involved in a specific experience |
| Inputs | Thread members, RSVP-like states, private interest, soft declines |
| Outputs | Active set, private set, excluded set, waiting set |
| Must not | Expose private sit-outs; pressure non-participants |
| Owner layer | Elixir |

## 5. Proximity and mobility engine

| Item | Definition |
|------|------------|
| Purpose | Geographic convenience without unnecessary exposure |
| Inputs | Permissioned location scopes, travel mode, traffic, venue coords |
| Outputs | Relative convenience scores; “centrally workable” flags |
| Must not | Continuous tracking by default; share precise peer locations |
| Owner layer | Elixir consent gates; Python ranking proposals |

## 6. Collective-fit engine

| Item | Definition |
|------|------------|
| Purpose | Rank options for the **set of people involved**, not one average user |
| Inputs | Constraints, preferences, distance, cost, sensory needs, history |
| Outputs | Ordered shortlist with hard-constraint satisfaction |
| Must not | Leak private constraint reasons into shared copy |
| Owner layer | Python ranking proposals; Elixir privacy-safe projection |

## 7. Experience curation engine

| Item | Definition |
|------|------------|
| Purpose | Build coherent experience possibilities (not a feed) |
| Inputs | Collective fit, social context, inventory, weather, events, timing |
| Outputs | 0–3 high-quality options with human-readable rationale (safe) |
| Must not | Dump catalogs; invent availability |
| Owner layer | Orchestrated under Elixir; Python generates candidates |

## 8. Opportunity engine

| Item | Definition |
|------|------------|
| Purpose | Recognize when membership, event, reservation, routine, or benefit may matter |
| Inputs | Patterns of co-activity, existing benefits, nearby inventory |
| Outputs | Opportunity candidates for restraint evaluation |
| Must not | Vendor spam; auto-enroll; commercial capture of private chat |
| Owner layer | Elixir opportunity admission |

## 9. Privacy and audience engine

| Item | Definition |
|------|------------|
| Purpose | Decide what may be used, revealed, shared, or withheld |
| Inputs | Consent grants, relationship vs audience graph, surprise flags, age tiers |
| Outputs | Allow / deny / redact / private-only decisions |
| Must not | Treat mention as publish permission |
| Owner layer | **Elixir only** for final decision |

## 10. Restraint engine

| Item | Definition |
|------|------------|
| Purpose | Decide whether Opal says anything at all |
| Inputs | Relevance, timing, permission, confidence, sensitivity, novelty, benefit, interruption cost, commercial influence, recent frequency |
| Outputs | Surface | hold | discard |
| Rule | Surface only when expected social value >> interruption + privacy cost |
| Owner layer | Elixir final gate; Python may score candidates |

## 11. Execution engine

| Item | Definition |
|------|------------|
| Purpose | Carry out **approved** reservations, invitations, payments, memberships, provider actions |
| Inputs | Explicit user confirmation (or narrow standing rule, visible and revocable) |
| Outputs | Side effects with auditability |
| Must not | Silent high-trust actions; provider chat-personae |
| Owner layer | Elixir; external providers behind adapters |

## 12. Learning and correction engine

| Item | Definition |
|------|------------|
| Purpose | Update model from outcomes and feedback |
| Inputs | Accept / decline / ignore, corrections, revocations, completed experiences |
| Outputs | Updated confidence, expired nuances, suppressed opportunity classes |
| Priority | Revocation > correction > outcome > soft inference |
| Owner layer | Elixir durable state; Python may propose reweights |

---

## Cross-cutting contracts

1. **No feed.** Engines produce sparse opportunities, not continuous content streams.  
2. **No friendship score.** Strength signals stay internal and unlabeled as scores.  
3. **No private surprise leakage.** Gift/surprise contexts stay private.  
4. **No user-facing jargon.** Surfaces use plain human language.  
5. **No em dashes in product-facing copy.**  
6. **Youth safety.** Dynamic engines for minors require separate safety gates before any Phase beyond design.  
7. **Foundation separation.** Kafka/Foundation may later carry events; they are not required for this Phase 0 truth and must not block Social Flow 18.
