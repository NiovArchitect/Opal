defmodule OpalCore.SocialFlow.ShellComingUpItem do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "shell_coming_up_items" do
    field :plan_id, :binary_id
    field :conversation_id, :binary_id
    field :title, :string
    field :when_label, :string
    field :who_label, :string
    field :where_label, :string
    field :state, :string, default: "upcoming"
    field :source_type, :string, default: "plan"
    field :privacy_class, :string, default: "shared"
    field :idempotency_key, :string
    belongs_to :owner_user, OpalCore.Accounts.User, foreign_key: :owner_user_id
    timestamps(type: :utc_datetime_usec)
  end

  def changeset(i, attrs) do
    i
    |> cast(attrs, [
      :owner_user_id,
      :plan_id,
      :conversation_id,
      :title,
      :when_label,
      :who_label,
      :where_label,
      :state,
      :source_type,
      :privacy_class,
      :idempotency_key
    ])
    |> validate_required([:owner_user_id, :title, :state, :idempotency_key])
    |> validate_inclusion(:state, ~w(needs_confirmation today upcoming recent completed live))
    |> unique_constraint(:idempotency_key)
  end

  def to_contract(%__MODULE__{} = i) do
    %{
      "id" => i.id,
      "title" => i.title,
      "when_label" => i.when_label,
      "who_label" => i.who_label,
      "where_label" => i.where_label,
      "state" => i.state,
      "conversation_id" => i.conversation_id,
      "plan_id" => i.plan_id,
      "no_progress_percent" => true
    }
  end
end
