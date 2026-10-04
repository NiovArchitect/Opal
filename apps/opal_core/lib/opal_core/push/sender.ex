defmodule OpalCore.Push.Sender do
  @moduledoc """
  Push sender behaviour + adapter resolution.

  Default is Synthetic (honest — never claims delivery). APNs/FCM adapters
  are selected only when credentials are present; otherwise Synthetic + warn.
  """

  @callback send(token :: String.t(), payload :: map(), opts :: keyword()) ::
              {:ok, :synthetic | :sent} | {:error, term()}

  alias OpalCore.Push.Adapters.APNS
  alias OpalCore.Push.Adapters.FCM
  alias OpalCore.Push.Adapters.Synthetic

  @doc """
  Send a push via the resolved adapter for the given platform.

  opts:
  - `:user_id` — for honest synthetic logging
  - `:platform` — `"ios"` | `"android"`
  - `:env` — `"sandbox"` | `"production"`
  - `:adapter` — override module (tests)
  """
  def send(token, payload, opts \\ []) when is_binary(token) and is_map(payload) do
    adapter = Keyword.get(opts, :adapter) || resolve_adapter(opts)
    adapter.send(token, payload, opts)
  end

  @doc """
  Resolve adapter for platform. Missing credentials → Synthetic with warn.
  """
  def resolve_adapter(opts \\ []) do
    platform = opts[:platform] || opts["platform"] || "ios"
    forced = Application.get_env(:opal_core, :push_adapter)

    cond do
      is_atom(forced) and not is_nil(forced) and forced != :auto ->
        module_for(forced)

      platform in ["ios", :ios] ->
        if APNS.credentials_present?() do
          APNS
        else
          warn_fallback("APNs", platform)
          Synthetic
        end

      platform in ["android", :android] ->
        if FCM.credentials_present?() do
          FCM
        else
          warn_fallback("FCM", platform)
          Synthetic
        end

      true ->
        warn_fallback("unknown platform", platform)
        Synthetic
    end
  end

  defp module_for(:synthetic), do: Synthetic
  defp module_for(:apns), do: APNS
  defp module_for(:fcm), do: FCM
  defp module_for(mod) when is_atom(mod), do: mod

  defp warn_fallback(provider, platform) do
    require Logger

    Logger.warning(
      "push.credentials_absent provider=#{provider} platform=#{inspect(platform)} falling_back=synthetic"
    )
  end
end
