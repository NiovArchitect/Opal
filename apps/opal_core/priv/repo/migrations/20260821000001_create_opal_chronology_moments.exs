defmodule OpalCore.Repo.Migrations.CreateOpalChronologyMoments do
  use Ecto.Migration

  def change do
    create table(:opal_chronology_moments, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :conversation_id, references(:conversations, type: :binary_id, on_delete: :delete_all),
        null: false

      add :kind, :string, null: false
      add :lifecycle_stage, :string
      add :label, :string, null: false
      add :detail, :string
      add :privacy_class, :string, null: false, default: "shared_progress"
      # shared | private_viewer
      add :visibility, :string, null: false, default: "shared"
      add :viewer_user_id, :binary_id
      add :evidence_message_id, :binary_id
      add :source_message_ids, {:array, :binary_id}, null: false, default: []
      add :after_server_seq, :integer, null: false, default: 0
      add :created_from, :string, null: false, default: "conversation_evidence"
      add :composition_snapshot, :map, null: false, default: %{}
      add :idempotency_key, :string, null: false

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:opal_chronology_moments, [:idempotency_key])
    create index(:opal_chronology_moments, [:conversation_id, :after_server_seq])
    create index(:opal_chronology_moments, [:conversation_id, :inserted_at])
  end
end
