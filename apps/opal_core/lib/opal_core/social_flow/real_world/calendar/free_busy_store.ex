defmodule OpalCore.SocialFlow.RealWorld.Calendar.FreeBusyStore do
  @moduledoc """
  In-process free/busy adapter for tests and local truthfulness.

  Does **not** claim live Google/Apple sync. Stores only busy intervals —
  never event titles.
  """

  @behaviour OpalCore.SocialFlow.RealWorld.Calendar.Connector

  use Agent

  def start_link(_opts \\ []) do
    Agent.start_link(fn -> %{} end, name: __MODULE__)
  end

  def ensure_started do
    case Process.whereis(__MODULE__) do
      nil ->
        case start_link([]) do
          {:ok, _} -> :ok
          {:error, {:already_started, _}} -> :ok
          other -> other
        end

      _ ->
        :ok
    end
  end

  @doc "Grant free/busy permission for a user (test helper)."
  def grant_permission(user_id, opts \\ []) when is_binary(user_id) do
    ensure_started()

    Agent.update(__MODULE__, fn state ->
      entry = Map.get(state, user_id, default_entry())

      Map.put(state, user_id, %{
        entry
        | granted: true,
          calendar_id: Keyword.get(opts, :calendar_id, "local"),
          observed_at: DateTime.utc_now() |> DateTime.truncate(:microsecond)
      })
    end)
  end

  def revoke_permission(user_id) when is_binary(user_id) do
    ensure_started()

    Agent.update(__MODULE__, fn state ->
      entry = Map.get(state, user_id, default_entry())
      Map.put(state, user_id, %{entry | granted: false, busy: []})
    end)
  end

  @doc "Replace busy blocks (title-free only)."
  def put_busy(user_id, blocks) when is_binary(user_id) and is_list(blocks) do
    ensure_started()

    clean =
      Enum.map(blocks, fn b ->
        b = stringify(b)

        %{
          "start_at" => b["start_at"],
          "end_at" => b["end_at"],
          "busy" => true,
          "no_event_titles" => true,
          "calendar_id" => b["calendar_id"] || "local"
        }
      end)

    Agent.update(__MODULE__, fn state ->
      entry = Map.get(state, user_id, default_entry())

      Map.put(state, user_id, %{
        entry
        | busy: clean,
          observed_at: DateTime.utc_now() |> DateTime.truncate(:microsecond)
      })
    end)
  end

  def reset do
    # Async tests may race with Agent lifecycle; restart then clear.
    ensure_started()

    try do
      Agent.update(__MODULE__, fn _ -> %{} end)
    catch
      :exit, _ ->
        # Process died between ensure and update (async suite race)
        case Process.whereis(__MODULE__) do
          nil -> start_link([])
          _ -> :ok
        end

        ensure_started()
        Agent.update(__MODULE__, fn _ -> %{} end)
    end

    :ok
  end

  @impl true
  def free_busy(user_id, _range) do
    ensure_started()

    case Agent.get(__MODULE__, &Map.get(&1, user_id)) do
      nil -> {:error, :unavailable}
      %{granted: false} -> {:error, :permission_denied}
      %{busy: busy} -> {:ok, busy}
    end
  end

  @impl true
  def calendar_permission(user_id) do
    ensure_started()

    case Agent.get(__MODULE__, &Map.get(&1, user_id)) do
      nil ->
        {:ok, %{"granted" => false, "live_sync" => false, "provider" => "local_store"}}

      %{granted: granted} = e ->
        {:ok,
         %{
           "granted" => granted,
           "live_sync" => false,
           "provider" => "local_store",
           "calendar_id" => e.calendar_id,
           "exposes_event_titles" => false
         }}
    end
  end

  @impl true
  def calendar_freshness(user_id) do
    ensure_started()

    case Agent.get(__MODULE__, &Map.get(&1, user_id)) do
      nil ->
        {:ok, %{"status" => "unknown", "live_sync" => false}}

      %{observed_at: at, granted: true} ->
        {:ok,
         %{
           "status" => "live",
           "observed_at" => at,
           "live_sync" => false
         }}

      _ ->
        {:ok, %{"status" => "permission_denied", "live_sync" => false}}
    end
  end

  defp default_entry do
    %{
      granted: false,
      busy: [],
      calendar_id: "local",
      observed_at: nil
    }
  end

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
