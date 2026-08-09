defmodule OpalCore.Repo.Migrations.CreateOpalCalendarCommitments do
  use Ecto.Migration

  @moduledoc """
  Native Opal calendar commitments — canonical social schedule created inside Opal.

  External calendars are optional sources/sinks, not authority.
  """

  def change do
    create table(:opal_calendar_commitments, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :conversation_id, references(:conversations, type: :binary_id, on_delete: :delete_all),
        null: false

      add :shared_plan_id, references(:shared_plans, type: :binary_id, on_delete: :nilify_all)

      add :owner_user_id, references(:users, type: :binary_id, on_delete: :delete_all),
        null: false

      # active | cancelled | superseded | completed
      add :status, :string, null: false, default: "active"
      add :start_at, :utc_datetime_usec, null: false
      add :end_at, :utc_datetime_usec, null: false
      add :timezone, :string, null: false, default: "UTC"
      # Shared-safe label for owner private context only (never peer-leaked across convos)
      add :label, :string
      add :place_label, :string
      add :plan_version, :integer, null: false, default: 1
      add :proposal_key, :string
      add :participant_user_ids, {:array, :binary_id}, null: false, default: []
      add :created_from_alignment, :boolean, null: false, default: true
      add :superseded_by_id, :binary_id
      add :cancelled_at, :utc_datetime_usec
      add :completed_at, :utc_datetime_usec
      # external mirror: not_synced | sync_requested | synced | sync_failed | sync_revoked
      add :external_sync_status, :string, null: false, default: "not_synced"
      add :external_provider, :string
      add :external_event_ref, :string
      add :metadata, :map, null: false, default: %{}

      timestamps(type: :utc_datetime_usec)
    end

    create index(:opal_calendar_commitments, [:owner_user_id, :status, :start_at])
    create index(:opal_calendar_commitments, [:conversation_id, :status])
    create index(:opal_calendar_commitments, [:shared_plan_id])

    create unique_index(
             :opal_calendar_commitments,
             [:shared_plan_id, :owner_user_id, :plan_version],
             name: :opal_calendar_commitments_plan_owner_version_uniq,
             where: "status = 'active' AND shared_plan_id IS NOT NULL"
           )
  end
end
