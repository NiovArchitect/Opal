defmodule OpalCore.Repo.Migrations.TemporalFollowThrough do
  use Ecto.Migration

  def change do
    create table(:temporal_follow_through_loops, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :kind, :string, null: false
      add :source_id, :string, null: false
      add :conversation_id, :string
      add :plan_id, :string
      add :plan_version, :string
      add :owner_user_id, :string
      add :responsibility_user_id, :string
      add :previous_owner_user_id, :string
      add :participant_ids, {:array, :string}, null: false, default: []
      add :timezone, :string, null: false, default: "America/Los_Angeles"
      add :precision, :string, null: false, default: "unspecified"
      add :semantic_deadline_date, :date
      add :semantic_deadline_at, :utc_datetime_usec
      add :plan_start_at, :utc_datetime_usec
      add :status, :string, null: false, default: "open"
      add :maturity, :string, null: false, default: "not_yet"
      add :attention_dedupe_key, :string, null: false
      add :provider_observed_at, :utc_datetime_usec
      add :provider_fresh_hours, :integer
      add :execution_status, :string
      add :destination_coords_known, :boolean, null: false, default: false
      add :travel_known, :boolean, null: false, default: false
      add :location_permission, :boolean, null: false, default: false
      add :metadata, :map, null: false, default: %{}
      add :idempotency_key, :string, null: false
      add :last_evaluated_at, :utc_datetime_usec

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:temporal_follow_through_loops, [:idempotency_key],
             name: :temporal_follow_through_loops_idempotency_uniq
           )

    create index(:temporal_follow_through_loops, [:responsibility_user_id, :status])
    create index(:temporal_follow_through_loops, [:plan_id, :plan_version])
    create index(:temporal_follow_through_loops, [:attention_dedupe_key])
  end
end
