defmodule OpalCore.Push.DeviceToken do
  @moduledoc """
  Registered device push token (APNs / FCM). Soft-disable via disabled_at —
  never hard-delete (audit trail).
  """

  use Ecto.Schema
  import Ecto.Changeset

  @platforms ~w(ios android)
  @envs ~w(sandbox production)

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "device_push_tokens" do
    field :user_id, :string
    field :platform, :string
    field :token, :string
    field :env, :string, default: "sandbox"
    field :disabled_at, :utc_datetime_usec

    timestamps(type: :utc_datetime_usec)
  end

  def changeset(row, attrs) do
    row
    |> cast(attrs, [:user_id, :platform, :token, :env, :disabled_at])
    |> validate_required([:user_id, :platform, :token, :env])
    |> update_change(:platform, &normalize_lower/1)
    |> update_change(:env, &normalize_lower/1)
    |> update_change(:token, &trim_bin/1)
    |> validate_inclusion(:platform, @platforms)
    |> validate_inclusion(:env, @envs)
    |> validate_length(:token, min: 8, max: 512)
    |> unique_constraint(:token, name: :device_push_tokens_token_uniq)
  end

  def to_contract(%__MODULE__{} = d) do
    %{
      "id" => d.id,
      "user_id" => d.user_id,
      "platform" => d.platform,
      "token" => d.token,
      "env" => d.env,
      "disabled_at" =>
        if(d.disabled_at, do: DateTime.to_iso8601(d.disabled_at), else: nil),
      "active" => is_nil(d.disabled_at)
    }
  end

  defp normalize_lower(nil), do: nil
  defp normalize_lower(v) when is_binary(v), do: v |> String.trim() |> String.downcase()
  defp normalize_lower(v), do: v

  defp trim_bin(nil), do: nil
  defp trim_bin(v) when is_binary(v), do: String.trim(v)
  defp trim_bin(v), do: v
end
