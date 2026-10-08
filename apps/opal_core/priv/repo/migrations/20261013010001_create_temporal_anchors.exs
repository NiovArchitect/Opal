defmodule OpalCore.Repo.Migrations.CreateTemporalAnchors do
  use Ecto.Migration

  def change do
    create table(:temporal_anchors, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :account_id, :binary_id, null: false
      add :person_id, :binary_id
      add :anchor_type, :string, null: false
      add :date, :date, null: false
      add :recurrence, :map
      add :source_text, :string
      add :source_message_id, :binary_id
      add :confidence, :float, null: false, default: 0.0
      add :needs_confirmation, :boolean, null: false, default: false
      add :confirmed, :boolean, null: false, default: false
      add :last_occurrence, :date

      timestamps(type: :utc_datetime_usec)
    end

    create index(:temporal_anchors, [:account_id, :date])
    create index(:temporal_anchors, [:account_id, :person_id, :anchor_type])

    create unique_index(:temporal_anchors, [:account_id, :person_id, :anchor_type, :date],
             name: :temporal_anchors_account_person_type_date_index,
             where: "person_id IS NOT NULL"
           )
  end
end
