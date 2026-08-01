defmodule OpalCore.SocialFlow.PlanReminder do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @statuses ~w(scheduled active dismissed completed cancelled)

  schema "plan_reminders" do
    field :visibility, :string, default: "private"
    field :scheduled_for, :utc_datetime_usec
    field :status, :string
    field :delivery_policy, :string, default: "in_app"
    field :content_summary, :string
    field :source_lineage, :map, default: %{}
    field :dismissed_at, :utc_datetime_usec
    field :completed_at, :utc_datetime_usec

    belongs_to :plan, OpalCore.SocialFlow.SharedPlan
    belongs_to :commitment, OpalCore.SocialFlow.PlanCommitment
    belongs_to :owner_user, OpalCore.Accounts.User, foreign_key: :owner_user_id

    timestamps(type: :utc_datetime_usec)
  end

  def changeset(r, attrs) do
    r
    |> cast(attrs, [
      :plan_id,
      :commitment_id,
      :owner_user_id,
      :visibility,
      :scheduled_for,
      :status,
      :delivery_policy,
      :content_summary,
      :source_lineage,
      :dismissed_at,
      :completed_at
    ])
    |> validate_required([:owner_user_id, :visibility, :status, :content_summary])
    |> validate_inclusion(:visibility, ~w(private shared))
    |> validate_inclusion(:status, @statuses)
  end

  def to_contract(%__MODULE__{} = r) do
    %{
      "id" => r.id,
      "plan_id" => r.plan_id,
      "commitment_id" => r.commitment_id,
      "owner_user_id" => r.owner_user_id,
      "visibility" => r.visibility,
      "status" => r.status,
      "content_summary" => r.content_summary,
      "scheduled_for" => dt(r.scheduled_for),
      "created_at" => dt(r.inserted_at)
    }
  end

  defp dt(nil), do: nil
  defp dt(%DateTime{} = d), do: DateTime.to_iso8601(d)
end
