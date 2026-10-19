defmodule OpalCore.Relationships.FamilySubtype do
  @moduledoc """
  Repair #15 Track B — family SUBTYPE / role dimension under the RU-1
  `family` type.

  ## Design call (see shots/repair15/FAMILY_TAXONOMY.md)

  The RU-1 type enum stays at exactly 7. Family structure is a *subtype*
  dimension stored on the same `relationship_types` row, valid only when
  `type == "family"`. Exploding the enum (parent/child/sibling/… as
  top-level types) was rejected: every type-driven consumer in the codebase
  (AttentionBudget gating, BroadcastFraming, CallIntelligence briefs,
  Wallets split framing, PromptBuilder, Invites, TrustSafety) keys off the
  7 types, and coordination must remain provably identical across family
  roles. A subtype refines *dials* (tone / lead time / nudge restraint)
  inside the one existing behavior engine (`Relationships.Behavior`); it
  never changes the plan state machine.

  ## Minors

  Existing product law for minors already lives in
  `OpalCore.SocialFlow.Family` (Social Flow 8): guardian-managed youth
  accounts, youth capability defaults (payments denied, location sharing
  denied, no public discovery, plan details approval-gated). This module
  does not duplicate that system. The subtype row carries a `family_minor`
  flag; when set, `Relationships.Behavior` applies the matching restraint
  to relationship nudges: no adult-pattern proactive nudges at all — only
  time-critical and mediation traffic — while planning help stays fully
  available. That is the minimal safe default, consistent with the SF8
  youth defaults.
  """

  # slug => %{label, generation}
  # generation is descriptive only (never a score, never exposed as ranking).
  @subtypes %{
    "parent" => %{label: "Parent", generation: "up"},
    "child" => %{label: "Child", generation: "down"},
    "sibling" => %{label: "Sibling", generation: "same"},
    "grandparent" => %{label: "Grandparent", generation: "up"},
    "aunt_uncle" => %{label: "Aunt / Uncle", generation: "up"},
    "cousin" => %{label: "Cousin", generation: "same"},
    "niece_nephew" => %{label: "Niece / Nephew", generation: "down"},
    "co_parent" => %{label: "Co-parent", generation: "same"}
  }

  # Picker order: closest-generation roles first, in the order a
  # person naming family would reach for them.
  @ordered ~w(parent child sibling grandparent aunt_uncle cousin niece_nephew co_parent)

  @doc "All valid family subtype slugs."
  def all, do: Map.keys(@subtypes)

  @doc "All valid family subtype slugs, in picker order."
  def ordered, do: @ordered

  @doc "Finished picker options: [%{slug, label}] in picker order."
  def options do
    Enum.map(@ordered, fn slug -> %{"slug" => slug, "label" => label(slug)} end)
  end

  def valid?(subtype) when is_binary(subtype), do: Map.has_key?(@subtypes, subtype)
  def valid?(_), do: false

  def label(subtype) when is_binary(subtype) do
    case Map.get(@subtypes, subtype) do
      %{label: label} -> label
      nil -> nil
    end
  end

  def label(_), do: nil

  def generation(subtype) when is_binary(subtype) do
    case Map.get(@subtypes, subtype) do
      %{generation: g} -> g
      nil -> nil
    end
  end

  def generation(_), do: nil

  @doc """
  Subtypes where the *role itself* commonly involves a minor counterpart
  in a planning context (a young niece/nephew, a child). Descriptive —
  the authoritative minor signal is the explicit `family_minor` flag.
  """
  def minor_capable?(subtype) when is_binary(subtype),
    do: subtype in ~w(child niece_nephew)

  def minor_capable?(_), do: false
end
