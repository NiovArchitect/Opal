# Social Flow Privacy Boundaries

**Authority:** ARCHITECTURE (CURRENT)  
**Renames historic “privacy sandbox” / DPS concepts to Opal language**

---

## Opal Personal Context Boundary (logical)

Not a single centralized intimate data lake. Not a blockchain.

| Boundary | Contents | Crosses only with |
|----------|----------|-------------------|
| **User private** | Private reminders, gift prep, personal holds, private reflections | That user’s explicit action |
| **Conversation** | Messages, in-thread proposals | Membership + feature consent |
| **Relationship / circle** | Scoped preferences, shared memory when dual-consented | Circle permissions |
| **Plan** | Coordination fields for one plan version | Plan participants + grants |
| **Restricted surprise** | Organizer/helpers; **excludes guest** | Explicit surprise mode |

---

## Rules

1. Python receives only context for **one approved capability**, with purpose, consent proof, expiry, trace_id.  
2. Derived insights do not auto-propagate across circles or relationships.  
3. Free/busy may be computed without exposing event titles or private prep.  
4. Revocation stops **future** processing; deletion semantics follow product/legal policy.  
5. Shared memory requires stronger consent than private memory.  
6. Sensitive inferences are reviewable and may expire.  

---

## User-facing controls (language)

Users never need “sandbox” jargon. They see:

- Share free/busy only with this group  
- Let Opal use this conversation to coordinate this plan  
- Keep this reminder private  
- Forget this preference after the event  
- Surprise mode: hide from [guest]  

---

## Availability grants

Per person / circle / plan, options may include:

- exact availability  
- free/busy only  
- preferred windows  
- ask before sharing  
- no availability access  

---

## Location (future)

- Off by default  
- Purpose-specific, time-limited  
- Prefer coarse over precise  
- Not visible to others unless shared  
- No covert proximity  

---

## Forbidden product uses

- Social Score (any form) driving access or matching  
- Advertising targeting from intimate messages/plans/mood  
- Covert mood inference of contacts  
- Auto RSVP without authority  
- Surprise leakage into shared plan with guest  

---

## Mapping from historic source terms

| Historic (source) | Opal |
|-------------------|------|
| Decentralized Privacy Sandbox / DPS | Personal Context Boundary |
| Staked DID preferences | Consented preference memory |
| Immutable social proof on chain | Private exportable history (when needed) |
| Group staking | Out of scope |
