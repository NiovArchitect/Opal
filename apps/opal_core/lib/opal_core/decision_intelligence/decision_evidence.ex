defmodule OpalCore.DecisionIntelligence.DecisionEvidence do
  @moduledoc "Durable evidence envelope bound to a DecisionContext revision."

  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @privacy ~w(private_user relationship shared_group inferred external_verified)
  @sources ~w(user conversation graph journey provider system model correction)
  @freshness ~w(fresh aging stale)
  @constraint_kinds ~w(hard soft unknown)

  schema "decision_evidences" do
    field :dimension, :string
    field :claim, :map, default: %{}
    field :privacy_class, :string
    field :source_type, :string
    field :source_ref, :string
    field :confidence, :float
    field :freshness, :string, default: "fresh"
    field :observed_at, :utc_datetime_usec
    field :expires_at, :utc_datetime_usec
    field :constraint_kind, :string, default: "soft"
    field :introduced_at_revision, :integer
    field :superseded_at_revision, :integer
    field :owner_user_id, :binary_id
    field :stale, :boolean, default: false
    field :conflicted, :boolean, default: false

    belongs_to :decision, OpalCore.DecisionIntelligence.DecisionContext, foreign_key: :decision_id

    timestamps(type: :utc_datetime_usec)
  end

  def changeset(e, attrs) do
    e
    |> cast(attrs, [
      :decision_id,
      :dimension,
      :claim,
      :privacy_class,
      :source_type,
      :source_ref,
      :confidence,
      :freshness,
      :observed_at,
      :expires_at,
      :constraint_kind,
      :introduced_at_revision,
      :superseded_at_revision,
      :owner_user_id,
      :stale,
      :conflicted
    ])
    |> validate_required([
      :decision_id,
      :dimension,
      :privacy_class,
      :source_type,
      :introduced_at_revision
    ])
    |> validate_inclusion(:privacy_class, @privacy)
    |> validate_inclusion(:source_type, @sources)
    |> validate_inclusion(:freshness, @freshness)
    |> validate_inclusion(:constraint_kind, @constraint_kinds)
  end

  def privacy_classes, do: @privacy
end
