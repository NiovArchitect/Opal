# Dogfood — Human Coordination Residue protocol

**Purpose:** Measure what coordination work remains after Opal has done everything it legitimately can.  
**Not:** Optimize for zero human involvement.

## Residue types

| Type | Avoidable? | Meaning |
|------|------------|---------|
| `irreducible_human_authority` | no | desire, consent, preference, pay, share, Set authority |
| `desirable_human_choice` | no | genuine tradeoff (romantic / experience) |
| `missing_intelligence` | yes | Opal could know but doesn't |
| `missing_permission` | yes | user denied/withheld capability |
| `missing_integration` | yes | provider/device not live |
| `execution_limitation` | yes | handoff-only / client contract |
| `product_defect` | yes | should have worked with existing truth |
| `user_preference` | no* | human chose manual path |

\* Not "fixed" by more product pressure; record honestly.

## Capture (privacy-safe)

After each real alignment, founder logs (no conversation body, no raw schedule, no private memory content):

```elixir
OpalCore.SocialFlow.Execution.CoordinationResidue.episode(
  ~w(check_schedule search_venue open_maps choose_meaningful_tradeoff),
  %{
    "native_commitment_known" => false,
    "destination_resolved" => true,
    "provider_live" => false,
    "reminder_capable" => false
  }
)
```

Or note freeform:

1. What did humans still do manually?
2. Classify each action.
3. Was it avoidable residue or irreducible agency?

## Cohort rules

1. Do **not** manufacture Plan 1→10.
2. Start: founder + one trusted 1:1.
3. Low-effort person is flagship — no forms.
4. Messy group behavior is welcome (later).
5. No survey by default.

## Success signal

Across Plan 1 → Plan N (similar situations, not identical):

- **avoidable residue ↓**
- **irreducible human authority remains**

That is Compound Alignment in the real world.

## Roadmap input

Prioritize by:

`largest recurring avoidable residue × frequency × alignment impact × feasibility`

Not by feature excitement.
