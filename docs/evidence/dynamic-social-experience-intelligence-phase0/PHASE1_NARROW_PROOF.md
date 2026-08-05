# Phase 1 narrow proof design — Dynamic Social and Experience Intelligence

**Status:** Proposed design only. **Not started.** **Not implemented.**  
**Does not close Social Flow 18.** **Does not require live location, providers, payments, or Kafka.**

---

## Goal

Prove the **product shape** of backend intelligence with almost no user configuration, using the **smallest** vertical that still demonstrates:

1. inferred social context (not a form)  
2. one restrained surface  
3. one confirmation or correction  
4. privacy-safe explanation  
5. no feed, no score, no vendor-in-chat  

---

## Non-goals for Phase 1

- Live continuous location  
- Real provider inventory / reservations / payments  
- Shared membership commerce  
- Creator following product  
- Friendship strength UI  
- Full multi-engine production stack  
- Social Flow 18 device closure (separate track)  
- iOS work (still paused pending Apple credentials)  
- Foundation bridge requirement  

---

## Narrow scenario (adult only)

**Name:** Quiet dinner fit among three already-accepted friends.

**Preconditions (reuse SF18 hosted truth):**

- Three adult users already have accepted relationships  
- They share a conversation (hosted realtime path)  
- No minors in the thread  

**Synthetic backend inputs (fixture / test doubles, not live sensors):**

| Input | Source in Phase 1 |
|-------|-------------------|
| Dietary nuance (one user vegetarian) | Private fixture + optional user correction |
| Quiet preference (one user) | Private fixture |
| Budget band (one user, private) | Private fixture |
| Approximate areas (coarse) | Fixture coordinates; **no device GPS required** |
| Past “liked places” for the group | Fixture history |
| Venue candidates | Static inventory fixture (3–5 venues) |

**Forbidden in Phase 1:** reading real device location; calling real restaurant APIs; writing real bookings.

---

## Expected product behavior

### Happy path

1. Conversation context marks “dinner tonight” as forming (existing journey vocabulary).  
2. Collective-fit + curation engines (offline or service-proposed) produce **one** option.  
3. Restraint engine allows surface because confidence and value thresholds pass.  
4. UI shows one light moment, e.g.:

   > This looks promising for the three of you.

5. Actions: **Interested** | **Not this time** | **See why** | **Keep this private**  
6. **See why** shows only group-safe reasons (central convenience, open hours, shared past likes). It never reveals private budget.  
7. **Interested** records participation; does **not** auto-invite third parties outside the thread.  
8. **Not this time** suppresses similar suggestions for a cooldown (fixture policy).

### Correction path

User says (or taps equivalent):

> Not with this group.

System must:

- suppress this opportunity class for that participation set  
- not punish the user with forms  
- log a high-priority correction  

### Restraint path

If confidence is low or interruption cost high, **surface nothing**. Test that silence is the correct outcome.

---

## Proof gates (definition of done for Phase 1)

| Gate | Evidence |
|------|----------|
| Docs + contracts for scenario | This file + engine responsibilities |
| Elixir admission of proposal | Unit/integration test: unauthorized share rejected |
| Private budget never in shared projection | Assertion on projected copy |
| At most one primary surface when allowed | UI contract test or golden JSON |
| Zero surfaces when restraint fails | Test fixture |
| No friendship score fields in API | Schema review |
| No provider personae in thread | Message class review |
| Hosted optional | Local or CI test sufficient; hosted is bonus |

Phase 1 is **closed for engineering proof** only when the table above is green. It remains **not** “intelligence product live.”

---

## Suggested implementation slices (later, ordered)

1. **Contracts only** — proposal and projection schemas (Elixir)  
2. **Fixture collective fit** — pure function / Python job with fixed inventory  
3. **Restraint gate** — Elixir  
4. **One mobile/web moment component** — existing luminous capsule pattern  
5. **Correction intake** — one API + learning write  

Do not start slice 2 until Social Flow 18 device strategy remains honest (phone when available). Phase 1 intelligence must not steal the only available focus if a founder phone appears for SF18 physical matrix; both tracks can coexist as **docs and tests**, not competing live launches.

---

## Success metric (product, not vanity)

Users experience:

- almost no setup  
- occasional right-time help  
- easy correction  
- dignity-preserving privacy  

Not:

- engagement minutes  
- suggestion count  
- number of circles created  

---

## Explicit dependency note

Social Flow 18 remains the **entry layer** proof for real people connecting safely.  
Phase 1 intelligence is the **deeper layer** proof of backend curation shape.  
Neither replaces the other.
