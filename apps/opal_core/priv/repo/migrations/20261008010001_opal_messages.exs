defmodule OpalCore.Repo.Migrations.OpalMessages do
  use Ecto.Migration

  def up do
    create table(:opal_messages, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :conversation_id,
          references(:opal_conversations, type: :binary_id, on_delete: :delete_all),
          null: false

      add :role, :string, null: false
      add :body, :text, null: false
      add :metadata, :map

      timestamps(type: :utc_datetime_usec, updated_at: false)
    end

    create index(:opal_messages, [:conversation_id])
    create index(:opal_messages, [:conversation_id, :inserted_at])
  end

  def down do
    drop table(:opal_messages)
  end
end
