defmodule OpalCore.SocialMemory.SocialPattern do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @types ~w(
    confirmation_habit
    overcommit_signal
    quiet_when_busy
    weekend_planner
    slow_responder
    early_confirmer
  )

  schema "social_patterns" do
    field :account_id, :binary_id
    field :pattern_type, :string
    field :description, :string
    field :confidence, :float, default: 0.0
    field :evidence_count, :integer, default: 0
    field :last_evidence_at, :utc_datetime_usec
    field :surfaced, :boolean, default: false
    field :archived, :boolean, default: false
    field :evidence_window_days, :integer, default: 90
    field :provenance, :string, default: "observed"

    timestamps(type: :utc_datetime_usec)
  end

  def pattern_types, do: @types

  def changeset(row, attrs) do
    row
    |> cast(attrs, [
      :account_id,
      :pattern_type,
      :description,
      :confidence,
      :evidence_count,
      :last_evidence_at,
      :surfaced,
      :archived,
      :evidence_window_days,
      :provenance
    ])
    |> validate_required([:account_id, :pattern_type, :description])
    |> validate_inclusion(:pattern_type, @types)
    |> validate_number(:confidence, greater_than_or_equal_to: 0.0, less_than_or_equal_to: 1.0)
    |> unique_constraint([:account_id, :pattern_type], name: :social_patterns_account_type_index)
  end
end
