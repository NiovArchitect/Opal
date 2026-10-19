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
    # Repair #18 / audit A2 — Quiet master switch. Pausing never
    # rewrites the per-kind switches, so unpausing restores them
    # exactly; the notification gates consult this flag first.
    field :notifications_paused, :boolean, default: false
    # nil = no choice yet. true/false is an explicit account default for future calls.
    field :assist_calls_enabled, :boolean
    # Phase D-1 — exclude this user from group taste learning aggregates.
    field :group_taste_opt_out, :boolean, default: false
    # Paste C3 — permanent opt-out of proactive Opal Center threads.
    field :proactive_opt_out, :boolean, default: false
    # Repair #16 (W4, P1) — explicit opt-IN for proactive thread initiation.
    # Default false: no account receives an Opal-started thread until the
    # user enables this. `proactive_opt_out` still wins when both are set.
    field :proactive_threads_enabled, :boolean, default: false
    # Adoption wave 2 (spec 4.C6): stamped when the account is closed
    # and anonymized in place by AccountDeletion. Sessions are revoked
    # at the same moment; authenticate/1 refuses a deleted account.
    field :deleted_at, :utc_datetime_usec

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
      :notifications_paused,
      :assist_calls_enabled,
      :group_taste_opt_out,
      :proactive_opt_out,
      :proactive_threads_enabled
    ])
    |> validate_required([:handle, :display_name])
    |> validate_length(:handle, max: 64)
    |> validate_length(:display_name, max: 128)
    |> unique_constraint(:handle)
  end
end
