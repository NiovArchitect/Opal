defmodule OpalCore.SocialFlow.CompletionEvent do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "completion_events" do
    field :conversation_id, :binary_id
    field :plan_id, :binary_id
    field :commitment_id, :binary_id
    field :reminder_id, :binary_id
    field :memory_id, :binary_id
    field :completion_kind, :string
    field :visibility, :string, default: "private"
    field :gratification_copy, :string
    field :shared_message, :string
    field :source, :string, default: "user_action"
    field :idempotency_key, :string
    field :completed_at, :utc_datetime_usec

    belongs_to :owner_user, OpalCore.Accounts.User, foreign_key: :owner_user_id

    timestamps(type: :utc_datetime_usec, updated_at: false)
  end

  def changeset(e, attrs) do
    e
    |> cast(attrs, [
      :owner_user_id,
      :conversation_id,
      :plan_id,
      :commitment_id,
      :reminder_id,
      :memory_id,
      :completion_kind,
      :visibility,
      :gratification_copy,
      :shared_message,
      :source,
      :idempotency_key,
      :completed_at
    ])
    |> validate_required([
      :owner_user_id,
      :completion_kind,
      :visibility,
      :idempotency_key,
      :completed_at
    ])
    |> validate_inclusion(:visibility, ~w(private shared))
    |> unique_constraint(:idempotency_key)
  end

  def to_contract(%__MODULE__{} = e) do
    %{
      "id" => e.id,
      "owner_user_id" => e.owner_user_id,
      "conversation_id" => e.conversation_id,
      "plan_id" => e.plan_id,
      "commitment_id" => e.commitment_id,
      "reminder_id" => e.reminder_id,
      "memory_id" => e.memory_id,
      "completion_kind" => e.completion_kind,
      "visibility" => e.visibility,
      "gratification_copy" => e.gratification_copy,
      "shared_message" => e.shared_message,
      "completed_at" => DateTime.to_iso8601(e.completed_at)
    }
  end
end
