defmodule OpalCore.SocialFlow.RealWorld.ProviderConnections do
  @moduledoc """
  Manage provider connections. Tokens never returned in API maps.
  """

  import Ecto.Query

  alias OpalCore.Repo
  alias OpalCore.SocialFlow.RealWorld.ProviderConnection
  alias OpalCore.SocialFlow.RealWorld.TokenVault

  def get(user_id, provider) when is_binary(user_id) and is_binary(provider) do
    if uuid?(user_id) do
      Repo.get_by(ProviderConnection, user_id: user_id, provider: provider)
    else
      nil
    end
  rescue
    _ -> nil
  end

  def connected?(user_id, provider) do
    case get(user_id, provider) do
      %ProviderConnection{status: "connected"} -> true
      _ -> false
    end
  end

  defp uuid?(id) when is_binary(id) do
    # Ecto binary_id / UUID shape
    Regex.match?(
      ~r/\A[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\z/,
      id
    )
  end

  defp uuid?(_), do: false

  def upsert_tokens(user_id, provider, attrs) when is_map(attrs) do
    access = attrs[:access_token] || attrs["access_token"]
    refresh = attrs[:refresh_token] || attrs["refresh_token"]

    with {:ok, access_ct} <- TokenVault.encrypt(access) do
      scopes = List.wrap(attrs[:scopes] || attrs["scopes"] || [])
      expires = attrs[:token_expires_at] || attrs["token_expires_at"]
      meta = attrs[:metadata] || attrs["metadata"] || %{}

      case get(user_id, provider) do
        nil ->
          # First connect: refresh may be nil only if Google omitted it (rare with prompt=consent)
          with {:ok, refresh_ct} <- TokenVault.encrypt(refresh) do
            %ProviderConnection{}
            |> ProviderConnection.changeset(%{
              user_id: user_id,
              provider: provider,
              status: "connected",
              scopes: scopes,
              access_token_ciphertext: access_ct,
              refresh_token_ciphertext: refresh_ct,
              token_expires_at: expires,
              external_account_ref: attrs[:external_account_ref] || attrs["external_account_ref"],
              metadata: sanitize_metadata(meta),
              last_synced_at: DateTime.utc_now() |> DateTime.truncate(:microsecond),
              revoked_at: nil,
              last_error_class: nil
            })
            |> Repo.insert()
          end

        %ProviderConnection{} = row ->
          # Preserve prior refresh ciphertext when Google omits refresh_token on re-auth/refresh
          refresh_ct =
            case refresh do
              r when is_binary(r) and r != "" ->
                case TokenVault.encrypt(r) do
                  {:ok, ct} -> ct
                  _ -> row.refresh_token_ciphertext
                end

              _ ->
                row.refresh_token_ciphertext
            end

          row
          |> ProviderConnection.changeset(%{
            status: "connected",
            scopes: if(scopes == [], do: row.scopes, else: scopes),
            access_token_ciphertext: access_ct,
            refresh_token_ciphertext: refresh_ct,
            token_expires_at: expires,
            external_account_ref:
              attrs[:external_account_ref] || attrs["external_account_ref"] ||
                row.external_account_ref,
            metadata: Map.merge(row.metadata || %{}, sanitize_metadata(meta)),
            last_synced_at: DateTime.utc_now() |> DateTime.truncate(:microsecond),
            revoked_at: nil,
            last_error_class: nil
          })
          |> Repo.update()
      end
    end
  end

  def access_token(%ProviderConnection{} = row) do
    TokenVault.decrypt(row.access_token_ciphertext)
  end

  def refresh_token(%ProviderConnection{} = row) do
    TokenVault.decrypt(row.refresh_token_ciphertext)
  end

  def revoke(user_id, provider) do
    case get(user_id, provider) do
      nil ->
        {:error, :not_found}

      row ->
        now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

        row
        |> ProviderConnection.changeset(%{
          status: "revoked",
          access_token_ciphertext: nil,
          refresh_token_ciphertext: nil,
          revoked_at: now
        })
        |> Repo.update()
    end
  end

  def mark_error(user_id, provider, error_class) do
    case get(user_id, provider) do
      nil ->
        {:error, :not_found}

      row ->
        row
        |> ProviderConnection.changeset(%{
          status: if(error_class in ["token_expired", "expired"], do: "expired", else: "error"),
          last_error_class: to_string(error_class)
        })
        |> Repo.update()
    end
  end

  def public_status(user_id, provider) do
    case get(user_id, provider) do
      nil ->
        %{
          "provider" => provider,
          "connected" => false,
          "status" => "not_connected",
          "scopes" => [],
          "token_present" => false
        }

      row ->
        %{
          "provider" => row.provider,
          "connected" => row.status == "connected",
          "status" => row.status,
          "scopes" => row.scopes || [],
          "token_present" => not is_nil(row.access_token_ciphertext),
          "last_synced_at" => row.last_synced_at && DateTime.to_iso8601(row.last_synced_at),
          "last_error_class" => row.last_error_class,
          # Never expose tokens
          "access_token" => nil,
          "refresh_token" => nil
        }
    end
  end

  def list_for_user(user_id) do
    from(p in ProviderConnection, where: p.user_id == ^user_id)
    |> Repo.all()
    |> Enum.map(fn row -> public_status(user_id, row.provider) end)
  end

  defp sanitize_metadata(meta) when is_map(meta) do
    meta
    |> Map.new(fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
    |> Map.drop(~w(access_token refresh_token id_token raw_events event_titles))
  end

  defp sanitize_metadata(_), do: %{}
end
