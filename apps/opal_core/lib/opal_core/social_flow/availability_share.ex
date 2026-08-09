defmodule OpalCore.SocialFlow.AvailabilityShare do
  @moduledoc """
  Intentional share of one private window into one conversation.

  Peer-visible projection is always shared-safe ranges only — never raw
  window rows with private metadata.
  """

  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @statuses ~w(active revoked)

  schema "availability_shares" do
    field :status, :string, default: "active"
    field :shared_at, :utc_datetime_usec
    field :revoked_at, :utc_datetime_usec

    belongs_to :owner_user, OpalCore.Accounts.User, foreign_key: :owner_user_id
    belongs_to :conversation, OpalCore.Messaging.Conversation
    belongs_to :availability_window, OpalCore.SocialFlow.AvailabilityWindow

    timestamps(type: :utc_datetime_usec)
  end

  def statuses, do: @statuses

  def changeset(share, attrs) do
    share
    |> cast(attrs, [
      :owner_user_id,
      :conversation_id,
      :availability_window_id,
      :status,
      :shared_at,
      :revoked_at
    ])
    |> validate_required([
      :owner_user_id,
      :conversation_id,
      :availability_window_id,
      :status,
      :shared_at
    ])
    |> validate_inclusion(:status, @statuses)
    |> unique_constraint([:conversation_id, :availability_window_id],
      name: :availability_shares_conversation_window_uniq
    )
  end
end
