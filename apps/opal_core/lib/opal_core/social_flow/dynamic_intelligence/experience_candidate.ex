defmodule OpalCore.SocialFlow.DynamicIntelligence.ExperienceCandidate do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "dsi_experience_candidates" do
    field :candidate_key, :string
    field :display_name, :string
    field :rank, :integer, default: 1
    field :group_safe_explanation, :string, default: ""
    field :preferred, :boolean, default: false
    field :fixture_snapshot, :map, default: %{}
    belongs_to :opportunity, OpalCore.SocialFlow.DynamicIntelligence.ExperienceOpportunity
    timestamps(type: :utc_datetime_usec)
  end

  def changeset(row, attrs) do
    row
    |> cast(attrs, [
      :opportunity_id,
      :candidate_key,
      :display_name,
      :rank,
      :group_safe_explanation,
      :preferred,
      :fixture_snapshot
    ])
    |> validate_required([:opportunity_id, :candidate_key, :display_name, :rank])
    |> unique_constraint([:opportunity_id, :candidate_key])
  end
end
