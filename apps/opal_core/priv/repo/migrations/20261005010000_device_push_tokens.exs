defmodule OpalCore.Repo.Migrations.DevicePushTokens do
  use Ecto.Migration

  def change do
    create table(:device_push_tokens, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :user_id, :string, null: false
      add :platform, :string, null: false
      add :token, :string, null: false
      add :env, :string, null: false, default: "sandbox"
      add :disabled_at, :utc_datetime_usec

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:device_push_tokens, [:token], name: :device_push_tokens_token_uniq)
    create index(:device_push_tokens, [:user_id])
    create index(:device_push_tokens, [:user_id, :disabled_at])
  end
end
