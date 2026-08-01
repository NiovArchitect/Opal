defmodule OpalCore.Contracts do
  @moduledoc """
  Contract loading and validation for Slice 1.

  Validates against the Opal 0.1.0 contract rules. Full Draft 2020-12 engines
  are not required; rules mirror packages/contracts schemas.
  """

  @schema_version "0.1.0"
  @max_context_items 5
  @max_context_chars 2000
  @uuid_re ~r/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/

  @capabilities ~w(
    ai_echo
    safe_drafting
    transcription
    translation
    commitment_candidate_extraction
    social_flow_plan_extract
    social_flow_follow_through_extract
    social_flow_memory_candidate_extract
    social_flow_relevance_rank
    social_flow_turn_classify
    social_flow_open_loop_detect
    social_flow_pre_send_check
    social_flow_ambiguity_detect
    social_flow_repair_suggest
    social_flow_decision_summary
    social_flow_group_intent_extract
    social_flow_group_option_cluster
    social_flow_availability_intersect
    social_flow_discovery_rank
    social_flow_live_late_extract
    social_flow_live_follow_up_extract
    social_flow_continuity_extract
  )

  def schema_version, do: @schema_version

  def contracts_path do
    Application.get_env(:opal_core, :contracts_path) ||
      Path.expand("../../../../packages/contracts", __DIR__)
  end

  def load_schema(name) do
    path = Path.join([contracts_path(), "schemas", "#{name}.schema.json"])
    path |> File.read!() |> Jason.decode!()
  end

  def load_example(name) do
    path = Path.join([contracts_path(), "examples", "#{name}.json"])
    path |> File.read!() |> Jason.decode!()
  end

  def validate_message(map) when is_map(map) do
    with :ok <- require_fields(map, message_required()),
         :ok <- reject_unknown(map, message_allowed()),
         :ok <- require_schema_version(map),
         :ok <- require_uuid(map, "id"),
         :ok <- require_uuid(map, "conversation_id"),
         :ok <- require_uuid(map, "sender_user_id"),
         :ok <- require_enum(map, "message_type", ~w(text voice_transcript)),
         :ok <- require_enum(map, "delivery_state", ~w(accepted persisted delivered failed)),
         :ok <-
           require_enum(
             map,
             "ai_processing_state",
             ~w(not_requested consent_required queued processing completed refused failed)
           ),
         :ok <- require_string(map, "client_message_id", 1, 128),
         :ok <- require_string(map, "body", 0, 8000),
         :ok <- require_iso8601(map, "created_at"),
         :ok <- require_positive_int(map, "server_seq") do
      :ok
    end
  end

  def validate_ai_job_request(map) when is_map(map) do
    with :ok <- require_fields(map, ai_request_required()),
         :ok <- reject_unknown(map, ai_request_allowed()),
         :ok <- require_schema_version(map),
         :ok <- require_uuid(map, "job_id"),
         :ok <- require_uuid(map, "requester_user_id"),
         :ok <- require_uuid(map, "subject_user_id"),
         :ok <- require_uuid(map, "conversation_id"),
         :ok <- require_uuid(map, "message_id"),
         :ok <- require_uuid(map, "consent_proof_id"),
         :ok <- require_enum(map, "capability", @capabilities),
         :ok <- require_string(map, "idempotency_key", 8, 128),
         :ok <- require_string(map, "trace_id", 8, 128),
         :ok <- require_iso8601(map, "requested_at"),
         :ok <- require_iso8601(map, "deadline_at"),
         :ok <- validate_context(map["context"]) do
      :ok
    end
  end

  def validate_ai_job_response(map) when is_map(map) do
    with :ok <- require_fields(map, ai_response_required()),
         :ok <- reject_unknown(map, ai_response_allowed()),
         :ok <- require_schema_version(map),
         :ok <- require_uuid(map, "job_id"),
         :ok <- require_enum(map, "capability", @capabilities),
         :ok <- require_enum(map, "status", ~w(completed refused failed)),
         :ok <- require_string(map, "idempotency_key", 8, 128),
         :ok <- require_string(map, "trace_id", 8, 128),
         :ok <- require_iso8601(map, "completed_at"),
         :ok <- validate_model_metadata(map["model_metadata"]),
         :ok <- validate_safety(map["safety"]),
         :ok <- validate_output(map["output"], map["status"]) do
      :ok
    end
  end

  def error_envelope(error_code, message, opts \\ []) do
    %{
      "schema_version" => @schema_version,
      "error_code" => to_string(error_code),
      "message" => message,
      "retryable" => Keyword.get(opts, :retryable, false),
      "details" => Keyword.get(opts, :details),
      "trace_id" => Keyword.get(opts, :trace_id, "trace-unknown-0000"),
      "occurred_at" =>
        DateTime.utc_now() |> DateTime.truncate(:microsecond) |> DateTime.to_iso8601()
    }
  end

  def event_envelope(event_type, payload, trace_id) do
    %{
      "schema_version" => @schema_version,
      "event_id" => Ecto.UUID.generate(),
      "event_type" => event_type,
      "occurred_at" =>
        DateTime.utc_now() |> DateTime.truncate(:microsecond) |> DateTime.to_iso8601(),
      "trace_id" => trace_id,
      "payload" => payload
    }
  end

  # --- private validators ---

  defp message_required do
    ~w(schema_version id client_message_id conversation_id sender_user_id message_type body created_at server_seq delivery_state ai_processing_state)
  end

  defp message_allowed, do: message_required() ++ ~w(source_language)

  defp ai_request_required do
    ~w(schema_version job_id idempotency_key capability requester_user_id subject_user_id conversation_id message_id consent_proof_id context requested_at deadline_at trace_id)
  end

  defp ai_request_allowed, do: ai_request_required()

  defp ai_response_required do
    ~w(schema_version job_id idempotency_key capability status output model_metadata safety completed_at trace_id)
  end

  defp ai_response_allowed, do: ai_response_required()

  defp require_fields(map, fields) do
    missing = Enum.reject(fields, &Map.has_key?(map, &1))

    if missing == [],
      do: :ok,
      else: {:error, {:missing_fields, missing}}
  end

  defp reject_unknown(map, allowed) do
    unknown = Map.keys(map) -- allowed

    if unknown == [],
      do: :ok,
      else: {:error, {:undeclared_fields, unknown}}
  end

  defp require_schema_version(%{"schema_version" => @schema_version}), do: :ok

  defp require_schema_version(%{"schema_version" => other}),
    do: {:error, {:unsupported_schema_version, other}}

  defp require_schema_version(_), do: {:error, :missing_schema_version}

  defp require_uuid(map, key) do
    case map[key] do
      value when is_binary(value) ->
        if Regex.match?(@uuid_re, value), do: :ok, else: {:error, {:invalid_uuid, key}}

      _ ->
        {:error, {:invalid_uuid, key}}
    end
  end

  defp require_enum(map, key, allowed) do
    if map[key] in allowed, do: :ok, else: {:error, {:invalid_enum, key, map[key]}}
  end

  defp require_string(map, key, min, max) do
    case map[key] do
      value when is_binary(value) and byte_size(value) >= min and byte_size(value) <= max ->
        :ok

      _ ->
        {:error, {:invalid_string, key}}
    end
  end

  defp require_iso8601(map, key) do
    case map[key] do
      value when is_binary(value) ->
        case DateTime.from_iso8601(value) do
          {:ok, _, _} -> :ok
          _ -> {:error, {:invalid_datetime, key}}
        end

      _ ->
        {:error, {:invalid_datetime, key}}
    end
  end

  defp require_positive_int(map, key) do
    case map[key] do
      n when is_integer(n) and n >= 1 -> :ok
      _ -> {:error, {:invalid_integer, key}}
    end
  end

  defp validate_context(context) when is_list(context) do
    cond do
      length(context) > @max_context_items ->
        {:error, :context_too_many_items}

      true ->
        total =
          Enum.reduce(context, 0, fn item, acc ->
            acc + String.length(to_string(item["value"] || ""))
          end)

        cond do
          total > @max_context_chars ->
            {:error, :context_too_large}

          Enum.any?(context, &(not valid_context_item?(&1))) ->
            {:error, :invalid_context_item}

          true ->
            :ok
        end
    end
  end

  defp validate_context(_), do: {:error, :invalid_context}

  defp valid_context_item?(%{"type" => type, "value" => value, "source_id" => source_id})
       when type in ~w(message_body message_note synthetic_prompt) and is_binary(value) and
              is_binary(source_id) and byte_size(value) <= 2000 and byte_size(source_id) <= 128 and
              map_size(%{"type" => type, "value" => value, "source_id" => source_id}) == 3 do
    true
  end

  defp valid_context_item?(%{} = item) do
    allowed = ~w(type value source_id)

    Map.keys(item) -- allowed == [] and
      match?(%{"type" => _, "value" => _, "source_id" => _}, item) and
      item["type"] in ~w(message_body message_note synthetic_prompt) and is_binary(item["value"]) and
      is_binary(item["source_id"])
  end

  defp valid_context_item?(_), do: false

  defp validate_model_metadata(
         %{
           "provider" => "local",
           "model" => model,
           "model_version" => "0.1.0"
         } = meta
       )
       when model in ~w(
              deterministic-echo
              deterministic-plan-extract
              deterministic-relevance
              deterministic-memory-extract
              deterministic-conversation-meaning
              deterministic-group-intent
            ) do
    if Map.keys(meta) -- ~w(provider model model_version) == [],
      do: :ok,
      else: {:error, :invalid_model_metadata}
  end

  defp validate_model_metadata(_), do: {:error, :invalid_model_metadata}

  defp validate_safety(%{"decision" => decision, "reasons" => reasons} = safety)
       when decision in ~w(allowed refused) and is_list(reasons) do
    if Map.keys(safety) -- ~w(decision reasons) == [],
      do: :ok,
      else: {:error, :invalid_safety}
  end

  defp validate_safety(_), do: {:error, :invalid_safety}

  defp validate_output(nil, status) when status in ~w(refused failed), do: :ok

  defp validate_output(%{} = output, "completed") do
    echo_keys = ~w(normalized_text character_count context_item_count)

    plan_keys =
      ~w(result_type candidate evidence uncertainty rankings memory_candidate context_note turns open_loops pre_send ambiguity repair decision_summary group_intent availability_intersection discovery_ranking live_late_candidate live_follow_ups continuity_candidates normalized_text character_count context_item_count)

    cond do
      Map.has_key?(output, "result_type") ->
        allowed = plan_keys
        unknown = Map.keys(output) -- allowed

        if unknown == [] and
             output["result_type"] in ~w(
               plan_candidate
               no_plan
               commitment_candidate
               revision_candidate
               memory_candidate
               no_memory
               relevance_ranking
               turn_classification
               open_loops
               pre_send_check
               ambiguity_candidate
               repair_suggestion
               decision_summary
               no_insight
               group_intent
               group_options
               availability_intersection
               discovery_ranking
               live_late_candidate
               live_follow_ups
               continuity_candidates
             ) do
          :ok
        else
          {:error, :invalid_output}
        end

      true ->
        with true <- Map.keys(output) -- echo_keys == [],
             true <- is_binary(output["normalized_text"] || ""),
             true <- is_integer(output["character_count"] || 0),
             true <- is_integer(output["context_item_count"] || 0) do
          :ok
        else
          _ -> {:error, :invalid_output}
        end
    end
  end

  defp validate_output(%{} = output, status) when status in ~w(refused failed) do
    if map_size(output) == 0 or is_map(output), do: :ok, else: {:error, :invalid_output}
  end

  defp validate_output(_, _), do: {:error, :invalid_output}
end
