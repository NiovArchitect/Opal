defmodule OpalCore.SocialFlow.ProviderEconomicEventStore do
  @moduledoc """
  Process-local durable audit store for provider economic events (Pass 22).

  Responsibilities:
  - idempotent insert by provider + economic_event_id
  - ordered history per transaction
  - reconstructible audit without relying on logs alone

  Not an accounting ledger. Not a wallet.
  """

  use Agent

  def start_link(opts \\ []) do
    name = Keyword.get(opts, :name, __MODULE__)
    Agent.start_link(fn -> %{by_event: %{}, by_tx: %{}} end, name: name)
  end

  def ensure_started do
    case Process.whereis(__MODULE__) do
      nil ->
        case start_link() do
          {:ok, _} -> :ok
          {:error, {:already_started, _}} -> :ok
          other -> other
        end

      _pid ->
        :ok
    end
  end

  def reset! do
    ensure_started()
    Agent.update(__MODULE__, fn _ -> %{by_event: %{}, by_tx: %{}} end)
  end

  @doc """
  Insert event. Duplicate provider+economic_event_id returns existing (:idempotent).
  """
  def put(event) when is_map(event) do
    ensure_started()
    e = stringify(event)
    key = event_key(e)

    Agent.get_and_update(__MODULE__, fn state ->
      case Map.get(state.by_event, key) do
        %{} = existing ->
          {{:ok, existing, :idempotent}, state}

        nil ->
          stored =
            e
            |> Map.put("stored_at", DateTime.utc_now() |> DateTime.truncate(:microsecond))
            |> Map.put("event_key", key)

          tx = e["transaction_id"] || e["provider_transaction_id"] || e["execution_id"]
          history = Map.get(state.by_tx, tx, []) ++ [stored]

          new_state = %{
            by_event: Map.put(state.by_event, key, stored),
            by_tx: Map.put(state.by_tx, tx, history)
          }

          {{:ok, stored, :created}, new_state}
      end
    end)
  end

  def put(_), do: {:error, :invalid}

  def get(provider, economic_event_id) when is_binary(provider) and is_binary(economic_event_id) do
    ensure_started()
    key = "#{provider}:#{economic_event_id}"
    Agent.get(__MODULE__, fn s -> Map.get(s.by_event, key) end)
  end

  def history(transaction_id) when is_binary(transaction_id) do
    ensure_started()
    Agent.get(__MODULE__, fn s -> Map.get(s.by_tx, transaction_id, []) end)
  end

  def history(_), do: []

  def all_events do
    ensure_started()
    Agent.get(__MODULE__, fn s -> Map.values(s.by_event) end)
  end

  defp event_key(e) do
    provider = e["provider"] || "unknown"
    id = e["economic_event_id"] || e["event_id"] || Ecto.UUID.generate()
    "#{provider}:#{id}"
  end

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
