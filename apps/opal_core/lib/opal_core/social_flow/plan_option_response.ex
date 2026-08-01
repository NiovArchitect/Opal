defmodule OpalCore.SocialFlow.PlanOptionResponse do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "plan_option_responses" do
    field :response, :string
    field :responded_at, :utc_datetime_usec

    belongs_to :option, OpalCore.SocialFlow.PlanOption
    belongs_to :user, OpalCore.Accounts.User

    timestamps(type: :utc_datetime_usec)
  end

  def changeset(r, attrs) do
    r
    |> cast(attrs, [:option_id, :user_id, :response, :responded_at])
    |> validate_required([:option_id, :user_id, :response, :responded_at])
    |> validate_inclusion(:response, ~w(accept decline tentative))
    |> unique_constraint([:option_id, :user_id])
  end
end
