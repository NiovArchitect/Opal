defmodule OpalCore.Repo.Migrations.CreateProviderConnections do
  use Ecto.Migration

  @moduledoc """
  Additive provider OAuth / connection rows for real-world connectors.

  Stores ciphertext tokens only — never plaintext. No event titles.
  """

  def change do
    create table(:provider_connections, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :user_id, references(:users, type: :binary_id, on_delete: :delete_all), null: false

      # google_calendar | apple_calendar | outlook_calendar | maps_travel | place_catalog | booking
      add :provider, :string, null: false
      # connected | revoked | expired | error
      add :status, :string, null: false, default: "connected"
      add :scopes, {:array, :string}, null: false, default: []
      add :access_token_ciphertext, :binary
      add :refresh_token_ciphertext, :binary
      add :token_expires_at, :utc_datetime_usec
      add :external_account_ref, :string
      add :metadata, :map, null: false, default: %{}
      add :last_synced_at, :utc_datetime_usec
      add :last_error_class, :string
      add :revoked_at, :utc_datetime_usec

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:provider_connections, [:user_id, :provider],
             name: :provider_connections_user_provider_uniq
           )

    create index(:provider_connections, [:provider, :status])
  end
end
