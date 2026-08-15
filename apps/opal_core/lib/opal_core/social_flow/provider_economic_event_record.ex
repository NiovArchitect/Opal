defmodule OpalCore.SocialFlow.ProviderEconomicEventRecord do
  @moduledoc """
  Durable Postgres row for provider economic events (Pass 23).

  Survives BEAM restart and multi-node processing.
  source_mode is preserved — storage never implies LIVE.
  """

  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "provider_economic_events" do
    field :provider, :string
    field :economic_event_id, :string
    field :transaction_id, :string
    field :execution_id, :string
    field :provider_transaction_id, :string
    field :provider_contract_version, :string
    field :source_mode, :string, default: "recorded_fixture"
    field :economic_event_type, :string
    field :transaction_type, :string
    field :currency, :string
    field :commission_value, :float
    field :commission_pool, :float
    field :gross_value, :float
    field :finality, :string
    field :status, :string
    field :settlement_state, :string
    field :completion, :boolean, default: false
    field :experience_completed, :boolean, default: false
    field :cancelled, :boolean, default: false
    field :partial, :boolean, default: false
    field :live, :boolean, default: false
    field :observed_at, :utc_datetime_usec
    field :effective_at, :utc_datetime_usec
    field :settled_at, :utc_datetime_usec
    field :reversal_reason, :string
    field :reversal_reference, :string
    field :raw_source_reference, :string
    field :payload, :map, default: %{}

    timestamps(type: :utc_datetime_usec)
  end

  def changeset(row, attrs) do
    row
    |> cast(attrs, [
      :provider,
      :economic_event_id,
      :transaction_id,
      :execution_id,
      :provider_transaction_id,
      :provider_contract_version,
      :source_mode,
      :economic_event_type,
      :transaction_type,
      :currency,
      :commission_value,
      :commission_pool,
      :gross_value,
      :finality,
      :status,
      :settlement_state,
      :completion,
      :experience_completed,
      :cancelled,
      :partial,
      :live,
      :observed_at,
      :effective_at,
      :settled_at,
      :reversal_reason,
      :reversal_reference,
      :raw_source_reference,
      :payload
    ])
    |> validate_required([:provider, :economic_event_id, :transaction_id, :economic_event_type, :source_mode])
    |> unique_constraint([:provider, :economic_event_id],
      name: :provider_economic_events_provider_event_id_index
    )
  end

  def to_event_map(%__MODULE__{} = r) do
    %{
      "id" => r.id,
      "provider" => r.provider,
      "economic_event_id" => r.economic_event_id,
      "transaction_id" => r.transaction_id,
      "execution_id" => r.execution_id,
      "provider_transaction_id" => r.provider_transaction_id || r.transaction_id,
      "provider_contract_version" => r.provider_contract_version,
      "source_mode" => r.source_mode,
      "mode" => r.source_mode,
      "economic_event_type" => r.economic_event_type,
      "transaction_type" => r.transaction_type,
      "currency" => r.currency,
      "commission_value" => r.commission_value,
      "commission_pool" => r.commission_pool || r.commission_value,
      "gross_value" => r.gross_value,
      "finality" => r.finality,
      "status" => r.status,
      "settlement_state" => r.settlement_state,
      "completion" => r.completion == true,
      "experience_completed" => r.experience_completed == true,
      "cancelled" => r.cancelled == true,
      "partial" => r.partial == true,
      "live" => r.live == true,
      "observed_at" => r.observed_at,
      "effective_at" => r.effective_at,
      "settled_at" => r.settled_at,
      "reversal_reason" => r.reversal_reason,
      "reversal_reference" => r.reversal_reference,
      "raw_source_reference" => r.raw_source_reference,
      "payload" => r.payload || %{},
      "stored_at" => r.inserted_at,
      "event_key" => "#{r.provider}:#{r.economic_event_id}",
      "durable" => true,
      "live_economic" => false
    }
  end
end
