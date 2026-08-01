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
          {:ok, capability_response(request)}

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
          {:ok, capability_response(request)}
      end

    {:reply, reply, state}
  end

  defp capability_response(request) do
    if request["capability"] == "social_flow_plan_extract" do
      plan_extract_response(request)
    else
      echo_response(request)
    end
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

  defp plan_extract_response(request) do
    values =
      (request["context"] || [])
      |> Enum.map(& &1["value"])
      |> Enum.join(" ")

    text = String.downcase(String.trim(values))

    if String.contains?(text, "opal_test_force_refusal") do
      refuse_response(request, ["OPAL_TEST_FORCE_REFUSAL"])
    else
      output = deterministic_plan_output(text, request["context"] || [])

      %{
        "schema_version" => "0.1.0",
        "job_id" => request["job_id"],
        "idempotency_key" => request["idempotency_key"],
        "capability" => "social_flow_plan_extract",
        "status" => "completed",
        "output" => output,
        "model_metadata" => %{
          "provider" => "local",
          "model" => "deterministic-plan-extract",
          "model_version" => "0.1.0"
        },
        "safety" => %{"decision" => "allowed", "reasons" => []},
        "completed_at" => DateTime.utc_now() |> DateTime.to_iso8601(),
        "trace_id" => request["trace_id"]
      }
    end
  end

  defp deterministic_plan_output(text, context) do
    source =
      case context do
        [%{"source_id" => id} | _] -> id
        _ -> "unknown"
      end

    cond do
      String.contains?(text, "reservation") or String.contains?(text, "i'll book") or
          String.contains?(text, "i will book") ->
        %{
          "result_type" => "commitment_candidate",
          "candidate" => %{
            "activity" => nil,
            "participant_mentions" => [],
            "temporal_expressions" => [],
            "normalized_time_candidates" => [],
            "location_expression" => nil,
            "possible_commitments" => [
              %{"description" => "Make the reservation", "confidence" => 0.8}
            ],
            "revision_hint" => nil,
            "missing_information" => [],
            "confidence" => 0.8,
            "recommended_signal_copy" => "You offered to make the reservation."
          },
          "evidence" => [
            %{"source_id" => source, "field" => "possible_commitments", "snippet" => "reservation"}
          ],
          "uncertainty" => ["Commitment requires explicit user confirmation in Elixir"]
        }

      String.contains?(text, "move it") or String.contains?(text, "7:30") ->
        %{
          "result_type" => "revision_candidate",
          "candidate" => %{
            "activity" => "dinner",
            "participant_mentions" => [],
            "temporal_expressions" => ["7:30 PM"],
            "normalized_time_candidates" => [
              %{"label" => "7:30 PM", "iso_hint" => nil, "confidence" => 0.75}
            ],
            "location_expression" => nil,
            "possible_commitments" => [],
            "revision_hint" => %{
              "change_type" => "time_change",
              "proposed_label" => "7:30 PM",
              "confidence" => 0.75
            },
            "missing_information" => [],
            "confidence" => 0.75,
            "recommended_signal_copy" => "Proposed changing dinner to 7:30 PM."
          },
          "evidence" => [
            %{"source_id" => source, "field" => "revision_hint", "snippet" => "7:30"}
          ],
          "uncertainty" => ["Revision requires peer approval"]
        }

      String.contains?(text, "dinner") or String.contains?(text, "thursday") ->
        %{
          "result_type" => "plan_candidate",
          "candidate" => %{
            "activity" => "dinner",
            "participant_mentions" => [],
            "temporal_expressions" => ["next Thursday", "after 6:30"],
            "normalized_time_candidates" => [
              %{"label" => "Thursday after 6:30", "iso_hint" => nil, "confidence" => 0.72},
              %{"label" => "Thursday at 7:00 PM", "iso_hint" => nil, "confidence" => 0.55}
            ],
            "location_expression" => nil,
            "possible_commitments" => [],
            "revision_hint" => nil,
            "missing_information" => ["location"],
            "confidence" => 0.7,
            "recommended_signal_copy" => "Dinner next Thursday may be a plan."
          },
          "evidence" => [
            %{"source_id" => source, "field" => "activity", "snippet" => "dinner"}
          ],
          "uncertainty" => [
            "This is a possible plan, not a binding event",
            "Python never creates authoritative agreement"
          ]
        }

      true ->
        %{
          "result_type" => "no_plan",
          "candidate" => nil,
          "evidence" => [],
          "uncertainty" => ["No clear coordination language detected"]
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
