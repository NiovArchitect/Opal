defmodule OpalCore.SocialFlow.DynamicIntelligence.Durable do
  @moduledoc """
  Phase 2 durable store for conversation-scoped experience intelligence.

  Elixir owns lifecycle, membership, privacy projection, correction memory,
  restraint cooldown, and expiry. Python still proposes only via Phase 1 path.
  """

  import Ecto.Query

  alias OpalCore.Repo
  alias OpalCore.Messaging.ConversationMember
  alias OpalCore.SocialFlow.DynamicIntelligence
  alias OpalCore.SocialFlow.DynamicIntelligence.Audience
  alias OpalCore.SocialFlow.DynamicIntelligence.Participation

  alias OpalCore.SocialFlow.DynamicIntelligence.{
    ContextCorrection,
    ExperienceCandidate,
    ExperienceOpportunity,
    Fixtures,
    ParticipationState,
    SocialContext
  }

  @active_opp_statuses ~w(eligible surfaced confirmed)
  @cooldown_hours 24
  @default_expiry_hours 72

  # --- evaluate + persist ---

  def evaluate_and_persist(attrs) when is_map(attrs) do
    requester = fetch!(attrs, :requester_user_id)
    conversation_id = fetch!(attrs, :conversation_id)
    input = build_input(attrs)
    evaluation_key = input[:idempotency_key] || input["idempotency_key"] || evaluation_key(input)

    with :ok <- ensure_member(conversation_id, requester),
         :ok <- ensure_participants_are_members(conversation_id, input) do
      case get_active_by_key(conversation_id, evaluation_key) do
        %ExperienceOpportunity{} = existing ->
          {:ok, project_for_user(existing.id, requester), :idempotent}

        nil ->
          if cooldown_or_suppressed?(conversation_id, input) do
            {:ok, quiet_payload(conversation_id), :suppressed}
          else
            persist_evaluation(conversation_id, requester, input, evaluation_key)
          end
      end
    end
  end

  def evaluate_and_persist(_), do: {:error, :invalid_input}

  # --- read ---

  def get_for_user(conversation_id, user_id) do
    with :ok <- ensure_member(conversation_id, user_id) do
      case get_active_opportunity(conversation_id) do
        nil ->
          {:ok, quiet_payload(conversation_id)}

        %ExperienceOpportunity{} = opp ->
          if expired?(opp) do
            _ = mark_expired(opp)
            {:ok, quiet_payload(conversation_id)}
          else
            if in_cooldown?(opp) and opp.status in ~w(dismissed suppressed) do
              {:ok, quiet_payload(conversation_id)}
            else
              {:ok, project_for_user(opp.id, user_id)}
            end
          end
      end
    end
  end

  # --- participation ---

  def record_participation(conversation_id, user_id, action, opts \\ []) do
    with :ok <- ensure_member(conversation_id, user_id) do
      case get_active_opportunity(conversation_id) do
        nil ->
          {:ok, quiet_payload(conversation_id)}

        %ExperienceOpportunity{} = opp ->
          if expired?(opp) do
            _ = mark_expired(opp)
            {:ok, quiet_payload(conversation_id)}
          else
            apply_participation(opp, conversation_id, user_id, action, opts)
          end
      end
    end
  end

  defp apply_participation(opp, conversation_id, user_id, action, opts) do
    action = to_string(action)

    if action in ParticipationState.states() do
      do_apply_participation(opp, conversation_id, user_id, action, opts)
    else
      {:error, :invalid_action}
    end
  end

  defp do_apply_participation(opp, conversation_id, user_id, action, opts) do
    private_reason =
      if action in ~w(not_this_time keep_private) do
        Keyword.get(opts, :private_reason)
      end

    now = now()

    {:ok, _} =
      %ParticipationState{}
      |> ParticipationState.changeset(%{
        opportunity_id: opp.id,
        conversation_id: conversation_id,
        user_id: user_id,
        state: action,
        private_reason: private_reason,
        responded_at: now
      })
      |> Repo.insert(
        on_conflict: {:replace, [:state, :private_reason, :responded_at, :updated_at]},
        conflict_target: [:opportunity_id, :user_id]
      )

    summary = recompute_participation_summary(opp.id)
    journey = recompute_journey_state(opp.id)

    status =
      cond do
        action == "not_this_time" and all_dismissed?(opp.id) -> "dismissed"
        journey == "ready" -> "confirmed"
        true -> opp.status
      end

    cooldown =
      if action == "not_this_time" do
        DateTime.add(now, @cooldown_hours * 3600, :second)
      else
        opp.cooldown_until
      end

    {:ok, updated} =
      opp
      |> ExperienceOpportunity.changeset(%{
        participation_summary: summary,
        journey_state: journey,
        status: status,
        dismissed_at: if(status == "dismissed", do: now, else: opp.dismissed_at),
        dismissal_reason:
          if(status == "dismissed", do: "not_this_time", else: opp.dismissal_reason),
        cooldown_until: cooldown,
        shared_projection: rebuild_shared_projection(opp, summary, journey)
      })
      |> Repo.update()

    if status == "dismissed" do
      {:ok, quiet_payload(conversation_id)}
    else
      {:ok, project_for_user(updated.id, user_id)}
    end
  end

  # --- correction ---

  def record_correction(conversation_id, user_id, text) when is_binary(text) do
    with :ok <- ensure_member(conversation_id, user_id),
         {:ok, kind} <- correction_kind(text) do
      opp = get_active_opportunity(conversation_id)
      participant_ids = if opp, do: load_participant_ids(opp), else: member_ids(conversation_id)
      set_key = participant_set_key(participant_ids)

      {:ok, correction} =
        %ContextCorrection{}
        |> ContextCorrection.changeset(%{
          conversation_id: conversation_id,
          social_context_id: opp && opp.social_context_id,
          opportunity_id: opp && opp.id,
          user_id: user_id,
          kind: kind,
          text: text,
          scope: "conversation_group",
          experience_type: "dinner",
          participant_set_key: set_key,
          duration: "until_revoked",
          audience: "self_and_context",
          reason_class: "user_correction",
          global_label: false,
          friendship_score_change: false,
          active: true
        })
        |> Repo.insert()

      if opp && kind in ~w(suppress_group_context suppress_opportunity_class) do
        now = now()

        _ =
          opp
          |> ExperienceOpportunity.changeset(%{
            status: "suppressed",
            dismissed_at: now,
            dismissal_reason: kind,
            cooldown_until: DateTime.add(now, @cooldown_hours * 3600, :second)
          })
          |> Repo.update()

        if opp.social_context_id do
          from(c in SocialContext, where: c.id == ^opp.social_context_id)
          |> Repo.update_all(
            set: [
              status: "suppressed",
              suppressed_at: now,
              suppression_reason: kind,
              updated_at: now
            ]
          )
        end
      end

      {:ok,
       %{
         "id" => correction.id,
         "kind" => correction.kind,
         "scope" => correction.scope,
         "experience_type" => correction.experience_type,
         "global_label" => false,
         "friendship_score_change" => false,
         "active" => true
       }}
    end
  end

  def record_correction(_, _, _), do: {:error, :invalid_correction}

  # --- dismiss ---

  def dismiss(conversation_id, user_id, reason \\ "not_this_time") do
    with :ok <- ensure_member(conversation_id, user_id) do
      case get_active_opportunity(conversation_id) do
        nil ->
          {:ok, quiet_payload(conversation_id)}

        %ExperienceOpportunity{} = opp ->
          now = now()

          {:ok, _} =
            %ParticipationState{}
            |> ParticipationState.changeset(%{
              opportunity_id: opp.id,
              conversation_id: conversation_id,
              user_id: user_id,
              state: "not_this_time",
              private_reason: reason,
              responded_at: now
            })
            |> Repo.insert(
              on_conflict: {:replace, [:state, :private_reason, :responded_at, :updated_at]},
              conflict_target: [:opportunity_id, :user_id]
            )

          {:ok, _} =
            opp
            |> ExperienceOpportunity.changeset(%{
              status: "dismissed",
              dismissed_at: now,
              dismissal_reason: reason,
              cooldown_until: DateTime.add(now, @cooldown_hours * 3600, :second),
              recent_suggestion_count: opp.recent_suggestion_count + 1,
              participation_summary: recompute_participation_summary(opp.id)
            })
            |> Repo.update()

          {:ok, quiet_payload(conversation_id)}
      end
    end
  end

  # --- expire ---

  def expire_stale(now \\ now()) do
    from(o in ExperienceOpportunity,
      where: o.status in ^@active_opp_statuses,
      where: not is_nil(o.expires_at) and o.expires_at < ^now
    )
    |> Repo.update_all(set: [status: "expired", updated_at: now])
  end

  # --- development dinner seed path ---

  def run_dinner_fixture_proof(opts \\ []) do
    conversation_id = Keyword.get(opts, :conversation_id, Fixtures.conversation_id_for_durable())
    requester = Keyword.get(opts, :requester_user_id, Fixtures.user_a_id())

    scenario =
      Fixtures.dinner_scenario(
        conversation_id: conversation_id,
        member_ids: Keyword.get(opts, :member_ids, Fixtures.member_ids()),
        idempotency_key: Keyword.get(opts, :idempotency_key, "dsi-phase2-dinner-1")
      )

    evaluate_and_persist(Map.put(scenario, :requester_user_id, requester))
  end

  # --- internals ---

  defp persist_evaluation(conversation_id, requester, input, evaluation_key) do
    case DynamicIntelligence.evaluate(Map.put(input, :idempotency_key, evaluation_key)) do
      {:ok, %{surface: :silence} = silence} ->
        _ = maybe_store_quiet_context(conversation_id, silence, evaluation_key, input)
        {:ok, quiet_payload(conversation_id, silence.reason), :silence}

      {:ok, %{surface: :opportunity} = result} ->
        Repo.transaction(fn ->
          now = now()
          expires = DateTime.add(now, @default_expiry_hours * 3600, :second)
          participant_ids = Enum.map(result.participants, & &1["user_id"])

          {:ok, ctx} =
            %SocialContext{}
            |> SocialContext.changeset(%{
              conversation_id: conversation_id,
              context_type: result.context["kind"] || "dinner_forming",
              status: "surfaced",
              confidence: result.context["confidence"] || 0.0,
              participant_user_ids: participant_ids,
              shared_facts: %{"activity" => result.context["activity"]},
              private_feature_refs: private_feature_refs(input),
              evaluation_key: evaluation_key,
              message_boundary: message_boundary(input),
              expires_at: expires
            })
            |> Repo.insert()

          shared = result.shared

          {:ok, opp} =
            %ExperienceOpportunity{}
            |> ExperienceOpportunity.changeset(%{
              social_context_id: ctx.id,
              conversation_id: conversation_id,
              status: "surfaced",
              headline: shared["headline"],
              supporting_explanation: shared["supporting_explanation"],
              see_why: shared["see_why"],
              preferred_candidate_id: result.preferred && result.preferred["id"],
              preferred_display_name: result.preferred && result.preferred["display_name"],
              journey_state: result.journey_state || "forming",
              participation_summary: nil,
              shared_projection: shared,
              last_surfaced_at: now,
              recent_suggestion_count: 1,
              expires_at: expires,
              evaluation_key: evaluation_key,
              version: 1
            })
            |> Repo.insert()

          result.options
          |> Enum.with_index(1)
          |> Enum.each(fn {opt, rank} ->
            %ExperienceCandidate{}
            |> ExperienceCandidate.changeset(%{
              opportunity_id: opp.id,
              candidate_key: opt["id"],
              display_name: opt["display_name"],
              rank: rank,
              group_safe_explanation: opt["group_safe_explanation"] || opt["explanation"] || "",
              preferred: opt["id"] == (result.preferred && result.preferred["id"]),
              fixture_snapshot: Map.take(opt, ["id", "display_name"])
            })
            |> Repo.insert!()
          end)

          Enum.each(participant_ids, fn uid ->
            %ParticipationState{}
            |> ParticipationState.changeset(%{
              opportunity_id: opp.id,
              conversation_id: conversation_id,
              user_id: uid,
              state: "undecided"
            })
            |> Repo.insert!()
          end)

          project_for_user(opp.id, requester)
        end)
        |> case do
          {:ok, payload} -> {:ok, payload, :created}
          {:error, reason} -> {:error, reason}
        end

      {:error, _} = err ->
        err
    end
  end

  defp maybe_store_quiet_context(conversation_id, silence, evaluation_key, input) do
    # Quiet is success: optionally record candidate context only when forming-ish metadata exists.
    if silence.context && silence.context["kind"] in ["weak_social", "ordinary", "unknown"] do
      :ok
    else
      now = now()

      %SocialContext{}
      |> SocialContext.changeset(%{
        conversation_id: conversation_id,
        context_type: (silence.context && silence.context["kind"]) || "unknown",
        status: "candidate",
        confidence: (silence.context && silence.context["confidence"]) || 0.0,
        participant_user_ids: input[:member_ids] || input["member_ids"] || [],
        shared_facts: %{"silence_reason" => silence.reason},
        private_feature_refs: %{},
        evaluation_key: evaluation_key <> ":quiet",
        message_boundary: message_boundary(input),
        expires_at: DateTime.add(now, 3600, :second)
      })
      |> Repo.insert()

      :ok
    end
  end

  defp project_for_user(opportunity_id, user_id) do
    opp =
      ExperienceOpportunity
      |> Repo.get!(opportunity_id)
      |> Repo.preload([:candidates, :participation_states, :social_context])

    members = member_ids(opp.conversation_id)

    if user_id in members do
      build_member_projection(opp, user_id)
    else
      quiet_payload(opp.conversation_id)
    end
  end

  defp build_member_projection(opp, user_id) do
    private = Enum.find(opp.participation_states, &(&1.user_id == user_id))
    shared = sanitize_shared(opp.shared_projection || %{})

    private_payload =
      case private do
        nil ->
          %{"state" => "undecided", "private_reason" => nil, "responded_at" => nil}

        row ->
          %{
            "state" => row.state,
            "responded_at" => datetime(row.responded_at),
            "private_reason" => row.private_reason
          }
      end

    %{
      "kind" => "opal_experience_moment",
      "conversation_id" => opp.conversation_id,
      "opportunity_id" => opp.id,
      "status" => opp.status,
      "headline" => opp.headline,
      "primary_option" => opp.preferred_display_name,
      "supporting_explanation" => opp.supporting_explanation,
      "see_why" => opp.see_why,
      "actions" => ["interested", "not_this_time", "see_why", "keep_private"],
      "journey_state" => opp.journey_state,
      "participation_summary" => opp.participation_summary,
      "options" =>
        opp.candidates
        |> Enum.sort_by(& &1.rank)
        |> Enum.map(fn c ->
          %{
            "id" => c.candidate_key,
            "display_name" => c.display_name,
            "explanation" => c.group_safe_explanation
          }
        end),
      "private_participation" => private_payload,
      "expires_at" => datetime(opp.expires_at),
      "not_a_chat_participant" => true,
      "surface" => "conversation_experience",
      "shared_projection" => shared,
      "quiet" => false
    }
  end

  defp sanitize_shared(shared) when is_map(shared) do
    case Audience.validate_shared_payload(shared) do
      :ok ->
        shared

      {:error, _} ->
        Map.drop(shared, ["see_why"]) |> Map.put("see_why", "Fits everyone’s current timing.")
    end
  end

  defp sanitize_shared(_), do: %{}

  defp quiet_payload(conversation_id, reason \\ "quiet") do
    %{
      "kind" => "quiet",
      "conversation_id" => conversation_id,
      "quiet" => true,
      "reason" => reason,
      "opportunity" => nil,
      "not_a_chat_participant" => true
    }
  end

  defp get_active_opportunity(conversation_id) do
    now = now()

    from(o in ExperienceOpportunity,
      where: o.conversation_id == ^conversation_id,
      where: o.status in ^@active_opp_statuses,
      where: is_nil(o.expires_at) or o.expires_at > ^now,
      order_by: [desc: o.inserted_at],
      limit: 1,
      preload: [:social_context, :candidates, :participation_states]
    )
    |> Repo.one()
  end

  defp get_active_by_key(conversation_id, evaluation_key) do
    now = now()

    from(o in ExperienceOpportunity,
      where: o.conversation_id == ^conversation_id,
      where: o.evaluation_key == ^evaluation_key,
      where: o.status in ^@active_opp_statuses,
      where: is_nil(o.expires_at) or o.expires_at > ^now,
      limit: 1
    )
    |> Repo.one()
  end

  defp cooldown_or_suppressed?(conversation_id, input) do
    now = now()
    set_key = participant_set_key(input[:member_ids] || input["member_ids"] || [])

    active_correction =
      from(c in ContextCorrection,
        where: c.conversation_id == ^conversation_id,
        where: c.active == true,
        where: c.kind in ^~w(suppress_group_context suppress_opportunity_class),
        where: is_nil(c.expires_at) or c.expires_at > ^now,
        where: c.participant_set_key == ^set_key or is_nil(c.participant_set_key),
        limit: 1
      )
      |> Repo.one()

    if active_correction do
      true
    else
      from(o in ExperienceOpportunity,
        where: o.conversation_id == ^conversation_id,
        where: o.status in ^~w(dismissed suppressed),
        where: not is_nil(o.cooldown_until) and o.cooldown_until > ^now,
        limit: 1
      )
      |> Repo.one()
      |> is_struct()
    end
  end

  defp recompute_participation_summary(opportunity_id) do
    states =
      from(p in ParticipationState, where: p.opportunity_id == ^opportunity_id)
      |> Repo.all()
      |> Map.new(&{&1.user_id, %{"state" => &1.state, "private_reason" => &1.private_reason}})

    Participation.shared_summary(states)
  end

  defp recompute_journey_state(opportunity_id) do
    states =
      from(p in ParticipationState, where: p.opportunity_id == ^opportunity_id)
      |> Repo.all()
      |> Map.new(&{&1.user_id, %{"state" => &1.state}})

    Participation.journey_state(states)
  end

  defp all_dismissed?(opportunity_id) do
    states =
      from(p in ParticipationState, where: p.opportunity_id == ^opportunity_id)
      |> Repo.all()

    states != [] and Enum.all?(states, &(&1.state == "not_this_time"))
  end

  defp rebuild_shared_projection(opp, summary, journey) do
    base = opp.shared_projection || %{}

    base
    |> Map.put("participation_summary", summary)
    |> Map.put("journey_state", journey)
  end

  defp private_feature_refs(input) do
    participants = input[:participants] || input["participants"] || []

    has_budget =
      Enum.any?(participants, fn p ->
        p = stringify(p)
        get_in(p, ["private_constraints", "max_price_band"]) != nil
      end)

    if has_budget, do: %{"has_private_budget_band" => true}, else: %{}
  end

  defp message_boundary(input) do
    messages = input[:messages] || input["messages"] || []

    messages
    |> Enum.map(fn m ->
      m = stringify(m)
      "#{m["user_id"]}:#{String.slice(m["body"] || "", 0, 40)}"
    end)
    |> Enum.join("|")
    |> then(fn s ->
      :crypto.hash(:sha256, s) |> Base.encode16(case: :lower) |> String.slice(0, 32)
    end)
  end

  defp evaluation_key(input) do
    cid = input[:conversation_id] || input["conversation_id"]
    boundary = message_boundary(input)
    "dsi:#{cid}:#{boundary}"
  end

  defp build_input(attrs) do
    base =
      if use_dinner_fixture?(attrs) do
        fixture_input(attrs)
      else
        custom_input(attrs)
      end

    base
    |> Map.put(:conversation_id, attr(attrs, :conversation_id) || base[:conversation_id])
    |> Map.put(:requester_user_id, attr(attrs, :requester_user_id))
  end

  defp use_dinner_fixture?(attrs) do
    case attr(attrs, :use_dinner_fixture, true) do
      false -> false
      "false" -> false
      _ -> true
    end
  end

  defp fixture_input(attrs) do
    Fixtures.dinner_scenario(
      conversation_id: attr(attrs, :conversation_id),
      member_ids: attr(attrs, :member_ids) || Fixtures.member_ids(),
      messages: attr(attrs, :messages) || Fixtures.dinner_messages(),
      participants: attr(attrs, :participants) || Fixtures.participants(),
      venues: attr(attrs, :venues) || Fixtures.venues(),
      time_window: attr(attrs, :time_window) || Fixtures.time_window(),
      idempotency_key: attr(attrs, :idempotency_key)
    )
  end

  defp custom_input(attrs) do
    %{
      conversation_id: attr(attrs, :conversation_id),
      member_ids: attr(attrs, :member_ids) || Fixtures.member_ids(),
      messages: attr(attrs, :messages) || [],
      participants: attr(attrs, :participants) || Fixtures.participants(),
      venues: attr(attrs, :venues) || Fixtures.venues(),
      time_window: attr(attrs, :time_window) || Fixtures.time_window(),
      corrections: attr(attrs, :corrections) || [],
      recent_suggestion_count: attr(attrs, :recent_suggestion_count) || 0,
      permission_revoked: attr(attrs, :permission_revoked) || false,
      python_proposal: attr(attrs, :python_proposal),
      idempotency_key: attr(attrs, :idempotency_key)
    }
  end

  defp attr(map, key, default \\ nil) do
    Map.get(map, key) || Map.get(map, Atom.to_string(key), default)
  end

  defp correction_kind(text) do
    n = text |> String.trim() |> String.downcase()

    cond do
      String.contains?(n, "not with this group") ->
        {:ok, "suppress_group_context"}

      String.contains?(n, "stop suggesting") ->
        {:ok, "suppress_opportunity_class"}

      String.contains?(n, "keep") and String.contains?(n, "private") ->
        {:ok, "keep_preference_private"}

      String.contains?(n, "ask me before") ->
        {:ok, "ask_before_surface"}

      true ->
        {:ok, "generic_correction"}
    end
  end

  defp participant_set_key(ids) when is_list(ids) do
    ids |> Enum.map(&to_string/1) |> Enum.sort() |> Enum.join(",")
  end

  defp load_participant_ids(%ExperienceOpportunity{} = opp) do
    ctx = opp.social_context || Repo.get(SocialContext, opp.social_context_id)
    (ctx && ctx.participant_user_ids) || []
  end

  defp member_ids(conversation_id) do
    from(m in ConversationMember,
      where: m.conversation_id == ^conversation_id,
      select: m.user_id
    )
    |> Repo.all()
  end

  defp member?(conversation_id, user_id), do: user_id in member_ids(conversation_id)

  defp ensure_member(conversation_id, user_id) do
    if member?(conversation_id, user_id), do: :ok, else: {:error, :not_a_member}
  end

  defp ensure_participants_are_members(conversation_id, input) do
    members = MapSet.new(member_ids(conversation_id))
    participants = input[:member_ids] || input["member_ids"] || []

    if Enum.all?(participants, &MapSet.member?(members, &1)) do
      :ok
    else
      {:error, :participant_not_member}
    end
  end

  defp expired?(%ExperienceOpportunity{expires_at: nil}), do: false

  defp expired?(%ExperienceOpportunity{expires_at: expires_at}) do
    DateTime.compare(expires_at, now()) == :lt
  end

  defp in_cooldown?(%ExperienceOpportunity{cooldown_until: nil}), do: false

  defp in_cooldown?(%ExperienceOpportunity{cooldown_until: until}) do
    DateTime.compare(until, now()) == :gt
  end

  defp mark_expired(opp) do
    opp
    |> ExperienceOpportunity.changeset(%{status: "expired"})
    |> Repo.update()
  end

  defp now, do: DateTime.utc_now() |> DateTime.truncate(:microsecond)

  defp datetime(nil), do: nil
  defp datetime(%DateTime{} = dt), do: DateTime.to_iso8601(dt)

  defp fetch!(map, key) do
    Map.get(map, key) || Map.get(map, Atom.to_string(key)) ||
      raise ArgumentError, "missing #{inspect(key)}"
  end

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), stringify_value(v)}
      {k, v} -> {to_string(k), stringify_value(v)}
    end)
  end

  defp stringify_value(v) when is_map(v), do: stringify(v)
  defp stringify_value(v), do: v
end
