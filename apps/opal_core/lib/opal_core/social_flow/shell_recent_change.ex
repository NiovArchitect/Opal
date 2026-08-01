defmodule OpalCore.SocialFlow.ShellRecentChange do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "shell_recent_changes" do
    field :title, :string
    field :explanation, :string
    field :conversation_id, :binary_id
    field :plan_id, :binary_id
    field :material, :boolean, default: true
    field :privacy_class, :string, default: "shared"
    field :idempotency_key, :string
    belongs_to :owner_user, OpalCore.Accounts.User, foreign_key: :owner_user_id
    timestamps(type: :utc_datetime_usec)
  end

  def changeset(c, attrs) do
    c
    |> cast(attrs, [
      :owner_user_id,
      :title,
      :explanation,
      :conversation_id,
      :plan_id,
      :material,
      :privacy_class,
      :idempotency_key
    ])
    |> validate_required([:owner_user_id, :title, :explanation, :idempotency_key])
    |> unique_constraint(:idempotency_key)
  end

  def to_contract(%__MODULE__{} = c) do
    %{
      "id" => c.id,
      "title" => c.title,
      "explanation" => c.explanation,
      "material" => c.material,
      "conversation_id" => c.conversation_id
    }
  end
end
