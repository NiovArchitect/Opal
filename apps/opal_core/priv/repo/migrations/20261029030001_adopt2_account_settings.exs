defmodule OpalCore.Repo.Migrations.Adopt2AccountSettings do
  use Ecto.Migration

  # Repair #18 adoption wave 2 (account/settings cluster) - additive only.
  # 4.C2: the session roster already lives in device_sessions; no table
  # needed. 4.C3: saved logins (host + TokenVault ciphertext only).
  # 4.C4: personal invite codes + redemption records. 4.C6: deletion
  # receipts + users.deleted_at. 4.C7: support entry_point parity column.
  # Activity trail entries back credential use (4.C3) and device revoke.
  def change do
    create table(:saved_logins, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :user_id, :binary_id, null: false
      add :host, :string, null: false
      add :secret_ciphertext, :binary, null: false

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:saved_logins, [:user_id, :host])
    create index(:saved_logins, [:user_id])

    create table(:account_activity_entries, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :user_id, :binary_id, null: false
      add :kind, :string, null: false
      add :subject, :string
      add :detail, :map, null: false, default: %{}

      timestamps(type: :utc_datetime_usec)
    end

    create index(:account_activity_entries, [:user_id, :inserted_at])

    create table(:personal_invite_codes, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :user_id, :binary_id, null: false
      add :code, :string, null: false

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:personal_invite_codes, [:user_id])
    create unique_index(:personal_invite_codes, [:code])

    create table(:invite_redemptions, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :personal_code_id, :binary_id, null: false
      add :inviter_user_id, :binary_id, null: false
      add :redeemer_user_id, :binary_id, null: false

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:invite_redemptions, [:personal_code_id, :redeemer_user_id])
    create index(:invite_redemptions, [:inviter_user_id, :inserted_at])
    create index(:invite_redemptions, [:redeemer_user_id, :inserted_at])

    create table(:deletion_receipts, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :reference, :string, null: false
      add :user_id, :binary_id, null: false
      add :mode, :string, null: false
      add :source, :string, null: false, default: "self_serve"
      add :summary, :map, null: false, default: %{}

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:deletion_receipts, [:reference])
    create index(:deletion_receipts, [:user_id, :inserted_at])

    alter table(:support_reports) do
      add :entry_point, :string, null: false, default: "you_help"
    end

    alter table(:users) do
      add :deleted_at, :utc_datetime_usec
    end
  end
end
