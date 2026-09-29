defmodule OpalCore.Calls.Outcomes do
  @moduledoc """
  Conversation Outcome owner.

  Evidence → proposal/keep → SharedPlan authority → structured Outcome.

  Outcomes describe lineage of what is now true / still open. They never
  override SharedPlan. They never write long-term personal memory.
  """

  import Ecto.Query

  alias OpalCore.Calls.CallOutcome
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.SharedPlan

  def record(attrs) when is_map(attrs) do
    attrs = stringify(attrs)

    case %CallOutcome{} |> CallOutcome.changeset(attrs) |> Repo.insert() do
      {:ok, row} ->
        {:ok, row}

      {:error, %{errors: errors} = changeset} ->
        if Keyword.has_key?(errors, :idempotency_key) and is_binary(attrs["idempotency_key"]) do
          case Repo.get_by(CallOutcome, idempotency_key: attrs["idempotency_key"]) do
            %CallOutcome{} = existing -> {:ok, existing}
            nil -> {:error, changeset}
          end
        else
          {:error, changeset}
        end
    end
  end

  def record_proposal(call, segment, state) when is_map(state) do
    proposal = state["change_proposal"]

    if is_map(proposal) and proposal["source_segment_id"] == segment.id do
      record_proposal_state(
        call.conversation_id,
        proposal,
        %{
          "source_type" => "call_transcript",
          "source_call_id" => call.id,
          "source_segment_id" => segment.id,
          "plan_version" => state["plan_version"],
          "plan_id" => state["lineage_id"] || plan_id(call.conversation_id)
        }
      )
    else
      :skipped
    end
  end

  def record_proposal(_, _, _), do: :skipped

  def record_proposal_state(conversation_id, proposal, meta \\ %{})
      when is_binary(conversation_id) and is_map(proposal) do
    field = proposal["field"]
    type = proposal_type(field)

    if is_nil(type) do
      :skipped
    else
      segment_id = proposal["source_segment_id"] || meta["source_segment_id"]
      proposal_key = proposal_key(proposal, meta)
      before = proposal["current"] || meta["before_value"]
      after_value = proposal["value"]

      record(%{
        call_id: proposal["source_call_id"] || meta["source_call_id"],
        conversation_id: conversation_id,
        source_type: proposal["source_type"] || meta["source_type"] || "chat",
        source_segment_ids: list_ids(segment_id),
        outcome_type: type,
        entity_type: "shared_plan",
        entity_id: after_value,
        before_value: before,
        after_value: after_value,
        proposer_user_id: proposal["proposed_by_user_id"] || proposal["speaker_user_id"],
        actor_user_id: proposal["proposed_by_user_id"] || proposal["speaker_user_id"],
        status: "recorded",
        plan_id: meta["plan_id"] || plan_id(conversation_id),
        plan_version: meta["plan_version"] || proposal["base_plan_version"],
        proposal_key: proposal_key,
        idempotency_key: "outcome:propose:#{proposal_key}",
        provenance: %{
          "kind" => "proposal",
          "field" => field,
          "source_type" => proposal["source_type"] || meta["source_type"] || "chat",
          "source_call_id" => proposal["source_call_id"] || meta["source_call_id"],
          "source_segment_id" => segment_id,
          "proposal_id" => proposal["proposal_id"],
          "speaker_user_id" => proposal["speaker_user_id"],
          "confidence" => proposal["confidence"]
        }
      })
    end
  end

  def record_acceptance(conversation_id, proposal) when is_map(proposal) do
    field = proposal["field"]
    type = changed_type(field)

    if is_nil(type) or proposal["status"] in ["stale", "superseded"] do
      :skipped
    else
      segment_id = proposal["source_segment_id"]
      proposal_key = proposal_key(proposal, %{})
      source_type = proposal["source_type"] || if(is_binary(segment_id), do: "call_transcript", else: "chat")

      record(%{
        call_id: proposal["source_call_id"],
        conversation_id: conversation_id,
        source_type: source_type,
        source_segment_ids: list_ids(segment_id),
        outcome_type: type,
        entity_type: "shared_plan",
        entity_id: proposal["value"],
        before_value: proposal["current"],
        after_value: proposal["value"],
        proposer_user_id: proposal["proposed_by_user_id"] || proposal["speaker_user_id"],
        accepter_user_id: proposal["accepted_by_user_id"],
        actor_user_id: proposal["accepted_by_user_id"],
        status: "recorded",
        plan_id: plan_id(conversation_id),
        plan_version: proposal["accepted_plan_version"],
        proposal_key: proposal_key,
        idempotency_key: "outcome:accept:#{proposal_key}",
        provenance: %{
          "kind" => "acceptance",
          "field" => field,
          "source_type" => source_type,
          "source_call_id" => proposal["source_call_id"],
          "source_segment_id" => segment_id,
          "proposal_id" => proposal["proposal_id"],
          "proposer_user_id" => proposal["proposed_by_user_id"] || proposal["speaker_user_id"],
          "accepter_user_id" => proposal["accepted_by_user_id"],
          "base_plan_version" => proposal["base_plan_version"]
        }
      })
    end
  end

  def record_acceptance(_, _), do: :skipped

  def record_keep(conversation_id, proposal, keeper_user_id)
      when is_binary(conversation_id) and is_map(proposal) and is_binary(keeper_user_id) do
    field = proposal["field"]
    type = kept_type(field)

    if is_nil(type) or proposal["status"] in ["stale", "superseded"] do
      :skipped
    else
      segment_id = proposal["source_segment_id"]
      proposal_key = proposal_key(proposal, %{})
      source_type = proposal["source_type"] || if(is_binary(segment_id), do: "call_transcript", else: "chat")
      kept = proposal["current"]

      record(%{
        call_id: proposal["source_call_id"],
        conversation_id: conversation_id,
        source_type: source_type,
        source_segment_ids: list_ids(segment_id),
        outcome_type: type,
        entity_type: "shared_plan",
        entity_id: kept,
        before_value: kept,
        after_value: kept,
        proposer_user_id: proposal["proposed_by_user_id"] || proposal["speaker_user_id"],
        accepter_user_id: keeper_user_id,
        actor_user_id: keeper_user_id,
        status: "recorded",
        plan_id: plan_id(conversation_id),
        plan_version: proposal["base_plan_version"],
        proposal_key: proposal_key,
        idempotency_key: "outcome:keep:#{proposal_key}",
        provenance: %{
          "kind" => "keep_current",
          "field" => field,
          "source_type" => source_type,
          "source_call_id" => proposal["source_call_id"],
          "source_segment_id" => segment_id,
          "proposal_id" => proposal["proposal_id"],
          "keeper_user_id" => keeper_user_id,
          "rejected_value" => proposal["value"]
        }
      })
    end
  end

  def record_keep(_, _, _), do: :skipped

  @doc """
  Narrow explicit commitment from utterance text. Never writes long-term memory.
  """
  def maybe_record_commitment(conversation_id, attrs) when is_binary(conversation_id) and is_map(attrs) do
    text = attrs["text"] || attrs[:text] || ""
    actor = attrs["speaker_user_id"] || attrs[:speaker_user_id]
    segment_id = attrs["source_segment_id"] || attrs[:source_segment_id]
    call_id = attrs["call_id"] || attrs[:call_id]

    case commitment_from_text(text) do
      nil ->
        :skipped

      body when is_binary(actor) ->
        record(%{
          call_id: call_id,
          conversation_id: conversation_id,
          source_type: attrs["source_type"] || "call_transcript",
          source_segment_ids: list_ids(segment_id),
          outcome_type: "commitment_created",
          entity_type: "commitment",
          entity_id: body,
          after_value: body,
          actor_user_id: actor,
          proposer_user_id: actor,
          status: "recorded",
          plan_id: plan_id(conversation_id),
          idempotency_key: "outcome:commitment:#{segment_id || body}",
          provenance: %{
            "kind" => "commitment",
            "explicit" => true,
            "inferred" => false,
            "source_segment_id" => segment_id,
            "source_call_id" => call_id,
            "owner_user_id" => actor
          }
        })

      _ ->
        :skipped
    end
  end

  @doc """
  Narrow explicit open question. No invented answer.
  """
  def maybe_record_open_question(conversation_id, attrs) when is_binary(conversation_id) and is_map(attrs) do
    text = attrs["text"] || attrs[:text] || ""
    actor = attrs["speaker_user_id"] || attrs[:speaker_user_id]
    segment_id = attrs["source_segment_id"] || attrs[:source_segment_id]
    call_id = attrs["call_id"] || attrs[:call_id]

    case open_question_from_text(text) do
      nil ->
        :skipped

      topic when is_binary(actor) ->
        record(%{
          call_id: call_id,
          conversation_id: conversation_id,
          source_type: attrs["source_type"] || "call_transcript",
          source_segment_ids: list_ids(segment_id),
          outcome_type: "open_question_created",
          entity_type: "open_question",
          entity_id: topic,
          after_value: topic,
          actor_user_id: actor,
          status: "recorded",
          plan_id: plan_id(conversation_id),
          idempotency_key: "outcome:open_question:#{segment_id || topic}",
          provenance: %{
            "kind" => "open_question",
            "explicit" => true,
            "topic" => topic,
            "source_segment_id" => segment_id,
            "source_call_id" => call_id
          }
        })

      _ ->
        :skipped
    end
  end

  @doc """
  Waiting-on from explicit deferred confirmation language.
  """
  def maybe_record_waiting_on(conversation_id, attrs) when is_binary(conversation_id) and is_map(attrs) do
    text = attrs["text"] || attrs[:text] || ""
    actor = attrs["speaker_user_id"] || attrs[:speaker_user_id]
    segment_id = attrs["source_segment_id"] || attrs[:source_segment_id]
    call_id = attrs["call_id"] || attrs[:call_id]

    case waiting_on_from_text(text) do
      nil ->
        :skipped

      label when is_binary(actor) ->
        record(%{
          call_id: call_id,
          conversation_id: conversation_id,
          source_type: attrs["source_type"] || "call_transcript",
          source_segment_ids: list_ids(segment_id),
          outcome_type: "waiting_on_created",
          entity_type: "waiting_on",
          entity_id: label,
          after_value: label,
          actor_user_id: actor,
          status: "recorded",
          plan_id: plan_id(conversation_id),
          idempotency_key: "outcome:waiting_on:#{segment_id || label}",
          provenance: %{
            "kind" => "waiting_on",
            "explicit" => true,
            "participant_user_id" => actor,
            "source_segment_id" => segment_id,
            "source_call_id" => call_id,
            "participation" => "not_confirmed"
          }
        })

      _ ->
        :skipped
    end
  end

  def list_for_conversation(conversation_id, opts \\ []) when is_binary(conversation_id) do
    limit = Keyword.get(opts, :limit, 50)
    source_type = Keyword.get(opts, :source_type)
    call_id = Keyword.get(opts, :call_id)

    CallOutcome
    |> where([o], o.conversation_id == ^conversation_id)
    |> maybe_filter_source(source_type)
    |> maybe_filter_call(call_id)
    |> order_by([o], desc: o.inserted_at)
    |> limit(^limit)
    |> Repo.all()
    |> Enum.map(&project/1)
  end

  def list_for_call(call_id, opts \\ []) when is_binary(call_id) do
    limit = Keyword.get(opts, :limit, 50)

    CallOutcome
    |> where([o], o.call_id == ^call_id)
    |> order_by([o], desc: o.inserted_at)
    |> limit(^limit)
    |> Repo.all()
    |> Enum.map(&project/1)
  end

  def count_changed(conversation_id) when is_binary(conversation_id) do
    CallOutcome
    |> where([o], o.conversation_id == ^conversation_id)
    |> where([o], o.outcome_type in ^~w(plan_time_changed plan_activity_changed plan_place_changed))
    |> Repo.aggregate(:count)
  end

  @doc """
  Outcome → memory bridge.

  Operational plan/commitment/execution outcomes never become memory.
  OUTCOME_AUTO_PROMOTES_TO_MEMORY remains 0 — eligibility never writes.
  """
  def memory_candidate_eligibility(%CallOutcome{} = outcome) do
    case outcome.outcome_type do
      type when type in ~w(plan_time_proposed plan_time_changed plan_time_kept
                           plan_activity_proposed plan_activity_changed plan_activity_kept
                           plan_place_proposed plan_place_changed plan_place_kept) ->
        {:reject, :operational_plan_state}

      "commitment_created" ->
        {:reject, :operational_commitment_not_personal_memory}

      "open_question_created" ->
        {:reject, :open_loop_not_personal_memory}

      "waiting_on_created" ->
        {:reject, :waiting_on_not_personal_memory}

      type when type in ~w(booking_authorized booking_submitted booking_confirmed booking_failed) ->
        {:reject, :operational_execution_not_personal_memory}

      _ ->
        {:reject, :not_approved_for_memory}
    end
  end

  def write_long_term_memory?(_outcome), do: false

  @doc "Never auto-promotes. Always false for outcome rows."
  def outcome_auto_promotes_to_memory?, do: false

  @doc """
  Execution lineage only. Does not become SharedPlan or provider authority.
  """
  def record_execution_lineage(conversation_id, attrs)
      when is_binary(conversation_id) and is_map(attrs) do
    a = stringify(attrs)
    type = a["outcome_type"]

    if type in ~w(booking_authorized booking_submitted booking_confirmed booking_failed) do
      record(%{
        call_id: a["call_id"],
        conversation_id: conversation_id,
        source_type: a["source_type"] || "execution",
        source_segment_ids: list_ids(a["source_segment_id"]),
        outcome_type: type,
        entity_type: "execution",
        entity_id: a["entity_id"],
        before_value: a["before_value"],
        after_value: a["after_value"],
        actor_user_id: a["actor_user_id"],
        proposer_user_id: a["actor_user_id"],
        status: "recorded",
        plan_id: a["plan_id"],
        plan_version: a["plan_version"],
        proposal_key: a["proposal_key"],
        idempotency_key:
          a["idempotency_key"] ||
            "outcome:#{type}:#{a["entity_id"] || a["plan_id"]}:#{a["plan_version"]}",
        provenance: a["provenance"] || %{"kind" => type}
      })
    else
      :skipped
    end
  end

  def record_execution_lineage(_, _), do: :skipped

  defp project(%CallOutcome{} = o) do
    %{
      "outcome_id" => o.id,
      "conversation_id" => o.conversation_id,
      "call_id" => o.call_id,
      "source_type" => o.source_type,
      "source_segment_ids" => o.source_segment_ids,
      "outcome_type" => o.outcome_type,
      "entity_type" => o.entity_type,
      "entity_id" => o.entity_id,
      "before_value" => o.before_value,
      "after_value" => o.after_value,
      "proposer_user_id" => o.proposer_user_id,
      "accepter_user_id" => o.accepter_user_id,
      "actor_user_id" => o.actor_user_id,
      "status" => o.status,
      "plan_id" => o.plan_id,
      "plan_version" => o.plan_version,
      "proposal_key" => o.proposal_key,
      "provenance" => o.provenance || %{},
      "created_at" => o.inserted_at,
      # Presentation hints — engineering types stay precise.
      "presentation" => presentation(o)
    }
  end

  defp presentation(%CallOutcome{outcome_type: "plan_time_proposed"} = o),
    do: %{"label" => "Plan update suggested", "detail" => o.after_value, "tone" => "proposed"}

  defp presentation(%CallOutcome{outcome_type: "plan_time_changed"} = o),
    do: %{"label" => "Plan updated", "detail" => "Now #{o.after_value}", "tone" => "settled"}

  defp presentation(%CallOutcome{outcome_type: "plan_time_kept"} = o),
    do: %{"label" => "Current plan kept", "detail" => o.after_value, "tone" => "kept"}

  defp presentation(%CallOutcome{outcome_type: "plan_activity_proposed"} = o),
    do: %{"label" => "Activity suggested", "detail" => o.after_value, "tone" => "proposed"}

  defp presentation(%CallOutcome{outcome_type: "plan_activity_changed"} = o),
    do: %{"label" => "Activity updated", "detail" => o.after_value, "tone" => "settled"}

  defp presentation(%CallOutcome{outcome_type: "plan_place_proposed"} = o),
    do: %{"label" => "Place suggested", "detail" => o.after_value, "tone" => "proposed"}

  defp presentation(%CallOutcome{outcome_type: "plan_place_changed"} = o),
    do: %{"label" => "Place updated", "detail" => o.after_value, "tone" => "settled"}

  defp presentation(%CallOutcome{outcome_type: "commitment_created"} = o),
    do: %{"label" => "Commitment", "detail" => o.after_value, "tone" => "owned"}

  defp presentation(%CallOutcome{outcome_type: "open_question_created"} = o),
    do: %{"label" => "Still deciding", "detail" => o.after_value, "tone" => "open"}

  defp presentation(%CallOutcome{outcome_type: "waiting_on_created"} = o),
    do: %{"label" => "Waiting on", "detail" => o.after_value, "tone" => "waiting"}

  defp presentation(%CallOutcome{outcome_type: "booking_authorized"} = o),
    do: %{"label" => "Approved to book", "detail" => o.after_value, "tone" => "authorized"}

  defp presentation(%CallOutcome{outcome_type: "booking_submitted"} = o),
    do: %{"label" => "Request sent", "detail" => o.after_value, "tone" => "submitted"}

  defp presentation(%CallOutcome{outcome_type: "booking_confirmed"} = o),
    do: %{"label" => "Confirmed", "detail" => o.after_value, "tone" => "confirmed"}

  defp presentation(%CallOutcome{outcome_type: "booking_failed"} = o),
    do: %{"label" => "Couldn't complete booking", "detail" => o.after_value, "tone" => "failed"}

  defp presentation(%CallOutcome{outcome_type: type} = o),
    do: %{"label" => type, "detail" => o.after_value || o.entity_id, "tone" => "recorded"}

  defp proposal_type(field) when field in ["datetime", "exact_time"], do: "plan_time_proposed"
  defp proposal_type("activity"), do: "plan_activity_proposed"
  defp proposal_type("place"), do: "plan_place_proposed"
  defp proposal_type(_), do: nil

  defp changed_type(field) when field in ["datetime", "exact_time"], do: "plan_time_changed"
  defp changed_type("activity"), do: "plan_activity_changed"
  defp changed_type("place"), do: "plan_place_changed"
  defp changed_type(_), do: nil

  defp kept_type(field) when field in ["datetime", "exact_time"], do: "plan_time_kept"
  defp kept_type("activity"), do: "plan_activity_kept"
  defp kept_type("place"), do: "plan_place_kept"
  defp kept_type(_), do: nil

  defp proposal_key(proposal, meta) do
    cond do
      is_binary(proposal["proposal_id"]) -> proposal["proposal_id"]
      is_binary(proposal["source_segment_id"]) -> proposal["source_segment_id"]
      is_binary(meta["source_segment_id"]) -> meta["source_segment_id"]
      true -> "field:#{proposal["field"]}:#{proposal["value"]}:#{proposal["proposed_by_user_id"]}"
    end
  end

  defp plan_id(conversation_id) when is_binary(conversation_id) do
    case Repo.get_by(SharedPlan, conversation_id: conversation_id) do
      %SharedPlan{id: id} -> id
      _ -> nil
    end
  end

  defp plan_id(_), do: nil

  defp list_ids(id) when is_binary(id), do: [id]
  defp list_ids(_), do: []

  defp maybe_filter_source(query, nil), do: query
  defp maybe_filter_source(query, source_type), do: where(query, [o], o.source_type == ^source_type)

  defp maybe_filter_call(query, nil), do: query
  defp maybe_filter_call(query, call_id), do: where(query, [o], o.call_id == ^call_id)

  defp stringify(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {k, v}
    end)
  end

  defp commitment_from_text(text) when is_binary(text) do
    normalized = String.downcase(text)

    cond do
      Regex.match?(~r/\bi'?ll\s+bring\s+the\s+tickets\b/, normalized) -> "bring the tickets"
      Regex.match?(~r/\bi\s+will\s+bring\s+the\s+tickets\b/, normalized) -> "bring the tickets"
      Regex.match?(~r/\bi'?ll\s+bring\s+(.+)$/, normalized) ->
        case Regex.run(~r/\bi'?ll\s+bring\s+(.+)$/i, String.trim(text)) do
          [_, rest] -> "bring " <> String.trim(rest) |> String.trim_trailing(".")
          _ -> nil
        end

      true ->
        nil
    end
  end

  defp commitment_from_text(_), do: nil

  defp open_question_from_text(text) when is_binary(text) do
    normalized = String.downcase(String.trim(text))

    cond do
      Regex.match?(~r/\bwhat\s+hotel\b/, normalized) -> "hotel"
      Regex.match?(~r/\bwhich\s+hotel\b/, normalized) -> "hotel"
      Regex.match?(~r/\bwhere\s+are\s+we\s+staying\b/, normalized) -> "lodging"
      String.ends_with?(normalized, "?") and Regex.match?(~r/\b(who|what|which|where)\b/, normalized) ->
        "open_question"

      true ->
        nil
    end
  end

  defp open_question_from_text(_), do: nil

  defp waiting_on_from_text(text) when is_binary(text) do
    normalized = String.downcase(text)

    cond do
      Regex.match?(~r/\bi'?ll\s+know\s+friday\b/, normalized) -> "Friday confirmation"
      Regex.match?(~r/\bi\s+will\s+know\s+friday\b/, normalized) -> "Friday confirmation"
      Regex.match?(~r/\bi'?ll\s+know\s+.+\s+if\s+i\s+can\s+go\b/, normalized) -> "participation confirmation"
      true -> nil
    end
  end

  defp waiting_on_from_text(_), do: nil
end
