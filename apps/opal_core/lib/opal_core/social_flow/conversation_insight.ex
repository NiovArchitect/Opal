defmodule OpalCore.SocialFlow.ConversationInsight do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @types ~w(pre_send_clarity open_loop ambiguity repair decision_summary)
  @statuses ~w(visible acted dismissed resolved superseded expired corrected)

  schema "conversation_insights" do
    field :insight_type, :string
    field :privacy_class, :string, default: "private"
    field :status, :string
    field :copy, :string
    field :actions, :map, default: %{}
    field :evidence_message_ids, {:array, :binary_id}, default: []
    field :uncertainty, {:array, :string}, default: []
    field :payload, :map, default: %{}
    field :suggested_draft, :string
    field :idempotency_key, :string
    field :dismissed_at, :utc_datetime_usec
    field :resolved_at, :utc_datetime_usec
    field :superseded_at, :utc_datetime_usec
    field :expires_at, :utc_datetime_usec
    field :correction_label, :string

    belongs_to :owner_user, OpalCore.Accounts.User, foreign_key: :owner_user_id
    belongs_to :conversation, OpalCore.Messaging.Conversation

    timestamps(type: :utc_datetime_usec)
  end

  def changeset(i, attrs) do
    i
    |> cast(attrs, [
      :owner_user_id,
      :conversation_id,
      :insight_type,
      :privacy_class,
      :status,
      :copy,
      :actions,
      :evidence_message_ids,
      :uncertainty,
      :payload,
      :suggested_draft,
      :idempotency_key,
      :dismissed_at,
      :resolved_at,
      :superseded_at,
      :expires_at,
      :correction_label
    ])
    |> validate_required([
      :owner_user_id,
      :conversation_id,
      :insight_type,
      :status,
      :copy,
      :idempotency_key,
      :privacy_class
    ])
    |> validate_inclusion(:insight_type, @types)
    |> validate_inclusion(:status, @statuses)
    |> validate_inclusion(:privacy_class, ~w(private))
    |> unique_constraint(:idempotency_key)
  end

  def to_contract(%__MODULE__{} = i) do
    actions =
      case i.actions do
        %{"items" => items} when is_list(items) -> items
        list when is_list(list) -> list
        _ -> []
      end

    %{
      "schema_version" => "0.1.0",
      "id" => i.id,
      "owner_user_id" => i.owner_user_id,
      "conversation_id" => i.conversation_id,
      "insight_type" => i.insight_type,
      "privacy_class" => i.privacy_class,
      "status" => i.status,
      "copy" => i.copy,
      "actions" => actions,
      "evidence_message_ids" => i.evidence_message_ids || [],
      "uncertainty" => i.uncertainty || [],
      "suggested_draft" => i.suggested_draft,
      "payload" => i.payload || %{},
      "created_at" => DateTime.to_iso8601(i.inserted_at)
    }
  end
end
