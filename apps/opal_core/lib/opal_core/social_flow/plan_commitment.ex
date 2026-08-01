defmodule OpalCore.SocialFlow.PlanCommitment do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @statuses ~w(proposed confirmed completed cancelled superseded)

  schema "plan_commitments" do
    field :description, :string
    field :visibility, :string, default: "private"
    field :status, :string
    field :due_at, :utc_datetime_usec
    field :source_message_ids, {:array, :binary_id}, default: []
    field :confirmed_at, :utc_datetime_usec
    field :completed_at, :utc_datetime_usec
    field :cancelled_at, :utc_datetime_usec

    belongs_to :plan, OpalCore.SocialFlow.SharedPlan
    belongs_to :owner_user, OpalCore.Accounts.User, foreign_key: :owner_user_id

    timestamps(type: :utc_datetime_usec)
  end

  def changeset(c, attrs) do
    c
    |> cast(attrs, [
      :plan_id,
      :owner_user_id,
      :description,
      :visibility,
      :status,
      :due_at,
      :source_message_ids,
      :confirmed_at,
      :completed_at,
      :cancelled_at
    ])
    |> validate_required([:plan_id, :owner_user_id, :description, :status, :visibility])
    |> validate_inclusion(:status, @statuses)
    |> validate_inclusion(:visibility, ~w(private shared))
  end

  def to_contract(%__MODULE__{} = c) do
    %{
      "id" => c.id,
      "plan_id" => c.plan_id,
      "owner_user_id" => c.owner_user_id,
      "description" => c.description,
      "visibility" => c.visibility,
      "status" => c.status,
      "confirmed_at" => dt(c.confirmed_at)
    }
  end

  defp dt(nil), do: nil
  defp dt(%DateTime{} = d), do: DateTime.to_iso8601(d)
end
