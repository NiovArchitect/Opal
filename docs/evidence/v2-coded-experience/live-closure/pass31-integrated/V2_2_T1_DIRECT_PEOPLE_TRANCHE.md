# V2.2-T1 — Direct People Relationship Surface

**Figma authority:** `fy69K8cCug9prf5GLwQ7Hy` · **`135:7`**  
**Prerequisite:** P31-PATCH-01 founder-validated (`7256f8e`)  
**HOLD. DO NOT MERGE** until this tranche is founder-walked.

---

## Goal

Maya must feel like a **person / relationship destination**, not a row that routes a plan.

Human 1-second / 3-second gates (founder):

| Time | Question | Expected |
|------|----------|----------|
| 1s | Who is this? | **Maya** |
| 3s | What can I do? | Message · Plan · (Call/Video only if truthful) |

---

## Existing owners (reuse — do not replace)

| Concern | Owner today | Gap for 135:7 |
|---------|-------------|----------------|
| People tab | `OpalApp` tab `chats` labeled **People** | List of conversations — thin person identity |
| Open thread | Chat early-return in `OpalApp` | Header is name + signal; no relationship plate |
| Dyad vs group | `composition` / `memberCount` / peers on `ChatPreview` | Not presented as “direct connection” |
| Find people | `FindPeopleFlow` | Onboarding invite — not relationship home |
| Follow | FollowGraph | Separate from connection — keep |
| Friend / connect | RelationshipGraph + establishment | Not surfaced on People UI |
| Shared plan / seed | moment seed + filaments | Shared Future strip not first-class |
| System consequence | `opalSystemConsequence` / speaker plan | Must stay non-Maya in thread |
| Call / Video | **Not productized** | Show only as unavailable or omit until capability true |

---

## T1 scope (in)

### T1-A — Direct relationship open state (dyad only)

When user opens a **dyad** from People:

1. **Identity plate** (above or integrated with thread header)
   - Display name (full first line)
   - Quiet relationship line: e.g. “Direct connection” / friend context if known — **not** taxonomy spam
   - No “them” · no group title collapse

2. **Actions** (human language)
   - **Message** — focus composer / already in thread (primary is the conversation)
   - **Plan** — opens moment-capable planning entry on **this** dyad (reuse seed destination; no group widen)
   - **Call** / **Video** — if no real capability: omit **or** disabled with honest non-capability (never fake live call)

3. **Shared Future** (minimal)
   - If `momentSeed` or conversation signal has grounded plan for this dyad: show one line  
     e.g. `Juniper & Ivy · Saturday · 7:30`  
   - Tap → scroll to filament / plans strip — not a second plan product
   - If none: quiet empty (no fake future)

4. **Thread**
   - Preserve P0-31-04 speaker chrome
   - Opal system consequences remain non-human (`opalSystemConsequence`)

### T1-B — People list person-first

- Dyad rows: peer display name primary; optional quiet “Direct”
- Group rows: group label primary; optional quiet “Group · N”
- Never present multi-party title as a single person (P31-PATCH-01 law holds)

### T1-C — Tests

- Dyad open shows identity + Plan action
- Plan from relationship surface uses direct conversation id (assert not group)
- System consequence still not attributed to peer
- Group open does **not** get false “Call Maya” personal plate

---

## Out of scope for T1

- Full `135:8` Journey controls (leave / cancel res / cancel plan / reschedule) — **T2**
- Explicit Add people expansion UX — **T3** (architecture must not block)
- Home Living Graph continuous feed — **T4**
- Graph-in / unfamiliar city — **T5**
- Real WebRTC calling
- Relationship circle admin / Instagram lists
- ExperienceField ranking changes
- FollowGraph changes
- Payouts

---

## Implementation law

**KEEP WHAT WORKS.**  
Compound on: dyad ensure, moment seed destination, message speaker, reservation consequence.  
Do not create `PeopleEngine` or parallel SocialReality.

**Call/Video truth:**  
Capability-honest. Prefer hide until real; if shown, never imply media works.

---

## Success (founder walk)

1. People → Maya → feels like Maya  
2. Plan → Juniper path still direct to Maya  
3. Shared Future (if plan exists) reads as the same object  
4. System reservation line is Opal, not Maya  
5. Group “Saturday Circle” still feels like a group, not a person  

---

## After T1

**T2 — Figma `135:8` Journey controls**  
**T3 — Explicit audience expansion**  
**T4 — Home `135:3` / continuous `135:4`**  
**T5 — Graph-in `135:5` + unfamiliar city `135:9`**
