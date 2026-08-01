defmodule OpalCore.SocialFlow.ExperienceCandidate do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "experience_candidates" do
    field :provider_id, :string
    field :provider_candidate_id, :string
    field :experience_type, :string
    field :display_name, :string
    field :category, :string
    field :geographic_summary, :string
    field :travel_estimate, :string
    field :price_band, :string
    field :accessibility_attributes, :map, default: %{}
    field :dietary_attributes, :map, default: %{}
    field :availability_state, :string, default: "unknown"
    field :availability_checked_at, :utc_datetime_usec
    field :sponsorship_state, :string, default: "organic"
    field :sponsor_label, :string
    field :handoff_url, :string
    field :normalized_facts, :map, default: %{}
    field :hard_constraint_pass, :boolean, default: false
    field :explanation, :string
    field :rank_score, :float, default: 0.0
    field :status, :string, default: "eligible"
    field :expires_at, :utc_datetime_usec
    belongs_to :request, OpalCore.SocialFlow.DiscoveryRequest
    timestamps(type: :utc_datetime_usec)
  end

  def changeset(c, attrs) do
    c
    |> cast(attrs, [
      :request_id,
      :provider_id,
      :provider_candidate_id,
      :experience_type,
      :display_name,
      :category,
      :geographic_summary,
      :travel_estimate,
      :price_band,
      :accessibility_attributes,
      :dietary_attributes,
      :availability_state,
      :availability_checked_at,
      :sponsorship_state,
      :sponsor_label,
      :handoff_url,
      :normalized_facts,
      :hard_constraint_pass,
      :explanation,
      :rank_score,
      :status,
      :expires_at
    ])
    |> validate_required([
      :request_id,
      :provider_id,
      :provider_candidate_id,
      :experience_type,
      :display_name,
      :sponsorship_state,
      :status
    ])
    |> validate_inclusion(:sponsorship_state, ~w(organic sponsored))
    |> validate_inclusion(:availability_state, ~w(available limited unknown stale unavailable))
    |> validate_inclusion(:status, ~w(eligible filtered_out option selected dismissed expired))
  end

  def to_public_contract(%__MODULE__{} = c) do
    sponsored? = c.sponsorship_state == "sponsored"

    %{
      "id" => c.id,
      "provider_id" => c.provider_id,
      "provider_candidate_id" => c.provider_candidate_id,
      "experience_type" => c.experience_type,
      "display_name" => c.display_name,
      "category" => c.category,
      "geographic_summary" => c.geographic_summary,
      "travel_estimate" => c.travel_estimate,
      "price_band" => c.price_band,
      "accessibility_fit" => Map.get(c.accessibility_attributes || %{}, "fit", "unknown"),
      "dietary_fit" => Map.get(c.dietary_attributes || %{}, "fit", "unknown"),
      "availability_state" => c.availability_state,
      "availability_guaranteed" => false,
      "sponsorship_state" => c.sponsorship_state,
      "sponsored_label" => if(sponsored?, do: c.sponsor_label || "Sponsored", else: nil),
      "accessibility_label" =>
        if(sponsored?,
          do: "#{c.display_name}, Sponsored",
          else: c.display_name
        ),
      "explanation" => c.explanation,
      "hard_constraint_pass" => c.hard_constraint_pass,
      "status" => c.status,
      "source" => c.provider_id
    }
  end
end
