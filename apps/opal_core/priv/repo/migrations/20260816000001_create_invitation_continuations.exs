defmodule OpalCore.Repo.Migrations.CreateInvitationContinuations do
  use Ecto.Migration

  def change do
    create table(:invitation_continuations, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :continuation_digest, :string, null: false
      add :invitation_id, :binary_id, null: false
      add :expires_at, :utc_datetime_usec, null: false
      add :consumed_at, :utc_datetime_usec
      add :bound_user_id, :binary_id
      add :source, :string, default: "share_link"

      timestamps(type: :utc_datetime_usec, updated_at: false)
    end

    create unique_index(:invitation_continuations, [:continuation_digest])
    create index(:invitation_continuations, [:invitation_id])
    create index(:invitation_continuations, [:expires_at])
  end
end
