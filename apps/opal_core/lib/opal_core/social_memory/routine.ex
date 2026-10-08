defmodule OpalCore.SocialMemory.Routine do
  @moduledoc """
  Learned life rhythm ("coffee with Sam every Tuesday").

  Confidence: 0.3 + 0.15 per detection beyond 2, capped 0.9 (detector may also
  set discrete 0.6/0.8/0.9 thresholds for 3+/5+/8+ occurrences).
  Below 0.6: stored, never surfaced (hypothesis-not-knowledge).
  """

  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @cadences ~w(weekly biweekly monthly)

  schema "routines" do
    field :account_id, :binary_id
    field :person_id, :binary_id
    field :activity, :string
    field :cadence, :string
    field :day_of_week, :integer
    field :day_of_month, :integer
    field :time_of_day, :string
    field :confidence, :float, default: 0.0
    field :detection_count, :integer, default: 0
    field :last_occurrence_at, :utc_datetime_usec
    field :streak_broken, :boolean, default: false
    field :archived, :boolean, default: false
    field :archived_at, :utc_datetime_usec
    field :provenance, :string, default: "observed"

    timestamps(type: :utc_datetime_usec)
  end

  def cadences, do: @cadences

  def changeset(row, attrs) do
    row
    |> cast(attrs, [
      :account_id,
      :person_id,
      :activity,
      :cadence,
      :day_of_week,
      :day_of_month,
      :time_of_day,
      :confidence,
      :detection_count,
      :last_occurrence_at,
      :streak_broken,
      :archived,
      :archived_at,
      :provenance
    ])
    |> validate_required([:account_id, :activity, :cadence, :confidence, :detection_count])
    |> validate_inclusion(:cadence, @cadences)
    |> validate_number(:confidence, greater_than_or_equal_to: 0.0, less_than_or_equal_to: 1.0)
    |> validate_number(:day_of_week, greater_than_or_equal_to: 0, less_than_or_equal_to: 6)
  end
end
