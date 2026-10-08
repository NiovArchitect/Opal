defmodule OpalCore.SocialMemory.GroupDecisionState do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @statuses ~w(open emerging reached blocked abandoned)

  schema "group_decision_states" do
    field :account_id, :binary_id
    field :conversation_id, :binary_id
    field :topic, :string
    field :proposals, {:array, :map}, default: []
    field :consensus_status, :string, default: "open"
    field :silent_participants, {:array, :binary_id}, default: []
    field :last_activity_at, :utc_datetime_usec
    field :mediation_dismissed_until, :utc_datetime_usec

    timestamps(type: :utc_datetime_usec)
  end

  def changeset(row, attrs) do
    row
    |> cast(attrs, [
      :account_id,
      :conversation_id,
      :topic,
      :proposals,
      :consensus_status,
      :silent_participants,
      :last_activity_at,
      :mediation_dismissed_until
    ])
    |> validate_required([:account_id, :conversation_id, :topic])
    |> validate_inclusion(:consensus_status, @statuses)
  end
end
