defmodule OpalCore.SocialFlow.Execution.MemoryKind do
  @moduledoc """
  Distinct memory types — never flattened into one preference blob.

  Authority order (same scope):
  current_correction >
  current_explicit >
  durable_explicit >
  repeated_behavior >
  bounded_inference

  Memory cannot Set / share / book / pay / invite.
  """

  @kinds ~w(
    explicit_fact
    explicit_correction
    repeated_behavior
    derived_context
    inferred_preference
    native_commitment_history
    provider_execution_outcome
  )

  @confidence_bands ~w(explicit_high repeated_medium_high inferred_low_medium)

  def kinds, do: @kinds
  def confidence_bands, do: @confidence_bands

  @doc "Authority rank — higher wins within comparable scope."
  def authority_rank(kind) when is_binary(kind) do
    case kind do
      "explicit_correction" -> 100
      "explicit_fact" -> 80
      "native_commitment_history" -> 70
      "provider_execution_outcome" -> 60
      "repeated_behavior" -> 40
      "derived_context" -> 20
      "inferred_preference" -> 10
      _ -> 0
    end
  end

  def authority_rank(_), do: 0

  def normalize(k) when k in @kinds, do: k
  def normalize("correction"), do: "explicit_correction"
  def normalize("explicit"), do: "explicit_fact"
  def normalize("inferred"), do: "inferred_preference"
  def normalize("repeated"), do: "repeated_behavior"
  def normalize("plan_context"), do: "derived_context"
  def normalize("outcome"), do: "provider_execution_outcome"
  def normalize("commitment"), do: "native_commitment_history"
  def normalize(_), do: "derived_context"

  def confidence_band("explicit_correction"), do: "explicit_high"
  def confidence_band("explicit_fact"), do: "explicit_high"
  def confidence_band("native_commitment_history"), do: "explicit_high"
  def confidence_band("repeated_behavior"), do: "repeated_medium_high"
  def confidence_band("provider_execution_outcome"), do: "repeated_medium_high"
  def confidence_band("inferred_preference"), do: "inferred_low_medium"
  def confidence_band("derived_context"), do: "inferred_low_medium"
  def confidence_band(_), do: "inferred_low_medium"

  @doc "Default Freshness source class for decay."
  def freshness_class("explicit_correction"), do: "explicit_willingness"
  def freshness_class("explicit_fact"), do: "preference"
  def freshness_class("repeated_behavior"), do: "conversation_evidence"
  def freshness_class("inferred_preference"), do: "conversation_evidence"
  def freshness_class("derived_context"), do: "tonight_opening"
  def freshness_class("native_commitment_history"), do: "native_commitment"
  def freshness_class("provider_execution_outcome"), do: "provider_inventory"
  def freshness_class(_), do: "conversation_evidence"

  @doc "Whether this kind may become durable without repeated evidence."
  def may_be_durable?("explicit_correction"), do: true
  def may_be_durable?("explicit_fact"), do: true
  def may_be_durable?("native_commitment_history"), do: true
  def may_be_durable?("repeated_behavior"), do: true
  def may_be_durable?(_), do: false

  def outranks?(winner, loser) do
    authority_rank(normalize(winner)) > authority_rank(normalize(loser))
  end
end
