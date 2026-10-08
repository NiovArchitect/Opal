defmodule OpalCore.Intelligence.AttentionSlot do
  @moduledoc "Granted attention slot row (Paste E1). Denied requests are logged only."

  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @priorities ~w(time_critical mediation reminder proactive_thread weekly_briefing routine_break)
  @statuses ~w(granted superseded)

  schema "attention_slots" do
    field :account_id, :binary_id
    field :surface, :string
    field :priority, :string
    field :ref, :map, default: %{}
    field :dedupe_key, :string
    field :granted_on, :date
    field :counts_against_budget, :boolean, default: true
    field :status, :string, default: "granted"

    timestamps(type: :utc_datetime_usec)
  end

  def priorities, do: @priorities

  def changeset(row, attrs) do
    row
    |> cast(attrs, [
      :account_id,
      :surface,
      :priority,
      :ref,
      :dedupe_key,
      :granted_on,
      :counts_against_budget,
      :status
    ])
    |> validate_required([:account_id, :surface, :priority, :dedupe_key, :granted_on])
    |> validate_inclusion(:priority, @priorities)
    |> validate_inclusion(:status, @statuses)
  end
end
