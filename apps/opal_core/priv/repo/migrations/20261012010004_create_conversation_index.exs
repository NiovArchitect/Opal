defmodule OpalCore.Repo.Migrations.CreateConversationIndex do
  use Ecto.Migration

  def change do
    create table(:conversation_index, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :account_id, :binary_id, null: false
      add :conversation_id, :binary_id, null: false
      add :rolling_summary, :text
      add :key_entities, :map, null: false, default: %{}
      add :open_questions, {:array, :string}, null: false, default: []
      add :message_count_at_summary, :integer, null: false, default: 0
      add :message_count, :integer, null: false, default: 0
      add :last_activity_at, :utc_datetime_usec

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:conversation_index, [:account_id, :conversation_id],
             name: :conversation_index_account_conversation_index
           )

    create index(:conversation_index, [:account_id])
  end
end
