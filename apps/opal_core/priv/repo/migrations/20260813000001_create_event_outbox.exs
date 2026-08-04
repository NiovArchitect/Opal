defmodule OpalCore.Repo.Migrations.CreateEventOutbox do
  use Ecto.Migration

  def change do
    create table(:event_outbox, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :event_id, :string, null: false
      add :event_type, :string, null: false
      add :event_version, :integer, null: false, default: 1
      add :aggregate_type, :string
      add :aggregate_id, :string
      add :partition_key, :string, null: false
      add :topic_family, :string, null: false
      add :privacy_class, :string, null: false, default: "shared_authorized"
      add :purpose, :string
      add :correlation_id, :string
      add :causation_id, :string
      add :envelope, :map, null: false, default: %{}
      add :status, :string, null: false, default: "pending"
      add :attempts, :integer, null: false, default: 0
      add :available_at, :utc_datetime_usec, null: false
      add :published_at, :utc_datetime_usec
      add :last_error, :string

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:event_outbox, [:event_id])
    create index(:event_outbox, [:status, :available_at])
    create index(:event_outbox, [:topic_family, :partition_key])
    create index(:event_outbox, [:aggregate_type, :aggregate_id])
  end
end
