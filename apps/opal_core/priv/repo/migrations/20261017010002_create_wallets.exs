defmodule OpalCore.Repo.Migrations.CreateWallets do
  use Ecto.Migration

  def change do
    # Stored-value wallet. Money transmitter obligations vary by jurisdiction —
    # founder must review before enabling loads in production. See BLOCKED.md.
    create table(:wallets, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :account_id, :binary_id, null: false
      add :balance_cents, :integer, null: false, default: 0
      add :currency, :string, null: false, default: "USD"
      # Founder-tunable auto-approve threshold (default $50).
      add :auto_approve_threshold_cents, :integer, null: false, default: 5000

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:wallets, [:account_id], name: :wallets_account_id_index)

    create table(:wallet_transactions, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :account_id, :binary_id, null: false
      add :amount_cents, :integer, null: false
      add :type, :string, null: false
      add :ref_type, :string
      add :ref_id, :string
      add :balance_after_cents, :integer, null: false
      add :idempotency_key, :string, null: false

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:wallet_transactions, [:idempotency_key],
             name: :wallet_transactions_idempotency_key_index
           )

    create index(:wallet_transactions, [:account_id, :inserted_at],
             name: :wallet_transactions_account_inserted_index
           )
  end
end
