defmodule OpalCore.SocialFlow.FutureInvitationPrompt do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "future_invitation_prompts" do
    field :copy, :string
    field :status, :string, default: "proposed"
    field :visibility, :string, default: "shared"
    field :responded_by_user_id, :binary_id
    field :decision, :string
    field :responded_at, :utc_datetime_usec
    field :idempotency_key, :string
    belongs_to :tradition, OpalCore.SocialFlow.SocialTradition
    belongs_to :conversation, OpalCore.Messaging.Conversation
    timestamps(type: :utc_datetime_usec)
  end

  def changeset(p, attrs) do
    p
    |> cast(attrs, [
      :tradition_id,
      :conversation_id,
      :copy,
      :status,
      :visibility,
      :responded_by_user_id,
      :decision,
      :responded_at,
      :idempotency_key
    ])
    |> validate_required([:tradition_id, :conversation_id, :copy, :status, :idempotency_key])
    |> validate_inclusion(
      :status,
      ~w(proposed started remind_later skipped paused forgotten declined)
    )
    |> unique_constraint(:idempotency_key)
  end

  def to_contract(%__MODULE__{} = p) do
    %{
      "id" => p.id,
      "tradition_id" => p.tradition_id,
      "copy" => p.copy,
      "status" => p.status,
      "actions" => [
        "Start a new journey",
        "Remind later",
        "Skip this year",
        "Pause tradition",
        "Forget this"
      ],
      "not_auto_plan" => true
    }
  end
end
