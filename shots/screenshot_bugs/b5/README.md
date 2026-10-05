# Screenshot bug 5 — OC-1 placeholder leak

## Root cause
`render_chat` default was still "I'm listening. I can help you plan…"
Short "Yes"/greetings hit that path when not plan_confirm.

## Fix (landed with plan_confirm + this commit)
- Contextual OC-4 chat templates (greeting / thanks / short yes / default)
- Live path never returns `OpalMessage.oc1_placeholder_body/0`
- Integration test: Hello never returns placeholder

## Verify
mix conversations hello + response chat tests (mix.log)
