defmodule OpalCore.SocialFlow.FamilyPermissionRequest do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "family_permission_requests" do
    field :summary, :string
    field :status, :string, default: "pending_review"
    field :missing_details, {:array, :string}, default: []
    field :details, :map, default: %{}
    field :guardian_copy, :string
    field :youth_copy, :string
    field :reviewed_by_user_id, :binary_id
    field :reviewed_at, :utc_datetime_usec
    field :resulting_plan_id, :binary_id
    field :idempotency_key, :string
    belongs_to :family, OpalCore.SocialFlow.FamilyContext, foreign_key: :family_id
    belongs_to :conversation, OpalCore.Messaging.Conversation
    belongs_to :youth_user, OpalCore.Accounts.User, foreign_key: :youth_user_id
    timestamps(type: :utc_datetime_usec)
  end

  def changeset(r, attrs) do
    r
    |> cast(attrs, [
      :family_id,
      :conversation_id,
      :youth_user_id,
      :summary,
      :status,
      :missing_details,
      :details,
      :guardian_copy,
      :youth_copy,
      :reviewed_by_user_id,
      :reviewed_at,
      :resulting_plan_id,
      :idempotency_key
    ])
    |> validate_required([
      :family_id,
      :conversation_id,
      :youth_user_id,
      :summary,
      :status,
      :idempotency_key
    ])
    |> validate_inclusion(
      :status,
      ~w(pending_review needs_details approved declined reminded)
    )
    |> unique_constraint(:idempotency_key)
  end

  def to_contract(%__MODULE__{} = r, role \\ "guardian") do
    %{
      "id" => r.id,
      "family_id" => r.family_id,
      "summary" => r.summary,
      "status" => r.status,
      "missing_details" => r.missing_details || [],
      "copy" => if(role == "youth", do: r.youth_copy, else: r.guardian_copy),
      "no_guilt" => true,
      "no_behavior_score" => true,
      "silence_is_not_approval" => true
    }
  end
end
