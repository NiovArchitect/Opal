# Repair #15 Track B — Family Taxonomy Depth

Status: machine-proven, pending founder phone walk.

## Design decision: subtype dimension, NOT an exploded enum

The founder wants real family structure: parent, child, sibling,
grandparent, aunt/uncle, cousin, niece/nephew, co-parent.

**Call: a family SUBTYPE/role dimension under the existing `family` type.**
The RU-1 top-level enum stays at exactly 7 (`spouse, partner, family,
close_friend, friend, business, acquaintance`).

Why not 8 new top-level types:

- Every type-driven consumer in the codebase keys off the 7 types:
  `AttentionBudget` nudge gating, `BroadcastFraming`, `CallIntelligence`
  pre-call briefs, `Wallets` split framing, `PromptBuilder` person
  context, `Invites` copy, `TrustSafety.soft_contact?`, and the seeded
  `relationship_behavior_profiles`. New top-level types would fall
  through every one of those `case`/lookup surfaces — most default to
  the most-reserved behavior or to nothing — silently degrading family
  coordination instead of refining it.
- The gyroscope law: coordination is one plan state machine for everyone.
  A subtype that refines *dials only* makes "coordination identical
  across subtypes" provable by construction, and the tests below prove
  it empirically anyway.
- Family role is a refinement of the same intimacy class (warmth,
  family planning norms). What actually differs by role is cadence,
  lead time, spontaneity, and restraint — exactly the dials the existing
  behavior engine already has.

## Model (additive only)

Migration `20261024010001_add_family_subtype_to_relationship_types`:
two new columns on `relationship_types`, no column changed or dropped,
no backfill (nil subtype = the plain R14-proven `family` behavior):

- `family_subtype :string` (nullable) — one of the slugs below.
- `family_minor :boolean, default false` — the minor flag (see below).

Slugs (`OpalCore.Relationships.FamilySubtype`):

| slug | label | generation (descriptive only) |
|---|---|---|
| `parent` | Parent | up |
| `child` | Child | down |
| `sibling` | Sibling | same |
| `grandparent` | Grandparent | up |
| `aunt_uncle` | Aunt / Uncle | up |
| `cousin` | Cousin | same |
| `niece_nephew` | Niece / Nephew | down |
| `co_parent` | Co-parent | same |

Validation (fail closed): the changeset rejects an unknown slug, and
rejects any subtype on a non-`family` type — the dimension can never
smuggle in an 8th top-level type. Changing a contact's type away from
`family` clears subtype + minor flag; re-setting `family` keeps them.

API (`OpalCore.Relationships`):

- `set_family_subtype(user_id, contact_user_id, subtype, minor: bool)` —
  `{:error, :not_family}` unless the stored type is `family`.
- `get_family_subtype/2` → `%{subtype, minor}` or nil.
- Contracts (`to_contract/1`, `contacts_with_types/1`) now carry
  `family_subtype` / `family_minor`. The reverse label is still never
  exposed (`their_type_for_me` stays nil — the subtype is the owner's
  private framing, same asymmetry law as the type itself).

## Dials (wired into the ONE existing engine, `Relationships.Behavior`)

No parallel engine. Subtype overrides layer between the `family`
defaults and the user's explicitly stored bounds (explicit bounds win):

| subtype | frequency | style | planning | lead time | rationale |
|---|---|---|---|---|---|
| parent | weekly | warm | planned | 12h | family defaults |
| child | weekly | warm | spontaneous | 2h | adult kids coordinate loosely |
| sibling | weekly | warm | spontaneous | 2h | siblings can do same-day |
| grandparent | weekly | warm | planned | 24h | more lead, never rushed |
| aunt_uncle | weekly | warm | planned | 24h | extended family lead time |
| cousin | weekly | casual | planned | 12h | warmth softens to casual |
| niece_nephew | weekly | warm | planned | 24h | plan through the family, with lead |
| co_parent | daily | warm | planned | 0h | kid logistics are a daily cadence, but deliberate |

New/overloaded Behavior entry points (old arities untouched, delegate
with no subtype): `defaults_for/2`, `style_for/2`, `planning_for/2`,
`frequency_for/2`, `lead_time_hours/2`, `enforce_planning/3`,
`nudge_allowed?/3` (opts: `subtype:`, `minor:`),
`nudge_daily_cap_for/2`, `nudge_allowed_for_pair?/3` (reads the stored
row). `plan_proposal_copy/2` accepts `subtype:` in opts and carries the
refined lead time / spontaneity. Non-family types ignore subtype
entirely (fail closed to the R14 dials).

## Minors

Existing product law was searched first. It exists and is NOT
duplicated: `OpalCore.SocialFlow.Family` (Social Flow 8) implements
guardian-managed youth accounts — guardian relationships, youth
capability defaults (payments `denied`, `share_location` `denied`,
`public_discovery` `denied`, plan details `approval_required`), approved
contacts, and youth-private reminders. The relationship-access templates
also already know `parent_to_child` / `child_to_parent` directions.

What Track B adds is only the missing link between that world and the
RU-1 behavior engine: the `family_minor` flag on the subtype row. When
set, `Behavior` applies the minimal safe default, consistent with the
SF8 youth defaults:

- ALL adult-pattern proactive nudges denied (`nudge`,
  `proactive_thread`, `routine_break`).
- `time_critical` and `mediation` still pass (safety and guardian-style
  coordination traffic).
- Planning help is never gated: lead-time enforcement and proposal copy
  behave exactly as for the subtype — a kid (~12) planning a birthday
  party gets full planning help, just no adult-pattern nudging.

The flag is explicit (set by the owner via `set_family_subtype/4`),
never inferred from the subtype slug: an adult child and a minor child
are both `child`; only the flag decides restraint.

## Evidence

`apps/opal_core/test/opal_core/repair15_family_profile_test.exs`
(B1–B4), fresh randomized accounts, extending the R14 pattern:

- B1: enum stays 7; slug set exact; set/get/clear round-trip; unknown
  slug / non-family / missing row all fail closed; type change clears
  subtype; no cross-account leakage.
- B2: the R14 1:1 lifecycle (create → revision handshake → time change
  → cancel + peer notification) produces ONE identical summary across
  all 8 subtypes + plain family; non-lead cancel refused for every
  subtype.
- B3: dial oracle per subtype (lead times, spontaneity, co-parent daily
  cap 3, cousin casual), proposal copy carries the dials,
  `resolved_bounds` layering.
- B4: minor restraint at both the pure-function and stored-row level;
  planning enforcement unaffected by the minor flag.

The R14 suite (`repair14_relationship_journeys_test.exs`, 24 tests)
is untouched and stays green (see TEST evidence in the run report).
