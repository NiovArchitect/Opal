# Opal Calendar, Work, and Surprise Action Model

**Status:** AUTHORITY — additive to Permission Architecture / Relationship Access / Calendar free-busy  
**Freeze:** HOLD · **Pass 2:** LOCKED  
**Last updated:** 2026-10-14

---

## 1. Calendar ownership law

Person A does **not** gain direct access to Person B's calendar because they are partners, family, friends, or coworkers.

```text
RELATIONSHIP_TYPE_AUTO_GRANTS_CALENDAR = NO
```

Correct architecture:

```text
Person B grants Opal permission to USE availability
  within approved relationship/scope
```

Person A may receive only the minimum safe alignment output.

Allowed: `"Saturday after 7 works for both of you."`  
Not automatically allowed: event titles, locations, or private causes.

```text
USE_AVAILABILITY ≠ DISCLOSE_EVENT_DETAILS
```

---

## 2. Capability separation

Capabilities are separate:

| Capability | Meaning |
|---|---|
| `calendar.availability.use` | Opal may use free/busy for alignment |
| `calendar.availability.disclose` | Opal may reveal free/busy windows to another person |
| `calendar.event_titles.disclose` | Opal may reveal event titles |
| `calendar.write` | Opal may create/update calendar events |
| `calendar.manage` | Broader calendar management |
| `calendar.surprise_hold.create` | Opaque hold on invitee calendar (explicit standing auth only) |

Default for surprise coordination: **use availability only; do not write to invitee calendar; do not disclose titles.**

---

## 3. Surprise mode

`visibility_mode: normal | surprise` is first-class planning state.

When surprise:

- Opal may use invitee free/busy **if** `calendar.availability.use` is granted for the relationship scope
- Opal must **not** expose the plan to the invitee prematurely
- Opal must **not** send a normal plan invite
- Opal must **not** create a revealing calendar event on the invitee's calendar
- Conflict monitoring notifies **only the organizer**, without revealing what created the conflict

---

## 4. Calendar knowledge ≠ willingness

```text
calendar_free ≠ willing ≠ interested ≠ going ≠ committed
```

Feasibility is not consent.

---

## 5. Work schedule + time-off

Work conflicts are evaluated with buffers (shift end + transit + departure), not naive comparisons.

Time-off is an action ladder:

```text
Suggest → Prepare → Submit → Submitted → Approved / Denied / Cancelled
```

`Submitted ≠ Approved`. Never claim “You're off Friday” from submission alone.

Standing work-action authority may auto-submit under explicit user-defined bounds; otherwise Prepare → ask once.

Providers (`WorkScheduleProvider`, `TimeOffProvider`) are substrate now; execution only when a real provider is connected. Never fake submission.

---

## 6. Multi-person privacy

Each participant's work/calendar facts belong to that person. Opal may align privately without cross-disclosure.

---

## 7. Graphing is not publishing

Private, permissioned intelligence from conversation or call Graphing may help Opal plan.

It does **not** automatically become Home, Stories, or Live content.

```text
GRAPHING ≠ PUBLISHING
```

Social projection requires a separate visibility / publishing authority.
Private Graphing signals may influence relevance.
Private Graphing must never automatically become a social post.
