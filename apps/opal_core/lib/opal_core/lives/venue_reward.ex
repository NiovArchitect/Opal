defmodule OpalCore.Lives.VenueReward do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "venue_rewards" do
    field :venue_id, :binary_id
    field :contributor_account_id, :binary_id
    field :amount_cents, :integer
    field :credit_tx_id, :binary_id
    field :test_mode, :boolean, default: true
    field :idempotency_key, :string
    field :note, :string

    timestamps(type: :utc_datetime_usec)
  end

  def changeset(row, attrs) do
    row
    |> cast(attrs, [
      :venue_id,
      :contributor_account_id,
      :amount_cents,
      :credit_tx_id,
      :test_mode,
      :idempotency_key,
      :note
    ])
    |> validate_required([
      :venue_id,
      :contributor_account_id,
      :amount_cents,
      :idempotency_key
    ])
    |> unique_constraint(:idempotency_key, name: :venue_rewards_idempotency_key_index)
  end
end
