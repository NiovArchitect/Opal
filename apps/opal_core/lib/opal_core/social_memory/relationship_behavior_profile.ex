defmodule OpalCore.SocialMemory.RelationshipBehaviorProfile do
  @moduledoc """
  Seeded (global) behavior defaults keyed by RU-1 relationship taxonomy strings.

  Taxonomy (verbatim from `OpalCore.Relationships.RelationshipType.allowed_types/0`):
  spouse | partner | family | close_friend | friend | business | acquaintance

  Per-person overrides live on `person_memories.behavior_override` (map); override
  wins on conflict when merged in PromptBuilder "How to be" section.
  """

  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:relationship_type, :string, autogenerate: false}
  @foreign_key_type :binary_id

  # Tone calibration notes (per type):
  # spouse — warm_intimate: highest intimacy; high proactivity OK
  # partner — warm_intimate: romantic peer; volunteer plans
  # family — warm_respectful: planned preferred
  # close_friend — warm_casual: spontaneous OK
  # friend — warm_casual / medium: don't over-initiate
  # business — friendly_respectful floor never drops
  # acquaintance — polite_brief, low/reserved (underconfident-safe)

  schema "relationship_behavior_profiles" do
    field :tone, :string
    field :proactivity, :string
    field :disclosure, :string
    field :formality_floor, :string
    field :boundary_notes, :string

    timestamps(type: :utc_datetime_usec)
  end

  def changeset(row, attrs) do
    row
    |> cast(attrs, [
      :relationship_type,
      :tone,
      :proactivity,
      :disclosure,
      :formality_floor,
      :boundary_notes
    ])
    |> validate_required([
      :relationship_type,
      :tone,
      :proactivity,
      :disclosure,
      :formality_floor
    ])
    |> validate_inclusion(:proactivity, ~w(high medium low))
    |> validate_inclusion(:disclosure, ~w(volunteers balanced reserved))
  end
end
