# EP-006 — Group recompose + multi-participant memory (messy)

## Cast
Founder (required), Chris (required), Jess (required), Alex (required), Maya (required), Sam (optional / late)

## Relationships
- Maya usually prefers quieter places (relationship memory — private)
- Jess likes sushi generally (soft relationship/episode)
- No hard-coded name branches in product code

## Starting context
Empty group conversation; 5 members already.

## Messages (order — messy)
1. Founder: “Saturday dinner around 7:30? Something Italian sounds good.”
2. Chris: “I'm in. Anywhere but downtown.”
3. Jess: “I'm in. I like sushi generally but Italian is fine.”
4. Alex: “Works for me. No sushi tonight though.”
5. Maya: “I'm in. Leaving around 9.”
6. Founder: “Can Sam come?”
7. (membership) Sam added as real member
8. Sam: “Count me in — join around 8.”
9. Four people: “Somewhere lively tonight.” (current override of Maya quiet memory)

## Private context
- Maya relationship memory: quiet restaurants (owner_private)
- Must not appear in shared chronology or human_surface as “Maya prefers quiet”

## Expected reality transitions
### After messages 1–5
- WHO: 5 required
- WHAT: Dinner
- WHEN: Saturday · ~7:30 (early leave ~9 does not kill plan)
- WHERE: open; downtown incompatible
- FOOD: sushi conflict (Alex current)
- next_gap: place (or participants if stage open)
- Collective fit: Italian candidates not downtown; sushi suppressed

### After Sam joins (7–8)
- WHO: 6 members; Sam optional/late
- WHEN preserved (no plan restart)
- party_size 6 → capacity recompute
- Sam sushi soft preference does **not** force sushi over required Italian

### After lively override (9)
- group_intent: lively
- Maya quiet memory still stored, not dominant
- ranking reflects lively current evidence

## Expected private outputs
- Ranked options with internal reasons (eval_snapshot)
- Private memory provenance never shared

## Expected shared outputs
- “I've got a few that fit the group.” / compressed group presence
- Optional: “Downtown doesn't fit” as consequence (not “Chris said…”)
- No preference matrix

## Expected next_gap
place (while WHERE open)

## Expected actions
- Choose a place / Curate (private)
- Not Find a time once WHEN known

## Forbidden actions
- Restart WHEN on Sam join
- Broadcast private Maya memory
- Optimize solely for one remembered person
- Optional Sam blocks required alignment
- authorizes_set from ranking

## Expected final reality
- Dinner · Saturday · ~7:30 · place candidate fit · 6 people · Sam late OK

## Expected chronology
- Consequential: Sam joined / party became 6 / downtown consequence / time/place deltas
- Not: every ranking recalculation

## Expected human coordination residue
Humans should not re-ask: downtown? sushi? can Sam join? does Maya need quiet tonight?

## Executable coverage
`collective_composition_test`, `group_composition_test`, EP-006 bridge property

## Capabilities
INT-GROUP-001, INT-GROUP-002, INT-PLACE-001, INT-CURATE-001, INT-REALITY-001, INT-MEM composition
