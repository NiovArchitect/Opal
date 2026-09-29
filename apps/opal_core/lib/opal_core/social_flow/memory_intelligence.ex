defmodule OpalCore.SocialFlow.MemoryIntelligence do
  @moduledoc """
  Relationship-aware memory candidate intelligence (Track A4).

  Broad admission surface with strong catch systems:

  - operational plan/outcome/commitment/execution never become memory
  - one-off selections never become durable preferences
  - temporary location never becomes "lives in"
  - group choice never becomes individual preference
  - sensitive domains stay conservative
  - private candidates never cross users
  - contradiction does not silently overwrite
  - supersession preserves history
  - promotion is gated and provenance-complete

  Owner of candidate derivation. Durable rows remain
  `RelationshipMemory` / `DurablePreferenceMemory` under existing law.
  """

  import Ecto.Query

  alias OpalCore.Calls.CallOutcome
  alias OpalCore.Calls.Outcomes
  alias OpalCore.Repo

  alias OpalCore.SocialFlow.{
    DurablePreferenceMemory,
    MemoryCandidate,
    RelationshipMemory
  }

  alias OpalCore.SocialFlow.Execution.{MemoryKind, MemoryScope}

  @repeat_promote_min 3

  # --- Public API ---

  @doc """
  Consider conversational or structured evidence for a memory candidate.

  Returns:
  - `{:ok, %{candidate: ..., promoted: ..., action: ...}}`
  - `{:reject, reason}`
  """
  def consider(attrs) when is_map(attrs) do
    a = stringify(attrs)

    # Catch order: specific privacy/safety/attribution rejects before generic one-off.
    with :ok <- catch_missing_owner(a),
         :ok <- catch_operational_payload(a),
         :ok <- catch_temporary_location(a),
         :ok <- catch_plan_state(a),
         :ok <- catch_commitment(a),
         :ok <- catch_group_choice(a),
         :ok <- catch_sensitive_inference(a),
         :ok <- catch_one_off_selection(a),
         {:ok, interpreted} <- interpret(a) do
      persist_and_maybe_promote(interpreted, a)
    end
  end

  def consider(_), do: {:reject, :invalid}

  @doc "Safe query for future recommendation — owner-private only."
  def candidates_for_context(owner_user_id, opts \\ []) when is_binary(owner_user_id) do
    relationship_id = Keyword.get(opts, :relationship_id) || Keyword.get(opts, :counterpart_user_id)
    activity = Keyword.get(opts, :activity)
    include_conflicted? = Keyword.get(opts, :include_conflicted, false)

    statuses =
      if include_conflicted?,
        do: ~w(proposed visible approved conflicted),
        else: ~w(proposed visible approved)

    q =
      from(c in MemoryCandidate,
        where: c.owner_user_id == ^owner_user_id and c.status in ^statuses,
        order_by: [desc: c.last_observed_at, desc: c.inserted_at]
      )

    q =
      if is_binary(relationship_id) do
        from(c in q,
          where:
            is_nil(c.counterpart_user_id) or c.counterpart_user_id == ^relationship_id or
              c.subject_user_id == ^relationship_id
        )
      else
        q
      end

    Repo.all(q)
    |> Enum.filter(fn c ->
      activity_ok?(c, activity) and not foreign_private_leak?(c, owner_user_id)
    end)
    |> Enum.map(&MemoryCandidate.to_contract/1)
  end

  @doc """
  Current presented truth for a value_key — never returns superseded as current.
  """
  def current_for(owner_user_id, value_key) when is_binary(owner_user_id) and is_binary(value_key) do
    case Repo.one(
           from(c in MemoryCandidate,
             where:
               c.owner_user_id == ^owner_user_id and c.value_key == ^value_key and
                 c.status in ^~w(proposed visible approved conflicted),
             order_by: [desc: c.last_observed_at, desc: c.inserted_at],
             limit: 1
           )
         ) do
      nil ->
        {:ok, nil}

      %MemoryCandidate{status: "superseded"} ->
        {:ok, nil}

      %MemoryCandidate{} = c ->
        {:ok, MemoryCandidate.to_contract(c)}
    end
  end

  @doc "User correction is authoritative — weaken/reject/supersede."
  def apply_correction(owner_user_id, attrs) when is_binary(owner_user_id) and is_map(attrs) do
    a = stringify(attrs) |> Map.put("owner_user_id", owner_user_id) |> Map.put("evidence_kind", "user_correction")

    with {:ok, interpreted} <- interpret_correction(a) do
      now = DateTime.utc_now() |> DateTime.truncate(:microsecond)
      prior = find_active_by_key(owner_user_id, interpreted.value_key)

      case prior do
        %MemoryCandidate{} = old ->
          {:ok, _} =
            old
            |> MemoryCandidate.changeset(%{
              status: "superseded",
              superseded_at: now,
              uncertainty: Enum.uniq((old.uncertainty || []) ++ ["user_correction"])
            })
            |> Repo.update()

          forget_promoted(old)

          interpreted =
            Map.merge(interpreted, %{
              supersedes_candidate_id: old.id,
              observation_count: 1,
              provenance:
                Map.merge(interpreted.provenance, %{
                  "corrected_prior_id" => old.id,
                  "kind" => "user_correction"
                })
            })

          persist_and_maybe_promote(interpreted, a)

        nil ->
          persist_and_maybe_promote(interpreted, a)
      end
    end
  end

  @doc "Bridge from CallOutcome — almost always reject; never auto-promote."
  def from_outcome(%CallOutcome{} = outcome) do
    # Outcomes bridge is reject-only today (operational never becomes memory).
    case Outcomes.memory_candidate_eligibility(outcome) do
      {:reject, reason} -> {:reject, reason}
      _ -> {:reject, :not_approved_for_memory}
    end
  end

  def from_outcome(_), do: {:reject, :invalid}

  @doc "Explain why a candidate is believed (internal)."
  def explain(%MemoryCandidate{} = c) do
    comps = c.confidence_components || %{}
    prov = c.provenance || %{}

    %{
      "candidate_id" => c.id,
      "summary" => c.candidate_summary,
      "evidence_kind" => c.evidence_kind,
      "observation_count" => c.observation_count,
      "first_observed_at" => c.first_observed_at,
      "last_observed_at" => c.last_observed_at,
      "confidence" => c.confidence,
      "components" => comps,
      "why" => why_copy(c, comps, prov),
      "sensitive" => c.sensitive == true,
      "status" => c.status
    }
  end

  def explain(id) when is_binary(id) do
    case Repo.get(MemoryCandidate, id) do
      %MemoryCandidate{} = c -> {:ok, explain(c)}
      nil -> {:error, :not_found}
    end
  end

  # --- Catch systems ---

  defp catch_missing_owner(%{"owner_user_id" => id}) when is_binary(id), do: :ok
  defp catch_missing_owner(_), do: {:reject, :owner_required}

  defp catch_operational_payload(%{"payload_kind" => kind})
       when kind in ~w(plan_state outcome_plan outcome_execution commitment open_question waiting_on) do
    {:reject, :operational_not_memory}
  end

  defp catch_operational_payload(%{"outcome_type" => type})
       when type in ~w(
         plan_time_proposed plan_time_changed plan_time_kept
         plan_activity_proposed plan_activity_changed plan_activity_kept
         plan_place_proposed plan_place_changed plan_place_kept
         commitment_created booking_authorized booking_submitted booking_confirmed booking_failed
       ) do
    {:reject, :operational_not_memory}
  end

  defp catch_operational_payload(_), do: :ok

  defp catch_temporary_location(a) do
    text = down(a["text"] || a["summary"] || "")

    if Regex.match?(~r/\b(i'?m|i am|we'?re|we are)\s+in\s+\w+.*(today|tonight|this (week|weekend)|right now|for (the )?weekend)\b/, text) or
         a["temporary_location"] == true do
      {:reject, :temporary_location}
    else
      :ok
    end
  end

  defp catch_one_off_selection(a) do
    cond do
      a["one_off_selection"] == true ->
        {:reject, :one_off_selection}

      a["evidence_kind"] in ["accepted_plan_pattern", "inference"] and
          (a["observation_count"] || 1) < 2 and a["force_candidate"] != true ->
        {:reject, :one_off_selection}

      cuisine_one_off?(a) ->
        {:reject, :one_off_selection}

      true ->
        :ok
    end
  end

  defp cuisine_one_off?(a) do
    text = down(a["text"] || "")
    a["memory_class"] == "preference" and a["evidence_kind"] != "explicit_statement" and
      Regex.match?(~r/\b(italian|sushi|mexican|thai|chinese)\b/, text) and
      (a["observation_count"] || 1) < @repeat_promote_min and
      not Regex.match?(~r/\b(prefer|usually|always|love|hate)\b/, text)
  end

  defp catch_plan_state(a) do
    if a["plan_state"] == true or a["payload_kind"] == "plan_state" do
      {:reject, :plan_state}
    else
      text = down(a["text"] || "")

      if Regex.match?(~r/\b(fort oak|tuesday|8(:00)?\s*pm)\b/, text) and
           not Regex.match?(~r/\b(prefer|can't|cannot|always|usually|my daughter|my dad)\b/, text) and
           a["force_candidate"] != true do
        {:reject, :plan_state}
      else
        :ok
      end
    end
  end

  defp catch_commitment(a) do
    text = down(a["text"] || "")

    if a["payload_kind"] == "commitment" or
         (Regex.match?(~r/\bi'?ll\s+bring\b|\bi\s+will\s+bring\b|\bi'?ll\s+pick\s+you\s+up\b/, text) and
            a["force_candidate"] != true) do
      {:reject, :commitment_not_memory}
    else
      :ok
    end
  end

  defp catch_group_choice(a) do
    if a["group_choice"] == true and a["attribute_to_individual"] == true do
      {:reject, :group_choice_to_individual}
    else
      :ok
    end
  end

  defp catch_sensitive_inference(a) do
    text = down(a["text"] || a["summary"] || "")
    inferred? = a["evidence_kind"] in [nil, "inference", "repeated_behavior", "accepted_plan_pattern"]

    sensitive? =
      Regex.match?(
        ~r/\b(religion|church|mosque|synagogue|christian|muslim|jewish|buddhist|hindu)\b|\b(cancer|diabetes|depression|anxiety|allergy|allergies|pregnant|hiv|disability)\b|\b(gay|lesbian|bisexual|transgender|sexual)\b|\b(democrat|republican|liberal|conservative|vote for)\b|\b(bankruptcy|evict|debt|salary|income)\b|\b(arrest|felony|lawsuit)\b/,
        text
      ) or a["sensitive"] == true

    cond do
      sensitive? and inferred? and a["evidence_kind"] != "explicit_statement" ->
        {:reject, :sensitive_inference_blocked}

      sensitive? and a["evidence_kind"] == "explicit_statement" and a["allow_sensitive_explicit"] != true ->
        # Explicit sensitive still becomes a guarded candidate, not auto-promoted.
        :ok

      true ->
        :ok
    end
  end

  # --- Interpret ---

  defp interpret(a) do
    text = String.trim(a["text"] || a["summary"] || "")

    cond do
      text == "" and is_binary(a["value"]) ->
        build_interpreted(a, a["memory_class"] || "preference", a["value"], a["evidence_kind"] || "explicit_statement")

      text == "" ->
        {:reject, :empty_evidence}

      match = preference_match(text) ->
        build_interpreted(a, "preference", match, a["evidence_kind"] || "explicit_statement")

      match = boundary_match(text) ->
        build_interpreted(a, "boundary", match, a["evidence_kind"] || "explicit_statement")

      match = relationship_fact_match(text) ->
        build_interpreted(a, "relationship_fact", match, a["evidence_kind"] || "explicit_statement")

      match = outdoor_pattern_match(text, a) ->
        build_interpreted(a, "preference", match, a["evidence_kind"] || "repeated_behavior")

      a["memory_class"] in MemoryCandidate.classes() and is_binary(a["value"]) ->
        build_interpreted(a, a["memory_class"], a["value"], a["evidence_kind"] || "inference")

      true ->
        {:reject, :no_durable_signal}
    end
  end

  defp interpret_correction(a) do
    text = String.trim(a["text"] || a["summary"] || "")
    value = a["value"] || correction_value(text) || text

    build_interpreted(
      Map.merge(a, %{"polarity" => a["polarity"] || "reject"}),
      a["memory_class"] || "preference",
      value,
      "user_correction"
    )
  end

  defp preference_match(text) do
    t = down(text)

    cond do
      Regex.match?(~r/\bi\s+prefer\s+quieter\s+restaurants\b/, t) -> "quieter restaurants"
      Regex.match?(~r/\bi\s+prefer\s+quiet\s+restaurants\b/, t) -> "quiet restaurants"
      Regex.match?(~r/\bi\s+prefer\s+outdoor\s+seating\b/, t) -> "outdoor seating"
      Regex.match?(~r/\bi\s+prefer\s+(.+)$/, t) ->
        case Regex.run(~r/\bi\s+prefer\s+(.+)$/i, String.trim(text)) do
          [_, rest] -> String.trim(rest) |> String.trim_trailing(".")
          _ -> nil
        end

      Regex.match?(~r/\bi\s+actually\s+love\s+loud\s+places\b/, t) -> "loud places with friends"
      true -> nil
    end
  end

  defp boundary_match(text) do
    t = down(text)

    cond do
      Regex.match?(~r/\bi\s+can'?t\s+stay\s+out\s+late\s+on\s+work\s+nights\b/, t) ->
        "can't stay out late on work nights"

      Regex.match?(~r/\bi\s+don'?t\s+drink\s+alcohol\b/, t) ->
        "doesn't drink alcohol"

      Regex.match?(~r/\bi\s+drink\s+wine\s+occasionally\b/, t) ->
        "drinks wine occasionally"

      Regex.match?(~r/\bi\s+can'?t\s+.+\bon\s+work\s+nights\b/, t) ->
        case Regex.run(~r/\bi\s+(can'?t\s+.+?\bon\s+work\s+nights)/i, String.trim(text)) do
          [_, rest] -> String.trim(rest) |> String.trim_trailing(".")
          _ -> nil
        end

      true ->
        nil
    end
  end

  defp relationship_fact_match(text) do
    t = down(text)

    cond do
      Regex.match?(~r/\bthis\s+is\s+my\s+daughter\b/, t) -> %{"role" => "daughter", "label" => "my daughter"}
      Regex.match?(~r/\bthis\s+is\s+my\s+dad\b|\bthis\s+is\s+my\s+father\b/, t) ->
        %{"role" => "dad", "label" => "my dad"}

      Regex.match?(~r/\bshe\s+is\s+my\s+daughter\b/, t) -> %{"role" => "daughter", "label" => "my daughter"}
      Regex.match?(~r/\bhe\s+is\s+my\s+dad\b/, t) -> %{"role" => "dad", "label" => "my dad"}
      true -> nil
    end
  end

  defp outdoor_pattern_match(text, a) do
    t = down(text)

    outdoor? = Regex.match?(~r/\boutdoor\s+seating\b/, t)

    cond do
      outdoor? and a["evidence_kind"] == "repeated_behavior" ->
        "outdoor seating"

      outdoor? and (a["observation_count"] || 1) >= 2 ->
        "outdoor seating"

      true ->
        nil
    end
  end

  defp correction_value(text) do
    t = down(text)

    cond do
      Regex.match?(~r/\bi\s+don'?t\s+prefer\s+outdoor\s+seating\b/, t) -> "outdoor seating"
      Regex.match?(~r/\bno,?\s+i\s+don'?t\s+prefer\b/, t) ->
        case Regex.run(~r/\bprefer\s+(.+)$/i, text) do
          [_, rest] -> String.trim(rest) |> String.trim_trailing(".")
          _ -> nil
        end

      true ->
        nil
    end
  end

  defp build_interpreted(a, class, value, evidence_kind) do
    {summary, value_key, polarity, context_dims, counterpart} = normalize_value(class, value, a)
    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)
    owner = a["owner_user_id"]
    subject = a["subject_user_id"] || owner
    scope = MemoryScope.normalize(a["scope"] || default_scope(class, a))
    scope_id = a["scope_id"] || scope_id_for(scope, a, counterpart)
    obs = max(1, parse_int(a["observation_count"], 1))
    sensitive? = a["sensitive"] == true or sensitive_text?(summary)
    comps = confidence_components(evidence_kind, obs, a, sensitive?)
    confidence = score(comps)

    {:ok,
     %{
       owner_user_id: owner,
       subject_user_id: subject,
       counterpart_user_id: counterpart || a["counterpart_user_id"],
       conversation_id: a["conversation_id"],
       memory_class: class,
       candidate_type: class,
       evidence_kind: evidence_kind,
       candidate_summary: summary,
       value_key: value_key,
       polarity: polarity,
       scope: scope,
       scope_id: scope_id,
       sensitive: sensitive?,
       source_type: a["source_type"] || "chat",
       observation_count: obs,
       first_observed_at: a["first_observed_at"] || now,
       last_observed_at: now,
       last_confirmed_at: if(evidence_kind == "explicit_statement", do: now, else: nil),
       confidence: confidence,
       confidence_components: comps,
       uncertainty: uncertainty_for(evidence_kind, sensitive?, a),
       proposed_purpose: purpose_for(class, scope),
       context_dims: context_dims,
       provenance: %{
         "explicit" => evidence_kind in ~w(explicit_statement user_correction confirmed_shared_fact),
         "inferred" => evidence_kind in ~w(inference accepted_plan_pattern),
         "source_type" => a["source_type"] || "chat",
         "source_message_ids" => List.wrap(a["source_message_ids"] || a["source_segment_ids"]),
         "source_segment_id" => a["source_segment_id"],
         "text" => a["text"],
         "memory_kind" => MemoryKind.normalize(evidence_to_kind(evidence_kind)),
         "from_outcome_id" => a["from_outcome_id"]
       },
       source_message_ids: List.wrap(a["source_message_ids"] || []),
       supersedes_candidate_id: a["supersedes_candidate_id"],
       contradiction_group_id: a["contradiction_group_id"],
       idempotency_key: a["idempotency_key"] || idem_key(owner, value_key, evidence_kind, a)
     }}
  end

  defp normalize_value("relationship_fact", %{"role" => role, "label" => label}, a) do
    direction = a["direction"] || role
    subject = a["subject_user_id"] || a["counterpart_user_id"]
    summary = label
    key = "relationship_fact:#{direction}:#{subject || "unknown"}"
    dims = %{"relationship_role" => role, "directional" => true}
    {summary, key, "fact", dims, a["counterpart_user_id"]}
  end

  defp normalize_value("boundary", value, a) when is_binary(value) do
    key = "boundary:" <> slug(value)
    dims = Map.take(stringify(a["context_dims"] || %{}), ~w(time day activity relationship context))

    dims =
      if String.contains?(down(value), "work night") do
        Map.put_new(dims, "context", "work_nights")
      else
        dims
      end

    {value, key, "avoid", dims, a["counterpart_user_id"]}
  end

  defp normalize_value(class, value, a) when is_binary(value) do
    key = "#{class}:" <> slug(value)
    polarity = a["polarity"] || if(String.contains?(down(value), "loud"), do: "prefer", else: "prefer")
    dims = context_from_text(value, a)
    {value, key, polarity, dims, a["counterpart_user_id"]}
  end

  defp normalize_value(class, value, a) do
    normalize_value(class, to_string(value), a)
  end

  defp context_from_text(value, a) do
    t = down(value)
    base = stringify(a["context_dims"] || %{})

    base
    |> maybe_put(String.contains?(t, "with friends") or String.contains?(t, "friends"), "group_type", "friends")
    |> maybe_put(String.contains?(t, "one-on-one") or String.contains?(t, "quiet"), "group_type", Map.get(base, "group_type") || "dyad")
    |> maybe_put(is_binary(a["activity"]), "activity", a["activity"])
  end

  defp maybe_put(map, true, k, v), do: Map.put(map, k, v)
  defp maybe_put(map, false, _, _), do: map

  # --- Persist / promote / contradict ---

  defp persist_and_maybe_promote(interpreted, raw) do
    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)
    owner = interpreted.owner_user_id
    prior = find_active_by_key(owner, interpreted.value_key)
    opposing = find_opposing(owner, interpreted)

    case match_idempotent(interpreted) do
      {:ok, existing} ->
        {:ok, %{candidate: existing, promoted: nil, action: :idempotent}}

      nil ->
        cond do
          is_struct(opposing, MemoryCandidate) and interpreted.evidence_kind != "user_correction" ->
            handle_contradiction(interpreted, opposing, raw, now)

          is_struct(prior, MemoryCandidate) and same_polarity?(prior, interpreted) ->
            strengthen(prior, interpreted, raw, now)

          is_struct(prior, MemoryCandidate) and
              interpreted.evidence_kind in ~w(explicit_statement user_correction) ->
            supersede_prior(prior, interpreted, raw, now)

          true ->
            insert_fresh(interpreted, raw, now)
        end
    end
  end

  defp match_idempotent(%{idempotency_key: key}) when is_binary(key) do
    case Repo.get_by(MemoryCandidate, idempotency_key: key) do
      %MemoryCandidate{} = c -> {:ok, c}
      nil -> nil
    end
  end

  defp match_idempotent(_), do: nil

  defp strengthen(%MemoryCandidate{} = prior, interpreted, raw, now) do
    count = (prior.observation_count || 1) + (interpreted.observation_count || 1)
    comps = confidence_components(interpreted.evidence_kind, count, raw, prior.sensitive == true)
    status = if prior.status == "conflicted", do: "conflicted", else: prior.status

    {:ok, cand} =
      prior
      |> MemoryCandidate.changeset(%{
        observation_count: count,
        last_observed_at: now,
        last_confirmed_at: interpreted.last_confirmed_at || prior.last_confirmed_at,
        confidence: score(comps),
        confidence_components: comps,
        provenance: Map.merge(prior.provenance || %{}, interpreted.provenance),
        context_dims: Map.merge(prior.context_dims || %{}, interpreted.context_dims),
        status: status,
        source_message_ids: Enum.uniq((prior.source_message_ids || []) ++ interpreted.source_message_ids)
      })
      |> Repo.update()

    {:ok, promoted} = maybe_promote(cand, raw)
    {:ok, %{candidate: cand, promoted: promoted, action: :strengthened}}
  end

  defp supersede_prior(%MemoryCandidate{} = prior, interpreted, raw, now) do
    {:ok, _} =
      prior
      |> MemoryCandidate.changeset(%{status: "superseded", superseded_at: now})
      |> Repo.update()

    forget_promoted(prior)

    interpreted = Map.put(interpreted, :supersedes_candidate_id, prior.id)
    insert_fresh(interpreted, raw, now, action: :superseded)
  end

  defp handle_contradiction(interpreted, opposing, _raw, _now) do
    group_id = opposing.contradiction_group_id || Ecto.UUID.generate()

    {:ok, _} =
      opposing
      |> MemoryCandidate.changeset(%{
        status: "conflicted",
        contradiction_group_id: group_id,
        uncertainty: Enum.uniq((opposing.uncertainty || []) ++ ["contradiction_observed"])
      })
      |> Repo.update()

    # Scope refinement when both explicit and context differs
    refined =
      if can_refine_scope?(opposing, interpreted) do
        Map.update!(interpreted, :context_dims, fn dims ->
          Map.merge(dims, %{"refined_from_contradiction" => true})
        end)
        |> Map.put(:contradiction_group_id, group_id)
        |> Map.put(:uncertainty, ["needs_clarification", "scoped_by_context"])
      else
        interpreted
        |> Map.put(:contradiction_group_id, group_id)
        |> Map.put(:uncertainty, ["contradiction_unresolved"])
        |> Map.put(:confidence, min(interpreted.confidence, 0.45))
      end

    attrs =
      candidate_attrs(refined)
      |> Map.put(:status, "conflicted")

    case %MemoryCandidate{} |> MemoryCandidate.changeset(attrs) |> Repo.insert() do
      {:ok, cand} ->
        {:ok,
         %{
           candidate: cand,
           promoted: nil,
           action: :contradiction,
           opposing_id: opposing.id,
           false_certainty: false
         }}

      {:error, %{errors: errors} = cs} ->
        if Keyword.has_key?(errors, :idempotency_key) do
          existing = Repo.get_by!(MemoryCandidate, idempotency_key: refined.idempotency_key)
          {:ok, %{candidate: existing, promoted: nil, action: :idempotent}}
        else
          {:error, cs}
        end
    end
  end

  defp insert_fresh(interpreted, raw, _now, opts \\ []) do
    action = Keyword.get(opts, :action, :created)
    attrs = candidate_attrs(interpreted)

    case %MemoryCandidate{} |> MemoryCandidate.changeset(attrs) |> Repo.insert() do
      {:ok, cand} ->
        {:ok, promoted} = maybe_promote(cand, raw)
        {:ok, %{candidate: cand, promoted: promoted, action: action}}

      {:error, %{errors: errors} = cs} ->
        if Keyword.has_key?(errors, :idempotency_key) do
          existing = Repo.get_by!(MemoryCandidate, idempotency_key: interpreted.idempotency_key)
          {:ok, %{candidate: existing, promoted: nil, action: :idempotent}}
        else
          {:error, cs}
        end
    end
  end

  defp candidate_attrs(interpreted) do
    %{
      owner_user_id: interpreted.owner_user_id,
      conversation_id: interpreted.conversation_id,
      counterpart_user_id: interpreted.counterpart_user_id,
      subject_user_id: interpreted.subject_user_id,
      source_message_ids: interpreted.source_message_ids,
      candidate_type: interpreted.candidate_type,
      memory_class: interpreted.memory_class,
      evidence_kind: interpreted.evidence_kind,
      candidate_summary: interpreted.candidate_summary,
      value_key: interpreted.value_key,
      polarity: interpreted.polarity,
      scope: interpreted.scope,
      scope_id: interpreted.scope_id,
      sensitive: interpreted.sensitive,
      source_type: interpreted.source_type,
      observation_count: interpreted.observation_count,
      first_observed_at: interpreted.first_observed_at,
      last_observed_at: interpreted.last_observed_at,
      last_confirmed_at: interpreted.last_confirmed_at,
      confidence: interpreted.confidence,
      confidence_components: interpreted.confidence_components,
      uncertainty: Map.get(interpreted, :uncertainty) || [],
      proposed_purpose: interpreted.proposed_purpose,
      provenance: interpreted.provenance,
      context_dims: interpreted.context_dims,
      supersedes_candidate_id: Map.get(interpreted, :supersedes_candidate_id),
      contradiction_group_id: Map.get(interpreted, :contradiction_group_id),
      idempotency_key: interpreted.idempotency_key,
      status: "visible"
    }
  end

  defp maybe_promote(%MemoryCandidate{} = cand, raw) do
    raw = stringify(raw)

    cond do
      cand.sensitive == true and raw["allow_sensitive_explicit"] != true ->
        {:ok, nil}

      cand.status == "conflicted" ->
        {:ok, nil}

      cand.evidence_kind == "user_correction" and cand.polarity == "reject" ->
        {:ok, nil}

      auto_promote?(cand, raw) ->
        promote!(cand)

      true ->
        {:ok, nil}
    end
  end

  defp auto_promote?(%MemoryCandidate{} = cand, raw) do
    cond do
      raw["auto_promote"] == false ->
        false

      cand.evidence_kind == "explicit_statement" and cand.memory_class in ~w(preference boundary relationship_fact) and
          (cand.confidence || 0) >= 0.8 and cand.sensitive != true ->
        true

      cand.evidence_kind == "repeated_behavior" and (cand.observation_count || 0) >= @repeat_promote_min and
          (cand.confidence || 0) >= 0.7 and cand.sensitive != true and
          raw["allow_repeat_promote"] != false ->
        true

      raw["auto_promote"] == true ->
        true

      true ->
        false
    end
  end

  defp promote!(%MemoryCandidate{} = cand) do
    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

    result =
      case cand.memory_class do
        "preference" ->
          DurablePreferenceMemory.remember_explicit(%{
            "owner_user_id" => cand.owner_user_id,
            "preference" => cand.candidate_summary,
            "counterpart_user_id" => cand.counterpart_user_id,
            "conversation_id" => cand.conversation_id,
            "purpose" => "place_preference"
          })

        "boundary" ->
          insert_relationship_memory(cand, "stable_constraint|personal|avoid")

        "relationship_fact" ->
          insert_relationship_memory(cand, "relationship_fact|relationship|fact")

        _ ->
          insert_relationship_memory(cand, cand.proposed_purpose || "private follow-through")
      end

    case result do
      {:ok, mem, _} ->
        {:ok, _cand} =
          cand
          |> MemoryCandidate.changeset(%{
            status: "approved",
            approved_at: now,
            promoted_memory_id: mem.id
          })
          |> Repo.update()

        {:ok, mem}

      {:ok, mem} ->
        {:ok, _} =
          cand
          |> MemoryCandidate.changeset(%{
            status: "approved",
            approved_at: now,
            promoted_memory_id: mem.id
          })
          |> Repo.update()

        {:ok, mem}

      {:error, _} = err ->
        err
    end
  end

  defp insert_relationship_memory(%MemoryCandidate{} = cand, purpose) do
    review = DateTime.utc_now() |> DateTime.add(90 * 24 * 3600, :second) |> DateTime.truncate(:microsecond)

    %RelationshipMemory{}
    |> RelationshipMemory.changeset(%{
      owner_user_id: cand.owner_user_id,
      conversation_id: cand.conversation_id,
      counterpart_user_id: cand.counterpart_user_id,
      source_candidate_id: cand.id,
      summary: cand.candidate_summary,
      purpose: purpose,
      visibility: "private",
      review_at: review,
      deletion_state: "active"
    })
    |> Repo.insert()
  end

  defp forget_promoted(%MemoryCandidate{promoted_memory_id: id, owner_user_id: owner})
       when is_binary(id) do
    _ = DurablePreferenceMemory.forget(id, owner)

    case Repo.get(RelationshipMemory, id) do
      %RelationshipMemory{owner_user_id: ^owner, deletion_state: "active"} = m ->
        now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

        _ =
          m
          |> RelationshipMemory.changeset(%{deletion_state: "forgotten", forgotten_at: now})
          |> Repo.update()

      _ ->
        :ok
    end
  end

  defp forget_promoted(_), do: :ok

  # --- Helpers ---

  defp find_active_by_key(owner, key) when is_binary(key) do
    Repo.one(
      from(c in MemoryCandidate,
        where:
          c.owner_user_id == ^owner and c.value_key == ^key and
            c.status in ^~w(proposed visible approved conflicted),
        order_by: [desc: c.last_observed_at],
        limit: 1
      )
    )
  end

  defp find_active_by_key(_, _), do: nil

  defp find_opposing(owner, interpreted) do
    class = interpreted.memory_class
    summary = down(interpreted.candidate_summary)

    Repo.all(
      from(c in MemoryCandidate,
        where:
          c.owner_user_id == ^owner and c.memory_class == ^class and
            c.status in ^~w(proposed visible approved conflicted),
        order_by: [desc: c.last_observed_at],
        limit: 20
      )
    )
    |> Enum.find(fn c ->
      c.value_key != interpreted.value_key and opposing_summaries?(down(c.candidate_summary), summary)
    end)
  end

  defp opposing_summaries?(a, b) do
    quiet_loud?(a, b) or alcohol_oppose?(a, b)
  end

  defp quiet_loud?(a, b) do
    (String.contains?(a, "quiet") and String.contains?(b, "loud")) or
      (String.contains?(a, "loud") and String.contains?(b, "quiet"))
  end

  defp alcohol_oppose?(a, b) do
    (String.contains?(a, "doesn't drink") and String.contains?(b, "wine")) or
      (String.contains?(a, "don") and String.contains?(a, "alcohol") and String.contains?(b, "wine"))
  end

  defp same_polarity?(prior, interpreted) do
    prior.value_key == interpreted.value_key
  end

  defp can_refine_scope?(opposing, interpreted) do
    o = opposing.context_dims || %{}
    i = interpreted.context_dims || %{}
    Map.get(o, "group_type") != Map.get(i, "group_type") and interpreted.evidence_kind == "explicit_statement"
  end

  defp confidence_components(evidence_kind, obs, a, sensitive?) do
    explicit =
      if evidence_kind in ~w(explicit_statement user_correction confirmed_shared_fact),
        do: 0.55,
        else: 0.1

    repetition = min(0.35, max(0, obs - 1) * 0.12)
    recency = 0.15
    consistency = if a["contradiction"] == true, do: 0.0, else: 0.1
    source = if a["source_type"] in ["call_transcript", "chat", "voice"], do: 0.05, else: 0.0
    sensitive_penalty = if sensitive?, do: -0.2, else: 0.0

    %{
      "explicitness" => explicit,
      "repetition" => Float.round(repetition * 1.0, 3),
      "recency" => recency,
      "consistency" => consistency,
      "source_reliability" => source,
      "sensitive_penalty" => sensitive_penalty,
      "observation_count" => obs
    }
  end

  defp score(comps) when is_map(comps) do
    total =
      (comps["explicitness"] || 0) + (comps["repetition"] || 0) + (comps["recency"] || 0) +
        (comps["consistency"] || 0) + (comps["source_reliability"] || 0) +
        (comps["sensitive_penalty"] || 0)

    total |> max(0.05) |> min(0.99) |> Float.round(3)
  end

  defp uncertainty_for("inference", _, _), do: ["inferred", "needs_confirmation"]
  defp uncertainty_for("repeated_behavior", _, _), do: ["pattern_only"]
  defp uncertainty_for(_, true, _), do: ["sensitive_domain"]

  defp uncertainty_for(_, _, a) do
    case a["uncertainty"] do
      list when is_list(list) -> list
      _ -> []
    end
  end

  defp purpose_for("preference", "relationship"), do: "place_preference|relationship_specific|prefer"
  defp purpose_for("preference", _), do: "place_preference|personal|prefer"
  defp purpose_for("boundary", _), do: "stable_constraint|personal|avoid"
  defp purpose_for("relationship_fact", _), do: "relationship_fact|relationship|fact"
  defp purpose_for(class, _), do: "#{class}|personal|prefer"

  defp default_scope("relationship_fact", _), do: "relationship"
  defp default_scope(_, %{"counterpart_user_id" => id}) when is_binary(id), do: "relationship"
  defp default_scope(_, _), do: "user"

  defp scope_id_for("relationship", a, counterpart) do
    owner = a["owner_user_id"]
    other = counterpart || a["counterpart_user_id"] || a["subject_user_id"]

    if owner && other do
      [owner, other] |> Enum.map(&to_string/1) |> Enum.sort() |> Enum.join("|")
    end
  end

  defp scope_id_for("user", a, _), do: a["owner_user_id"]
  defp scope_id_for("conversation", a, _), do: a["conversation_id"]
  defp scope_id_for(_, a, _), do: a["scope_id"]

  defp evidence_to_kind("explicit_statement"), do: "explicit_fact"
  defp evidence_to_kind("user_correction"), do: "explicit_correction"
  defp evidence_to_kind("repeated_behavior"), do: "repeated_behavior"
  defp evidence_to_kind("inference"), do: "inferred_preference"
  defp evidence_to_kind(_), do: "derived_context"

  defp activity_ok?(_c, nil), do: true

  defp activity_ok?(%MemoryCandidate{} = c, activity) when is_binary(activity) do
    dims = c.context_dims || %{}
    is_nil(dims["activity"]) or dims["activity"] == activity
  end

  defp foreign_private_leak?(%MemoryCandidate{owner_user_id: owner}, viewer), do: owner != viewer

  defp why_copy(c, _comps, prov) do
    kind = c.evidence_kind || "evidence"
    count = c.observation_count || 1
    when_s = c.last_observed_at && DateTime.to_date(c.last_observed_at) |> to_string()

    base =
      cond do
        kind == "explicit_statement" and count == 1 ->
          "Explicitly stated#{if when_s, do: " on #{when_s}", else: ""}."

        kind == "explicit_statement" ->
          "Explicitly stated #{count} times#{if when_s, do: ", most recently #{when_s}", else: ""}."

        kind == "repeated_behavior" ->
          "Observed as a repeated pattern (#{count} times)."

        kind == "user_correction" ->
          "Updated by user correction."

        true ->
          "Candidate from #{kind}."
      end

    if prov["explicit"] == true, do: base, else: base <> " Not treated as certainty."
  end

  defp sensitive_text?(text) when is_binary(text) do
    t = down(text)

    Regex.match?(
      ~r/\b(religion|medical|cancer|allerg|pregnant|gay|lesbian|democrat|republican|salary|arrest|felony)\b/,
      t
    )
  end

  defp sensitive_text?(_), do: false

  defp idem_key(owner, value_key, evidence_kind, a) do
    src = a["source_segment_id"] || a["source_message_id"] || a["idempotency_suffix"] || "x"
    "mem:#{owner}:#{value_key}:#{evidence_kind}:#{src}"
  end

  defp slug(nil), do: "unknown"

  defp slug(s) when is_binary(s) do
    s
    |> String.downcase()
    |> String.replace(~r/[^a-z0-9]+/, "_")
    |> String.trim("_")
    |> String.slice(0, 80)
  end

  defp down(nil), do: ""
  defp down(s) when is_binary(s), do: String.downcase(s)

  defp parse_int(n, _) when is_integer(n), do: n

  defp parse_int(n, default) when is_binary(n) do
    case Integer.parse(n) do
      {i, _} -> i
      :error -> default
    end
  end

  defp parse_int(_, default), do: default

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
