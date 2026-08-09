defmodule OpalCore.SocialFlow.RealWorld.ProviderConnection do
  @moduledoc """
  Durable provider connection row. Tokens stored as ciphertext only.

  Provider fact ≠ social decision. Connection grants fact access only.
  """

  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @providers ~w(
    google_calendar
    apple_calendar
    outlook_calendar
    maps_travel
    place_catalog
    booking
  )
  @statuses ~w(connected revoked expired error)

  schema "provider_connections" do
    field :provider, :string
    field :status, :string, default: "connected"
    field :scopes, {:array, :string}, default: []
    field :access_token_ciphertext, :binary
    field :refresh_token_ciphertext, :binary
    field :token_expires_at, :utc_datetime_usec
    field :external_account_ref, :string
    field :metadata, :map, default: %{}
    field :last_synced_at, :utc_datetime_usec
    field :last_error_class, :string
    field :revoked_at, :utc_datetime_usec

    belongs_to :user, OpalCore.Accounts.User

    timestamps(type: :utc_datetime_usec)
  end

  def providers, do: @providers
  def statuses, do: @statuses

  def changeset(row, attrs) do
    row
    |> cast(attrs, [
      :user_id,
      :provider,
      :status,
      :scopes,
      :access_token_ciphertext,
      :refresh_token_ciphertext,
      :token_expires_at,
      :external_account_ref,
      :metadata,
      :last_synced_at,
      :last_error_class,
      :revoked_at
    ])
    |> validate_required([:user_id, :provider, :status])
    |> validate_inclusion(:provider, @providers)
    |> validate_inclusion(:status, @statuses)
    |> unique_constraint([:user_id, :provider], name: :provider_connections_user_provider_uniq)
  end
end
