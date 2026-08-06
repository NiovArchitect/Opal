# Speed to Alignment — Vertical Slice Design (Grok)

**Author:** Grok  
**No runtime implementation in this document.** Awaits Claude architecture package + Grok review.

## Slice 1 — Group (three people, local)

### Scenario

- A, B, C consider something local.  
- A ready.  
- B private constraint (e.g. quieter / budget / distance) — owner only.  
- C undecided.  
- Current option is location-poor for the set.

### Expected product behavior

1. Opal detects possibility (existing DI path).  
2. Identifies **one** missing alignment point (Minimum Question).  
3. Private ask to the right person only if needed.  
4. Ranks one better option without leaking B’s private reason.  
5. Shared states: **Still open** → (participation) → **Ready**.  
6. No setup form. No long summary. No exact location dump.

### Authority

- Elixir: membership, participation, shared projection safety, state.  
- Python: propose gap, candidate, reflection usefulness.  
- No Kafka required for slice proof.  
- No real provider booking required for slice 1.

### Proof artifacts (future implementation PR)

- Tests: private non-leak, outsider denial, one question path, silence when low value.  
- Web contract: moment labels age-12 readable.  
- Evidence doc with synthetic run.

## Slice 2 — Solo traveler (future)

≤3 options, one preferred, weather/time/area/mood/budget permissioned; no social requirement.

## Explicit non-goals for first slice

Production SMS, physical Android matrix, live GPS, real reservations, payments, creator feed, Kafka production connect.
