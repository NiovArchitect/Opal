# POST-B7 Implementation Touchpoint Map

**Pass:** P0 — map only. **Do not implement here.**  
**Product frozen at:** `110ca3c`  
**Authority root:** `618:2`

For each future feature: existing owner · state · minimal extension · backend/privacy/Figma deps.

---

## P1 — Objective founder-walk defect closure

| Defect | Existing owner | Minimal extension | Backend | Privacy | Figma |
|--------|----------------|-------------------|---------|---------|-------|
| FW-D1 Outgoing≠Incoming | `CallSurfaces.tsx` (`CallKind`); call open from Person/Direct/Group/`OpalApp` | Add outgoing dialing/ringing states; route place-call → outgoing, not `incoming` | None required for UI honesty | — | Current `618:581+` visuals; state law in `CALLS_COMMUNICATION_CONTINUITY.md` |
| FW-D2 Overlapping copy | Same | Single active branch; unmount inactive chrome | — | — | Current call frames |
| FW-D3 Spine centering | `styles.css` `.gsh-gr-timeline*`, `.graphs-timeline*`; Home Jordan / Graphs list | Align spine x to node center; z-order behind dots | — | — | `618:161`, `618:674` |
| FW-D4 Stage centering | App shell / member stage CSS; sheet/portal mounts | Fix mount origin vs phone stage | — | — | Full 390×844 viewport law |

---

## P2 — Calls / Communication Continuity (after founder promotes `928:3`)

| Concern | Existing owner | Minimal extension | Backend | Privacy | Figma |
|---------|----------------|-------------------|---------|---------|-------|
| Calls home continuity list | `ChatsHome.tsx` / communication tab; no separate CallGraph | Mode switch Chats↔Calls; relationship rows + optional consequence slot | Call history events + optional consequence link to Graph/Journey | Assist consent; private≠social | `928:3` proposals |
| Person/Group call continuity | Person profile / Group info / Direct | Continuity signal card; recent call events | Same | Group-safe aggregates only | `928:158`, `928:221` |
| Place call / New call | Existing call actions | Outgoing state machine (P1) + people/groups picker | — | — | `928:276` |
| Provider outcomes | Graph/Journey owners | Surface “Handled by Opal” on Graph — **not** fake user call row | Provider action provenance | — | Continuity law |

**Forbidden:** `CallGraph` domain.

---

## P3 — Signal Grammar behavior (after founder promotes `965:2`)

| Concern | Existing owner | Minimal extension | Backend | Privacy | Figma |
|---------|----------------|-------------------|---------|---------|-------|
| Semantic accent tokens | Brand V4 CSS / Section 06 accents | Shared signal token map; lifecycle (born→settled) | Signal freshness / ack state | Never color-encode private inference | `965:2` |
| Interruption budget | Notifications / Activity | Map severity 0–4 to push/haptic/pulse | Notification policy | Existing Section 06 | `965:2` interruption budget |
| Calls consequence reveal | Calls continuity (P2) | Gold only when mutually confirmed | Shared truth confirmation | — | Earned consequence frames |

**Do not** recolor frozen B5 screens for vanity.

---

## P4 — Decision Intelligence / Curate-for-me (after founder promotes `975:2`)

| Concern | Existing owner | Minimal extension | Backend | Privacy | Figma |
|---------|----------------|-------------------|---------|---------|-------|
| Primary entry | `OpalAmbient.tsx` `618:902` | High-confidence one-best-fit path; confidence router | Ranking / fit engine | Share-safe reasons only | `975:2`, `975:363`, `975:1051` |
| Contextual invoke | Direct Plan, Graph gaps, Journey, Calls consequence | Seed Global Opal with known context; no WHO re-ask | Context snapshot | — | Cross-surface map in `OPAL_DECISION_INTELLIGENCE.md` |
| Solo | Same + additive `902:2` | Solo path without group prerequisite | — | — | `902:2` (additive) |
| One-tap refine | Existing chips | Dimension-local recompose | — | — | `902:345` |
| Group fit | Backend intelligence | Private matrix → share-safe output | Group fit matrix `975:1069` | Private≠social | `975:707` |
| Handoff | Graph / SharedPlan / Journey | Mutate **same** Graph owner | Provenance fields on existing objects | — | Same-reality law |
| ACT delegation | Capability / consent / spend | Explicit scope only | Capability ledger | Consent | Delegation levels |

**Forbidden:** `OpalPlan`, `Graph2`, `AIPlan`, `CuratedPlan`.

---

## P5 — Integration / learning / provenance / convergence

| Concern | Existing | Extension |
|---------|----------|-----------|
| Learning loop | Intelligence layers / relationship contexts | Outcome → decay → correction (silence = neutral) |
| Provenance | Reality / SharedPlan / Graph | Attach decision provenance; no parallel planner DB |
| Proof | `prove_b6_guards`, `prove_b7_convergence` | New formal packages only after promotion; preserve B1–B7 history |
| Additive 902 states | Documented | Implement only when authorized |

---

## Code inventory (verified paths)

```
apps/opal_web/src/opalUi/CallSurfaces.tsx
apps/opal_web/src/opalUi/OpalAmbient.tsx
apps/opal_web/src/opalUi/ChatsHome.tsx
apps/opal_web/src/opalUi/GraphSocialHome.tsx
apps/opal_web/src/opalUi/GraphDetailSheet.tsx
apps/opal_web/src/opalUi/GraphJourneyCard.tsx
apps/opal_web/src/opalUi/JourneySurface.tsx
apps/opal_web/src/opalUi/GraphPeopleThread.tsx
apps/opal_web/src/opalUi/GraphProfilePage.tsx
apps/opal_web/src/opalUi/ActivityDestination.tsx
apps/opal_web/src/opalUi/YouSettingsDestination.tsx
apps/opal_web/src/styles.css  (.gsh-gr-timeline*, .graphs-timeline*, call-*, stage)
docs/authority/OPAL_CURRENT_AUTHORITY.yaml
docs/authority/STATE_COMPLETENESS_LAW.md
docs/authority/OPAL_AI_REWARD_ARCHITECTURE.md
docs/product/CONSENT_MODEL.md
docs/product/CAPABILITY_LEDGER.md
```

## Metrics

```
IMPLEMENTATION_STARTED_IN_P0 = NO
PRODUCT_CODE_CHANGED = NO
NEW_CURRENT_SURFACES_PROMOTED = 0
```
