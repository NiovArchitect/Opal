defmodule OpalCore.SocialFlow.Discovery do
  @moduledoc """
  Social Flow 5: intent-gated contextual experience discovery.

  Elixir owns intent, provider orchestration, hard constraints, selection,
  and handoff validation. Synthetic providers only. No payments or live ads.
  """

  import Ecto.Query

  alias OpalCore.Repo
  alias OpalCore.Messaging.ConversationMember
  alias OpalCore.SocialFlow.AuditEvent
  alias OpalCore.SocialFlow.GroupSharedPlan
  alias OpalCore.SocialFlow.SyntheticProviders

  alias OpalCore.SocialFlow.{
    DiscoveryIntent,
    DiscoveryOptionSet,
    DiscoveryRequest,
    ExperienceCandidate,
    ExperienceSelection,
    ExternalHandoff
  }

  @trace "trace-social-flow-5"
  @max_options 3
  @allowed_intent_sources ~w(explicit_request capability_enablement approved_prompt)

  # --- Intent gate ---

  def create_intent(attrs) do
    conversation_id = fetch!(attrs, :conversation_id)
    owner = fetch!(attrs, :owner_user_id)
    objective = Map.get(attrs, :objective_type) || "restaurant"
    source = Map.get(attrs, :source) || "explicit_request"
    plan_id = Map.get(attrs, :plan_id)
    idem = Map.get(attrs, :idempotency_key) || "dint-#{:erlang.phash2({conversation_id, owner})}"
    trace_id = Map.get(attrs, :trace_id) || @trace

    with :ok <- ensure_member(conversation_id, owner),
         true <- source in @allowed_intent_sources,
         :ok <- ensure_plan_allows_discovery(plan_id, conversation_id, owner),
         :ok <- ensure_not_duplicate_active(conversation_id, objective) do
      case Repo.get_by(DiscoveryIntent, idempotency_key: idem) do
        %DiscoveryIntent{} = existing ->
          {:ok, existing, :idempotent}

        nil ->
          {:ok, intent} =
            %DiscoveryIntent{}
            |> DiscoveryIntent.changeset(%{
              conversation_id: conversation_id,
              owner_user_id: owner,
              plan_id: plan_id,
              objective_type: objective,
              source: source,
              status: "approved",
              source_message_ids: Map.get(attrs, :source_message_ids) || [],
              consent_proof_id: Map.get(attrs, :consent_proof_id),
              idempotency_key: idem,
              expires_at:
                DateTime.add(DateTime.utc_now(), 86_400, :second)
                |> DateTime.truncate(:microsecond)
            })
            |> Repo.insert()

          audit!(
            conversation_id,
            owner,
            "discovery.intent.created",
            %{
              "intent_id" => intent.id,
              "source" => source,
              "objective_type" => objective
            },
            trace_id
          )

          {:ok, intent, :created}
      end
    else
      false -> {:error, :invalid_intent_source}
      {:error, _} = e -> e
    end
  end

  def deny_without_intent(_conversation_id, _user_id) do
    {:error, :intent_required}
  end

  # --- Discovery run ---

  def run_discovery(attrs) do
    conversation_id = fetch!(attrs, :conversation_id)
    user_id = fetch!(attrs, :user_id)
    intent_id = fetch!(attrs, :intent_id)
    request_type = Map.get(attrs, :request_type) || "restaurant"
    option_limit = min(Map.get(attrs, :option_limit) || @max_options, 5)
    hide_sponsored = Map.get(attrs, :hide_sponsored) || false
    include_sponsored = Map.get(attrs, :include_sponsored) || false
    hard = Map.get(attrs, :hard_constraints) || default_hard(request_type)
    soft = Map.get(attrs, :soft_preferences) || %{}

    geo =
      Map.get(attrs, :geographic_envelope) || %{"scope" => "neighborhood", "label" => "midtown"}

    idem = Map.get(attrs, :idempotency_key) || "dreq-#{intent_id}-#{:erlang.phash2(hard)}"
    trace_id = Map.get(attrs, :trace_id) || @trace
    plan_id = Map.get(attrs, :plan_id)
    time_window = Map.get(attrs, :agreed_time_window)

    with :ok <- ensure_member(conversation_id, user_id),
         %DiscoveryIntent{} = intent <- Repo.get(DiscoveryIntent, intent_id),
         true <- intent.conversation_id == conversation_id,
         true <- intent.status in ~w(approved active),
         true <- is_nil(intent.revoked_at) do
      case Repo.get_by(DiscoveryRequest, idempotency_key: idem) do
        %DiscoveryRequest{status: "completed"} = existing ->
          reload_completed(existing)

        %DiscoveryRequest{} = existing when existing.status in ~w(pending running) ->
          {:ok, existing, :idempotent}

        nil ->
          disclosure = provider_disclosure(hard, soft, geo)

          {:ok, request} =
            %DiscoveryRequest{}
            |> DiscoveryRequest.changeset(%{
              intent_id: intent.id,
              conversation_id: conversation_id,
              requested_by_user_id: user_id,
              plan_id: plan_id || intent.plan_id,
              request_type: request_type,
              agreed_time_window: time_window,
              geographic_envelope: geo,
              participant_count:
                Map.get(attrs, :participant_count) || member_count(conversation_id),
              option_limit: option_limit,
              status: "running",
              provider_strategy: "synthetic",
              hard_constraints: hard,
              soft_preferences: soft,
              provider_disclosure: disclosure,
              hide_sponsored: hide_sponsored,
              idempotency_key: idem
            })
            |> Repo.insert()

          intent
          |> DiscoveryIntent.changeset(%{status: "active"})
          |> Repo.update()

          case execute_provider_and_rank(
                 request,
                 include_sponsored,
                 hide_sponsored,
                 hard,
                 soft,
                 option_limit,
                 user_id,
                 trace_id
               ) do
            {:ok, result} -> {:ok, result, :created}
            {:error, reason} -> fail_request(request, reason, trace_id)
          end
      end
    else
      nil -> {:error, :intent_not_found}
      false -> {:error, :forbidden}
      {:error, _} = e -> e
    end
  end

  defp execute_provider_and_rank(
         request,
         include_sponsored,
         hide_sponsored,
         hard,
         soft,
         option_limit,
         user_id,
         trace_id
       ) do
    with {:ok, raw} <-
           SyntheticProviders.search_experiences(%{
             request_type: request.request_type,
             include_sponsored: include_sponsored
           }),
         {:ok, validated} <- validate_candidates(raw),
         scored <- evaluate_and_score(validated, hard, soft),
         eligible <- Enum.filter(scored, & &1.hard_pass),
         visible <- maybe_hide_sponsored(eligible, hide_sponsored),
         ranked <- rank_diverse(visible, soft),
         top <- Enum.take(ranked, option_limit) do
      if top == [] do
        create_no_match_set(request, scored, user_id, trace_id)
      else
        persist_option_set(request, scored, top, user_id, trace_id)
      end
    end
  end

  defp create_no_match_set(request, scored, user_id, trace_id) do
    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)
    copy = "I couldn’t find an option that satisfies every requirement."

    Repo.transaction(fn ->
      Enum.each(scored, fn c -> insert_candidate!(request.id, c, false) end)

      {:ok, set} =
        %DiscoveryOptionSet{}
        |> DiscoveryOptionSet.changeset(%{
          request_id: request.id,
          conversation_id: request.conversation_id,
          version: next_version(request.conversation_id),
          candidate_ids: [],
          status: "active",
          no_match: true,
          no_match_copy: copy
        })
        |> Repo.insert()

      request
      |> DiscoveryRequest.changeset(%{status: "completed", completed_at: now})
      |> Repo.update!()

      supersede_prior_sets(request.conversation_id, set.id)

      broadcast(
        request.conversation_id,
        "social_flow:discovery_options",
        %{
          "option_set" => DiscoveryOptionSet.to_contract(set),
          "options" => [],
          "no_match" => true,
          "copy" => copy,
          "next_actions" => [
            "change one constraint",
            "expand area",
            "change time",
            "keep searching later",
            "leave unresolved"
          ]
        },
        trace_id
      )

      audit!(
        request.conversation_id,
        user_id,
        "discovery.no_match",
        %{
          "request_id" => request.id,
          "option_set_id" => set.id
        },
        trace_id
      )

      %{request: request, option_set: set, options: [], no_match: true}
    end)
  end

  defp persist_option_set(request, all_scored, top, user_id, trace_id) do
    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

    Repo.transaction(fn ->
      # Persist all evaluated for audit; only top are options
      all_ids =
        Enum.map(all_scored, fn c ->
          hard? = Enum.any?(top, &(&1.provider_candidate_id == c.provider_candidate_id))
          insert_candidate!(request.id, c, hard? and c.hard_pass)
        end)

      top_ids =
        Enum.map(top, fn c ->
          Enum.find_value(all_ids, fn cand ->
            if cand.provider_candidate_id == c.provider_candidate_id, do: cand.id
          end)
        end)
        |> Enum.reject(&is_nil/1)

      # Mark top as option status
      from(c in ExperienceCandidate, where: c.id in ^top_ids)
      |> Repo.update_all(set: [status: "option"])

      options =
        from(c in ExperienceCandidate, where: c.id in ^top_ids)
        |> Repo.all()
        |> Enum.sort_by(& &1.rank_score, :desc)

      {:ok, set} =
        %DiscoveryOptionSet{}
        |> DiscoveryOptionSet.changeset(%{
          request_id: request.id,
          conversation_id: request.conversation_id,
          version: next_version(request.conversation_id),
          candidate_ids: Enum.map(options, & &1.id),
          status: "active",
          no_match: false
        })
        |> Repo.insert()

      request
      |> DiscoveryRequest.changeset(%{status: "completed", completed_at: now})
      |> Repo.update!()

      supersede_prior_sets(request.conversation_id, set.id)

      public = Enum.map(options, &ExperienceCandidate.to_public_contract/1)

      broadcast(
        request.conversation_id,
        "social_flow:discovery_options",
        %{
          "option_set" => DiscoveryOptionSet.to_contract(set),
          "options" => public,
          "no_match" => false,
          "copy" => "Here are #{length(public)} options that fit the plan."
        },
        trace_id
      )

      audit!(
        request.conversation_id,
        user_id,
        "discovery.options.created",
        %{
          "request_id" => request.id,
          "option_set_id" => set.id,
          "count" => length(public),
          "sponsored_count" => Enum.count(public, &(&1["sponsorship_state"] == "sponsored")),
          "provider_disclosure_keys" => Map.keys(request.provider_disclosure || %{})
        },
        trace_id
      )

      %{request: request, option_set: set, options: options, no_match: false}
    end)
  end

  # --- Selection ---

  def propose_selection(attrs) do
    option_set_id = fetch!(attrs, :option_set_id)
    candidate_id = fetch!(attrs, :candidate_id)
    user_id = fetch!(attrs, :user_id)
    idem = Map.get(attrs, :idempotency_key) || "dsel-#{option_set_id}-#{candidate_id}"
    trace_id = Map.get(attrs, :trace_id) || @trace

    with %DiscoveryOptionSet{} = set <- Repo.get(DiscoveryOptionSet, option_set_id),
         :ok <- ensure_member(set.conversation_id, user_id),
         true <- set.status == "active",
         true <- candidate_id in (set.candidate_ids || []),
         %ExperienceCandidate{} = cand <- Repo.get(ExperienceCandidate, candidate_id),
         true <- cand.hard_constraint_pass do
      case Repo.get_by(ExperienceSelection, idempotency_key: idem) do
        %ExperienceSelection{} = s ->
          {:ok, s, :idempotent}

        nil ->
          members = member_ids(set.conversation_id)
          required = Enum.reject(members, &(&1 == user_id))
          now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

          state =
            if required == [] do
              "confirmed"
            else
              "awaiting_approvals"
            end

          {:ok, sel} =
            %ExperienceSelection{}
            |> ExperienceSelection.changeset(%{
              option_set_id: set.id,
              candidate_id: candidate_id,
              selected_by_user_id: user_id,
              selection_state: state,
              required_approvals: required,
              approvals: if(required == [], do: %{}, else: %{user_id => "accept"}),
              selected_at: now,
              confirmed_at: if(state == "confirmed", do: now),
              idempotency_key: idem
            })
            |> Repo.insert()

          result =
            if state == "confirmed" do
              confirm_selection_effects(set, cand, sel, user_id, trace_id)
            else
              %{selection: sel, plan: nil}
            end

          broadcast(
            set.conversation_id,
            "social_flow:discovery_selection",
            %{
              "selection" => ExperienceSelection.to_contract(sel),
              "candidate" => ExperienceCandidate.to_public_contract(cand)
            },
            trace_id
          )

          {:ok, result, :created}
      end
    else
      nil -> {:error, :not_found}
      false -> {:error, :forbidden}
      {:error, _} = e -> e
    end
  end

  def respond_selection(attrs) do
    selection_id = fetch!(attrs, :selection_id)
    user_id = fetch!(attrs, :user_id)
    decision = fetch!(attrs, :decision)
    trace_id = Map.get(attrs, :trace_id) || @trace

    with %ExperienceSelection{} = sel <- Repo.get(ExperienceSelection, selection_id),
         %DiscoveryOptionSet{} = set <- Repo.get(DiscoveryOptionSet, sel.option_set_id),
         :ok <- ensure_member(set.conversation_id, user_id),
         true <- sel.selection_state == "awaiting_approvals",
         true <- user_id in sel.required_approvals do
      approvals = Map.put(sel.approvals || %{}, user_id, decision)
      now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

      cond do
        decision == "reject" ->
          {:ok, sel} =
            sel
            |> ExperienceSelection.changeset(%{selection_state: "rejected", approvals: approvals})
            |> Repo.update()

          {:ok, %{selection: sel, plan: nil}}

        Enum.all?(sel.required_approvals, fn uid -> approvals[uid] == "accept" end) ->
          {:ok, sel} =
            sel
            |> ExperienceSelection.changeset(%{
              selection_state: "confirmed",
              approvals: approvals,
              confirmed_at: now
            })
            |> Repo.update()

          cand = Repo.get!(ExperienceCandidate, sel.candidate_id)
          {:ok, confirm_selection_effects(set, cand, sel, user_id, trace_id)}

        true ->
          {:ok, sel} =
            sel
            |> ExperienceSelection.changeset(%{approvals: approvals})
            |> Repo.update()

          {:ok, %{selection: sel, plan: nil}}
      end
    else
      nil -> {:error, :not_found}
      false -> {:error, :forbidden}
      {:error, _} = e -> e
    end
  end

  defp confirm_selection_effects(set, cand, sel, actor, trace_id) do
    set
    |> DiscoveryOptionSet.changeset(%{
      status: "selected",
      selected_candidate_id: cand.id
    })
    |> Repo.update!()

    cand
    |> ExperienceCandidate.changeset(%{status: "selected"})
    |> Repo.update!()

    plan =
      case set.request_id && Repo.get(DiscoveryRequest, set.request_id) do
        %DiscoveryRequest{plan_id: plan_id} when is_binary(plan_id) ->
          case Repo.get(GroupSharedPlan, plan_id) do
            %GroupSharedPlan{} = plan ->
              {:ok, plan} =
                plan
                |> GroupSharedPlan.changeset(%{location: cand.display_name})
                |> Repo.update()

              plan

            _ ->
              nil
          end

        _ ->
          nil
      end

    audit!(
      set.conversation_id,
      actor,
      "discovery.selection.confirmed",
      %{
        "selection_id" => sel.id,
        "candidate_id" => cand.id,
        "plan_location_updated" => not is_nil(plan)
      },
      trace_id
    )

    broadcast(
      set.conversation_id,
      "social_flow:discovery_selection",
      %{
        "selection" => ExperienceSelection.to_contract(sel),
        "candidate" => ExperienceCandidate.to_public_contract(cand),
        "plan_location" => plan && plan.location
      },
      trace_id
    )

    %{selection: sel, plan: plan, candidate: cand}
  end

  # --- Handoff ---

  def create_handoff(attrs) do
    candidate_id = fetch!(attrs, :candidate_id)
    user_id = fetch!(attrs, :user_id)
    conversation_id = fetch!(attrs, :conversation_id)
    idem = Map.get(attrs, :idempotency_key) || "handoff-#{candidate_id}-#{user_id}"
    trace_id = Map.get(attrs, :trace_id) || @trace

    with :ok <- ensure_member(conversation_id, user_id),
         %ExperienceCandidate{} = cand <- Repo.get(ExperienceCandidate, candidate_id),
         true <- cand.status == "selected",
         {:ok, url} <- SyntheticProviders.validate_handoff_url(cand.handoff_url) do
      case Repo.get_by(ExternalHandoff, idempotency_key: idem) do
        %ExternalHandoff{} = h ->
          {:ok, h, :idempotent}

        nil ->
          {:ok, h} =
            %ExternalHandoff{}
            |> ExternalHandoff.changeset(%{
              candidate_id: cand.id,
              owner_user_id: user_id,
              conversation_id: conversation_id,
              provider_id: cand.provider_id,
              destination_class: "reservation_view",
              validated_url: url,
              status: "ready",
              leaving_opal_copy: "You are leaving Opal.",
              idempotency_key: idem
            })
            |> Repo.insert()

          audit!(
            conversation_id,
            user_id,
            "discovery.handoff.created",
            %{
              "handoff_id" => h.id,
              "candidate_id" => cand.id,
              "provider_id" => cand.provider_id
            },
            trace_id
          )

          {:ok, h, :created}
      end
    else
      nil -> {:error, :not_found}
      false -> {:error, :not_selected}
      {:error, _} = e -> e
    end
  end

  def open_handoff(%{handoff_id: id, user_id: user_id}) do
    with %ExternalHandoff{} = h <- Repo.get(ExternalHandoff, id),
         true <- h.owner_user_id == user_id,
         true <- h.status in ~w(ready opened) do
      now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

      h
      |> ExternalHandoff.changeset(%{status: "opened", opened_at: now})
      |> Repo.update()
    else
      nil -> {:error, :not_found}
      false -> {:error, :forbidden}
    end
  end

  def mark_reservation_booked(%{handoff_id: id, user_id: user_id}) do
    with %ExternalHandoff{} = h <- Repo.get(ExternalHandoff, id),
         true <- h.owner_user_id == user_id do
      now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

      h
      |> ExternalHandoff.changeset(%{status: "completed_manually", completed_manually_at: now})
      |> Repo.update()
    else
      nil -> {:error, :not_found}
      false -> {:error, :forbidden}
    end
  end

  def reject_malicious_url(url), do: SyntheticProviders.validate_handoff_url(url)

  # --- Sync / privacy ---

  def sync_discovery(user_id, conversation_id) do
    with :ok <- ensure_member(conversation_id, user_id) do
      sets =
        from(s in DiscoveryOptionSet,
          where: s.conversation_id == ^conversation_id and s.status in ~w(active selected),
          order_by: [desc: s.version],
          limit: 5
        )
        |> Repo.all()

      options =
        sets
        |> Enum.flat_map(fn s ->
          from(c in ExperienceCandidate, where: c.id in ^s.candidate_ids)
          |> Repo.all()
          |> Enum.map(&ExperienceCandidate.to_public_contract/1)
        end)

      {:ok,
       %{
         "option_sets" => Enum.map(sets, &DiscoveryOptionSet.to_contract/1),
         "options" => options,
         "no_raw_messages" => true,
         "no_private_budget_values" => true
       }}
    end
  end

  def get_option_set_for_user(set_id, user_id) do
    case Repo.get(DiscoveryOptionSet, set_id) do
      %DiscoveryOptionSet{} = set ->
        if member?(set.conversation_id, user_id), do: {:ok, set}, else: {:error, :forbidden}

      nil ->
        {:error, :not_found}
    end
  end

  # --- Ranking / constraints ---

  defp validate_candidates(list) when is_list(list) do
    validated =
      Enum.reduce_while(list, [], fn raw, acc ->
        case validate_one(raw) do
          {:ok, c} -> {:cont, [c | acc]}
          {:error, _} -> {:cont, acc}
        end
      end)
      |> Enum.reverse()

    {:ok, validated}
  end

  defp validate_one(raw) when is_map(raw) do
    name = raw["display_name"] || ""
    url = raw["handoff_url"]
    sponsorship = raw["sponsorship_state"] || "organic"

    cond do
      byte_size(name) < 1 or byte_size(name) > 120 ->
        {:error, :invalid_name}

      sponsorship not in ~w(organic sponsored) ->
        {:error, :invalid_sponsorship}

      match?({:error, _}, SyntheticProviders.validate_handoff_url(url)) ->
        {:error, :bad_url}

      true ->
        {:ok, normalize_raw(raw)}
    end
  end

  defp validate_one(_), do: {:error, :invalid_payload}

  defp normalize_raw(raw) do
    %{
      provider_id: raw["provider_id"],
      provider_candidate_id: raw["provider_candidate_id"],
      experience_type: raw["experience_type"],
      display_name: raw["display_name"],
      category: raw["category"],
      geographic_summary: raw["geographic_summary"],
      travel_estimate: raw["travel_estimate"],
      price_band: raw["price_band"],
      accessibility_attributes: raw["accessibility_attributes"] || %{},
      dietary_attributes: raw["dietary_attributes"] || %{},
      availability_state: raw["availability_state"] || "unknown",
      availability_checked_at: raw["availability_checked_at"],
      sponsorship_state: raw["sponsorship_state"] || "organic",
      sponsor_label:
        raw["sponsor_label"] || if(raw["sponsorship_state"] == "sponsored", do: "Sponsored"),
      handoff_url: raw["handoff_url"],
      normalized_facts: raw["normalized_facts"] || %{}
    }
  end

  defp evaluate_and_score(candidates, hard, soft) do
    Enum.map(candidates, fn c ->
      {pass, reasons} = hard_pass?(c, hard)
      score = if pass, do: soft_score(c, soft), else: -1.0
      explanation = build_explanation(c, hard, soft, pass, reasons)

      Map.merge(c, %{
        hard_pass: pass,
        rank_score: score,
        explanation: explanation,
        status: if(pass, do: "eligible", else: "filtered_out")
      })
    end)
  end

  defp hard_pass?(c, hard) do
    reasons = []

    reasons =
      if hard["require_accessible_parking"] == true do
        if Map.get(c.accessibility_attributes, "accessible_parking") == true or
             Map.get(c.accessibility_attributes, "fit") == "meets_accessibility" do
          reasons
        else
          ["accessibility" | reasons]
        end
      else
        reasons
      end

    reasons =
      if hard["require_vegetarian"] == true do
        if Map.get(c.dietary_attributes, "vegetarian_options") == true or
             Map.get(c.dietary_attributes, "fit") == "meets_dietary" do
          reasons
        else
          ["dietary" | reasons]
        end
      else
        reasons
      end

    reasons =
      if max_band = hard["max_price_band"] do
        if price_rank(c.price_band) <= price_rank(max_band) do
          reasons
        else
          ["budget" | reasons]
        end
      else
        reasons
      end

    reasons =
      if hard["require_outdoor"] == true do
        if Map.get(c.normalized_facts, "outdoor") == true,
          do: reasons,
          else: ["outdoor" | reasons]
      else
        reasons
      end

    {reasons == [], reasons}
  end

  defp soft_score(c, soft) do
    base = 1.0

    base =
      if soft["prefer_quiet"] == true and Map.get(c.normalized_facts, "quiet") == true,
        do: base + 0.3,
        else: base

    base =
      if soft["prefer_outdoor"] == true and Map.get(c.normalized_facts, "outdoor") == true,
        do: base + 0.3,
        else: base

    base = if c.sponsorship_state == "sponsored", do: base + 0.05, else: base + 0.15
    base = base + max(0.0, 0.2 - price_rank(c.price_band) * 0.05)
    Float.round(base, 3)
  end

  defp build_explanation(c, hard, soft, pass, reasons) do
    if pass do
      parts = []

      parts =
        if hard["require_accessible_parking"] == true,
          do: ["accessible parking" | parts],
          else: parts

      parts =
        if hard["require_vegetarian"] == true, do: ["dietary needs" | parts], else: parts

      parts =
        if is_binary(hard["max_price_band"]),
          do: ["fits the group’s budget preferences" | parts],
          else: parts

      parts =
        if soft["prefer_quiet"] == true and Map.get(c.normalized_facts, "quiet") == true,
          do: ["quiet setting" | parts],
          else: parts

      parts =
        if soft["prefer_outdoor"] == true and Map.get(c.normalized_facts, "outdoor") == true,
          do: ["outdoor option" | parts],
          else: parts

      parts =
        if is_binary(c.travel_estimate), do: ["travel #{c.travel_estimate}" | parts], else: parts

      if parts == [] do
        "Matches the plan constraints."
      else
        "Fits: #{Enum.join(Enum.reverse(parts), "; ")}."
      end
    else
      "Does not meet: #{Enum.join(reasons, ", ")}"
    end
  end

  defp rank_diverse(list, _soft) do
    # Score order with slight organic boost so sponsorship cannot silently win
    Enum.sort_by(
      list,
      fn c ->
        organic_boost = if c.sponsorship_state == "organic", do: 1.0, else: 0.0
        {c.rank_score + organic_boost * 0.01, c.rank_score}
      end,
      :desc
    )
  end

  defp maybe_hide_sponsored(list, true),
    do: Enum.reject(list, &(&1.sponsorship_state == "sponsored"))

  defp maybe_hide_sponsored(list, _), do: list

  defp price_rank(band) do
    case band do
      "free" -> 0
      "$" -> 1
      "$$" -> 2
      "$$$" -> 3
      "$$$$" -> 4
      _ -> 2
    end
  end

  defp default_hard("restaurant") do
    %{
      "require_accessible_parking" => true,
      "require_vegetarian" => true,
      "max_price_band" => "$$$"
    }
  end

  defp default_hard("activity") do
    %{"require_accessible_parking" => false}
  end

  defp default_hard(_), do: %{}

  defp provider_disclosure(hard, soft, geo) do
    %{
      "disclosed" => [
        "party_size",
        "time_window",
        "coarse_area",
        "normalized_accessibility",
        "normalized_dietary",
        "price_band",
        "category"
      ],
      "not_disclosed" => [
        "raw_conversation",
        "participant_names",
        "phone_numbers",
        "private_budget_exact",
        "relationship_labels",
        "emotional_state",
        "social_score"
      ],
      "hard_keys" => Map.keys(hard || %{}),
      "soft_keys" => Map.keys(soft || %{}),
      "geo_scope" => Map.get(geo || %{}, "scope")
    }
  end

  defp insert_candidate!(request_id, c, as_option?) do
    {:ok, cand} =
      %ExperienceCandidate{}
      |> ExperienceCandidate.changeset(%{
        request_id: request_id,
        provider_id: c.provider_id,
        provider_candidate_id: c.provider_candidate_id,
        experience_type: c.experience_type,
        display_name: c.display_name,
        category: c.category,
        geographic_summary: c.geographic_summary,
        travel_estimate: c.travel_estimate,
        price_band: c.price_band,
        accessibility_attributes: c.accessibility_attributes,
        dietary_attributes: c.dietary_attributes,
        availability_state: c.availability_state,
        availability_checked_at: c.availability_checked_at,
        sponsorship_state: c.sponsorship_state,
        sponsor_label: c.sponsor_label,
        handoff_url: c.handoff_url,
        normalized_facts: c.normalized_facts,
        hard_constraint_pass: c.hard_pass,
        explanation: c.explanation,
        rank_score: c.rank_score,
        status:
          if(as_option? and c.hard_pass,
            do: "option",
            else: if(c.hard_pass, do: "eligible", else: "filtered_out")
          )
      })
      |> Repo.insert()

    cand
  end

  defp next_version(conversation_id) do
    from(s in DiscoveryOptionSet,
      where: s.conversation_id == ^conversation_id,
      select: max(s.version)
    )
    |> Repo.one()
    |> case do
      nil -> 1
      n -> n + 1
    end
  end

  defp supersede_prior_sets(conversation_id, keep_id) do
    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

    from(s in DiscoveryOptionSet,
      where: s.conversation_id == ^conversation_id and s.id != ^keep_id and s.status == "active"
    )
    |> Repo.update_all(set: [status: "superseded", superseded_at: now])
  end

  defp reload_completed(%DiscoveryRequest{} = request) do
    set =
      from(s in DiscoveryOptionSet,
        where: s.request_id == ^request.id,
        order_by: [desc: s.version],
        limit: 1
      )
      |> Repo.one()

    options =
      if set do
        from(c in ExperienceCandidate, where: c.id in ^set.candidate_ids) |> Repo.all()
      else
        []
      end

    {:ok, %{request: request, option_set: set, options: options, no_match: set && set.no_match},
     :idempotent}
  end

  defp fail_request(request, reason, _trace_id) do
    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

    request
    |> DiscoveryRequest.changeset(%{
      status: "failed",
      failed_at: now,
      failure_reason: to_string(reason)
    })
    |> Repo.update()

    {:error, reason}
  end

  defp ensure_plan_allows_discovery(nil, _conversation_id, _user_id), do: :ok

  defp ensure_plan_allows_discovery(plan_id, conversation_id, user_id) do
    case Repo.get(GroupSharedPlan, plan_id) do
      %GroupSharedPlan{conversation_id: ^conversation_id} = plan ->
        if user_id in (plan.participant_ids || []) do
          :ok
        else
          {:error, :not_plan_participant}
        end

      %GroupSharedPlan{} ->
        {:error, :forbidden}

      nil ->
        {:error, :plan_not_found}
    end
  end

  defp ensure_not_duplicate_active(conversation_id, objective) do
    active =
      from(i in DiscoveryIntent,
        where:
          i.conversation_id == ^conversation_id and i.objective_type == ^objective and
            i.status in ^["approved", "active"] and is_nil(i.revoked_at)
      )
      |> Repo.exists?()

    # Allow re-request; suppression only for identical idempotency
    _ = active
    :ok
  end

  defp member_ids(conversation_id) do
    from(m in ConversationMember,
      where: m.conversation_id == ^conversation_id,
      select: m.user_id
    )
    |> Repo.all()
  end

  defp member_count(conversation_id), do: length(member_ids(conversation_id))

  defp member?(conversation_id, user_id) do
    from(m in ConversationMember,
      where: m.conversation_id == ^conversation_id and m.user_id == ^user_id
    )
    |> Repo.exists?()
  end

  defp ensure_member(conversation_id, user_id) do
    if member?(conversation_id, user_id), do: :ok, else: {:error, :not_a_member}
  end

  defp fetch!(attrs, key) do
    Map.get(attrs, key) || Map.get(attrs, to_string(key)) ||
      raise ArgumentError, "missing #{inspect(key)}"
  end

  defp audit!(conversation_id, actor, event_type, payload, trace_id) do
    %AuditEvent{}
    |> AuditEvent.changeset(%{
      conversation_id: conversation_id,
      actor_user_id: actor,
      event_type: event_type,
      payload: payload,
      trace_id: trace_id
    })
    |> Repo.insert!()
  end

  defp broadcast(conversation_id, event, payload, trace_id) do
    OpalCoreWeb.Endpoint.broadcast(
      "conversation:#{conversation_id}",
      event,
      Map.put(payload, "trace_id", trace_id)
    )
  end
end
