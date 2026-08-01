defmodule OpalCore.SocialFlow.AvailabilityGrant do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "availability_grants" do
    field :grant_mode, :string
    field :windows, :map, default: %{}
    field :status, :string, default: "active"
    field :revoked_at, :utc_datetime_usec
    field :idempotency_key, :string
    belongs_to :owner_user, OpalCore.Accounts.User, foreign_key: :owner_user_id
    belongs_to :conversation, OpalCore.Messaging.Conversation
    timestamps(type: :utc_datetime_usec)
  end

  def changeset(g, attrs) do
    g
    |> cast(attrs, [
      :owner_user_id,
      :conversation_id,
      :grant_mode,
      :windows,
      :status,
      :revoked_at,
      :idempotency_key
    ])
    |> validate_required([
      :owner_user_id,
      :conversation_id,
      :grant_mode,
      :status,
      :idempotency_key
    ])
    |> validate_inclusion(
      :grant_mode,
      ~w(exact free_busy preferred_windows unavailable_windows ask_before none)
    )
    |> unique_constraint(:idempotency_key)
  end

  def to_contract(%__MODULE__{} = g) do
    %{
      "id" => g.id,
      "owner_user_id" => g.owner_user_id,
      "conversation_id" => g.conversation_id,
      "grant_mode" => g.grant_mode,
      "windows" => g.windows,
      "status" => g.status
    }
  end
end
