defmodule OpalCore.Calls.CallSession do
  @moduledoc """
  Durable 1:1 call session metadata. Media (SDP/ICE) is ephemeral on Phoenix — not stored here.
  """

  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @statuses ~w(initiated ringing answered ended failed missed canceled)

  schema "call_sessions" do
    field :caller_user_id, :binary_id
    field :callee_user_id, :binary_id
    field :conversation_id, :binary_id
    field :status, :string, default: "initiated"
    field :ended_reason, :string
    field :correlation_id, :string
    field :answered_at, :utc_datetime_usec
    field :ended_at, :utc_datetime_usec
    field :media_connected_at, :utc_datetime_usec
    field :ringing_at, :utc_datetime_usec

    timestamps(type: :utc_datetime_usec)
  end

  def statuses, do: @statuses

  def create_changeset(attrs) do
    %__MODULE__{}
    |> cast(attrs, [
      :caller_user_id,
      :callee_user_id,
      :conversation_id,
      :status,
      :correlation_id,
      :ringing_at
    ])
    |> validate_required([:caller_user_id, :callee_user_id, :status])
    |> validate_inclusion(:status, @statuses)
    |> validate_different_peers()
  end

  def transition_changeset(%__MODULE__{} = s, attrs) do
    s
    |> cast(attrs, [:status, :ended_reason, :answered_at, :ended_at, :ringing_at, :media_connected_at])
    |> validate_required([:status])
    |> validate_inclusion(:status, @statuses)
  end

  defp validate_different_peers(cs) do
    caller = get_field(cs, :caller_user_id)
    callee = get_field(cs, :callee_user_id)

    if is_binary(caller) and caller == callee do
      add_error(cs, :callee_user_id, "cannot call yourself")
    else
      cs
    end
  end
end
