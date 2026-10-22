defmodule OpalCore.Repo.Migrations.CreateStepUpElevations do
  use Ecto.Migration

  # Repair #24 (WS-5) - the memory step-up elevation record.
  # Additive only.
  #
  # An elevation is a short-lived, server-side grant bound to ONE
  # account and ONE device session, minted only after a fresh
  # phone-code verification (the account's actual credential - the
  # users table carries no password field at all; see the
  # StepUpElevation moduledoc). Manual memory mutations require a
  # live elevation; the row is the grant's own audit record
  # (granted_at / expires_at / revoked_at), and each gated mutation
  # additionally writes a SocialFlow AuditEvent row.
  def change do
    create table(:step_up_elevations, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :user_id, references(:users, type: :binary_id, on_delete: :delete_all), null: false
      add :session_id, :binary_id, null: false
      add :purpose, :string, null: false, default: "memory_mutation"
      add :credential_kind, :string, null: false, default: "phone_code"
      add :verification_challenge_id, :binary_id
      add :granted_at, :utc_datetime_usec, null: false
      add :expires_at, :utc_datetime_usec, null: false
      add :revoked_at, :utc_datetime_usec

      timestamps(type: :utc_datetime_usec)
    end

    create index(:step_up_elevations, [:user_id, :session_id])
    create index(:step_up_elevations, [:expires_at])
  end
end
