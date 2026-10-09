defmodule OpalCore.Lives.VenuePayment do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "venue_payments" do
    field :venue_id, :binary_id
    field :payer_account_id, :binary_id
    field :amount_cents, :integer
    field :spend_tx_id, :binary_id
    field :test_mode, :boolean, default: true
    field :status, :string, default: "completed"
    field :idempotency_key, :string
    field :frozen, :boolean, default: false
    field :metadata, :map, default: %{}

    timestamps(type: :utc_datetime_usec)
  end

  def changeset(row, attrs) do
    row
    |> cast(attrs, [
      :venue_id,
      :payer_account_id,
      :amount_cents,
      :spend_tx_id,
      :test_mode,
      :status,
      :idempotency_key,
      :frozen,
      :metadata
    ])
    |> validate_required([
      :venue_id,
      :payer_account_id,
      :amount_cents,
      :idempotency_key
    ])
    |> unique_constraint(:idempotency_key, name: :venue_payments_idempotency_key_index)
  end

  def to_receipt(%__MODULE__{} = p, venue_name) do
    %{
      "id" => p.id,
      "venue_id" => p.venue_id,
      "venue_name" => venue_name,
      "amount_cents" => p.amount_cents,
      "test_mode" => p.test_mode,
      "test_payment_label" => if(p.test_mode, do: "test payment", else: nil),
      "status" => p.status,
      "inserted_at" => p.inserted_at && DateTime.to_iso8601(p.inserted_at)
    }
  end
end
