defmodule OpalCore.Push.DeviceTokens do
  @moduledoc """
  Upsert / soft-disable device push tokens. Hard-delete is forbidden.
  """

  import Ecto.Query

  alias OpalCore.Push.DeviceToken
  alias OpalCore.Repo

  @doc """
  Upsert a device token for a user. Re-enables a previously disabled token
  when the same token is registered again.
  """
  def upsert(user_id, attrs) when is_binary(user_id) and is_map(attrs) do
    platform = attrs["platform"] || attrs[:platform]
    token = attrs["token"] || attrs[:token]
    env = attrs["env"] || attrs[:env] || "sandbox"

    params = %{
      user_id: user_id,
      platform: platform,
      token: token,
      env: env,
      disabled_at: nil
    }

    case Repo.get_by(DeviceToken, token: String.trim(to_string(token || ""))) do
      nil ->
        %DeviceToken{}
        |> DeviceToken.changeset(params)
        |> Repo.insert()

      %DeviceToken{} = existing ->
        existing
        |> DeviceToken.changeset(params)
        |> Repo.update()
    end
  end

  def upsert(_, _), do: {:error, :invalid}

  @doc """
  Soft-disable a token for the given user. Never hard-deletes.
  Returns {:ok, row} | {:error, :not_found} | {:error, :forbidden}.
  """
  def disable(user_id, token) when is_binary(user_id) and is_binary(token) do
    token = String.trim(token)

    case Repo.get_by(DeviceToken, token: token) do
      nil ->
        {:error, :not_found}

      %DeviceToken{user_id: ^user_id, disabled_at: %DateTime{}} = row ->
        {:ok, row}

      %DeviceToken{user_id: ^user_id} = row ->
        row
        |> DeviceToken.changeset(%{disabled_at: DateTime.utc_now()})
        |> Repo.update()

      %DeviceToken{} ->
        {:error, :forbidden}
    end
  end

  def disable(_, _), do: {:error, :invalid}

  @doc "Active (non-disabled) tokens for a user."
  def list_active(user_id) when is_binary(user_id) do
    from(t in DeviceToken,
      where: t.user_id == ^user_id and is_nil(t.disabled_at),
      order_by: [desc: t.updated_at]
    )
    |> Repo.all()
  end

  def list_active(_), do: []
end
