defmodule OpalCore.Accounts.User do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "users" do
    field :handle, :string
    field :display_name, :string
    # Internal read state is not this switch. This only controls whether
    # other people are told that this user saw a message.
    field :read_receipts_enabled, :boolean, default: true
    field :message_notifications_enabled, :boolean, default: true
    # nil = no choice yet. true/false is an explicit account default for future calls.
    field :assist_calls_enabled, :boolean
    # Phase D-1 — exclude this user from group taste learning aggregates.
    field :group_taste_opt_out, :boolean, default: false
    # Paste C3 — permanent opt-out of proactive Opal Center threads.
    field :proactive_opt_out, :boolean, default: false

    timestamps(type: :utc_datetime_usec)
  end

  def changeset(user, attrs) do
    user
    |> cast(attrs, [
      :id,
      :handle,
      :display_name,
      :read_receipts_enabled,
      :message_notifications_enabled,
      :assist_calls_enabled,
      :group_taste_opt_out,
      :proactive_opt_out
    ])
    |> validate_required([:handle, :display_name])
    |> validate_length(:handle, max: 64)
    |> validate_length(:display_name, max: 128)
    |> unique_constraint(:handle)
  end
end
