defmodule OpalCore.Repo.Migrations.Invites do
  use Ecto.Migration

  def up do
    create table(:invites, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :inviter_id, references(:users, type: :binary_id, on_delete: :delete_all), null: false
      add :code, :string, null: false
      add :invitee_phone, :string
      add :invitee_email, :string
      add :status, :string, null: false
      add :joined_user_id, references(:users, type: :binary_id, on_delete: :nilify_all)
      add :expires_at, :utc_datetime_usec, null: false

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:invites, [:code])
    create index(:invites, [:inviter_id])
    create index(:invites, [:status])

    create table(:invite_rewards, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :user_id, references(:users, type: :binary_id, on_delete: :delete_all), null: false
      add :successful_invites, :integer, null: false, default: 0

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:invite_rewards, [:user_id])
  end

  def down do
    drop table(:invite_rewards)
    drop table(:invites)
  end
end
