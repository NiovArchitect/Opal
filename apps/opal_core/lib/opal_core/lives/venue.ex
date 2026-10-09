defmodule OpalCore.Lives.Venue do
  @moduledoc """
  Places-validated venue for Paste K lives / stickers / Opal Pay.
  """

  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @statuses ~w(quarantine full frozen merged)

  schema "venues" do
    field :place_id, :string
    field :name, :string
    field :formatted_address, :string
    field :types, {:array, :string}, default: []
    field :residential, :boolean, default: false
    field :status, :string, default: "quarantine"
    field :quarantine_until, :utc_datetime_usec
    field :first_live_at, :utc_datetime_usec
    field :claimed_at, :utc_datetime_usec
    field :claimed_account_id, :binary_id
    field :escrow_balance_cents, :integer, default: 0
    field :balance_cents, :integer, default: 0
    field :pay_token, :string
    field :canonical_venue_id, :binary_id
    field :heat_frozen, :boolean, default: false
    field :fraud_flags, :integer, default: 0
    field :metadata, :map, default: %{}

    timestamps(type: :utc_datetime_usec)
  end

  def statuses, do: @statuses

  def changeset(row, attrs) do
    row
    |> cast(attrs, [
      :place_id,
      :name,
      :formatted_address,
      :types,
      :residential,
      :status,
      :quarantine_until,
      :first_live_at,
      :claimed_at,
      :claimed_account_id,
      :escrow_balance_cents,
      :balance_cents,
      :pay_token,
      :canonical_venue_id,
      :heat_frozen,
      :fraud_flags,
      :metadata
    ])
    |> validate_required([:place_id, :name, :pay_token, :status])
    |> validate_inclusion(:status, @statuses)
    |> unique_constraint(:place_id, name: :venues_place_id_index)
    |> unique_constraint(:pay_token, name: :venues_pay_token_index)
  end

  def stickers_enabled?(%__MODULE__{status: "full"} = v), do: not test_only?(v)
  def stickers_enabled?(%__MODULE__{}), do: false

  def escrow_accrues?(%__MODULE__{status: "full"} = v), do: not test_only?(v)
  def escrow_accrues?(%__MODULE__{}), do: false

  @doc "Provisional testing venues (place_id test-* or metadata.test_only)."
  def test_only?(%__MODULE__{place_id: place_id, metadata: meta}) do
    meta_test? =
      case meta do
        %{"test_only" => true} -> true
        %{"test_only" => "true"} -> true
        %{test_only: true} -> true
        _ -> false
      end

    meta_test? or (is_binary(place_id) and String.starts_with?(place_id, "test-"))
  end

  def test_only?(_), do: false

  def display_name(%__MODULE__{} = v) do
    if test_only?(v), do: "TEST VENUE · #{v.name}", else: v.name
  end

  def to_public_contract(%__MODULE__{} = v) do
    test? = test_only?(v)

    %{
      "id" => v.id,
      "place_id" => v.place_id,
      "name" => v.name,
      "display_name" => display_name(v),
      "formatted_address" => v.formatted_address,
      "status" => v.status,
      "quarantine" => v.status == "quarantine",
      "stickers_enabled" => stickers_enabled?(v),
      "heat_frozen" => v.heat_frozen,
      "test_only" => test?,
      "test_venue_badge" => if(test?, do: "TEST VENUE", else: nil)
    }
  end

  def to_ops_contract(%__MODULE__{} = v) do
    to_public_contract(v)
    |> Map.merge(%{
      "escrow_balance_cents" => v.escrow_balance_cents,
      "balance_cents" => v.balance_cents,
      "fraud_flags" => v.fraud_flags,
      "claimed" => not is_nil(v.claimed_at)
    })
  end

  def to_claimed_contract(%__MODULE__{} = v) do
    to_ops_contract(v)
    |> Map.put("pay_token", v.pay_token)
  end
end
