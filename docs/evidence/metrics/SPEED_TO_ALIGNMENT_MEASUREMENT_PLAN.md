# Speed to Alignment — Measurement Plan (Grok)

**Author:** Grok  
**Principle:** Measure authentic alignment speed, not vanity engagement.

## Primary metrics

| Metric | Definition | Good direction |
|--------|------------|----------------|
| Time to shared readiness | From first meaningful intent signal → Ready (or equivalent) | Lower, without coercion |
| Questions asked | Count of user-facing clarifying prompts | Lower per completed alignment |
| Private-safe rate | Share of constraints that never enter shared projection | High (near 100%) |
| Correction rate | User overrides of Opal proposal/state | Track; high may mean bad inference |
| False execution claims | UI states claiming action without authority | Must be 0 |
| Experience completion | Confirmed happened (when lifecycle exists) | Higher quality over volume |
| Invite conversion | Invite → joined participant who participates | Higher with usefulness |

## Anti-metrics (do not optimize)

- Daily open streaks  
- Message volume  
- Time in app without movement  
- Notification clickbait rate  

## Instrumentation stages

1. **Synthetic fixtures** — log alignment steps in tests (existing DI tests are seed).  
2. **Hosted analytics (later)** — event names only after schema review; no private payload in general logs.  
3. **Founder demos** — stopwatch + comprehension questions after first minute.

## Comprehension questions (age ~12–14 friendly)

1. What is Opal doing here?  
2. Who said the human message?  
3. Is this a suggestion or a booking?  
4. What is still missing?  
5. Would you show this to a friend?
