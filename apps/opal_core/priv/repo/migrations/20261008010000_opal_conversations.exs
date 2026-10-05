defmodule OpalCore.Repo.Migrations.OpalConversations do
  use Ecto.Migration

  def up do
    create table(:opal_conversations, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :user_id, references(:users, type: :binary_id, on_delete: :delete_all), null: false
      add :title, :string

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:opal_conversations, [:user_id])
  end

  def down do
    drop table(:opal_conversations)
  end
end
