defmodule OpalCore.SocialFlow.RealWorld.Calendar.CompositeAdapter do
  @moduledoc """
  Routes calendar free/busy to the best available adapter.

  Order:
  1. Google if connected for user
  2. FreeBusyStore (local / test)
  3. Manual fallback is handled by AvailabilitySufficiency (no windows)

  Provider fact never becomes social authority by itself.
  """

  @behaviour OpalCore.SocialFlow.RealWorld.Calendar.Connector

  alias OpalCore.SocialFlow.RealWorld.Calendar.FreeBusyStore
  alias OpalCore.SocialFlow.RealWorld.Calendar.GoogleAdapter
  alias OpalCore.SocialFlow.RealWorld.ProviderConnections

  @impl true
  def free_busy(user_id, range) do
    case choose(user_id) do
      :google ->
        case GoogleAdapter.free_busy(user_id, range) do
          {:ok, _} = ok -> ok
          {:error, :token_expired} = err -> err
          {:error, :permission_denied} = err -> err
          {:error, _} -> FreeBusyStore.free_busy(user_id, range)
        end

      :local ->
        FreeBusyStore.free_busy(user_id, range)
    end
  end

  @impl true
  def calendar_permission(user_id) do
    case choose(user_id) do
      :google -> GoogleAdapter.calendar_permission(user_id)
      :local -> FreeBusyStore.calendar_permission(user_id)
    end
  end

  @impl true
  def calendar_freshness(user_id) do
    case choose(user_id) do
      :google -> GoogleAdapter.calendar_freshness(user_id)
      :local -> FreeBusyStore.calendar_freshness(user_id)
    end
  end

  defp choose(user_id) do
    if ProviderConnections.connected?(user_id, "google_calendar") do
      :google
    else
      :local
    end
  end
end
