defmodule OpalCore.SocialMemory.ProactiveThreadLog do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "proactive_thread_logs" do
    field :account_id, :binary_id
    field :trigger_type, :string
    field :trigger_ref_id, :binary_id
    field :opened_at, :utc_datetime_usec
    field :owner_response, :string
    field :conversation_id, :binary_id

    timestamps(type: :utc_datetime_usec)
  end

  def changeset(row, attrs) do
    row
    |> cast(attrs, [
      :account_id,
      :trigger_type,
      :trigger_ref_id,
      :opened_at,
      :owner_response,
      :conversation_id
    ])
    |> validate_required([:account_id, :trigger_type, :opened_at])
  end
end
