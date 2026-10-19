defmodule OpalCore.Settings.SavedLogins do
  @moduledoc """
  The credential wallet (spec 4.C3) over the existing TokenVault
  (`OpalCore.SocialFlow.RealWorld.TokenVault`, AES-256-GCM).

  Verified at source: TokenVault is an encryption module only - the
  provider-connection store behind it holds Google OAuth tokens for
  two fixed providers, not user saved logins. This context is the
  user-facing store the spec names: values are encrypted through
  TokenVault on the way in, decrypted ONLY inside `use_for_host/2`
  for a server-side caller acting for that host, and every use
  writes an activity-trail entry. No function here returns a value
  to a transport layer; contracts carry hosts only.
  """

  import Ecto.Query

  alias OpalCore.Accounts.AccountActivity
  alias OpalCore.Repo
  alias OpalCore.Settings.SavedLogin
  alias OpalCore.SocialFlow.RealWorld.TokenVault

  @doc "Normalize a user-typed host: strip scheme/path/port, downcase."
  def normalize_host(host) when is_binary(host) do
    host
    |> String.trim()
    |> String.replace(~r{^[a-zA-Z][a-zA-Z0-9+.-]*://}, "")
    |> String.split("/", parts: 2)
    |> List.first()
    |> String.split(":", parts: 2)
    |> List.first()
    |> String.trim()
    |> String.downcase()
  end

  def normalize_host(_), do: ""

  def add(user_id, host, secret)
      when is_binary(user_id) and is_binary(secret) and secret != "" do
    normalized = normalize_host(host)

    cond do
      normalized == "" ->
        {:error, :invalid_host}

      not String.contains?(normalized, ".") ->
        {:error, :invalid_host}

      true ->
        with {:ok, ciphertext} <- TokenVault.encrypt(secret) do
          %SavedLogin{user_id: user_id, secret_ciphertext: ciphertext}
          |> SavedLogin.changeset(%{host: normalized})
          |> Repo.insert()
          |> case do
            {:ok, login} -> {:ok, login}
            {:error, changeset} -> {:error, changeset}
          end
        end
    end
  end

  def add(_, _, _), do: {:error, :invalid}

  @doc "Hosts-only list, oldest first. Values never read."
  def list_for_user(user_id) when is_binary(user_id) do
    SavedLogin
    |> where([l], l.user_id == ^user_id)
    |> order_by([l], asc: l.inserted_at)
    |> Repo.all()
  end

  def list_for_user(_), do: []

  def remove(user_id, id) when is_binary(user_id) and is_binary(id) do
    case Repo.get_by(SavedLogin, id: id, user_id: user_id) do
      %SavedLogin{} = login ->
        Repo.delete(login)

      nil ->
        {:error, :not_found}
    end
  end

  def remove(_, _), do: {:error, :invalid}

  @doc """
  Server-internal use: decrypt the saved value for `host` for a
  caller acting on the owner's behalf, and write the activity-trail
  entry the spec requires. Returns the plaintext to the SERVER
  caller only - controllers must never render it.
  """
  def use_for_host(user_id, host) when is_binary(user_id) do
    normalized = normalize_host(host)

    case Repo.get_by(SavedLogin, user_id: user_id, host: normalized) do
      %SavedLogin{} = login ->
        with {:ok, plaintext} <- TokenVault.decrypt(login.secret_ciphertext),
             {:ok, _entry} <-
               AccountActivity.record(user_id, "credential_used", normalized, %{
                 "host" => normalized
               }) do
          {:ok, plaintext}
        end

      nil ->
        {:error, :not_found}
    end
  end

  def use_for_host(_, _), do: {:error, :invalid}
end
