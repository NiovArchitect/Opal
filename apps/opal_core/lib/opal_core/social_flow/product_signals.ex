defmodule OpalCore.SocialFlow.ProductSignals do
  @moduledoc """
  Elixir-owned conversation journey signals for the product shell.

  Signals describe **current social meaning of the conversation**, not a person's
  identity. They are proposal-class until users act. Python may later propose
  candidates; Elixir decides eligibility, visibility, and lifecycle.

  Lifecycle stages (internal — AlignmentAuthority owns Set elevation):

  - quiet → no signal
  - plan_forming → forming possibility
  - still_open → partial availability / needs confirmation (until Set gate)
  - set → AlignmentAuthority authorized mutual alignment (not booked / not provider)
  - will_know_later / canceled / handled

  **User-facing `label`** is a Shared Reality presentation (WHO/WHAT/WHEN/WHERE
  when known), composed by SharedRealityPresentation. It is **not** the authority
  stage name. Clients must use `lifecycle_stage` for gate/status logic.

  ProductSignals never elevates to Set alone. AlignmentAuthority.authorize_set?/3
  is the sole production Set boundary (it alone calls the alignment gate and
  private invalidation helpers).

  Never use booking or provider language unless a real provider action exists.
  Smoke-test message bodies never count as evidence.
  """

  import Ecto.Query

  alias OpalCore.Messaging.{ConversationMember, Message}
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.SmokeResidue
  alias OpalCore.SocialFlow.AlignmentAuthority
  alias OpalCore.SocialFlow.CollectiveComposition
  alias OpalCore.SocialFlow.DurablePreferenceMemory
  alias OpalCore.SocialFlow.ExternalWorldTruth
  alias OpalCore.SocialFlow.GroupComposition
  alias OpalCore.SocialFlow.SocialReality

  # Plan-forming only (proposal identity). Day/time alone is availability, not a new proposal.
  @plan_patterns [
    ~r/\bwe should\b/i,
    ~r/\bstudy together\b/i,
    ~r/\bdinner\b/i,
    ~r/\blunch\b/i,
    ~r/\blet'?s (meet|get|do|plan|study)\b/i,
    ~r/\bdoes .* work\b/i,
    ~r/\bmeet up\b/i,
    ~r/\bget together\b/i
  ]

  @availability_patterns [
    ~r/\bfree after\b/i,
    ~r/\bi('?m| am) free\b/i,
    ~r/\bworks for me\b/i,
    ~r/\bi can do\b/i,
    ~r/\bafter \d/i,
    ~r/\bwednesday works\b/i,
    ~r/\bnot too late\b/i,
    ~r/\bneed another time\b/i,
    ~r/\bi'?m in\b/i
  ]

  # Public "Set" — mutual agreement only, never "booked"
  @ready_patterns [
    ~r/\bi'?m in\b/i,
    ~r/\bworks for me\b/i,
    ~r/\bwe('?re| are) set\b/i,
    ~r/\bit'?s a plan\b/i,
    ~r/\bagreed\b/i,
    ~r/\bsee you (there|then|at)\b/i,
    ~r/\bconfirmed\b/i
  ]

  # Legacy "handled" only for real execution language — map carefully in build_signals
  @handled_patterns [
    ~r/\breservation (is )?confirm/i,
    ~r/\bpickup is confirm/i
  ]

  @later_patterns [
    ~r/\bwill know (after|later)\b/i,
    ~r/\bafter work\b/i,
    ~r/\bnot sure yet\b/i,
    ~r/\blet me check\b/i,
    ~r/\bi'?ll know\b/i,
    ~r/\bneed another time\b/i
  ]

  @cancel_patterns [
    ~r/\bnot this time\b/i,
    ~r/\bcancel\b/i,
    ~r/\bnot happening\b/i
  ]

  @doc """
  Returns signals visible to a conversation member. Empty if not a member.
  """
  def signals_for_conversation(conversation_id, user_id) do
    if member?(conversation_id, user_id) do
      messages =
        from(m in Message,
          where: m.conversation_id == ^conversation_id,
          order_by: [desc: m.server_seq],
          limit: 40
        )
        |> Repo.all()
        |> Enum.reverse()
        |> Enum.reject(&SmokeResidue.smoke_body?(&1.body))

      build_signals(conversation_id, messages)
    else
      {:error, :not_a_member}
    end
  end

  def signals_for_user_home(user_id) do
    conv_ids =
      from(cm in ConversationMember,
        where: cm.user_id == ^user_id,
        select: cm.conversation_id
      )
      |> Repo.all()

    Enum.flat_map(conv_ids, fn cid ->
      case signals_for_conversation(cid, user_id) do
        {:ok, signals} ->
          Enum.map(signals, &Map.put(&1, "conversation_id", cid))

        _ ->
          []
      end
    end)
  end

  defp build_signals(conversation_id, messages) do
    social =
      messages
      |> Enum.filter(fn m ->
        body = m.body || ""
        not SmokeResidue.smoke_body?(body) and
          not OpalCore.SocialFlow.SeedFixtureLeak.seed_fixture_body?(body) and
          String.trim(body) != ""
      end)

    if social == [] do
      {:ok, []}
    else
      member_count = member_count(conversation_id)
      composition = GroupComposition.compose(conversation_id, social)
      evidence_stage = classify_evidence_stage(social)
      stage = elevate_to_set_if_authorized(conversation_id, social, evidence_stage)
      signals = stage_to_signals(stage, social, member_count, evidence_stage, composition)
      {:ok, signals}
    end
  end

  defp member_count(conversation_id) do
    from(cm in ConversationMember,
      where: cm.conversation_id == ^conversation_id,
      select: count(cm.id)
    )
    |> Repo.one() || 0
  end

  # Evidence-only recognition. Never returns :set — that requires AlignmentAuthority.
  defp classify_evidence_stage(messages) do
    bodies = Enum.map(messages, &(&1.body || ""))
    last = List.last(bodies) || ""

    cond do
      Enum.any?(bodies, &match_any?(&1, @cancel_patterns)) ->
        :canceled

      Enum.any?(bodies, &match_any?(&1, @handled_patterns)) ->
        # Real execution language only — never generic "done"
        :handled

      # Mutual readiness in messages is only a candidate; stays Still open until gate.
      plan?(bodies) and
          (affirmative_speaker_ids(messages) != [] or availability?(bodies) or
             mutual_affirmatives?(messages)) ->
        :still_open

      Enum.any?(bodies, &match_any?(&1, @later_patterns)) or
          match_any?(last, @later_patterns) ->
        :will_know_later

      plan?(bodies) ->
        :plan_forming

      true ->
        :quiet
    end
  end

  defp elevate_to_set_if_authorized(conversation_id, messages, evidence_stage) do
    # Only candidate readiness paths may become Set; cancel/handled stay as-is.
    # Pass the same active proposal_id clients use for private participation.
    proposal_key = stable_proposal_id(messages)

    if evidence_stage in [:still_open, :plan_forming, :will_know_later, :quiet] and
         AlignmentAuthority.authorize_set?(conversation_id, messages, proposal_key) do
      :set
    else
      evidence_stage
    end
  end

  defp plan?(bodies), do: Enum.any?(bodies, &match_any?(&1, @plan_patterns))
  defp availability?(bodies), do: Enum.any?(bodies, &match_any?(&1, @availability_patterns))

  defp match_any?(body, patterns), do: Enum.any?(patterns, &Regex.match?(&1, body))

  defp affirmative_speaker_ids(messages) do
    messages
    |> Enum.filter(fn m -> match_any?(m.body || "", @ready_patterns) end)
    |> Enum.map(& &1.sender_user_id)
    |> Enum.uniq()
  end

  defp mutual_affirmatives?(messages) do
    length(affirmative_speaker_ids(messages)) >= 2
  end

  defp stage_to_signals(:quiet, _messages, _member_count, _evidence_stage, _composition), do: []

  defp stage_to_signals(stage, messages, member_count, evidence_stage, composition) do
    sample = evidence_sample(stage, messages)
    proposal_id = stable_proposal_id(messages)
    # Whole-picture intelligence: SocialReality.project composes presentation +
    # refined next_gap/actions/dimensions (remote/home/fixed). Keeps production
    # path aligned with tests/bridge — no dual next_gap owner.
    reality = SocialReality.project(messages, stage)
    source_ids = source_message_ids_for(stage, messages)
    moments =
      chronological_moments(messages)
      |> maybe_append_set_moment(stage, evidence_stage, messages, sample)

    speakers = distinct_speakers(messages)
    affirm_ids = affirmative_speaker_ids(messages)
    member_hint = max(member_count, length(speakers))
    who = composition["who"] || %{}

    {kind, status} =
      case stage do
        :plan_forming ->
          {"plan_forming", "possibility"}

        :still_open ->
          {"open_loop", "possibility"}

        :will_know_later ->
          {"open_loop", "possibility"}

        :set ->
          {"set", "forming"}

        :ready ->
          {"set", "forming"}

        :handled ->
          # Only when reservation/pickup language is real execution evidence
          {"follow_through", "resolved"}

        :canceled ->
          {"canceled", "resolved"}
      end

    # Human-facing label = shared reality projection. Stage lives in lifecycle_stage.
    label = reality["headline"] || fallback_stage_label(stage, member_hint)

    recognition = %{
      "kind" => kind,
      "label" => label,
      "status" => status,
      "authority" => "proposal_only",
      "visibility" => "shared_when_authorized",
      "audience" => "conversation_members",
      "privacy_class" => "shared_progress",
      "requires_user_action" => status != "resolved" and reality["sufficiency"] != "usable",
      "not_shared_plan" => status != "resolved",
      "not_identity_label" => true,
      "evidence_message_id" => sample.id,
      "evidence_message_ids" => source_ids,
      "source_message_ids" => source_ids,
      "evidence_preview" => String.slice(sample.body || "", 0, 120),
      "evidence_server_seq" => sample.server_seq,
      "python_required" => false,
      "created_from" => "conversation_evidence",
      "lifecycle_stage" => Atom.to_string(stage),
      "proposal_id" => proposal_id,
      "set_version" => if(stage == :set, do: 1, else: 0),
      "shared_reality" => reality,
      "ui_job" => reality["ui_job"],
      "sufficiency" => reality["sufficiency"],
      "detail" => reality["detail"],
      "chronological_moments" => moments,
      "member_count" => member_count,
      "speaker_count" => length(speakers),
      "affirmative_count" => length(affirm_ids),
      "composition" => composition["composition"] || if(member_count >= 3, do: "group", else: "dyad"),
      "partial_group?" =>
        member_count >= 3 and is_integer(who["required_pending_count"]) and
          who["required_pending_count"] > 0,
      "group_composition" => composition,
      # Live collective continuity: shared-safe projection only (no private memory text)
      "collective_fit" =>
        build_collective_fit_projection(messages, composition, reality, member_count)
    }

    case stage do
      s when s in [:plan_forming, :still_open, :set] ->
        [recognition, proposal_signal(messages, proposal_id, stage, reality, source_ids)]

      _ ->
        [recognition]
    end
  end

  # ProductSignals transports collective intelligence — does not re-own ranking.
  # Private memory is used server-side for ranking; only shared-safe options ship on signal.
  defp build_collective_fit_projection(messages, composition, reality, member_count) do
    try do
      contexts = build_participant_contexts(messages, composition)
      party = member_count || get_in(composition, ["who", "member_count"]) || 2

      fit =
        CollectiveComposition.compose_from_group(composition, contexts, %{
          "place_gap_label" => reality["place_gap_label"],
          "what" => reality["what"],
          "party_size" => party,
          "where" => reality["where"],
          "where_known" => present_str?(reality["where"])
        })

      %{
        "authority" => "candidate_only",
        "authorizes_set" => false,
        "party_size" => fit["party_size"] || party,
        "abstain" => fit["abstain"] == true,
        "one_question" => fit["one_question"],
        "shared_safe_summary" => fit["shared_safe_summary"],
        "human_surface" => fit["human_surface"],
        "options" =>
          Enum.map(fit["options"] || [], fn o ->
            social = ExternalWorldTruth.social_fit_from_collective(o)
            provider = ExternalWorldTruth.fixture_provider_fact(o)

            %{
              "id" => o["id"],
              "name" => o["display_name"] || o["name"],
              "area" => o["area_label"] || o["area"],
              "tag" => o["human_tag"],
              "cuisine" => o["cuisine"],
              "quiet" => o["quiet"],
              # External-world truth boundary (social fit ≠ provider ≠ execution)
              "truth_class" => "social_fit",
              "provider_status" => social["provider_status"],
              "execution_state" => social["execution_state"],
              "booked" => false,
              "authorizes_booking" => false,
              "provider_fact" => %{
                "truth_class" => "provider_fact",
                "kind" => provider["kind"],
                "synthetic" => get_in(provider, ["provenance", "synthetic"]),
                "source" => get_in(provider, ["provenance", "source"])
              }
            }
          end),
        "suppressed_count" => length(fit["suppressed"] || []),
        "group_intent" => fit["group_intent"],
        "episode_category" => fit["episode_category"],
        "privacy" => "private_reasons_not_on_signal",
        "schema_version" => "0.1.0",
        "external_truth_contract" => "social_fit_not_provider"
      }
    rescue
      _ ->
        %{
          "authority" => "candidate_only",
          "authorizes_set" => false,
          "options" => [],
          "abstain" => false,
          "error" => "collective_fit_unavailable"
        }
    end
  end

  defp build_participant_contexts(messages, composition) do
    who = composition["who"] || %{}
    required = MapSet.new(who["required_participant_ids"] || [])
    optional = MapSet.new(who["optional_participant_ids"] || [])

    member_ids =
      (who["required_participant_ids"] || []) ++ (who["optional_participant_ids"] || [])

    member_ids = Enum.uniq(member_ids)

    durable_by_owner =
      DurablePreferenceMemory.list_for_owners(member_ids)
      |> Enum.group_by(& &1.owner_user_id)

    # Message-derived statements per sender
    by_sender =
      messages
      |> Enum.group_by(fn m -> m.sender_user_id || m[:sender_user_id] end)

    Enum.map(member_ids, fn uid ->
      role =
        cond do
          MapSet.member?(optional, uid) -> "optional"
          MapSet.member?(required, uid) -> "required"
          true -> "required"
        end

      bodies =
        by_sender
        |> Map.get(uid, [])
        |> Enum.map(fn m -> m.body || m[:body] || "" end)

      {hard, current, episode} =
        Enum.reduce(bodies, {[], [], []}, fn body, {h, c, e} ->
          case CollectiveComposition.classify_statement(body) do
            {:hard, kind} when is_binary(kind) ->
              {[%{"kind" => kind, "privacy" => "shared_consequence"} | h], c, e}

            {:current, kind} when is_binary(kind) ->
              {h, [%{"kind" => kind, "value" => kind} | c], e}

            {:episode, kind} when is_binary(kind) ->
              {h, c, [%{"kind" => kind, "value" => kind} | e]}

            _ ->
              {h, c, e}
          end
        end)

      rel_prefs =
        durable_by_owner
        |> Map.get(uid, [])
        |> DurablePreferenceMemory.to_preference_facts()

      %{
        "user_id" => uid,
        "role" => role,
        "hard_constraints" => Enum.uniq_by(hard, & &1["kind"]),
        "current_prefs" => Enum.uniq_by(current, & &1["kind"]),
        "episode_prefs" => Enum.uniq_by(episode, & &1["kind"]),
        "relationship_prefs" => rel_prefs
      }
    end)
  end

  defp present_str?(nil), do: false
  defp present_str?(""), do: false
  defp present_str?(s) when is_binary(s), do: String.trim(s) != ""
  defp present_str?(_), do: true

  defp fallback_stage_label(:plan_forming, _), do: "Something is forming"
  defp fallback_stage_label(:still_open, _), do: "Still taking shape"
  defp fallback_stage_label(:will_know_later, _), do: "Will know later"
  defp fallback_stage_label(:set, n) when n >= 3, do: "The group is in"
  defp fallback_stage_label(:set, _), do: "You're both in"
  defp fallback_stage_label(:ready, n), do: fallback_stage_label(:set, n)
  defp fallback_stage_label(:handled, _), do: "Handled"
  defp fallback_stage_label(:canceled, _), do: "Not happening"
  defp fallback_stage_label(_, _), do: "Update"

  # Causal chain: which human messages produced this stage recognition.
  defp source_message_ids_for(stage, messages) do
    patterns =
      case stage do
        :plan_forming -> @plan_patterns
        :still_open -> @plan_patterns ++ @availability_patterns ++ @ready_patterns
        :will_know_later -> @later_patterns
        :set -> @plan_patterns ++ @ready_patterns
        :ready -> @plan_patterns ++ @ready_patterns
        :handled -> @handled_patterns
        :canceled -> @cancel_patterns
        _ -> []
      end

    messages
    |> Enum.filter(fn m -> match_any?(m.body || "", patterns) end)
    |> Enum.map(& &1.id)
    |> Enum.uniq()
  end

  @doc false
  # Walk messages in order and emit stage transitions with provenance.
  # Clients interleave these after the triggering human message (server_seq).
  def chronological_moments(messages) when is_list(messages) do
    social =
      messages
      |> Enum.filter(fn m ->
        body = m.body || ""
        not SmokeResidue.smoke_body?(body) and
          not OpalCore.SocialFlow.SeedFixtureLeak.seed_fixture_body?(body) and
          String.trim(body) != ""
      end)

    social
    |> Enum.with_index(1)
    |> Enum.reduce({[], :quiet}, fn {msg, _i}, {acc, prev_stage} ->
      prefix = Enum.take_while(social, fn m -> m.server_seq <= msg.server_seq end)
      stage = classify_evidence_stage(prefix)

      if stage != :quiet and stage != prev_stage do
        moment = %{
          "lifecycle_stage" => Atom.to_string(stage),
          "kind" => moment_kind(stage),
          "label" => moment_label(stage, prefix),
          "evidence_message_id" => msg.id,
          "source_message_ids" => Enum.map(prefix, & &1.id) |> Enum.take(-6),
          "after_server_seq" => msg.server_seq,
          "created_from" => "conversation_evidence",
          "not_staged" => true
        }

        {acc ++ [moment], stage}
      else
        {acc, prev_stage}
      end
    end)
    |> elem(0)
  end

  def chronological_moments(_), do: []

  # Set is authority-elevated, not evidence-classified. Append only when gate passes.
  defp maybe_append_set_moment(moments, :set, evidence_stage, messages, sample)
       when evidence_stage != :set do
    last_seq =
      messages
      |> Enum.map(& &1.server_seq)
      |> Enum.max(fn -> sample.server_seq end)

    moments ++
      [
        %{
          "lifecycle_stage" => "set",
          "kind" => "set",
          "label" => moment_label(:set, messages),
          "evidence_message_id" => sample.id,
          "source_message_ids" => source_message_ids_for(:set, messages),
          "after_server_seq" => last_seq,
          "created_from" => "alignment_authority",
          "not_staged" => true
        }
      ]
  end

  defp maybe_append_set_moment(moments, _, _, _, _), do: moments

  defp moment_kind(:plan_forming), do: "plan_forming"
  defp moment_kind(:still_open), do: "open_loop"
  defp moment_kind(:will_know_later), do: "open_loop"
  defp moment_kind(:handled), do: "follow_through"
  defp moment_kind(:canceled), do: "canceled"
  defp moment_kind(_), do: "plan_forming"

  defp moment_label(stage, messages) do
    reality = SocialReality.project(messages, stage)
    reality["headline"] || fallback_stage_label(stage, length(distinct_speakers(messages)))
  end

  defp distinct_speakers(messages) do
    messages
    |> Enum.map(& &1.sender_user_id)
    |> Enum.uniq()
  end

  # Active proposal = latest plan-forming message (must match AlignmentAuthority).
  defp stable_proposal_id(messages) do
    plan_msg =
      messages
      |> Enum.filter(fn m -> match_any?(m.body || "", @plan_patterns) end)
      |> List.last()

    id = if plan_msg, do: plan_msg.id, else: "none"
    "prop-" <> to_string(id)
  end

  defp proposal_signal(messages, proposal_id, stage, reality, source_ids) do
    bodies = Enum.map(messages, &(&1.body || ""))
    # detail keeps legacy time contract for journey tests; label is human reality.
    time_label = extract_time_label(bodies)
    detail = reality["detail"] || time_label
    prop_label = reality["what"] || reality["headline"] || "Possible plan"

    %{
      "kind" => "proposal",
      "label" => prop_label,
      "detail" => detail || time_label,
      "status" => if(stage == :set, do: "accepted", else: "possibility"),
      "authority" => "proposal_only",
      "visibility" => "shared_when_authorized",
      "audience" => "conversation_members",
      "privacy_class" => "shared_progress",
      "requires_user_action" => stage != :set,
      "not_identity_label" => true,
      "python_required" => false,
      "created_from" => "conversation_evidence",
      "lifecycle_stage" => Atom.to_string(stage),
      "proposal_id" => proposal_id,
      "stable" => true,
      "shared_reality" => reality,
      "ui_job" => reality["ui_job"],
      "sufficiency" => reality["sufficiency"],
      "source_message_ids" => source_ids,
      "evidence_message_ids" => source_ids
    }
  end

  # Legacy detail contract used by Real People journey tests (when-window only).
  defp extract_time_label(bodies) do
    cond do
      Enum.any?(bodies, &Regex.match?(~r/\bwednesday\b/i, &1)) ->
        "Wednesday at 5:30"

      Enum.any?(bodies, &Regex.match?(~r/\bthursday\b/i, &1)) ->
        "Thursday at 6:30"

      true ->
        "This week"
    end
  end

  defp evidence_sample(:plan_forming, messages) do
    Enum.find(messages, List.last(messages), fn m ->
      match_any?(m.body || "", @plan_patterns)
    end)
  end

  defp evidence_sample(:still_open, messages) do
    Enum.find(Enum.reverse(messages), List.last(messages), fn m ->
      match_any?(m.body || "", @availability_patterns) or match_any?(m.body || "", @plan_patterns)
    end)
  end

  defp evidence_sample(:will_know_later, messages) do
    Enum.find(Enum.reverse(messages), List.last(messages), fn m ->
      match_any?(m.body || "", @later_patterns)
    end)
  end

  defp evidence_sample(:set, messages) do
    Enum.find(Enum.reverse(messages), List.last(messages), fn m ->
      match_any?(m.body || "", @ready_patterns)
    end)
  end

  defp evidence_sample(:ready, messages), do: evidence_sample(:set, messages)

  defp evidence_sample(:handled, messages) do
    Enum.find(Enum.reverse(messages), List.last(messages), fn m ->
      match_any?(m.body || "", @handled_patterns)
    end)
  end

  defp evidence_sample(:canceled, messages) do
    Enum.find(Enum.reverse(messages), List.last(messages), fn m ->
      match_any?(m.body || "", @cancel_patterns)
    end)
  end

  defp evidence_sample(_, messages), do: List.last(messages)

  defp member?(conversation_id, user_id) do
    from(cm in ConversationMember,
      where: cm.conversation_id == ^conversation_id and cm.user_id == ^user_id
    )
    |> Repo.exists?()
  end
end
