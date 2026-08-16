# WHO candidate reconciliation (pre–T1-A)

**DATE:** 2026-08-16  
**STATUS:** RECON ONLY — do not implement 135:7 until founder accepts  
**HOLD. DO NOT MERGE.**  
**Baseline product:** `7256f8e`

Doctrine: **Context should delete steps.**  
Noise budget: every WHO ask must be necessary.

---

## 1. Why founder sees Jordan but not Maya (exact root cause)

**Owner:** `earnedNamedPresence()` in `momentNamedPresence.ts` + fork UI in `OpalApp.tsx`.

| Fact | Code |
|------|------|
| Fork sheet shows **at most one** named person | `{namedPresence ? (<>With {name} · Someone else</>) : With people}` |
| That one person is **Jordan-hardcoded preference** | `people.find(/\bjordan/i) \|\| people[0]` |
| Maya is not “missing from the system” | She can appear under **Someone else** via `listDirectPeopleFromChats` **if** a dyad exists |
| Maya is missing from the **first** WHO surface | Only one `namedPresence` slot; Jordan wins when both dyads exist |

**Not the cause:** RelationshipGraph hiding Maya.  
**Not the cause:** P31-PATCH-01 dyad filter deleting Maya (unless she has **no** direct dyad—only group membership).

**Conclusion:** Presentation/selection model = single demo-named option + Jordan bias → founder primary sheet = Solo / With Jordan / Someone else. Maya is demoted to secondary sheet.

---

## 2. Why options concatenate visually (exact root cause)

**Owner:** fork panel layout CSS + structure.

| Fact | Detail |
|------|--------|
| Structure | `.moment-fork-panel` contains **sibling** `<button class="moment-people-option">` with **no** flex column / gap |
| Styles | `.moment-fork-panel { max-width: 360px; }` only — no `display:flex; flex-direction:column; gap` |
| Buttons | `.moment-people-option` is full-width but **does not set `display: block`/`flex`** |
| Observed failure | OCR / tight layout / a11y tree can read continuous run: `SoloWith JordanSomeone else` |

People sheet (second sheet) uses `.moment-people-list { flex-direction: column; gap: 8px }` — **stack is correct there**. Fork sheet does **not** reuse that list wrapper.

**Conclusion:** layout/presentation defect on **fork sheet**, not candidate data.

---

## 3. Authoritative source for direct people

| Source | Role |
|--------|------|
| **Primary** | `listConversations` → chats with `composition` / `memberCount` / `peers[]` |
| **Person candidates** | `listDirectPeopleFromChats(chats)` — dyads only, **peer user id** |
| **Group candidates** | `listExplicitGroupsFromChats(chats)` — multi-party only |
| **Destination** | `resolveDirectConversationForPerson` + `ensureDirectConversation` (PATCH-01) |
| **Not primary for WHO** | Jordan hardcode · group title first-token · RelationshipGraph “friend score” |

Do **not** create a PeopleEngine. Extend the existing list helpers.

---

## 4. Ranking / cap hiding Maya?

| Layer | Cap | Hides Maya? |
|-------|-----|-------------|
| `earnedNamedPresence` | **1 person** + Jordan prefer | **Yes** on first sheet |
| People sheet `momentWhoOptions.slice(0, 16)` | 16 people+groups | Unlikely unless >16 and Maya ranked out (people first, then groups) |
| Server list | recency | Secondary only |

**Main hide mechanism:** single-slot named presence, not ExperienceField or Home ranking.

---

## 5. Proposed fast-path list (WHO after Moment CTA)

**Law:** Context deletes steps; still allow exploration.

```
Solo
────────
With Maya      }  fast path: all direct dyad people
With Jordan    }  (ordered: recency / stable name; no Jordan-only hardcode)
With …         }  cap ~3–5 on first sheet
────────
More people    → full person list if more dyads
With a group   → explicit groups only (or same secondary sheet, sectioned)
Not now
```

If only one dyad: show that one + More if groups exist.  
If zero dyads: Solo + With people (current empty-path).

**Remove:** exclusive `With Jordan` demo monopoly.

---

## 6. “More people” / groups behavior

| Control | Opens | Content |
|---------|-------|---------|
| **More people** | existing people sheet (or section) | Remaining **person** rows only |
| **With a group** (or section “Groups”) | same sheet or second list | **Explicit multi-party only** — never person-masquerade |
| Cap on first sheet | intentional | Remaining must still be reachable without inventing a new graph |

Do not force multi-select noise. Single tap = WHO settled when one person chosen.

---

## 7. Plan-from-Maya must skip WHO (T1-A proof path)

| Launch context | WHO | UI |
|----------------|-----|-----|
| Home Moment CTA | open | WHO sheet (fast path above) |
| **People → Maya → Plan** | **pre-grounded Maya** | **No** “Solo / With Jordan / Someone else” |
| Path | `seedRealityFromMoment(..., [{id: maya, name: Maya}])` + `applyMomentSeed(seed, mayaDyadId)` | Forming → WHEN if needed |

**Hard law:** Action from a person surface preserves the person as context.  
Implement when T1-A ships; WHO fix is prerequisite so Moment path also shows Maya without “Someone else” tax.

---

## 8. Files expected to change (smallest WHO patch)

| File | Change |
|------|--------|
| `momentNamedPresence.ts` | Replace single Jordan `earnedNamedPresence` with **fast-path list** of direct people (no group); optional rank by recency if chat order known |
| `OpalApp.tsx` | Fork sheet: render **N named options** + More / group entry; Plan-from-person later in T1-A |
| `styles.css` | `.moment-fork-panel { display:flex; flex-direction:column; gap:8px; }` (+ ensure options `display:block` / full stack) |
| `momentNamedPresence.test.ts` | Maya+Jordan both reachable; no Jordan-only monopoly; no group masquerade |
| Optional a11y | Distinct labels; no run-on accessible name |

**Out of this smallest patch:** 135:7 identity plate, Shared Future, Call, Home.

---

## 9. Regression risks

| Risk | Guard |
|------|-------|
| Group titled “Maya, …” shown as person | Keep `isMultiPartyConversation` / PATCH-01 gates |
| Duplicate threads | Reuse `resolveDirect` / `ensure_direct` |
| Too many first-sheet options | Cap 3–5 + More |
| Plan from Moment still asks WHO when already named | Named tap must still apply that person only |
| CSS only fix without candidate fix | Maya still missing if only one slot remains |

---

## 10. Smallest patch scope (founder acceptance gate)

**Name:** `WHO-FAST-PATH-01` (pre-T1-A)

1. Stack fork buttons (column + gap) — kills concatenation  
2. Fast-path **all (capped) direct dyad people**, not Jordan-only  
3. **More people** → remaining people; groups only as explicit group choices  
4. Tests: Solo + Maya + Jordan visible/reachable; group ≠ person; 390 no run-on  

**Then** T1-A (135:7): Plan-from-Maya **skips WHO** entirely.

---

## Doctrine lock

> **Context should delete steps.**

| Already know | Must not re-ask |
|--------------|-----------------|
| Exact Juniper | WHERE / invent Dinner |
| Saturday 7:30 | WHEN again |
| Opened Maya / Plan from Maya | WHO again |
| Shared Future segment | WHAT again |

**HOLD. DO NOT MERGE.**  
**Do not implement 135:7 until this WHO reconciliation is accepted.**
