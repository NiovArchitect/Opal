defmodule OpalCore.SocialFlow.AttentionAuthority do
  @moduledoc """
  ATTENTION / INTERVENTION decision boundary (Pass 10 + Track A6).

  Sits *after* Evidence → Inference → Authority → Presentation candidates.
  Something may be true, durable, and causal — and still deserve **silence**.

  Primary law:
  THE SMARTER OPAL BECOMES, THE LESS SOFTWARE THE HUMAN SHOULD HAVE TO MANAGE.

  Track A6: intelligence does not imply interruption. Optimize for resolution,
  not notification. Recipient-specific routing — ask only who needs to answer.

  Does **not** replace SocialReality, ProductSignals, Chronology, or AlignmentAuthority.
  Does **not** mutate SharedPlan, Memory, or execute providers.

  Builds on:
  - `Execution.AttentionTier` (prepare early, interrupt late)
  - `InterventionResolution` (silence is success)
  - `Ambient.InterruptionDebt` (surface cost — not reimplemented here)

  Internal interruption classes (never product labels):
  ambient | useful_now | action_required | time_sensitive | critical | silence

  Product levels (A6):
  silent | ambient | attention | urgent
  """

  alias OpalCore.SocialFlow.Execution.AttentionTier

  @classes ~w(silence ambient useful_now action_required time_sensitive critical)
  @levels ~w(silent ambient attention urgent)

  def classes, do: @classes
  def levels, do: @levels

  # --- A6 laws ---

  def attention_can_mutate_plan?, do: false
  def attention_can_mutate_memory?, do: false
  def attention_can_execute_provider_action?, do: false
  def new_recommendation_default_notification?, do: false
  def high_recommendation_score_causes_notification?, do: false
  def memory_alone_causes_proactive_alert?, do: false
  def recommendation_without_need_interrupts?, do: false
  def memory_without_context_interrupts?, do: false
  def unread_equals_attention?, do: false
  def mute_hides_canonical_state?, do: false
  def open_thread_duplicate_banner?, do: false
  def same_event_notification_fanout_spam?, do: false
  def resolved_attention_stays_actionable?, do: false
  def private_signal_attention_leak?, do: false
  def feature_direct_banner_bypass?, do: false
  def fake_leave_by_attention?, do: false
  def proposer_gets_approval_prompt?, do: false

  @doc "Rank for comparison (higher = more interruptive)."
  def class_rank(class) when is_binary(class) do
    case class do
      "silence" -> 0
      "ambient" -> 1
      "useful_now" -> 2
      "action_required" -> 3
      "time_sensitive" -> 4
      "critical" -> 5
      _ -> 0
    end
  end

  def class_rank(_), do: 0

  @doc """
  Evaluate a single reality/signal projection for attention.

  Expected keys (all optional; pure map API):
  - `:next_gap` — SocialReality next_gap atom or string
  - `:lifecycle_stage` / `:stage`
  - `:requires_user_action` boolean
  - `:member_count` / `:participant_count`
  - `:sufficiency` — intention | converging | usable
  - `:has_meaningful_dims` — what/when/where any known
  - `:duplicate_of_active` — true when same lineage already surfaced
  - `:recompute_only` — true when backend recompute with no human delta
  - `:minutes_until` — integer | nil for temporal urgency
  - `:leave_by_relevant` — travel leave window matters now
  - `:private_memory_only` — only private memory changed
  - `:kind` — proposal | signal | etc.
  """
  @spec evaluate(map()) :: %{
          class: String.t(),
          should_surface_home: boolean(),
          should_surface_chat_filament: boolean(),
          should_interrupt: boolean(),
          may_notify: boolean(),
          tier: String.t(),
          priority: integer(),
          reason: String.t(),
          channel: String.t() | nil
        }
  def evaluate(facts) when is_map(facts) do
    facts = stringify_keys(facts)

    cond do
      truthy?(facts["recompute_only"]) ->
        pack("silence", false, false, false, "dormant", "recompute_no_delta")

      truthy?(facts["duplicate_of_active"]) ->
        pack("silence", false, false, false, "dormant", "duplicate_lineage")

      truthy?(facts["private_memory_only"]) ->
        # Private memory may improve Curate ranking without Home noise.
        pack("silence", false, false, false, "watch", "private_memory_no_home")

      facts["kind"] == "proposal" ->
        pack("silence", false, false, false, "dormant", "proposal_satellite")

      handled_recall?(facts) ->
        # Recede from Home by default; Plans/recall may still load.
        pack("ambient", false, false, false, "dormant", "handled_recede")

      truthy?(facts["leave_by_relevant"]) or leave_window?(facts["minutes_until"]) or
          imminent_action_deadline?(facts) ->
        pack(
          "time_sensitive",
          true,
          true,
          true,
          "urgent_actionable",
          if(imminent_action_deadline?(facts), do: "external_deadline", else: "leave_window"),
          "in_app_actionable"
        )

      actionable_gap?(facts["next_gap"]) and truthy?(facts["requires_user_action"] || true) ->
        pack(
          "action_required",
          true,
          true,
          false,
          "actionable",
          "next_gap_action",
          "in_app_actionable"
        )

      usable_active?(facts) and approaching?(facts["minutes_until"]) ->
        pack("useful_now", true, true, false, "actionable", "approaching_usable", "in_app_passive")

      usable_active?(facts) ->
        pack("useful_now", true, false, false, "prepare", "usable_ambient", "in_app_passive")

      converging?(facts) ->
        pack("ambient", true, false, false, "watch", "converging_field", "in_app_passive")

      weak_intention?(facts) ->
        pack("silence", false, false, false, "dormant", "weak_intention")

      true ->
        pack("silence", false, false, false, "dormant", "no_attention_justified")
    end
  end

  def evaluate(_), do: pack("silence", false, false, false, "dormant", "invalid_facts")

  @doc """
  Compress many evaluations into a sparse Home field.

  Order of operations (Pass 11 — ranking before caps):
  1. Evaluate each candidate
  2. **Reality collapse** — one row per conversation/lineage (highest priority wins)
  3. Sort by priority (class + temporal urgency + actionability)
  4. Safety-rail caps per band (rails, not the intelligence)

  Caps alone must never be the sole reason a higher-priority reality loses to a lower one.
  """
  @spec compose_home_field([{map(), any()}], keyword()) :: [
          %{item: any(), decision: map(), band: String.t(), surface_reason: String.t()}
        ]
  def compose_home_field(items, opts \\ []) when is_list(items) do
    explain = compose_home_field_explain(items, opts)
    explain.surfaced
  end

  @doc """
  Full compression funnel with survivors + suppressions for residue proofs.

  Returns:
  - `:candidates` — all evaluated rows
  - `:after_collapse` — one per reality lineage
  - `:surfaced` — after ranking + band caps
  - `:suppressed` — with reasons (silence, collapse_lost, cap_band, etc.)
  """
  @spec compose_home_field_explain([{map(), any()}], keyword()) :: %{
          candidates: list(),
          after_collapse: list(),
          surfaced: list(),
          suppressed: list()
        }
  def compose_home_field_explain(items, opts \\ []) when is_list(items) do
    max_now = Keyword.get(opts, :max_now, 2)
    max_later = Keyword.get(opts, :max_later, 3)
    max_quiet = Keyword.get(opts, :max_quiet, 1)

    candidates =
      Enum.map(items, fn {facts, item} ->
        facts = stringify_keys(if is_map(facts), do: facts, else: %{})
        d = evaluate(facts)
        d = %{d | priority: priority_score(facts, d)}
        %{
          item: item,
          facts: facts,
          decision: d,
          band: band_for(d),
          lineage: lineage_key(facts)
        }
      end)

    silenced =
      candidates
      |> Enum.filter(fn c -> not c.decision.should_surface_home end)
      |> Enum.map(fn c ->
        Map.put(c, :suppress_reason, "attention_silence:#{c.decision.reason}")
      end)

    eligible = Enum.filter(candidates, & &1.decision.should_surface_home)

    {collapsed, collapse_losses} = collapse_by_lineage(eligible)

    ranked = Enum.sort_by(collapsed, &(-&1.decision.priority))

    {now, now_drop} = take_band(ranked, "now", max_now)
    {later, later_drop} = take_band(ranked, "later", max_later)
    {quiet, quiet_drop} = take_band(ranked, "quiet", max_quiet)

    surfaced =
      (now ++ later ++ quiet)
      |> Enum.map(fn c ->
        %{
          item: c.item,
          decision: c.decision,
          band: c.band,
          surface_reason: surface_reason(c),
          lineage: c.lineage
        }
      end)

    cap_drops =
      (now_drop ++ later_drop ++ quiet_drop)
      |> Enum.map(fn c ->
        Map.put(c, :suppress_reason, "cap_after_rank:#{c.band}:priority_#{c.decision.priority}")
      end)

    suppressed =
      (silenced ++ collapse_losses ++ cap_drops)
      |> Enum.map(fn c ->
        %{
          item: c.item,
          decision: c.decision,
          band: Map.get(c, :band),
          suppress_reason: c.suppress_reason,
          lineage: Map.get(c, :lineage)
        }
      end)

    %{
      candidates: candidates,
      after_collapse: collapsed,
      surfaced: surfaced,
      suppressed: suppressed
    }
  end

  @doc """
  Notification / interrupt policy for a semantic consequence id.

  Pure: given previous notice and new evaluation, decide notify / suppress / supersede.
  Does not send OS push — policy only.
  """
  @spec notification_policy(map(), map() | nil) :: %{
          action: :notify | :suppress | :supersede | :silent,
          reason: String.t(),
          consequence_id: String.t() | nil
        }
  def notification_policy(new_facts, previous \\ nil) when is_map(new_facts) do
    facts = stringify_keys(new_facts)
    d = evaluate(facts)
    cid = consequence_id(facts)
    prev = if is_map(previous), do: stringify_keys(previous), else: nil
    prev_cid = prev && (prev["consequence_id"] || prev["conversation_id"])
    prev_payload = prev && prev["payload_key"]
    new_payload = payload_key(facts)

    cond do
      not d.may_notify ->
        %{action: :silent, reason: d.reason, consequence_id: cid}

      is_map(prev) and prev_cid != nil and prev_cid == cid and prev_payload == new_payload ->
        %{action: :suppress, reason: "dedupe_same_consequence", consequence_id: cid}

      is_map(prev) and prev_cid != nil and prev_cid == cid and prev_payload != new_payload ->
        %{action: :supersede, reason: "same_lineage_updated", consequence_id: cid}

      d.should_interrupt or d.class in ~w(time_sensitive critical) ->
        %{action: :notify, reason: d.reason, consequence_id: cid}

      true ->
        %{action: :silent, reason: "not_interruptive", consequence_id: cid}
    end
  end

  @doc "Whether a chronology/filament row should show in Chat by default."
  def filament_visible?(facts) when is_map(facts) do
    d = evaluate(facts)
    d.should_surface_chat_filament and d.class != "silence"
  end

  def filament_visible?(_), do: false

  # =====================================================================
  # Track A6 — recipient-aware proactive assistance
  # =====================================================================

  @doc """
  Decide attention for an event across participants.

  Returns one Attention identity with per-recipient projections.
  Does not mutate plan/memory/providers. Does not send push.
  """
  def decide(event) when is_map(event) do
    e = stringify_keys(event)

    cond do
      truthy?(e["resolved"]) or truthy?(e["expired"]) ->
        pack_decision(e, [], "resolved_or_expired")

      truthy?(e["superseded"]) ->
        pack_decision(e, [], "superseded")

      true ->
        recipients = recipient_universe(e)
        items = Enum.map(recipients, &decide_for_recipient(e, &1))
        items = apply_active_thread_suppression(e, items)
        items = apply_mute(e, items)
        items = sanitize_privacy(e, items)

        pack_decision(e, items, "ok")
    end
  end

  def decide(_), do: pack_decision(%{}, [], "invalid")

  @doc "Single-recipient decision."
  def decide_for(event, recipient_user_id)
      when is_map(event) and is_binary(recipient_user_id) do
    case decide(Map.put(stringify_keys(event), "focus_recipient_id", recipient_user_id)) do
      %{"items" => items} = full ->
        item = Enum.find(items, &(&1["recipient_user_id"] == recipient_user_id))

        full
        |> Map.put("items", List.wrap(item))
        |> Map.put("focus", item)

      other ->
        other
    end
  end

  @doc """
  Coalesce related events into one Attention identity (anti-fanout).
  """
  def coalesce(events) when is_list(events) do
    groups =
      events
      |> Enum.map(&stringify_keys/1)
      |> Enum.group_by(&dedupe_key/1)

    Enum.map(groups, fn {key, group} ->
      primary = List.last(group)
      decided = decide(primary)

      %{
        "dedupe_key" => key,
        "source_count" => length(group),
        "fanout" => 1,
        "decision" => decided,
        "same_event_notification_fanout_spam" => false
      }
    end)
  end

  def coalesce(_), do: []

  @doc "Mark attention resolved after underlying action completes."
  def resolve(prior_decision, attrs \\ %{}) when is_map(prior_decision) do
    a = stringify_keys(attrs)
    key = a["dedupe_key"] || prior_decision["dedupe_key"]

    items =
      Enum.map(List.wrap(prior_decision["items"]), fn item ->
        item
        |> Map.put("level", "silent")
        |> Map.put("interrupt", false)
        |> Map.put("action_required", false)
        |> Map.put("status", "resolved")
        |> Map.put("surface", "none")
        |> Map.put("copy", a["copy"] || "Resolved")
      end)

    %{
      "dedupe_key" => key,
      "items" => items,
      "actionable_count" => 0,
      "status" => "resolved",
      "resolved_attention_stays_actionable" => false
    }
  end

  @doc "Supersede prior attention with a newer event (e.g. P1 → P2 proposal)."
  def supersede(prior_decision, new_event) when is_map(prior_decision) and is_map(new_event) do
    resolved = resolve(prior_decision, %{"copy" => "Superseded"})
    fresh = decide(Map.put(stringify_keys(new_event), "supersedes_key", prior_decision["dedupe_key"]))

    %{
      "prior" => resolved,
      "current" => fresh,
      "prior_actionable" => false,
      "attention_supersession" => true
    }
  end

  @doc "Actionable badge count for a user — not unread, not all outcomes."
  def actionable_badge_count(decision, user_id) when is_map(decision) and is_binary(user_id) do
    decision
    |> Map.get("items", [])
    |> Enum.count(fn item ->
      item["recipient_user_id"] == user_id and item["action_required"] == true and
        item["level"] in ~w(attention urgent) and item["status"] != "resolved" and
        item["seen"] != true
    end)
  end

  def actionable_badge_count(_, _), do: 0

  # --- A6 recipient routing ---

  defp decide_for_recipient(e, recipient) do
    role = recipient_role(e, recipient)
    base = base_level_for_source(e, role)
    {level, reason, action?, copy} = refine_level(e, recipient, role, base)

    surface = surface_for(level, e, recipient)
    interrupt? = level in ~w(attention urgent) and surface in ~w(banner bell push)

    %{
      "recipient_user_id" => recipient,
      "role" => role,
      "level" => level,
      "reason" => reason,
      "action_required" => action?,
      "interrupt" => interrupt?,
      "surface" => surface,
      "copy" => copy,
      "status" => "candidate",
      "dedupe_key" => dedupe_key(e),
      "source_type" => e["source_type"],
      "source_id" => e["source_id"],
      "conversation_id" => e["conversation_id"],
      "privacy_safe" => true,
      "mutates_plan" => false,
      "mutates_memory" => false,
      "executes_provider" => false,
      "provenance" => %{
        "why" => reason,
        "urgency_evidence" => e["urgency_evidence"],
        "required_because" => role
      }
    }
  end

  defp recipient_universe(e) do
    focus = e["focus_recipient_id"]

    if is_binary(focus) do
      [focus]
    else
      (
        List.wrap(e["participants"]) ++
          List.wrap(e["required_responder_ids"]) ++
          List.wrap(e["observer_ids"]) ++
          [e["proposer_user_id"], e["organizer_user_id"], e["authorization_required_user_id"],
           e["question_owner_user_id"], e["waiting_on_user_id"], e["commitment_owner_user_id"]]
      )
      |> Enum.filter(&is_binary/1)
      |> Enum.uniq()
    end
  end

  defp recipient_role(e, recipient) do
    cond do
      recipient in List.wrap(e["required_responder_ids"]) -> "required_responder"
      e["authorization_required_user_id"] == recipient -> "authorizer"
      e["organizer_user_id"] == recipient and e["source_type"] in ~w(execution booking_authorization) ->
        "organizer"
      e["question_owner_user_id"] == recipient -> "question_owner"
      e["waiting_on_user_id"] == recipient -> "waiting_on_owner"
      e["commitment_owner_user_id"] == recipient -> "commitment_owner"
      e["proposer_user_id"] == recipient -> "proposer"
      recipient in List.wrap(e["observer_ids"]) -> "observer"
      true -> "participant"
    end
  end

  defp base_level_for_source(e, role) do
    case e["source_type"] do
      "recommendation" ->
        if truthy?(e["recommendation_need_open"]) or truthy?(e["decision_open"]),
          do: {"ambient", "recommendation_with_open_need", false, "Options ready"},
          else: {"silent", "recommendation_without_need", false, nil}

      "memory" ->
        {"silent", "memory_without_context", false, nil}

      "proposal" ->
        case role do
          "required_responder" ->
            {"attention", "decision_required", true, copy_or(e, "Needs your answer")}

          "proposer" ->
            {"ambient", "waiting_on_others", false, waiting_copy(e)}

          _ ->
            {"ambient", "proposal_observer", false, "Plan update pending"}
        end

      "open_question" ->
        cond do
          is_binary(e["question_owner_user_id"]) and role == "question_owner" ->
            {"attention", "open_question_assigned", true, copy_or(e, "Needs your answer")}

          is_binary(e["question_owner_user_id"]) ->
            {"ambient", "open_question_owned_elsewhere", false, "Waiting on an answer"}

          true ->
            {"ambient", "open_question_no_owner", false, copy_or(e, "Still open")}
        end

      "waiting_on" ->
        cond do
          role == "waiting_on_owner" and truthy?(e["waiting_due"]) ->
            {"attention", "waiting_on_due", true, copy_or(e, "Still waiting on you")}

          role == "waiting_on_owner" ->
            {"silent", "waiting_on_not_due", false, nil}

          true ->
            {"ambient", "waiting_on_status", false, waiting_copy(e)}
        end

      "commitment" ->
        cond do
          role == "commitment_owner" and truthy?(e["commitment_due_soon"]) ->
            {"attention", "commitment_due", true, copy_or(e, "Tickets still need an owner")}

          true ->
            {"silent", "commitment_immediate_quiet", false, nil}
        end

      type when type in ~w(execution booking_failed provider_failure) ->
        cond do
          role in ~w(authorizer organizer required_responder) or
              e["authorization_required_user_id"] == nil and role == "proposer" ->
            fail_actor_level(e, role)

          true ->
            {"ambient", "provider_failure_observer", false, copy_or(e, "Booking couldn't be completed")}
        end

      type when type in ~w(booking_confirmed execution_confirmed confirmation) ->
        {"ambient", "provider_confirmation", false, copy_or(e, "Reservation confirmed")}

      "booking_authorization" ->
        if role in ~w(authorizer organizer required_responder),
          do: {"attention", "authorization_required", true, copy_or(e, "Needs your approval")},
          else: {"ambient", "authorization_pending", false, "Waiting on approval"}

      "plan_update" ->
        {"ambient", "plan_materially_updated", false, copy_or(e, "Plan updated")}

      _ ->
        # Fall back to legacy evaluate mapping
        legacy = evaluate(e)
        map_legacy_class(legacy, role)
    end
  end

  defp fail_actor_level(e, _role) do
    if e["source_type"] in ~w(booking_failed provider_failure execution) and
         (e["outcome_type"] in ~w(booking_failed provider_failure) or e["source_type"] in ~w(booking_failed provider_failure)) do
      {"attention", "provider_failure", true, copy_or(e, "Booking couldn't be completed")}
    else
      {"attention", "execution_action", true, copy_or(e, "Needs your attention")}
    end
  end

  defp refine_level(e, recipient, role, {level, reason, action?, copy}) do
    cond do
      # Proposer must never get "approve your own proposal"
      e["source_type"] == "proposal" and role == "proposer" and level == "attention" ->
        {"ambient", "proposer_not_approver", false, waiting_copy(e)}

      # Group: only required responders get attention for authorization
      e["source_type"] in ~w(booking_authorization proposal) and
          role not in ~w(required_responder authorizer organizer question_owner) and
            level in ~w(attention urgent) ->
        {"ambient", "not_required_responder", false, copy_or(e, "Update pending")}

      # Urgency only with evidence
      level == "urgent" and not urgency_justified?(e) ->
        {"attention", reason, action?, copy}

      # High recommendation score alone never elevates
      e["source_type"] == "recommendation" and not truthy?(e["recommendation_need_open"]) ->
        {"silent", "recommendation_without_need", false, nil}

      true ->
        {level, reason, action?, copy}
    end
    |> then(fn tuple ->
      _ = recipient
      tuple
    end)
  end

  defp surface_for("silent", _, _), do: "none"
  defp surface_for("ambient", e, recipient) do
    if e["active_conversation_viewer_id"] == recipient, do: "inline", else: "home"
  end

  defp surface_for("attention", e, recipient) do
    cond do
      e["active_conversation_viewer_id"] == recipient -> "inline"
      muted?(e, recipient) -> "none_interrupt"
      true -> "banner"
    end
  end

  defp surface_for("urgent", e, recipient) do
    if muted?(e, recipient) and not truthy?(e["urgent_overrides_mute"]),
      do: "none_interrupt",
      else: "banner"
  end

  defp surface_for(_, _, _), do: "none"

  defp apply_active_thread_suppression(e, items) do
    viewer = e["active_conversation_viewer_id"]

    Enum.map(items, fn item ->
      if is_binary(viewer) and item["recipient_user_id"] == viewer and
           item["conversation_id"] == e["conversation_id"] and item["interrupt"] == true do
        item
        |> Map.put("interrupt", false)
        |> Map.put("surface", "inline")
        |> Map.put("suppression", "active_thread")
        |> Map.put("active_thread_duplicate_attention", false)
      else
        Map.put(item, "active_thread_duplicate_attention", false)
      end
    end)
  end

  defp apply_mute(e, items) do
    Enum.map(items, fn item ->
      if muted?(e, item["recipient_user_id"]) do
        item
        |> Map.put("interrupt", false)
        |> Map.put(
          "surface",
          if(item["level"] in ~w(attention urgent), do: "none_interrupt", else: item["surface"])
        )
        |> Map.put("muted", true)
        |> Map.put("mute_suppresses_interruption", true)
        |> Map.put("mute_suppresses_truth", false)
        |> Map.put("canonical_state_preserved", true)
      else
        Map.merge(item, %{
          "muted" => false,
          "mute_suppresses_interruption" => false,
          "mute_suppresses_truth" => false
        })
      end
    end)
  end

  defp sanitize_privacy(e, items) do
    leak_phrases = List.wrap(e["forbidden_copy_fragments"]) ++ ["privately prefers", "private memory", "Walk B privately"]

    Enum.map(items, fn item ->
      copy = item["copy"] || ""

      leaked? =
        Enum.any?(leak_phrases, fn frag ->
          is_binary(frag) and frag != "" and String.contains?(String.downcase(copy), String.downcase(frag))
        end)

      if leaked? or truthy?(e["private_signal_in_shared_copy"]) do
        item
        |> Map.put("copy", calm_fallback_copy(e, item))
        |> Map.put("privacy_safe", true)
        |> Map.put("private_signal_attention_leak", false)
        |> Map.put("sanitized", true)
      else
        Map.merge(item, %{"privacy_safe" => true, "private_signal_attention_leak" => false})
      end
    end)
  end

  defp pack_decision(e, items, status) do
    key = dedupe_key(e)

    actionable =
      Enum.filter(items, &(&1["action_required"] == true and &1["level"] in ~w(attention urgent)))

    by_user =
      Map.new(Enum.group_by(actionable, & &1["recipient_user_id"]), fn {uid, list} ->
        {uid, length(list)}
      end)

    %{
      "status" => status,
      "dedupe_key" => key,
      "attention_identity" => key,
      "items" => items,
      "actionable_count" => length(actionable),
      "actionable_count_by_user" => by_user,
      "fanout" => 1,
      "same_event_notification_fanout_spam" => false,
      "mutates_plan" => false,
      "mutates_memory" => false,
      "executes_provider" => false,
      "levels_present" => items |> Enum.map(& &1["level"]) |> Enum.uniq(),
      "source_type" => e["source_type"]
    }
  end

  defp dedupe_key(e) do
    e["dedupe_key"] ||
      Enum.join(
        [
          e["source_type"] || "evt",
          e["source_id"] || e["consequence_id"] || e["conversation_id"] || "x",
          e["outcome_type"] || e["proposal_key"] || "0"
        ],
        ":"
      )
  end

  defp muted?(e, recipient) do
    recipient in List.wrap(e["muted_for"]) or
      (is_map(e["mute_by_user"]) and e["mute_by_user"][recipient] == true)
  end

  defp urgency_justified?(e) do
    truthy?(e["leave_by_relevant"]) or
      truthy?(e["provider_expiring"]) or
      truthy?(e["explicit_human_urgency"]) or
      (is_integer(e["minutes_until"]) and e["minutes_until"] >= 0 and e["minutes_until"] <= 60) or
      (is_integer(e["action_deadline_minutes"]) and e["action_deadline_minutes"] <= 60)
  end

  defp map_legacy_class(d, _role) do
    case d.class do
      "silence" -> {"silent", d.reason, false, nil}
      "ambient" -> {"ambient", d.reason, false, "Update"}
      "useful_now" -> {"ambient", d.reason, false, "Worth a look"}
      "action_required" -> {"attention", d.reason, true, "Needs your answer"}
      "time_sensitive" -> {"urgent", d.reason, true, "Time-sensitive"}
      "critical" -> {"urgent", d.reason, true, "Needs attention now"}
      _ -> {"silent", d.reason, false, nil}
    end
  end

  defp waiting_copy(e) do
    who = e["waiting_on_display"] || e["required_responder_display"] || "them"
    "Waiting on #{who}"
  end

  defp copy_or(e, default), do: e["copy"] || default

  defp calm_fallback_copy(e, item) do
    cond do
      item["action_required"] -> "Needs your answer"
      e["source_type"] in ~w(booking_failed provider_failure) -> "Booking couldn't be completed"
      true -> "Plan updated"
    end
  end

  # --- internals ---

  defp pack(class, home, filament, interrupt, tier, reason, channel \\ nil) do
    tier_n = AttentionTier.normalize(tier)
    # Home ambient may surface without AttentionTier.may_surface? (that gates push-tier).
    # Interrupt/push still respects tier + class.
    may_push =
      interrupt and
        (AttentionTier.may_push?(tier_n) or class in ~w(time_sensitive critical))

    %{
      class: class,
      should_surface_home: home == true,
      should_surface_chat_filament: filament == true,
      should_interrupt: may_push,
      may_notify: may_push,
      tier: tier_n,
      priority: class_rank(class) * 100 + AttentionTier.rank(tier_n),
      reason: to_string(reason),
      channel: channel
    }
  end

  # Priority: class ≫ temporal urgency ≫ cost of delay ≫ actionability.
  # Caps apply only after this sort. Pass 13: consequence urgency, not insertion order.
  defp priority_score(facts, decision) do
    base = decision.priority
    mins = resolved_minutes_until(facts)
    deadline = resolved_action_deadline(facts)

    temporal =
      cond do
        truthy?(facts["leave_by_relevant"]) -> 45
        is_integer(mins) and mins >= 0 and mins <= 60 -> 50
        is_integer(mins) and mins > 60 and mins <= 360 -> 30
        is_integer(mins) and mins > 360 and mins <= 24 * 60 -> 18
        is_integer(mins) and mins > 24 * 60 and mins <= 3 * 24 * 60 -> 6
        is_integer(mins) and mins > 3 * 24 * 60 -> 2
        when_tonight_or_today?(facts) -> 18
        when_weekday_later?(facts) -> 6
        true -> 0
      end

    delay = cost_of_delay_bonus(facts, mins, deadline)

    action_bonus = if decision.class in ~w(action_required time_sensitive critical), do: 20, else: 0
    gap_bonus = if actionable_gap?(facts["next_gap"]), do: 10, else: 0

    base + temporal + delay + action_bonus + gap_bonus
  end

  defp resolved_minutes_until(facts) do
    case facts["minutes_until"] do
      n when is_integer(n) -> n
      _ ->
        case facts["action_horizon_minutes"] do
          n when is_integer(n) -> n
          _ -> nil
        end
    end
  end

  defp resolved_action_deadline(facts) do
    case facts["action_deadline_minutes"] || facts["external_deadline_minutes"] do
      n when is_integer(n) -> n
      _ -> nil
    end
  end

  # Delay cost: unresolved decision before imminent event loses options / creates work.
  defp cost_of_delay_bonus(facts, mins, deadline) do
    deadline_bonus =
      cond do
        is_integer(deadline) and deadline >= 0 and deadline <= 15 -> 70
        is_integer(deadline) and deadline <= 60 -> 45
        is_integer(deadline) and deadline <= 360 -> 20
        true -> 0
      end

    gap = facts["next_gap"]
    actionable? = actionable_gap?(gap) and truthy?(facts["requires_user_action"] || true)

    event_bonus =
      if actionable? do
        cond do
          is_integer(mins) and mins >= 0 and mins <= 6 * 60 -> 35
          is_integer(mins) and mins <= 24 * 60 -> 28
          is_integer(mins) and mins <= 48 * 60 -> 12
          is_integer(mins) and mins > 48 * 60 -> 5
          when_tonight_or_today?(facts) -> 28
          when_weekday_later?(facts) -> 6
          true -> 8
        end
      else
        0
      end

    deadline_bonus + event_bonus
  end

  defp when_tonight_or_today?(facts) do
    w = facts["when"] || facts["when_label"] || ""
    w = w |> to_string() |> String.downcase()
    String.contains?(w, "tonight") or String.contains?(w, "today")
  end

  defp when_weekday_later?(facts) do
    w = facts["when"] || facts["when_label"] || ""
    w = w |> to_string() |> String.downcase()

    Enum.any?(
      ~w(saturday sunday monday tuesday wednesday thursday friday sat sun mon tue wed thu fri),
      &String.contains?(w, &1)
    ) and not when_tonight_or_today?(facts)
  end

  defp lineage_key(facts) do
    consequence_id(facts) ||
      facts["id"] ||
      :erlang.phash2(facts)
  end

  defp collapse_by_lineage(eligible) do
    # Tag with stable index so we can identify the single winner per lineage.
    indexed = Enum.with_index(eligible)

    grouped =
      Enum.group_by(indexed, fn {c, _i} -> c.lineage end)

    winners_idx =
      Enum.map(grouped, fn {_lin, rows} ->
        {_c, i} = Enum.max_by(rows, fn {c, _i} -> c.decision.priority end)
        i
      end)
      |> MapSet.new()

    winners =
      indexed
      |> Enum.filter(fn {_c, i} -> MapSet.member?(winners_idx, i) end)
      |> Enum.map(fn {c, _i} -> c end)

    losses =
      indexed
      |> Enum.reject(fn {_c, i} -> MapSet.member?(winners_idx, i) end)
      |> Enum.map(fn {c, _i} ->
        Map.put(c, :suppress_reason, "reality_collapse:lost_to_higher_priority_same_lineage")
      end)

    {winners, losses}
  end

  defp take_band(ranked, band, max_n) do
    band_rows = Enum.filter(ranked, &(&1.band == band))
    {Enum.take(band_rows, max_n), Enum.drop(band_rows, max_n)}
  end

  defp surface_reason(c) do
    "survive:#{c.decision.reason}|class=#{c.decision.class}|priority=#{c.decision.priority}|band=#{c.band}"
  end

  defp band_for(%{class: class} = d) do
    # Imminent usable realities stay NOW; far usable can recede to later.
    case class do
      c when c in ~w(action_required time_sensitive critical) -> "now"
      "useful_now" ->
        if d.priority >= class_rank("useful_now") * 100 + 30, do: "now", else: "later"

      "ambient" -> "later"
      _ -> "quiet"
    end
  end

  defp actionable_gap?(gap) do
    g = gap |> to_string() |> String.downcase()
    g in ~w(time place activity participants open_loop)
  end

  defp usable_active?(facts) do
    suf = facts["sufficiency"] |> to_string()
    stage = stage(facts)
    suf == "usable" or stage in ~w(set ready)
  end

  defp converging?(facts) do
    suf = facts["sufficiency"] |> to_string()
    stage = stage(facts)
    suf == "converging" or stage in ~w(still_open plan_forming) or truthy?(facts["has_meaningful_dims"])
  end

  defp handled_recall?(facts) do
    stage(facts) in ~w(handled canceled quiet)
  end

  defp weak_intention?(facts) do
    suf = facts["sufficiency"] |> to_string()
    stage = stage(facts)
    (suf == "intention" or stage in ~w(quiet) or stage == "") and not truthy?(facts["has_meaningful_dims"])
  end

  defp approaching?(mins) when is_integer(mins), do: mins >= 0 and mins <= 24 * 60
  defp approaching?(_), do: false

  defp leave_window?(mins) when is_integer(mins), do: mins >= 0 and mins <= 120
  defp leave_window?(_), do: false

  defp imminent_action_deadline?(facts) do
    case resolved_action_deadline(facts) do
      n when is_integer(n) and n >= 0 and n <= 120 -> true
      _ -> false
    end
  end

  defp stage(facts) do
    (facts["lifecycle_stage"] || facts["stage"] || "")
    |> to_string()
    |> String.downcase()
  end

  defp consequence_id(facts) do
    facts["consequence_id"] ||
      facts["conversation_id"] ||
      facts["lineage_id"] ||
      nil
  end

  defp payload_key(facts) do
    [
      facts["next_gap"],
      facts["when"],
      facts["where"],
      facts["leave_by"],
      facts["lifecycle_stage"] || facts["stage"]
    ]
    |> Enum.map(&to_string/1)
    |> Enum.join("|")
  end

  defp truthy?(v), do: v == true or v == "true" or v == 1

  defp stringify_keys(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
