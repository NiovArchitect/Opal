defmodule OpalCore.SocialFlow.ExperienceSelection do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "experience_selections" do
    field :selection_state, :string, default: "proposed"
    field :required_approvals, {:array, :binary_id}, default: []
    field :approvals, :map, default: %{}
    field :selected_at, :utc_datetime_usec
    field :confirmed_at, :utc_datetime_usec
    field :idempotency_key, :string
    belongs_to :option_set, OpalCore.SocialFlow.DiscoveryOptionSet
    belongs_to :candidate, OpalCore.SocialFlow.ExperienceCandidate
    belongs_to :selected_by_user, OpalCore.Accounts.User, foreign_key: :selected_by_user_id
    timestamps(type: :utc_datetime_usec)
  end

  def changeset(s, attrs) do
    s
    |> cast(attrs, [
      :option_set_id,
      :candidate_id,
      :selected_by_user_id,
      :selection_state,
      :required_approvals,
      :approvals,
      :selected_at,
      :confirmed_at,
      :idempotency_key
    ])
    |> validate_required([
      :option_set_id,
      :candidate_id,
      :selected_by_user_id,
      :selection_state,
      :idempotency_key
    ])
    |> validate_inclusion(
      :selection_state,
      ~w(proposed awaiting_approvals confirmed rejected superseded)
    )
    |> unique_constraint(:idempotency_key)
  end

  def to_contract(%__MODULE__{} = s) do
    %{
      "id" => s.id,
      "option_set_id" => s.option_set_id,
      "candidate_id" => s.candidate_id,
      "selected_by_user_id" => s.selected_by_user_id,
      "selection_state" => s.selection_state,
      "required_approvals" => s.required_approvals || [],
      "approvals" => s.approvals || %{}
    }
  end
end
