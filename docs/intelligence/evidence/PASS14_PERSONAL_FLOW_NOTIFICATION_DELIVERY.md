# PASS 14 — Personal Flow Orchestration + Trustworthy Notification Delivery

**Date:** 2026-08-14  
**Branch:** `build/v2-coded-experience-closure`  
**HOLD. DO NOT MERGE.**

---

## EXECUTIVE STATE

Pass 13 froze **what matters now**.  
Pass 14 connects that decision to:

1. **Personal flow** — next meaningful private consequence (or silence), not a planner.  
2. **Delivery** — silence / ambient / notify / supersede / suppress / expire after AttentionAuthority — never an independent escalation engine.

**AttentionAuthority ranking not redesigned.** Only delivery + personal composition + meta polish.

---

## INTELLIGENCE PREFLIGHT

```text
INTELLIGENCE CONTEXT LOADED
TARGET CAPABILITIES:
  personal flow orchestration (new pure projection)
  notification delivery (new seam over existing policy)
  delivery supersession / expiry / receipt / feedback
DEPENDENCIES:
  AttentionAuthority (frozen)
  ExperienceContinuation
  NotificationContent / ReminderDelivery / DeliveryCompose (existing)
  ExternalWorldTruth travel provenance (synthetic OK)
INVARIANTS:
  one semantic consequence → one interruption
  reconnect does not re-notify
  optional ≠ obligation
  delivery never escalates attention class
  leave-by requires travel provenance
EXPECTED NON-CHANGES:
  Pass 13 ranking weights
  one-awaken law
  filament budget
  SocialReality / CollectiveComposition / brand / SF15
  no provider integrations
  no notification center / feed UI
  no personal planner screen
```

---

## EXISTING NOTIFICATION ARCHITECTURE

| Owner | Role |
|-------|------|
| `AttentionAuthority.notification_policy/2` | notify / suppress / supersede / silent (policy) |
| `Execution.NotificationContent` | lock-screen privacy modes |
| `OpalCalendar.ReminderDelivery` | queue + lock_screen_copy |
| `Execution.DeliveryCompose` | device capability + revalidation path |
| `Ambient.InterruptionDebt` | surface debt |

**Pass 14 does not replace these.** It adds:

| Module | Path |
|--------|------|
| PersonalFlow | `apps/opal_core/.../personal_flow.ex` + `opal_web/.../personalFlow.ts` |
| NotificationDelivery | `apps/opal_core/.../notification_delivery.ex` + `opal_web/.../notificationDelivery.ts` |

Browser Notification API is the minimal client adapter when permission = granted. **No OS push provider campaign.**

---

## DELIVERY OWNER / PERSONAL FLOW OWNER

- **AttentionAuthority** — whether consequence is justified.  
- **PersonalFlow** — compose next private flow consequence from realities + day context.  
- **NotificationDelivery** — DeliveryIntent after attention; history/dedupe/supersede/expiry.  
- **Channel adapter** — browser notification or in-app only.

---

## PERSONAL FLOW TIMELINE (EP-010 shape)

| Time | Context | Expected | Result |
|------|---------|----------|--------|
| 3:00 | work, dinner 7, travel known | **silence** | PASS |
| 5:00 | work ends, optional errand, slack | **optional transition** (not obligation) | PASS |
| 6:20 | leave window | **leave consequence**, delivery eligible | PASS |
| on track | already travelling | **silence** | PASS |

Optional copy: “You've got time for that stop before dinner.”  
Never: “Go to the store at 5:15.”

---

## NOTIFICATION MATRIX

| ID | Case | Result |
|----|------|--------|
| N1 | recompute only | silent |
| N2 | settled far | silent/ambient |
| N3 | leave window imminent | notify |
| N4 | leave time changes | supersede |
| N5 | app active on reality | suppress external |
| N6 | permission denied | suppress (app still works) |
| N7 | reconnect same key | suppress dedupe |
| N8 | stale after start | expire |
| N9 | private cause in copy | lock-screen safe |

**Permission prompt:** “Want Opal to let you know when it’s time to head out?” — contextual, not first-launch spam.

---

## META COPY + BARE CLOCK

| Issue | Repair |
|-------|--------|
| `6:3 · 6:30 PM` | `formatDayLabel` no longer treats bare clocks as days; `shortWeekday` never slices clocks |
| Bare clock AM/PM | Evening-social bias only when dinner/tonight/evening context or hour ≥ 5; not silent high-certainty invent for 1–4 |

---

## ATTENTION REGRESSION

Pass 13 matrix remains green (tonight place-open > Saturday place-open; deadline exception; order independence).

---

## CONSTITUTION (additive laws only)

1. Attention consequence ≠ notification.  
2. One semantic consequence → one interruption.  
3. Delivery supersession by lineage + supersession key.  
4. Delivery expiry after validity horizon.  
5. Permission never assumed.  
6. Feedback (delivered/opened/dismissed/acted/expired/superseded) is moment-scoped — dismiss ≠ durable hate forever.

---

## TESTS

- vitest personalFlow + notificationDelivery + meta polish  
- vitest full opalUi + sharedReality  
- ExUnit PersonalFlowNotificationTest + AttentionAuthority  
- intelligence_check --with-tests  
- Pass 13 ranking regression (unit)

---

## KNOWN GAPS

1. Browser notification is the real client adapter; **native OS push infrastructure not fully wired** — stated truthfully.  
2. Deep-link routing from notification click is specified (route to reality) but not a full native shell integration.  
3. Live multi-hour simulated founder browser proof is unit/timeline proven; full Playwright clock-injected day is optional follow-up.  
4. Residual multi-seed fixture hygiene unchanged.  
5. Providers still blocked (Maps/OpenTable not in this pass).

---

## V2 MERGE VERDICT

**HOLD — DO NOT MERGE.**

Internal chain now:

**understand reality → decide what matters → personal/shared flow composition → decide whether to interrupt → deliver (or stay silent)**

Providers remain next: senses and hands for this brain — not the brain.
