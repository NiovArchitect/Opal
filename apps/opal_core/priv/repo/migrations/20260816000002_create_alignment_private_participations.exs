defmodule OpalCore.Repo.Migrations.CreateAlignmentPrivateParticipations do
  use Ecto.Migration

  def change do
    create table(:alignment_private_participations, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :conversation_id, :binary_id, null: false
      add :user_id, :binary_id, null: false
      add :proposal_key, :string, null: false, default: "default"
      add :response_key, :string, null: false
      add :invalidates_set, :boolean, null: false, default: false

      timestamps(type: :utc_datetime_usec, updated_at: false)
    end

    create unique_index(:alignment_private_participations, [
             :conversation_id,
             :user_id,
             :proposal_key
           ])

    create index(:alignment_private_participations, [:conversation_id])
  end
end
