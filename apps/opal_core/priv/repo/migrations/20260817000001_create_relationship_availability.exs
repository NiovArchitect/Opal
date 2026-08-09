defmodule OpalCore.Repo.Migrations.CreateRelationshipAvailability do
  use Ecto.Migration

  @moduledoc """
  Additive Phase 1: private availability windows + intentional conversation shares.

  Does not alter SF4 availability_grants (group free/busy).
  Conversations remain valid with zero availability rows.
  """

  def change do
    create table(:availability_windows, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :owner_user_id, references(:users, type: :binary_id, on_delete: :delete_all),
        null: false

      add :start_at, :utc_datetime_usec, null: false
      add :end_at, :utc_datetime_usec, null: false
      # IANA timezone for display; computation uses UTC instants.
      add :timezone, :string, null: false, default: "UTC"
      # Phase 1: manual only. Future: calendar_free_busy, device_inference.
      add :source, :string, null: false, default: "manual"
      # active | deleted
      add :status, :string, null: false, default: "active"
      add :expires_at, :utc_datetime_usec

      timestamps(type: :utc_datetime_usec)
    end

    create index(:availability_windows, [:owner_user_id, :status])
    create index(:availability_windows, [:owner_user_id, :start_at])

    create table(:availability_shares, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :owner_user_id, references(:users, type: :binary_id, on_delete: :delete_all),
        null: false

      add :conversation_id, references(:conversations, type: :binary_id, on_delete: :delete_all),
        null: false

      add :availability_window_id,
          references(:availability_windows, type: :binary_id, on_delete: :delete_all),
          null: false

      # active | revoked
      add :status, :string, null: false, default: "active"
      add :shared_at, :utc_datetime_usec, null: false
      add :revoked_at, :utc_datetime_usec

      timestamps(type: :utc_datetime_usec)
    end

    create index(:availability_shares, [:conversation_id, :status])
    create index(:availability_shares, [:owner_user_id, :conversation_id])

    create unique_index(
             :availability_shares,
             [:conversation_id, :availability_window_id],
             name: :availability_shares_conversation_window_uniq,
             where: "status = 'active'"
           )
  end
end
