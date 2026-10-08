defmodule OpalCore.SocialMemory.SurfacedNudge do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "surfaced_nudges" do
    field :account_id, :binary_id
    field :type, :string
    field :ref_id, :binary_id
    field :priority, :integer, default: 50
    field :reason, :string
    field :message_draft, :string
    field :conversation_id, :binary_id
    field :surfaced_at, :utc_datetime_usec
    field :dismissed_count, :integer, default: 0
    field :suppressed_until, :utc_datetime_usec
    field :status, :string, default: "active"

    timestamps(type: :utc_datetime_usec)
  end

  def changeset(row, attrs) do
    row
    |> cast(attrs, [
      :account_id,
      :type,
      :ref_id,
      :priority,
      :reason,
      :message_draft,
      :conversation_id,
      :surfaced_at,
      :dismissed_count,
      :suppressed_until,
      :status
    ])
    |> validate_required([:account_id, :type, :reason, :surfaced_at])
  end
end
