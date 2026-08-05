defmodule OpalCore.SocialFlow.DynamicIntelligence.Outcome do
  @moduledoc """
  Phase 3: experience completion, light reflection, scoped outcome learning.

  Elixir authority. Time alone cannot complete. Corrections outrank learning.
  Private constraints never enter shared outcome copy.
  """

  import Ecto.Query

  alias OpalCore.Repo
  alias OpalCore.Messaging.ConversationMember
  alias OpalCore.SocialFlow.DynamicIntelligence.{
    CollectiveFit,
    ExperienceCompletion,
    ExperienceOpportunity,
    Reflection,
    ScopedLearning,
    SocialContext
  }

  @learning_ttl_days 90
  @reflection_ttl_hours 48
  @stale_learning_days 60
  @forbidden_shared ~w(budget afford max_price price_band sensory area_a area_b area_c)

  # --- completion ---

  @doc """
  Explicit synthetic confirmation completes an experience.
  Rejects time-only completion and non-members.
  """
  def complete(attrs) when is_map(attrs) do
    conversation_id = fetch!(attrs, :conversation_id)
    user_id = fetch!(attrs, :user_id)
    opportunity_id = fetch!(attrs, :opportunity_id)
    idem = fetch!(attrs, :idempotency_key)
    evidence = Map.get(attrs, :evidence_class) || Map.get(attrs, "evidence_class") || "explicit_confirmation"
    label = Map.get(attrs, :continuity_label) || Map.get(attrs, "continuity_label") || "Happened"

    with :ok <- ensure_member(conversation_id, user_id),
         :ok <- reject_time_only(evidence),
         %ExperienceOpportunity{} = opp <- get_opp(opportunity_id, conversation_id) do
      case Repo.get_by(ExperienceCompletion, opportunity_id: opportunity_id) do
        %ExperienceCompletion{} = existing ->
          {:ok, project_completion(existing), :idempotent}

        nil ->
          case Repo.get_by(ExperienceCompletion, idempotency_key: idem) do
            %ExperienceCompletion{} = existing ->
              {:ok, project_completion(existing), :idempotent}

            nil ->
              do_complete(opp, user_id, idem, evidence, label)
          end
      end
    else
      nil -> {:error, :opportunity_not_found}
      {:error, _} = e -> e
    end
  end

  def complete(_), do: {:error, :invalid_input}

  def complete_from_time_alone(_attrs), do: {:error, :time_alone_cannot_complete}

  # --- reflection ---

  def maybe_surface_reflection(attrs) when is_map(attrs) do
    conversation_id = fetch!(attrs, :conversation_id)
    user_id = fetch!(attrs, :user_id)
    opportunity_id = fetch!(attrs, :opportunity_id)
    force_suppress = Map.get(attrs, :force_suppress) == true
    low_value = Map.get(attrs, :low_learning_value) == true

    with :ok <- ensure_member(conversation_id, user_id),
         %ExperienceCompletion{} = completion <-
           Repo.get_by(ExperienceCompletion, opportunity_id: opportunity_id) || :none do
      case Repo.get_by(Reflection, opportunity_id: opportunity_id) do
        %Reflection{status: "surfaced"} = r ->
          {:ok, project_reflection(r), :idempotent}

        %Reflection{status: "answered"} = r ->
          {:ok, project_reflection(r), :already_answered}

        %Reflection{status: "suppressed"} = r ->
          {:ok, quiet_reflection(conversation_id, r.suppression_reason), :suppressed}

        %Reflection{} = r ->
          decide_reflection(r, force_suppress, low_value, conversation_id)

        nil ->
          create_and_decide_reflection(completion, force_suppress, low_value)
      end
    else
      :none -> {:error, :not_completed}
      {:error, _} = e -> e
    end
  end

  def respond_to_reflection(attrs) when is_map(attrs) do
    conversation_id = fetch!(attrs, :conversation_id)
    user_id = fetch!(attrs, :user_id)
    reflection_id = fetch!(attrs, :reflection_id)
    response = attrs |> Map.get(:response) || Map.get(attrs, "response") || ""
    response = normalize_response(response)

    with :ok <- ensure_member(conversation_id, user_id),
         true <- response in Reflection.responses(),
         %Reflection{status: "surfaced"} = r <- Repo.get(Reflection, reflection_id),
         true <- r.conversation_id == conversation_id do
      now = now()

      {:ok, r} =
        r
        |> Reflection.changeset(%{
          status: "answered",
          response: response,
          responded_by_user_id: user_id,
          responded_at: now
        })
        |> Repo.update()

      learning =
        if response == "not_with_this_group" do
          suppress_group_learning(r)
        else
          accept_learning_from_reflection(r, response)
        end

      {:ok, %{reflection: project_reflection(r), learning: learning}}
    else
      false -> {:error, :invalid_response}
      nil -> {:error, :reflection_not_found}
      %Reflection{status: status} -> {:error, {:not_surfaced, status}}
      {:error, _} = e -> e
    end
  end

  # --- learning application to ranking ---

  @doc """
  Modest ranking influence from active scoped learnings for the participant set.
  Hard constraints remain authoritative via CollectiveFit.
  """
  def rank_with_learning(venues, participants, time_window, opts \\ []) do
    set_key = participant_set_key(participants)
    experience_type = Keyword.get(opts, :experience_type, "dinner")
    learnings = active_learnings(set_key, experience_type)

    {options, _preferred} = CollectiveFit.rank(venues, participants, time_window)

    options =
      options
      |> Enum.map(fn opt ->
        boost = learning_boost(opt, learnings)
        Map.put(opt, "fit_score_internal", (opt["fit_score_internal"] || 1.0) + boost)
      end)
      |> Enum.sort_by(fn o -> {-(o["fit_score_internal"] || 0), o["id"]} end)

    preferred = List.first(options)
    stripped = CollectiveFit.strip_internal_scores(options)
    preferred_public = preferred && hd(CollectiveFit.strip_internal_scores([preferred]))
    {stripped, preferred_public}
  end

  def active_learnings(participant_set_key, experience_type \\ "dinner") do
    now = now()
    decay_cutoff = DateTime.add(now, -@stale_learning_days * 86_400, :second)

    from(l in ScopedLearning,
      where: l.participant_set_key == ^participant_set_key,
      where: l.experience_type == ^experience_type,
      where: l.active == true,
      where: l.suppressed_by_correction == false,
      where: is_nil(l.expires_at) or l.expires_at > ^now,
      where: l.inserted_at > ^decay_cutoff
    )
    |> Repo.all()
  end

  def suppress_learning_for_group(participant_set_key, experience_type \\ "dinner") do
    from(l in ScopedLearning,
      where: l.participant_set_key == ^participant_set_key,
      where: l.experience_type == ^experience_type,
      where: l.active == true
    )
    |> Repo.update_all(
      set: [
        active: false,
        suppressed_by_correction: true,
        source: "suppressed",
        updated_at: now()
      ]
    )
  end

  # --- internals ---

  defp do_complete(opp, user_id, idem, evidence, label) do
    now = now()

    Repo.transaction(fn ->
      {:ok, completion} =
        %ExperienceCompletion{}
        |> ExperienceCompletion.changeset(%{
          opportunity_id: opp.id,
          conversation_id: opp.conversation_id,
          confirmed_by_user_id: user_id,
          status: "completed",
          continuity_label: label,
          evidence_class: evidence,
          idempotency_key: idem,
          completed_at: now,
          shared_safe_summary: "This kind of place worked well for this group.",
          preferred_candidate_id: opp.preferred_candidate_id
        })
        |> Repo.insert()

      _ =
        opp
        |> ExperienceOpportunity.changeset(%{
          status: "completed",
          journey_state: "happened",
          participation_summary: opp.participation_summary
        })
        |> Repo.update()

      assert_shared_safe!(completion.shared_safe_summary)
      project_completion(completion)
    end)
    |> case do
      {:ok, payload} -> {:ok, payload, :created}
      {:error, reason} -> {:error, reason}
    end
  end

  defp create_and_decide_reflection(completion, force_suppress, low_value) do
    now = now()
    expires = DateTime.add(now, @reflection_ttl_hours * 3600, :second)

    {:ok, r} =
      %Reflection{}
      |> Reflection.changeset(%{
        opportunity_id: completion.opportunity_id,
        completion_id: completion.id,
        conversation_id: completion.conversation_id,
        status: "eligible",
        prompt: "Would you choose a place like this again?",
        idempotency_key: "reflect-#{completion.id}",
        expires_at: expires
      })
      |> Repo.insert()

    decide_reflection(r, force_suppress, low_value, completion.conversation_id)
  end

  defp decide_reflection(r, force_suppress, low_value, conversation_id) do
    cond do
      force_suppress or low_value ->
        {:ok, r} =
          r
          |> Reflection.changeset(%{
            status: "suppressed",
            suppression_reason: if(low_value, do: "low_learning_value", else: "forced")
          })
          |> Repo.update()

        {:ok, quiet_reflection(conversation_id, r.suppression_reason), :suppressed}

      recent_reflection?(conversation_id) ->
        {:ok, _r} =
          r
          |> Reflection.changeset(%{
            status: "suppressed",
            suppression_reason: "recent_reflection"
          })
          |> Repo.update()

        {:ok, quiet_reflection(conversation_id, "recent_reflection"), :suppressed}

      true ->
        now = now()

        {:ok, r} =
          r
          |> Reflection.changeset(%{status: "surfaced", surfaced_at: now})
          |> Repo.update()

        {:ok, project_reflection(r), :surfaced}
    end
  end

  defp recent_reflection?(conversation_id) do
    since = DateTime.add(now(), -24 * 3600, :second)

    from(r in Reflection,
      where: r.conversation_id == ^conversation_id,
      where: r.status in ^~w(surfaced answered),
      where: r.surfaced_at > ^since,
      limit: 1
    )
    |> Repo.one()
    |> is_struct()
  end

  defp accept_learning_from_reflection(r, response) do
    opp = Repo.get!(ExperienceOpportunity, r.opportunity_id) |> Repo.preload(:social_context)
    set_key = participant_set_key_from_context(opp.social_context)
    now = now()
    expires = DateTime.add(now, @learning_ttl_days * 86_400, :second)
    conf = if response == "yes", do: 0.75, else: 0.45

    dims =
      [
        {"quiet_venue", "true"},
        {"similar_dinner", "true"},
        {"moderate_cost", "true"},
        {"timing", "evening"},
        {"balanced_travel", "true"}
      ]

    Enum.map(dims, fn {dim, value} ->
      idem = "learn-#{r.id}-#{dim}"

      case Repo.get_by(ScopedLearning, idempotency_key: idem) do
        %ScopedLearning{} = existing ->
          existing

        nil ->
          %ScopedLearning{}
          |> ScopedLearning.changeset(%{
            conversation_id: r.conversation_id,
            opportunity_id: r.opportunity_id,
            completion_id: r.completion_id,
            experience_type: "dinner",
            participant_set_key: set_key,
            dimension: dim,
            value: value,
            confidence: conf,
            active: true,
            source: "explicit_reflection",
            suppressed_by_correction: false,
            expires_at: expires,
            idempotency_key: idem
          })
          |> Repo.insert!()
      end
    end)
    |> then(fn list -> %{accepted: Enum.count(list), participant_set_key: set_key} end)
  end

  defp suppress_group_learning(r) do
    opp = Repo.get!(ExperienceOpportunity, r.opportunity_id) |> Repo.preload(:social_context)
    set_key = participant_set_key_from_context(opp.social_context)
    suppress_learning_for_group(set_key, "dinner")
    %{accepted: 0, suppressed: true, participant_set_key: set_key, global_label: false}
  end

  defp learning_boost(opt, learnings) when is_list(learnings) do
    Enum.reduce(learnings, 0.0, fn l, acc ->
      case l.dimension do
        "quiet_venue" -> acc + 0.08 * l.confidence
        "similar_dinner" -> acc + 0.06 * l.confidence
        "moderate_cost" -> acc + 0.04 * l.confidence
        "timing" -> acc + 0.03 * l.confidence
        "balanced_travel" -> acc + 0.03 * l.confidence
        _ -> acc
      end
      # Cap modest influence; never dominate hard constraints.
      |> min(0.25)
    end)
    |> then(fn b ->
      # Do not auto-pick same venue: slight penalty if exact same id was prior preferred.
      # (Optional: not applied here without prior preferred id)
      _ = opt
      b
    end)
  end

  defp learning_boost(_, _), do: 0.0

  defp reject_time_only("time_elapsed"), do: {:error, :time_alone_cannot_complete}
  defp reject_time_only("time_alone"), do: {:error, :time_alone_cannot_complete}
  defp reject_time_only("explicit_confirmation"), do: :ok
  defp reject_time_only(_), do: {:error, :invalid_evidence_class}

  defp get_opp(id, conversation_id) do
    case Repo.get(ExperienceOpportunity, id) do
      %ExperienceOpportunity{conversation_id: ^conversation_id} = opp -> opp
      _ -> nil
    end
  end

  defp project_completion(%ExperienceCompletion{} = c) do
    %{
      "id" => c.id,
      "opportunity_id" => c.opportunity_id,
      "conversation_id" => c.conversation_id,
      "status" => c.status,
      "continuity_label" => c.continuity_label,
      "shared_safe_summary" => c.shared_safe_summary,
      "evidence_class" => c.evidence_class,
      "completed_at" => datetime(c.completed_at),
      "quiet" => false
    }
  end

  defp project_reflection(%Reflection{} = r) do
    %{
      "id" => r.id,
      "opportunity_id" => r.opportunity_id,
      "conversation_id" => r.conversation_id,
      "status" => r.status,
      "prompt" => if(r.status == "surfaced", do: r.prompt, else: nil),
      "actions" =>
        if(r.status == "surfaced", do: ["yes", "maybe", "not_with_this_group"], else: []),
      "response" => r.response,
      "quiet" => r.status != "surfaced"
    }
  end

  defp quiet_reflection(conversation_id, reason) do
    %{
      "conversation_id" => conversation_id,
      "status" => "suppressed",
      "quiet" => true,
      "reason" => reason,
      "prompt" => nil,
      "actions" => []
    }
  end

  defp assert_shared_safe!(text) when is_binary(text) do
    low = String.downcase(text)

    if Enum.any?(@forbidden_shared, &String.contains?(low, &1)) do
      raise "private_leak_in_shared_outcome"
    end

    :ok
  end

  defp assert_shared_safe!(_), do: :ok

  defp participant_set_key(participants) when is_list(participants) do
    participants
    |> Enum.map(fn p ->
      p = if is_map(p), do: p, else: %{}
      Map.get(p, "user_id") || Map.get(p, :user_id)
    end)
    |> Enum.reject(&is_nil/1)
    |> Enum.map(&to_string/1)
    |> Enum.sort()
    |> Enum.join(",")
  end

  defp participant_set_key_from_context(%SocialContext{participant_user_ids: ids}) when is_list(ids) do
    ids |> Enum.map(&to_string/1) |> Enum.sort() |> Enum.join(",")
  end

  defp participant_set_key_from_context(_), do: ""

  defp normalize_response(r) when is_binary(r) do
    case String.downcase(String.trim(r)) do
      "yes" -> "yes"
      "maybe" -> "maybe"
      "not with this group" -> "not_with_this_group"
      "not_with_this_group" -> "not_with_this_group"
      other -> other
    end
  end

  defp normalize_response(_), do: ""

  defp ensure_member(conversation_id, user_id) do
    exists? =
      from(m in ConversationMember,
        where: m.conversation_id == ^conversation_id and m.user_id == ^user_id
      )
      |> Repo.exists?()

    if exists?, do: :ok, else: {:error, :not_a_member}
  end

  defp now, do: DateTime.utc_now() |> DateTime.truncate(:microsecond)
  defp datetime(nil), do: nil
  defp datetime(%DateTime{} = dt), do: DateTime.to_iso8601(dt)

  defp fetch!(map, key) do
    Map.get(map, key) || Map.get(map, Atom.to_string(key)) ||
      raise ArgumentError, "missing #{inspect(key)}"
  end
end
