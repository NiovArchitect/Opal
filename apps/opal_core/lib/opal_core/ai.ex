defmodule OpalCore.AI do
  @moduledoc """
  Consent-gated durable AI job orchestration.

  Elixir owns consent, job state, response acceptance, and PubSub.
  Python never authorizes.
  """

  import Ecto.Query

  alias OpalCore.{Consent, Contracts, Messages, Repo, SocialFlow}
  alias OpalCore.AI.{AiJob, AiJobResult, ProcessJobWorker}
  alias OpalCore.Messaging.Message

  @executable_capabilities ~w(
    ai_echo
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
  )

  @doc """
  Requests AI processing for a message under authoritative consent.
  """
  def request_job(attrs) do
    message_id = fetch!(attrs, :message_id)
    requester_user_id = fetch!(attrs, :requester_user_id)
    capability = fetch!(attrs, :capability)
    consent_proof_id = fetch!(attrs, :consent_proof_id)
    idempotency_key = fetch!(attrs, :idempotency_key)
    trace_id = Map.get(attrs, :trace_id) || Map.get(attrs, "trace_id") || generate_trace_id()

    with {:ok, message} <- fetch_message_for_user(message_id, requester_user_id),
         :ok <- ensure_capability_executable(capability),
         {:ok, _proof} <-
           Consent.validate_for_job(%{
             consent_proof_id: consent_proof_id,
             capability: capability,
             user_id: requester_user_id,
             conversation_id: message.conversation_id
           }),
         {:ok, job, created?} <-
           get_or_create_job(%{
             message: message,
             requester_user_id: requester_user_id,
             capability: capability,
             consent_proof_id: consent_proof_id,
             idempotency_key: idempotency_key,
             trace_id: trace_id
           }) do
      if created? do
        :ok = Messages.update_ai_state(message, "queued") |> ignore_update()
        {:ok, _job} = enqueue(job)
      end

      {:ok, reload_job(job.id), if(created?, do: :created, else: :idempotent)}
    else
      {:error, _reason} = err ->
        # Consent/auth failures never reach Python.
        err
    end
  end

  def get_job(id), do: Repo.get(AiJob, id) |> maybe_preload()

  def get_job_for_user(id, user_id) do
    from(j in AiJob,
      where: j.id == ^id and j.requester_user_id == ^user_id,
      preload: [:result]
    )
    |> Repo.one()
  end

  def process_job(%AiJob{} = job) do
    job = reload_job(job.id)

    cond do
      job.status in AiJob.terminal_statuses() ->
        {:ok, job}

      true ->
        do_process(job)
    end
  end

  def job_to_api(%AiJob{} = job) do
    %{
      "id" => job.id,
      "idempotency_key" => job.idempotency_key,
      "capability" => job.capability,
      "status" => job.status,
      "requester_user_id" => job.requester_user_id,
      "conversation_id" => job.conversation_id,
      "message_id" => job.message_id,
      "consent_proof_id" => job.consent_proof_id,
      "trace_id" => job.trace_id,
      "error_code" => job.error_code,
      "failure_reason" => job.failure_reason,
      "result" => result_to_api(job.result),
      "created_at" => datetime(job.inserted_at),
      "finished_at" => datetime(job.finished_at)
    }
  end

  defp result_to_api(nil), do: nil

  defp result_to_api(%AiJobResult{} = result) do
    %{
      "status" => result.status,
      "output" => result.output,
      "model_metadata" => result.model_metadata,
      "safety" => result.safety,
      "completed_at" => datetime(result.completed_at)
    }
  end

  defp do_process(%AiJob{} = job) do
    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

    {:ok, job} =
      job
      |> AiJob.transition_changeset(%{status: "processing", started_at: now})
      |> Repo.update()

    :ok = set_message_state(job, "processing")

    message = Messages.get_message!(job.message_id)
    request = build_request(job, message)

    case Contracts.validate_ai_job_request(request) do
      :ok ->
        job =
          job
          |> AiJob.transition_changeset(%{request_payload: request})
          |> Repo.update!()

        case client().execute(request) do
          {:ok, response} ->
            accept_response(job, response)

          {:error, :timeout} ->
            fail_job(job, "timeout", "AI worker timed out", retryable: true)

          {:error, :unavailable} ->
            fail_job(job, "service_unavailable", "AI worker unavailable", retryable: true)

          {:error, reason} ->
            fail_job(job, "client_error", inspect(reason), retryable: true)
        end

      {:error, reason} ->
        fail_job(job, "invalid_request", inspect(reason), retryable: false)
    end
  end

  defp accept_response(%AiJob{} = job, response) when is_map(response) do
    response = stringify_keys(response)

    case Contracts.validate_ai_job_response(response) do
      {:error, reason} ->
        fail_job(job, "schema_invalid_response", inspect(reason), retryable: false)

      :ok ->
        cond do
          response["job_id"] != job.id ->
            fail_job(job, "job_id_mismatch", "Response job_id does not match", retryable: false)

          response["trace_id"] != job.trace_id ->
            fail_job(job, "trace_id_mismatch", "Response trace_id does not match",
              retryable: false
            )

          response["idempotency_key"] != job.idempotency_key ->
            fail_job(job, "idempotency_mismatch", "Response idempotency_key does not match",
              retryable: false
            )

          true ->
            persist_terminal(job, response)
        end
    end
  end

  defp persist_terminal(%AiJob{} = job, response) do
    status = response["status"]

    now =
      parse_dt(response["completed_at"]) || DateTime.utc_now() |> DateTime.truncate(:microsecond)

    Repo.transaction(fn ->
      job = reload_job(job.id)

      if job.status in AiJob.terminal_statuses() do
        job
      else
        {:ok, job} =
          job
          |> AiJob.transition_changeset(%{
            status: status,
            finished_at: now,
            error_code: if(status == "failed", do: "worker_failed", else: nil),
            failure_reason:
              if(status == "refused",
                do: Enum.join(get_in(response, ["safety", "reasons"]) || [], ", "),
                else: nil
              )
          })
          |> Repo.update()

        %AiJobResult{}
        |> AiJobResult.changeset(%{
          ai_job_id: job.id,
          status: status,
          output: response["output"],
          model_metadata: response["model_metadata"],
          safety: response["safety"],
          response_payload: response,
          schema_version: response["schema_version"] || "0.1.0",
          completed_at: now
        })
        |> Repo.insert!()

        message_state =
          case status do
            "completed" -> "completed"
            "refused" -> "refused"
            "failed" -> "failed"
          end

        set_message_state(job, message_state)
        publish(job, status)

        if status == "completed" and job.capability == "social_flow_plan_extract" do
          maybe_materialize_social_flow(job, response)
        end

        reload_job(job.id)
      end
    end)
  end

  defp maybe_materialize_social_flow(%AiJob{} = job, response) do
    output = response["output"] || %{}

    source_ids =
      (job.request_payload["context"] || [])
      |> Enum.map(& &1["source_id"])
      |> Enum.filter(&is_binary/1)

    source_ids =
      if source_ids == [], do: [job.message_id], else: source_ids

    _ =
      SocialFlow.create_proposal_from_ai_result(%{
        conversation_id: job.conversation_id,
        requester_user_id: job.requester_user_id,
        output: output,
        ai_job_id: job.id,
        consent_proof_id: job.consent_proof_id,
        source_message_ids: source_ids,
        trace_id: job.trace_id
      })

    :ok
  rescue
    _ -> :ok
  end

  defp fail_job(%AiJob{} = job, error_code, reason, opts) do
    _retryable = Keyword.get(opts, :retryable, false)
    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

    Repo.transaction(fn ->
      job = reload_job(job.id)

      if job.status in AiJob.terminal_statuses() do
        job
      else
        {:ok, job} =
          job
          |> AiJob.transition_changeset(%{
            status: "failed",
            error_code: error_code,
            failure_reason: reason,
            finished_at: now
          })
          |> Repo.update()

        set_message_state(job, "failed")
        publish(job, "failed")
        reload_job(job.id)
      end
    end)
  end

  defp publish(%AiJob{} = job, status) do
    event_type =
      case status do
        "completed" -> "ai_job.completed"
        "refused" -> "ai_job.refused"
        "failed" -> "ai_job.failed"
      end

    envelope =
      Contracts.event_envelope(
        event_type,
        %{
          "job_id" => job.id,
          "conversation_id" => job.conversation_id,
          "requester_user_id" => job.requester_user_id,
          "message_id" => job.message_id,
          "status" => status,
          "error_code" => job.error_code
        },
        job.trace_id
      )

    Phoenix.PubSub.broadcast(OpalCore.PubSub, "ai_jobs:#{job.requester_user_id}", envelope)

    Phoenix.PubSub.broadcast(
      OpalCore.PubSub,
      "ai_jobs:conversation:#{job.conversation_id}",
      envelope
    )

    OpalCore.AI.EventProbe.record(envelope)
    :ok
  end

  defp build_request(%AiJob{} = job, %Message{} = message) do
    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)
    deadline = DateTime.add(now, 30, :second)

    context =
      if job.capability == "social_flow_plan_extract" do
        recent_message_context(job.conversation_id, message)
      else
        body = String.slice(message.body || "", 0, 2000)

        [
          %{
            "type" => "message_body",
            "value" => body,
            "source_id" => message.id
          }
        ]
      end

    %{
      "schema_version" => "0.1.0",
      "job_id" => job.id,
      "idempotency_key" => job.idempotency_key,
      "capability" => job.capability,
      "requester_user_id" => job.requester_user_id,
      "subject_user_id" => job.subject_user_id,
      "conversation_id" => job.conversation_id,
      "message_id" => job.message_id,
      "consent_proof_id" => job.consent_proof_id,
      "context" => context,
      "requested_at" => DateTime.to_iso8601(now),
      "deadline_at" => DateTime.to_iso8601(deadline),
      "trace_id" => job.trace_id
    }
  end

  defp recent_message_context(conversation_id, %Message{} = trigger) do
    import Ecto.Query

    messages =
      from(m in Message,
        where: m.conversation_id == ^conversation_id and m.server_seq <= ^trigger.server_seq,
        order_by: [desc: m.server_seq],
        limit: 5
      )
      |> Repo.all()
      |> Enum.reverse()

    messages =
      if Enum.any?(messages, &(&1.id == trigger.id)), do: messages, else: messages ++ [trigger]

    Enum.map(messages, fn m ->
      %{
        "type" => "message_body",
        "value" => String.slice(m.body || "", 0, 2000),
        "source_id" => m.id
      }
    end)
  end

  defp get_or_create_job(
         %{
           message: message,
           requester_user_id: requester_user_id,
           capability: capability,
           consent_proof_id: consent_proof_id,
           idempotency_key: idempotency_key,
           trace_id: trace_id
         } = _
       ) do
    case Repo.get_by(AiJob, idempotency_key: idempotency_key) do
      %AiJob{} = existing ->
        if existing.requester_user_id == requester_user_id and
             existing.message_id == message.id and
             existing.capability == capability do
          {:ok, existing, false}
        else
          {:error, :idempotency_conflict}
        end

      nil ->
        deadline =
          DateTime.utc_now() |> DateTime.add(30, :second) |> DateTime.truncate(:microsecond)

        %AiJob{}
        |> AiJob.create_changeset(%{
          idempotency_key: idempotency_key,
          capability: capability,
          status: "queued",
          requester_user_id: requester_user_id,
          subject_user_id: requester_user_id,
          conversation_id: message.conversation_id,
          message_id: message.id,
          consent_proof_id: consent_proof_id,
          trace_id: trace_id,
          schema_version: "0.1.0",
          deadline_at: deadline
        })
        |> Repo.insert()
        |> case do
          {:ok, job} ->
            {:ok, job, true}

          {:error, %Ecto.Changeset{} = cs} ->
            if unique_idempotency_error?(cs) do
              job = Repo.get_by!(AiJob, idempotency_key: idempotency_key)
              {:ok, job, false}
            else
              {:error, cs}
            end
        end
    end
  end

  defp enqueue(%AiJob{} = job) do
    %{job_id: job.id}
    |> ProcessJobWorker.new()
    |> Oban.insert()
  end

  defp fetch_message_for_user(message_id, user_id) do
    case Messages.get_message_for_user(message_id, user_id) do
      %Message{} = message -> {:ok, message}
      nil -> {:error, :message_not_found}
    end
  end

  defp ensure_capability_executable(cap) when cap in @executable_capabilities, do: :ok
  defp ensure_capability_executable(_), do: {:error, :capability_not_executable}

  defp set_message_state(%AiJob{} = job, state) do
    case Messages.get_message(job.message_id) do
      %Message{} = message ->
        {:ok, _} = Messages.update_ai_state(message, state)
        :ok

      _ ->
        :ok
    end
  end

  defp reload_job(id) do
    Repo.get!(AiJob, id) |> Repo.preload(:result)
  end

  defp maybe_preload(nil), do: nil
  defp maybe_preload(job), do: Repo.preload(job, :result)

  defp client do
    Application.get_env(:opal_core, :ai_client, OpalCore.AI.HTTPClient)
  end

  defp fetch!(attrs, key) do
    Map.get(attrs, key) || Map.get(attrs, Atom.to_string(key)) ||
      raise ArgumentError, "missing #{key}"
  end

  defp generate_trace_id do
    "trace-" <> Base.encode16(:crypto.strong_rand_bytes(8), case: :lower)
  end

  defp unique_idempotency_error?(%Ecto.Changeset{errors: errors}) do
    Enum.any?(errors, fn
      {:idempotency_key, _} -> true
      _ -> false
    end)
  end

  defp ignore_update({:ok, _}), do: :ok
  defp ignore_update({:error, _}), do: :ok

  defp stringify_keys(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), stringify_keys(v)}
      {k, v} -> {k, stringify_keys(v)}
    end)
  end

  defp stringify_keys(list) when is_list(list), do: Enum.map(list, &stringify_keys/1)
  defp stringify_keys(other), do: other

  defp datetime(nil), do: nil
  defp datetime(%DateTime{} = dt), do: DateTime.to_iso8601(dt)

  defp parse_dt(nil), do: nil

  defp parse_dt(value) when is_binary(value) do
    case DateTime.from_iso8601(value) do
      {:ok, dt, _} -> DateTime.truncate(dt, :microsecond)
      _ -> nil
    end
  end
end
