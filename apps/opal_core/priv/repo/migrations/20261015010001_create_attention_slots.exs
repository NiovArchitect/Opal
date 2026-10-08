defmodule OpalCore.Repo.Migrations.CreateAttentionSlots do
  use Ecto.Migration

  def change do
    create table(:attention_slots, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :account_id, :binary_id, null: false
      add :surface, :string, null: false
      add :priority, :string, null: false
      add :ref, :map, null: false, default: %{}
      add :dedupe_key, :string, null: false
      add :granted_on, :date, null: false
      add :counts_against_budget, :boolean, null: false, default: true
      add :status, :string, null: false, default: "granted"

      timestamps(type: :utc_datetime_usec)
    end

    create index(:attention_slots, [:account_id, :granted_on])
    create index(:attention_slots, [:account_id, :dedupe_key, :granted_on])
  end
end
