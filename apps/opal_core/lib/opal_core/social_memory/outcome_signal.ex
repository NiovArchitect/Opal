defmodule OpalCore.SocialMemory.OutcomeSignal do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @types ~w(
    plan_accepted plan_rejected venue_liked venue_disliked
    suggestion_followed suggestion_ignored nudge_acted nudge_dismissed
    feedback.accepted feedback.dismissed feedback.ignored feedback.counter_proposed
    call_commitment pre_call_brief
  )
  @outcomes ~w(positive negative neutral)

  schema "outcome_signals" do
    field :account_id, :binary_id
    field :signal_type, :string
    field :ref_type, :string
    field :ref_id, :binary_id
    field :context, :map, default: %{}
    field :outcome, :string
    field :strength, :float, default: 0.5
    field :recorded_at, :utc_datetime_usec
    field :archived, :boolean, default: false

    timestamps(type: :utc_datetime_usec)
  end

  def changeset(row, attrs) do
    row
    |> cast(attrs, [
      :account_id,
      :signal_type,
      :ref_type,
      :ref_id,
      :context,
      :outcome,
      :strength,
      :recorded_at,
      :archived
    ])
    |> validate_required([:account_id, :signal_type, :ref_type, :outcome, :recorded_at])
    |> validate_inclusion(:signal_type, @types)
    |> validate_inclusion(:outcome, @outcomes)
    |> validate_number(:strength, greater_than_or_equal_to: 0.0, less_than_or_equal_to: 1.0)
  end
end
