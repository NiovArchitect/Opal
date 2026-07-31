defmodule OpalCore.Messaging.MessageDelivery do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "message_deliveries" do
    field :device_id, :string
    field :delivered_at, :utc_datetime_usec

    belongs_to :message, OpalCore.Messaging.Message
    belongs_to :recipient_user, OpalCore.Accounts.User, foreign_key: :recipient_user_id

    timestamps(type: :utc_datetime_usec)
  end

  def changeset(delivery, attrs) do
    delivery
    |> cast(attrs, [:message_id, :recipient_user_id, :device_id, :delivered_at])
    |> validate_required([:message_id, :recipient_user_id, :device_id, :delivered_at])
    |> validate_length(:device_id, max: 128)
    |> unique_constraint([:message_id, :recipient_user_id, :device_id])
  end
end
