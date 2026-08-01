defmodule OpalCore.SocialFlow.ShellNeedsYouItem do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "shell_needs_you_items" do
    field :source_type, :string
    field :source_id, :binary_id
    field :conversation_id, :binary_id
    field :relationship_context_id, :binary_id
    field :title, :string
    field :explanation, :string
    field :primary_action, :string
    field :secondary_action, :string
    field :urgency_class, :string, default: "normal"
    field :privacy_class, :string, default: "private"
    field :status, :string, default: "open"
    field :due_at, :utc_datetime_usec
    field :expires_at, :utc_datetime_usec
    field :source_evidence, :map, default: %{}
    field :suppression_reason, :string
    field :completed_at, :utc_datetime_usec
    field :dismissed_at, :utc_datetime_usec
    field :idempotency_key, :string
    belongs_to :owner_user, OpalCore.Accounts.User, foreign_key: :owner_user_id
    timestamps(type: :utc_datetime_usec)
  end

  def changeset(i, attrs) do
    i
    |> cast(attrs, [
      :owner_user_id,
      :source_type,
      :source_id,
      :conversation_id,
      :relationship_context_id,
      :title,
      :explanation,
      :primary_action,
      :secondary_action,
      :urgency_class,
      :privacy_class,
      :status,
      :due_at,
      :expires_at,
      :source_evidence,
      :suppression_reason,
      :completed_at,
      :dismissed_at,
      :idempotency_key
    ])
    |> validate_required([
      :owner_user_id,
      :source_type,
      :title,
      :explanation,
      :primary_action,
      :status,
      :idempotency_key
    ])
    |> validate_inclusion(:status, ~w(open completed dismissed suppressed expired))
    |> validate_inclusion(:urgency_class, ~w(low normal high))
    |> validate_inclusion(:privacy_class, ~w(private shared family safety))
    |> unique_constraint(:idempotency_key)
  end

  def to_contract(%__MODULE__{} = i) do
    %{
      "id" => i.id,
      "source_type" => i.source_type,
      "source_id" => i.source_id,
      "conversation_id" => i.conversation_id,
      "title" => i.title,
      "explanation" => i.explanation,
      "primary_action" => i.primary_action,
      "secondary_action" => i.secondary_action,
      "urgency_class" => i.urgency_class,
      "privacy_class" => i.privacy_class,
      "status" => i.status,
      "due_at" => i.due_at && DateTime.to_iso8601(i.due_at),
      "source_evidence" => i.source_evidence || %{},
      "no_engagement_score" => true,
      "no_guilt_language" => true
    }
  end
end
