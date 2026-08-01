defmodule OpalCore.SocialFlow.PlanParticipant do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @response_states ~w(proposed accepted declined tentative withdrawn)

  schema "plan_participants" do
    field :role, :string, default: "participant"
    field :response_state, :string
    field :responded_at, :utc_datetime_usec
    field :authority_source, :string, default: "user_action"

    belongs_to :plan, OpalCore.SocialFlow.SharedPlan
    belongs_to :user, OpalCore.Accounts.User

    timestamps(type: :utc_datetime_usec)
  end

  def changeset(p, attrs) do
    p
    |> cast(attrs, [
      :plan_id,
      :user_id,
      :role,
      :response_state,
      :responded_at,
      :authority_source
    ])
    |> validate_required([:plan_id, :user_id, :response_state])
    |> validate_inclusion(:response_state, @response_states)
    |> unique_constraint([:plan_id, :user_id])
  end
end
