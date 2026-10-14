# FIT_TO_CENTER + SPENDING_TO_CENTER

**Branch:** `muse/packet-b-batch-2`  
**Pass 2:** LOCKED · **Freeze:** HOLD  
**Law:** USE_PERMISSION ≠ DISCLOSURE_PERMISSION — Fit/Spend influence owner Center privately; never announce private constraints to friends.

## Flow (Fit)

```
You → Fit (localStorage, share gate)
  → readFitSliceForOpal(userId)
  → OpalCenterChat postOpalMessage(..., { clientContext: { fit } })
  → POST /api/v1/product/opal/conversation/messages { body, client_context }
  → OpalConversations.create_user_message(..., client_context:)
  → OpalContext.assemble(..., client_context) → gated :fit %{activities, goal}
  → OpalIntent.classify → :recommend | :plan_create
  → OpalResponse: activity suggest / plan hint (no "Fit" / goal id in consumer copy)
```

## Flow (Spending)

```
You → Spending comfort (FinancialProfiles, trusted+)
  → OpalContext.gated_financial/2 (already on Center assemble)
  → OpalResponse.render_recommend → fits_approx? / fits_level?
  → Budget ≤ ~$25 catalog · Comfortable broader (polished) · never speak $ or level to others
```

## Caps / honesty

- Fit activities allowlisted + capped at 6; unknown tokens dropped.
- No Pass 2 inference; no fake bookings.
- Consumer UI: no `FIT_*` / `LLM_*` diagnostics.
- `context_snapshot.fit` / `.financial` live on owner Opal message metadata only.

## Proof commands

```bash
cd apps/opal_core && mix test \
  test/opal_core/opal_context_test.exs \
  test/opal_core/opal_conversations_test.exs \
  test/opal_core/opal_response_test.exs \
  test/opal_core/financial_profiles_test.exs

cd apps/opal_web && npx vitest run \
  src/opalUi/fitPreferences.test.ts \
  src/opalUi/OpalCenterChat.test.tsx
```

## Status

| Row | Status |
|---|---|
| FIT_TO_CENTER | IMPLEMENTED → unit PROVEN |
| SPENDING_TO_CENTER | chat-path closed (was partial BE) → unit PROVEN |
| FOUNDER ACCEPTED | pending phone |
| PASS2_UNLOCKED | NO |
