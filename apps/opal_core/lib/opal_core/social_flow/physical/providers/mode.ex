defmodule OpalCore.SocialFlow.Physical.Providers.Mode do
  @moduledoc """
  Truthful provider runtime mode.

  DISABLED | SYNTHETIC | CONNECTED | DEGRADED | ERROR

  Never silently present synthetic results as real.
  """

  @modes ~w(disabled synthetic connected degraded error)

  def modes, do: @modes

  @doc """
  Resolve mode for a provider family (:places | :events).

  Prefer explicit Application config; then env keys; default synthetic.
  """
  def resolve(family) when family in [:places, :events] do
    case configured_mode(family) do
      mode when mode in @modes ->
        enrich(mode, family)

      _ ->
        auto_mode(family) |> enrich(family)
    end
  end

  def resolve(_), do: %{"mode" => "disabled", "real" => false, "synthetic" => false}

  @doc "True when live network calls may run."
  def connected?(family) do
    resolve(family)["mode"] == "connected"
  end

  @doc "True when fixture/synthetic inventory is the intentional source."
  def synthetic?(family) do
    resolve(family)["mode"] == "synthetic"
  end

  defp configured_mode(:places) do
    case Application.get_env(:opal_core, :place_provider_mode) ||
           System.get_env("OPAL_PLACE_PROVIDER_MODE") do
      m when is_binary(m) -> String.downcase(m)
      m when is_atom(m) and not is_nil(m) -> Atom.to_string(m)
      _ -> nil
    end
  end

  defp configured_mode(:events) do
    case Application.get_env(:opal_core, :event_provider_mode) ||
           System.get_env("OPAL_EVENT_PROVIDER_MODE") do
      m when is_binary(m) -> String.downcase(m)
      m when is_atom(m) and not is_nil(m) -> Atom.to_string(m)
      _ -> nil
    end
  end

  defp auto_mode(:places) do
    if places_key() in [nil, ""], do: "synthetic", else: "connected"
  end

  defp auto_mode(:events) do
    if events_key() in [nil, ""], do: "synthetic", else: "connected"
  end

  defp enrich(mode, family) do
    %{
      "mode" => mode,
      "family" => to_string(family),
      "real" => mode == "connected",
      "synthetic" => mode == "synthetic",
      "credential_present" => credential_present?(family),
      "silent_synthetic_fallback_forbidden" => mode in ~w(connected degraded error),
      "provider_is_not_authority" => true
    }
  end

  defp credential_present?(:places), do: places_key() not in [nil, ""]
  defp credential_present?(:events), do: events_key() not in [nil, ""]

  def places_key do
    Application.get_env(:opal_core, :google_places_api_key) ||
      System.get_env("GOOGLE_PLACES_API_KEY") ||
      System.get_env("OPAL_GOOGLE_PLACES_API_KEY")
  end

  def events_key do
    Application.get_env(:opal_core, :ticketmaster_api_key) ||
      System.get_env("TICKETMASTER_API_KEY") ||
      System.get_env("OPAL_TICKETMASTER_API_KEY")
  end
end
