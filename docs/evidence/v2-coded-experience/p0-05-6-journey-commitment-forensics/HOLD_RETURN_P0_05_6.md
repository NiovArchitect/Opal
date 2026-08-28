# P0-05.6 — Journey commitment semantics forensics

**HEAD unchanged:** `15731c0cdf1da014afea9373073413067a673241`  
**Production files changed:** 0  
**Classification:** **CASE B** — domain commitment exists; current dated Figma UI trigger for Graph→Going→Journey is **MISSING**.

## Founder law (accepted for this forensic)

Journey is not a navigation button. It is the projection of the same Reality after commitment.

## Exact eligibility (`JourneyAuthority.journey_eligible?/1`)

```elixir
status in ~w(agreed changed) and
  (non_empty location OR non_empty time_label OR non_nil start_at)
```

Reservation / two participants / lead are **not** eligibility requirements (Journey fixture may show them).

## Existing domain commitment paths

1. **Conversation option accept (all members)** → `create_shared_plan` → SharedPlan `agreed` + participants `accepted`
2. **`JourneyAuthority.activate`** → find/create SharedPlan `agreed` + caller `accepted` (currently only used to refresh an already-open Journey after P0-05.5)
3. Soft interest / I'm interested → **localStorage only** — explicitly not Going

## Current 618:2 UI

No Going/commit control that mutates SharedPlan.  
I'm interested = soft. Lock-in = copy. Open directions = maps. Graph open = Detail only.

**CURRENT_COMMITMENT_UI_AUTHORITY = MISSING**

## Recommendation

Do not invent a trigger. Founder designs **one intentional Going/commitment interaction** (or maps an existing domain path onto an approved surface). Then a small mechanical follow-up can route Graph open → Journey **only when** SharedPlan is already Journey-active.
