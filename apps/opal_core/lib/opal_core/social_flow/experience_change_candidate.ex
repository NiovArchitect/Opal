defmodule OpalCore.SocialFlow.ExperienceChangeCandidate do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "experience_change_candidates" do
    field :change_type, :string
    field :source_class, :string, default: "provider"
    field :source_reference, :string
    field :proposed_changes, :map, default: %{}
    field :shared_copy, :string
    field :confidence, :float, default: 0.6
    field :status, :string, default: "proposed"
    field :expires_at, :utc_datetime_usec
    field :resolved_at, :utc_datetime_usec
    field :idempotency_key, :string
    belongs_to :experience, OpalCore.SocialFlow.SocialExperience
    timestamps(type: :utc_datetime_usec)
  end

  def changeset(c, attrs) do
    c
    |> cast(attrs, [
      :experience_id,
      :change_type,
      :source_class,
      :source_reference,
      :proposed_changes,
      :shared_copy,
      :confidence,
      :status,
      :expires_at,
      :resolved_at,
      :idempotency_key
    ])
    |> validate_required([:experience_id, :change_type, :status, :idempotency_key])
    |> validate_inclusion(
      :status,
      ~w(proposed acknowledged kept_current alternatives accepted rejected expired)
    )
    |> unique_constraint(:idempotency_key)
  end

  def to_contract(%__MODULE__{} = c) do
    %{
      "id" => c.id,
      "experience_id" => c.experience_id,
      "change_type" => c.change_type,
      "source_class" => c.source_class,
      "shared_copy" => c.shared_copy,
      "proposed_changes" => c.proposed_changes,
      "status" => c.status,
      "actions" => ["Find alternatives", "Keep current plan", "Propose a change"]
    }
  end
end
