defmodule OpalCore.SocialFlow.Execution.ProfileGapAsk do
  @moduledoc """
  Repair #15 Track C — one ledger row per (owner, person, fact).

  Records the lifecycle of a progressive-profile ask so the QUIET law is
  enforceable: `asked` → `answered` | `skipped`. Once a row exists in any
  status, the fact is never asked about again for that person.
  """

  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @statuses ~w(asked answered skipped)

  schema "profile_gap_asks" do
    field :person_id, :binary_id
    field :fact_key, :string
    field :status, :string, default: "asked"
    field :asked_in_flow, :string
    field :answered_value, :string
    field :asked_at, :utc_datetime_usec
    field :resolved_at, :utc_datetime_usec

    belongs_to :owner_user, OpalCore.Accounts.User, foreign_key: :owner_user_id

    timestamps(type: :utc_datetime_usec)
  end

  def statuses, do: @statuses

  def changeset(ask, attrs) do
    ask
    |> cast(attrs, [
      :owner_user_id,
      :person_id,
      :fact_key,
      :status,
      :asked_in_flow,
      :answered_value,
      :asked_at,
      :resolved_at
    ])
    |> validate_required([:owner_user_id, :person_id, :fact_key, :status])
    |> validate_inclusion(:status, @statuses)
    |> unique_constraint([:owner_user_id, :person_id, :fact_key])
    |> foreign_key_constraint(:owner_user_id)
  end
end
