defmodule OpalCore.Repo.Migrations.CreateCommitmentLedger do
  use Ecto.Migration

  def change do
    create table(:commitment_ledger, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :account_id, :binary_id, null: false
      add :description, :string, null: false
      add :status, :string, null: false, default: "open"
      add :source_conversation_id, :binary_id, null: false
      add :source_message_id, :binary_id, null: false
      add :deadline_at, :utc_datetime_usec
      add :completed_at, :utc_datetime_usec
      add :dismissed_at, :utc_datetime_usec
      add :person_id, :binary_id

      timestamps(type: :utc_datetime_usec)
    end

    create index(:commitment_ledger, [:account_id, :status],
             name: :commitment_ledger_account_status_index
           )

    create unique_index(:commitment_ledger, [:account_id, :source_message_id],
             name: :commitment_ledger_account_message_index
           )
  end
end
