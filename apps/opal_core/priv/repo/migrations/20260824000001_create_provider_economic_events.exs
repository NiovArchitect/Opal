defmodule OpalCore.Repo.Migrations.CreateProviderEconomicEvents do
  use Ecto.Migration

  def change do
    create table(:provider_economic_events, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :provider, :string, null: false
      add :economic_event_id, :string, null: false
      add :transaction_id, :string, null: false
      add :execution_id, :string
      add :provider_transaction_id, :string
      add :provider_contract_version, :string
      add :source_mode, :string, null: false, default: "recorded_fixture"
      add :economic_event_type, :string, null: false
      add :transaction_type, :string
      add :currency, :string
      add :commission_value, :float
      add :commission_pool, :float
      add :gross_value, :float
      add :finality, :string
      add :status, :string
      add :settlement_state, :string
      add :completion, :boolean, default: false
      add :experience_completed, :boolean, default: false
      add :cancelled, :boolean, default: false
      add :partial, :boolean, default: false
      add :live, :boolean, null: false, default: false
      add :observed_at, :utc_datetime_usec
      add :effective_at, :utc_datetime_usec
      add :settled_at, :utc_datetime_usec
      add :reversal_reason, :string
      add :reversal_reference, :string
      add :raw_source_reference, :string
      add :payload, :map, null: false, default: %{}

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:provider_economic_events, [:provider, :economic_event_id],
             name: :provider_economic_events_provider_event_id_index
           )

    create index(:provider_economic_events, [:transaction_id, :inserted_at])
    create index(:provider_economic_events, [:execution_id])
    create index(:provider_economic_events, [:source_mode])
  end
end
