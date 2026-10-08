defmodule OpalCore.SocialMemory.Commitment do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @statuses ~w(open done overdue dismissed)

  schema "commitment_ledger" do
    field :account_id, :binary_id
    field :description, :string
    field :status, :string, default: "open"
    field :source_conversation_id, :binary_id
    field :source_message_id, :binary_id
    field :deadline_at, :utc_datetime_usec
    field :completed_at, :utc_datetime_usec
    field :dismissed_at, :utc_datetime_usec
    field :person_id, :binary_id

    timestamps(type: :utc_datetime_usec)
  end

  def changeset(row, attrs) do
    row
    |> cast(attrs, [
      :account_id,
      :description,
      :status,
      :source_conversation_id,
      :source_message_id,
      :deadline_at,
      :completed_at,
      :dismissed_at,
      :person_id
    ])
    |> validate_required([
      :account_id,
      :description,
      :source_conversation_id,
      :source_message_id
    ])
    |> validate_inclusion(:status, @statuses)
    |> unique_constraint([:account_id, :source_message_id],
      name: :commitment_ledger_account_message_index
    )
  end
end
