# Screenshot bug 4 — Yes confirmation creates SharedPlan

## Root cause
`:chat` caught "Yes" after "Want me to set this up?" with no plan_confirm path.

## Fix
- `:plan_confirm` intent when affirmation + pending plan_create ask in history
- `OpalPlanConfirm.execute/3` → ensure_direct + create_tentative SharedPlan
- Response: "Done — dinner Friday with Maya is set up. I'll handle the details."

## Verify
mix test conversations + intent plan_confirm cases (mix.log)
