# Repair #15 Track C — Progressive Profile-Building

Status: machine-proven, pending founder phone walk.

"Conversation, not interrogation." Opal learns the facts it needs by
asking once, in context, at the moment a flow actually needs them —
then never asks again.

## Mechanism (general, reusable)

Module: `OpalCore.SocialFlow.Execution.ProfileGap`
Ledger schema: `OpalCore.SocialFlow.Execution.ProfileGapAsk`
(table `profile_gap_asks`, additive migration
`20261024010002_create_profile_gap_asks`).

A flow declares the fact it needs by **fact key** from a small registry
in `ProfileGap` (today: `"birthday"`). Adding a fact = one registry
entry (dimension + prompt); no new one-off code paths.

`ProfileGap.assess(owner_id, person_id, fact_key, opts)` returns:

| status | meaning |
|---|---|
| `known` | Fact already stored. Flow uses it silently; NO ask is surfaced and no ledger row is written. |
| `ask` | Fact missing, never asked. Returns one conversational ask payload AND records the ask in the ledger. |
| `proceed_without` | Fact missing but already asked (`already_asked`), previously skipped (`skipped`), or the fact key is unknown (`unknown_fact` — fail closed, no invented asks). |

`ProfileGap.birthday_plan_context/3` is the birthday flow entry point:
same result plus `"plan_proceeds" => true` in every branch — the
mechanism structurally cannot block a plan.

### Ask payload (QUIET-law surface contract)

```elixir
%{
  "fact_key" => "birthday",
  "prompt" => "Quick one while we plan — when's <Name>'s birthday? I'll remember it so next year just works. Skip is totally fine.",
  "flow" => "birthday_plan",
  "blocking" => false,
  "dismissible" => true,
  "skip_label" => "Skip",
  "asked_once" => true
}
```

### Answer path — the real memory path, no side channel

`ProfileGap.answer(owner_id, person_id, "birthday", value, opts)`:

1. Parses/validates the date (ISO date, `%Date{}`, or `%{month, day, year?}`;
   invalid input stores nothing and leaves the ledger untouched).
2. Admits through `MemoryAdmission.evaluate/1` via `MemoryStore.admit/1`
   as an `explicit_fact`, **relationship-scoped** (owner + counterpart
   pair key) memory with dimension `birthday`. A rejected admission
   stores nothing durable.
3. Writes the durable `Celebrations` record (kind `birthday`) that the
   existing birthday/reminder flows already read.
4. Resolves the ledger row to `answered`.

Known-value lookup on later flows checks the durable `Celebrations`
record first (by person name, when the caller knows it), then the
admitted relationship memory — so a birthday the user already keeps in
Celebrations is `known` silently from the first flow, with no ask and
no ledger row.

### Skip / no-nag policy

- `ProfileGap.skip/3` records `skipped`. **Policy: a skip is permanent
  for that (owner, person, fact)** — the mechanism never re-asks. The
  flow proceeds without the fact. (Skipped facts are not a lockout: if
  the user later volunteers the fact, `answer/4` still stores it.)
- An ask left unanswered is also never repeated (`already_asked`).
- One ledger row per (owner, person, fact), enforced by a unique index —
  double-asks are impossible even under concurrent flows.
- Facts are relationship-scoped and owner-scoped: nothing learned about
  one person surfaces for another, and one owner's facts never leak to
  another owner.

## Evidence

`apps/opal_core/test/opal_core/repair15_family_profile_test.exs`
(C1–C4), fresh randomized accounts:

- C1: unknown birthday → exactly one ask (non-blocking, dismissible,
  names the person, offers skip); second assess →
  `proceed_without`/`already_asked`; plan proceeds in every branch;
  unknown fact keys fail closed with no ledger row.
- C2: answer stored via admission (asserted on the stored fact itself:
  `explicit_fact`, relationship scope, dimension, value), durable
  Celebrations row created, ledger `answered`; next flow `known` with
  no ask payload. Pre-existing Celebrations birthday is `known`
  silently with zero ledger writes. Invalid answer stores nothing.
- C3: skip → `proceed_without`/`skipped` on every later assess; a later
  volunteered answer still lands and is used silently.
- C4: no leakage — person A's birthday/ask state never surfaces for
  person B (same owner) or for person A under a different owner.

## Known limits (honest)

- The ask *surface* (rendering the payload inside a live birthday plan
  flow / chat) is a front-end + flow-integration step; this track ships
  the backend mechanism, the ledger, and the birthday entry point with
  the full policy test-proven. No fake surface was built.
- `MemoryStore` is the codebase's existing in-process memory store; the
  durable copy of a birthday answer is the `Celebrations` row, and the
  ask/skip policy itself is durable in Postgres (`profile_gap_asks`).
