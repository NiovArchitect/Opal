defmodule OpalCore.Lives.LiveSticker do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "live_stickers" do
    field :live_room_id, :binary_id
    field :venue_id, :binary_id
    field :sender_account_id, :binary_id
    field :host_account_id, :binary_id
    field :sticker_key, :string
    field :amount_cents, :integer
    field :host_share_cents, :integer
    field :venue_share_cents, :integer
    field :spend_tx_id, :binary_id
    field :host_credit_tx_id, :binary_id
    field :test_mode, :boolean, default: true
    field :idempotency_key, :string

    timestamps(type: :utc_datetime_usec)
  end

  def changeset(row, attrs) do
    row
    |> cast(attrs, [
      :live_room_id,
      :venue_id,
      :sender_account_id,
      :host_account_id,
      :sticker_key,
      :amount_cents,
      :host_share_cents,
      :venue_share_cents,
      :spend_tx_id,
      :host_credit_tx_id,
      :test_mode,
      :idempotency_key
    ])
    |> validate_required([
      :live_room_id,
      :venue_id,
      :sender_account_id,
      :host_account_id,
      :sticker_key,
      :amount_cents,
      :host_share_cents,
      :venue_share_cents,
      :idempotency_key
    ])
    |> unique_constraint(:idempotency_key, name: :live_stickers_idempotency_key_index)
  end

  def to_contract(%__MODULE__{} = s) do
    %{
      "id" => s.id,
      "live_room_id" => s.live_room_id,
      "sticker_key" => s.sticker_key,
      "amount_cents" => s.amount_cents,
      "host_share_cents" => s.host_share_cents,
      "sender_account_id" => s.sender_account_id,
      "test_mode" => s.test_mode,
      "overlay_seconds" => 3,
      "inserted_at" => s.inserted_at && DateTime.to_iso8601(s.inserted_at)
    }
  end
end
