# Screenshot bug 3 — Fort Oak ×3 in What's coming up?

## Root cause
DB had multiple tentative SharedPlans titled "Fort Oak" (Plan this / prior
create paths). `recent_plans` took the newest 5 with no title dedupe.

## Fix
`OpalContext.recent_plans/1` dedupes by normalized title (keep newest), then
takes 5. Includes id/status on plan rows.

## Verify
`mix test` opal_context_test dedupe case (see mix.log)
