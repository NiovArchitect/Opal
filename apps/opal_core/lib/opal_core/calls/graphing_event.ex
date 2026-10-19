defmodule OpalCore.Calls.GraphingEvent do
  @moduledoc """
  Consent lineage for one call's graphing (Repair #19 W12, item 16c).

  Append-only: a row is written for every graphing transition — on,
  paused, resumed, off — with the actor and the resulting state. This is
  the per-call lineage the wallet audit pattern requires: consent is
  never decorative, so every change to what Opal may take from a call
  leaves a durable, attributable record.
  """

  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @actions ~w(graphing_on graphing_paused graphing_resumed graphing_off)
  @states ~w(graphing paused waiting_for_other off)

  schema "call_graphing_events" do
    field :call_id, :binary_id
    field :actor_user_id, :binary_id
    field :action, :string
    field :resulting_state, :string
    field :scope, :string, default: "call"

    timestamps(type: :utc_datetime_usec, updated_at: false)
  end

  def actions, do: @actions
  def states, do: @states

  def changeset(row, attrs) do
    row
    |> cast(attrs, [:call_id, :actor_user_id, :action, :resulting_state, :scope])
    |> validate_required([:call_id, :action, :resulting_state])
    |> validate_inclusion(:action, @actions)
    |> validate_inclusion(:resulting_state, @states)
  end
end
