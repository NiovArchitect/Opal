defmodule OpalCore.Repo.Migrations.CreateSocialPatterns do
  use Ecto.Migration

  def change do
    create table(:social_patterns, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :account_id, :binary_id, null: false
      add :pattern_type, :string, null: false
      add :description, :string, null: false
      add :confidence, :float, null: false, default: 0.0
      add :evidence_count, :integer, null: false, default: 0
      add :last_evidence_at, :utc_datetime_usec
      add :surfaced, :boolean, null: false, default: false

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:social_patterns, [:account_id, :pattern_type],
             name: :social_patterns_account_type_index
           )

    create index(:social_patterns, [:account_id])
  end
end
