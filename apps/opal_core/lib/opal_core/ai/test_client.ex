defmodule OpalCore.AI.TestClient do
  @moduledoc """
  Configurable AI client for tests. Tracks call count for consent-isolation proofs.
  """

  use GenServer

  def start_link(opts \\ []) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end

  def execute(request) do
    GenServer.call(__MODULE__, {:execute, request})
  end

  def reset do
    GenServer.call(__MODULE__, :reset)
  end

  def call_count do
    GenServer.call(__MODULE__, :call_count)
  end

  def last_request do
    GenServer.call(__MODULE__, :last_request)
  end

  def set_mode(mode) do
    GenServer.call(__MODULE__, {:set_mode, mode})
  end

  def set_handler(fun) when is_function(fun, 1) do
    GenServer.call(__MODULE__, {:set_handler, fun})
  end

  @impl true
  def init(_opts) do
    {:ok, %{mode: :echo, call_count: 0, last_request: nil, handler: nil}}
  end

  @impl true
  def handle_call(:reset, _from, state) do
    {:reply, :ok, %{state | mode: :echo, call_count: 0, last_request: nil, handler: nil}}
  end

  def handle_call(:call_count, _from, state), do: {:reply, state.call_count, state}
  def handle_call(:last_request, _from, state), do: {:reply, state.last_request, state}

  def handle_call({:set_mode, mode}, _from, state) do
    {:reply, :ok, %{state | mode: mode, handler: nil}}
  end

  def handle_call({:set_handler, fun}, _from, state) do
    {:reply, :ok, %{state | handler: fun, mode: :handler}}
  end

  def handle_call({:execute, request}, _from, state) do
    state = %{state | call_count: state.call_count + 1, last_request: request}

    reply =
      cond do
        is_function(state.handler, 1) ->
          state.handler.(request)

        state.mode == :echo ->
          {:ok, echo_response(request)}

        state.mode == :unavailable ->
          {:error, :unavailable}

        state.mode == :timeout ->
          {:error, :timeout}

        state.mode == :malformed_json_map ->
          {:ok, %{"not" => "a valid response"}}

        state.mode == :wrong_job_id ->
          {:ok, echo_response(request) |> Map.put("job_id", Ecto.UUID.generate())}

        state.mode == :wrong_trace_id ->
          {:ok, echo_response(request) |> Map.put("trace_id", "trace-wrong-trace-id-xx")}

        state.mode == :unsupported_version ->
          {:ok, echo_response(request) |> Map.put("schema_version", "9.9.9")}

        state.mode == :refuse_marker ->
          {:ok, refuse_response(request, ["OPAL_TEST_FORCE_REFUSAL"])}

        true ->
          {:ok, echo_response(request)}
      end

    {:reply, reply, state}
  end

  defp echo_response(request) do
    values =
      (request["context"] || [])
      |> Enum.map(& &1["value"])
      |> Enum.join(" ")

    text = String.trim(values)

    if String.contains?(text, "OPAL_TEST_FORCE_REFUSAL") do
      refuse_response(request, ["OPAL_TEST_FORCE_REFUSAL"])
    else
      %{
        "schema_version" => "0.1.0",
        "job_id" => request["job_id"],
        "idempotency_key" => request["idempotency_key"],
        "capability" => request["capability"],
        "status" => "completed",
        "output" => %{
          "normalized_text" => text,
          "character_count" => String.length(text),
          "context_item_count" => length(request["context"] || [])
        },
        "model_metadata" => %{
          "provider" => "local",
          "model" => "deterministic-echo",
          "model_version" => "0.1.0"
        },
        "safety" => %{"decision" => "allowed", "reasons" => []},
        "completed_at" => DateTime.utc_now() |> DateTime.to_iso8601(),
        "trace_id" => request["trace_id"]
      }
    end
  end

  defp refuse_response(request, reasons) do
    %{
      "schema_version" => "0.1.0",
      "job_id" => request["job_id"],
      "idempotency_key" => request["idempotency_key"],
      "capability" => request["capability"],
      "status" => "refused",
      "output" => nil,
      "model_metadata" => %{
        "provider" => "local",
        "model" => "deterministic-echo",
        "model_version" => "0.1.0"
      },
      "safety" => %{"decision" => "refused", "reasons" => reasons},
      "completed_at" => DateTime.utc_now() |> DateTime.to_iso8601(),
      "trace_id" => request["trace_id"]
    }
  end
end
