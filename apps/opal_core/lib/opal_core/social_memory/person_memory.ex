defmodule OpalCore.SocialMemory.PersonMemory do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @cadence ~w(warming stable cooling)
  @sentiment ~w(warming neutral cooling positive negative)

  schema "person_memories" do
    field :account_id, :binary_id
    field :person_id, :binary_id
    field :relationship_type, :string
    field :vibe_profile_id, :binary_id
    field :cadence_status, :string, default: "stable"
    field :last_contact_at, :utc_datetime_usec
    field :contact_frequency_days, :float
    field :known_facts, :map, default: %{}
    field :open_loops, {:array, :map}, default: []
    field :sentiment_trend, :string, default: "neutral"
    field :contact_intervals, {:array, :float}, default: []

    timestamps(type: :utc_datetime_usec)
  end

  def changeset(row, attrs) do
    row
    |> cast(attrs, [
      :account_id,
      :person_id,
      :relationship_type,
      :vibe_profile_id,
      :cadence_status,
      :last_contact_at,
      :contact_frequency_days,
      :known_facts,
      :open_loops,
      :sentiment_trend,
      :contact_intervals
    ])
    |> validate_required([:account_id, :person_id])
    |> validate_inclusion(:cadence_status, @cadence)
    |> validate_inclusion(:sentiment_trend, @sentiment)
    |> unique_constraint([:account_id, :person_id], name: :person_memories_account_person_index)
  end
end
