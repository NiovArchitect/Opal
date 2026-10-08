defmodule OpalCore.Repo.Migrations.MemoryHygieneColumns do
  use Ecto.Migration

  def change do
    alter table(:routines) do
      add_if_not_exists :archived, :boolean, default: false, null: false
      add_if_not_exists :archived_at, :utc_datetime_usec
      add_if_not_exists :provenance, :string, default: "observed"
    end

    alter table(:social_patterns) do
      add_if_not_exists :archived, :boolean, default: false, null: false
      add_if_not_exists :evidence_window_days, :integer, default: 90
      add_if_not_exists :provenance, :string, default: "observed"
    end

    alter table(:temporal_anchors) do
      add_if_not_exists :provenance, :string, default: "observed"
      add_if_not_exists :archived, :boolean, default: false, null: false
      add_if_not_exists :superseded_by, :binary_id
    end

    alter table(:person_memories) do
      add_if_not_exists :hygiene_touched_at, :utc_datetime_usec
    end
  end
end
