defmodule OpalCore.SocialFlow.AttentionCenter do
  @moduledoc """
  Track A6.1 — Attention Center / bell projection.

  THE BELL IS A PROJECTION OF ATTENTION AUTHORITY.

  Data path:
  canonical product truth → AttentionAuthority → attention_for_user/2 → Attention Center

  Sections: Needs You · Waiting · Updated.
  Badge = unseen actionable Needs You only (never chat unread).
  Does not invent notifications from messages / recommendations / memory.
  """

  import Ecto.Query

  alias OpalCore.Repo
  alias OpalCore.SocialFlow.AttentionAuthority
  alias OpalCore.SocialFlow.AttentionCenterItem
  alias OpalCore.SocialFlow.Clock
  alias OpalCore.SocialFlow.TemporalFollowThrough
  alias OpalCoreWeb.Endpoint

  @updated_retention_hours 72
  @updated_limit 12

  # --- Laws ---

  def bell_bypasses_attention_authority?, do: false
  def bell_bypasses_mute?, do: false
  def bell_badge_equals_actionable_count?, do: true
  def chat_unread_and_attention_badge_separate?, do: true
  def bell_duplicates_all_messages?, do: false
  def bell_recommendation_spam?, do: false
  def bell_memory_spam?, do: false
  def bell_private_signal_leak?, do: false
  def bell_creates_second_action_path?, do: false
  def attention_deep_link_dead_end?, do: false
  def action_completed_badge_stale?, do: false

  @doc """
  Ingest an AttentionAuthority decision (or raw event → decide) into durable
  Attention Center rows for each recipient. Silent items are not stored.
  """
  def ingest(event_or_decision, opts \\ [])

  def ingest(event_or_decision, opts) when is_map(event_or_decision) do
    decision = normalize_decision(event_or_decision)
    event = Keyword.get(opts, :event) || event_meta(event_or_decision, decision)
    now = Keyword.get(opts, :now) || Clock.utc_now()

    items =
      decision
      |> Map.get("items", [])
      |> Enum.reject(&silent?/1)
      |> Enum.map(fn item -> upsert_item(item, event, now) end)
      |> Enum.reject(&is_nil/1)

    items
    |> Enum.map(& &1.owner_user_id)
    |> Enum.uniq()
    |> Enum.each(&notify_user/1)

    {:ok, items}
  end

  def ingest(_, _), do: {:error, :invalid}

  @doc "Mark prior attention resolved and ingest the superseding event."
  def supersede(prior_dedupe_key, new_event, opts \\ [])
      when is_binary(prior_dedupe_key) and is_map(new_event) do
    resolve_key(prior_dedupe_key, "superseded", opts)
    ingest(new_event, opts)
  end

  @doc "Resolve all active rows for a dedupe key (any owners)."
  def resolve_key(dedupe_key, status \\ "resolved", opts \\ []) when is_binary(dedupe_key) do
    now = Keyword.get(opts, :now) || Clock.utc_now()
    stamp = if status == "superseded", do: :superseded_at, else: :resolved_at

    from(i in AttentionCenterItem,
      where: i.dedupe_key == ^dedupe_key and i.status == "active"
    )
    |> Repo.all()
    |> Enum.map(fn item ->
      attrs =
        %{status: status, action_required: false, badge_eligible: false}
        |> Map.put(stamp, now)

      {:ok, updated} = item |> AttentionCenterItem.changeset(attrs) |> Repo.update()
      notify_user(updated.owner_user_id)
      updated
    end)
  end

  @doc "Resolve a single owner's item by id or dedupe key."
  def resolve(user_id, id_or_key, opts \\ []) when is_binary(user_id) and is_binary(id_or_key) do
    now = Keyword.get(opts, :now) || Clock.utc_now()

    item =
      cond do
        uuid?(id_or_key) ->
          case Repo.get(AttentionCenterItem, id_or_key) do
            %AttentionCenterItem{} = i -> i
            nil -> Repo.get_by(AttentionCenterItem, owner_user_id: user_id, dedupe_key: id_or_key)
          end

        true ->
          Repo.get_by(AttentionCenterItem, owner_user_id: user_id, dedupe_key: id_or_key)
      end

    case item do
      %AttentionCenterItem{owner_user_id: ^user_id, status: "active"} = i ->
        {:ok, updated} =
          i
          |> AttentionCenterItem.changeset(%{
            status: "resolved",
            action_required: false,
            badge_eligible: false,
            resolved_at: now
          })
          |> Repo.update()

        notify_user(user_id)
        {:ok, updated}

      %AttentionCenterItem{} ->
        {:error, :forbidden}

      nil ->
        {:error, :not_found}
    end
  end

  @doc """
  Mark Needs You items seen for presentation.

  Seen ≠ resolved. Opening the bell / Attention Center must NOT clear
  actionable badge count — only resolving the underlying action does.
  """
  def mark_seen(user_id, ids \\ :all) when is_binary(user_id) do
    q =
      from(i in AttentionCenterItem,
        where:
          i.owner_user_id == ^user_id and i.status == "active" and i.section == "needs_you" and
            i.seen == false
      )

    q =
      case ids do
        :all -> q
        list when is_list(list) -> from(i in q, where: i.id in ^list)
        id when is_binary(id) -> from(i in q, where: i.id == ^id)
      end

    # Presentation only — keep badge_eligible so unresolved actions stay badged.
    {count, _} = Repo.update_all(q, set: [seen: true, updated_at: Clock.utc_now()])
    if count > 0, do: notify_user(user_id)
    {:ok, count}
  end

  @doc "Resolve active proposal attentions for a conversation once the change is settled."
  def resolve_conversation_actions(conversation_id, opts \\ [])
      when is_binary(conversation_id) do
    now = Keyword.get(opts, :now) || Clock.utc_now()

    from(i in AttentionCenterItem,
      where:
        i.conversation_id == ^conversation_id and i.status == "active" and
          i.source_type in ^~w(proposal booking_authorization)
    )
    |> Repo.all()
    |> Enum.map(fn item ->
      {:ok, updated} =
        item
        |> AttentionCenterItem.changeset(%{
          status: "resolved",
          action_required: false,
          badge_eligible: false,
          resolved_at: now
        })
        |> Repo.update()

      notify_user(updated.owner_user_id)
      updated
    end)
  end

  @doc """
  Canonical Attention Center projection for a user.

  Merges durable rows with TemporalFollowThrough.attention_for_user/2
  (maturing open loops) through the same section grammar.
  """
  def feed(user_id, opts \\ []) when is_binary(user_id) do
    now = Keyword.get(opts, :now) || Clock.utc_now()
    refresh_temporal? = Keyword.get(opts, :refresh_temporal, true)

    if refresh_temporal? do
      refresh_from_temporal(user_id, now)
    end

    active = list_active(user_id)
    {needs, waiting, updated} = partition(active, now)

    # Badge = unresolved actionable Needs You. Seen does not clear the count.
    actionable =
      Enum.count(needs, fn i ->
        i.badge_eligible == true and i.action_required == true
      end)

    %{
      "actionable_count" => actionable,
      "needs_you" => Enum.map(needs, &AttentionCenterItem.to_contract/1),
      "waiting" => Enum.map(waiting, &AttentionCenterItem.to_contract/1),
      "updated" => Enum.map(updated, &AttentionCenterItem.to_contract/1),
      "empty_needs_you_copy" =>
        if(needs == [], do: "Nothing needs your attention right now.", else: nil),
      "empty_copy" =>
        if(needs == [] and waiting == [] and updated == [],
          do: "You're all caught up.",
          else: nil
        ),
      "evaluated_at" => DateTime.to_iso8601(now),
      "bell_bypasses_attention_authority" => false,
      "bell_badge_equals_actionable_count" => true,
      "chat_unread_separate" => true,
      "opening_bell_clears_unresolved_actionable_count" => false
    }
  end

  def actionable_count(user_id) when is_binary(user_id) do
    from(i in AttentionCenterItem,
      where:
        i.owner_user_id == ^user_id and i.status == "active" and i.section == "needs_you" and
          i.badge_eligible == true and i.action_required == true
    )
    |> Repo.aggregate(:count)
  end

  def actionable_count(_), do: 0

  # --- Temporal merge ---

  defp refresh_from_temporal(user_id, now) do
    feed = TemporalFollowThrough.attention_for_user(user_id, now: now)

    for {section, items} <- [
          {"needs_you", feed["needs_you"] || []},
          {"waiting", feed["waiting"] || []},
          {"updated", feed["updated"] || []}
        ],
        item <- items do
      upsert_from_authority_item(item, section, user_id, now)
    end

    :ok
  end

  defp uuid?(value) when is_binary(value) do
    match?(
      {:ok, _},
      Ecto.UUID.cast(value)
    )
  end

  defp uuid?(_), do: false

  defp upsert_from_authority_item(item, section, user_id, now) when is_map(item) do
    level = item["level"] || "ambient"
    if level == "silent", do: nil, else: do_upsert_temporal(item, section, user_id, now, level)
  end

  defp upsert_from_authority_item(_, _, _, _), do: nil

  defp do_upsert_temporal(item, section, user_id, now, level) do
    muted? = item["muted"] == true or item["mute_suppresses_interruption"] == true
    action? = item["action_required"] == true
    title = human_title(item, %{})
    detail = human_detail(item, section)

    link = deep_link_fields(item, %{})

    attrs = %{
      owner_user_id: user_id,
      dedupe_key: item["dedupe_key"] || "tft:#{item["source_id"] || Ecto.UUID.generate()}",
      section: section,
      level: level,
      reason: item["reason"],
      title: title,
      detail: detail,
      copy: item["copy"] || detail,
      action_required: action?,
      badge_eligible: section == "needs_you" and action? and not muted?,
      status: "active",
      conversation_id: item["conversation_id"],
      plan_id: item["plan_id"],
      deep_link_kind: link.kind,
      deep_link_id: link.id,
      muted: muted?,
      source_type: item["source_type"],
      privacy_safe: item["privacy_safe"] != false,
      metadata: %{
        "maturity" => item["maturity"],
        "urgency_rank" => urgency_rank(item, %{}),
        "source_id" => item["source_id"],
        "proposal_id" => item["proposal_id"],
        "plan_id" => item["plan_id"],
        "conversation_id" => item["conversation_id"],
        "focus" => link.focus,
        "target_surface" => link.target_surface
      }
    }

    upsert_attrs(attrs, now)
  end

  # --- Persist ---

  defp upsert_item(item, event, now) when is_map(item) do
    section = section_for(item, event)
    if is_nil(section), do: nil, else: do_upsert_item(item, event, section, now)
  end

  defp do_upsert_item(item, event, section, now) do
    muted? = item["muted"] == true
    action? = item["action_required"] == true and section == "needs_you"
    title = human_title(item, event)
    detail = human_detail(Map.merge(event, item), section)
    merged = Map.merge(event, item)
    link = deep_link_fields(item, event)

    attrs = %{
      owner_user_id: item["recipient_user_id"],
      dedupe_key: item["dedupe_key"] || AttentionAuthority.decide(event)["dedupe_key"],
      section: section,
      level: item["level"] || "ambient",
      reason: item["reason"],
      title: title,
      detail: detail,
      copy: sanitize_copy(item["copy"] || detail),
      action_required: action?,
      badge_eligible: action? and not muted?,
      status: "active",
      conversation_id: item["conversation_id"] || event["conversation_id"],
      plan_id: event["plan_id"] || item["plan_id"],
      deep_link_kind: link.kind,
      deep_link_id: link.id,
      muted: muted?,
      source_type: item["source_type"] || event["source_type"],
      privacy_safe: item["privacy_safe"] != false,
      metadata: %{
        "role" => item["role"],
        "urgency_rank" => urgency_rank(item, event),
        "source_id" => item["source_id"] || event["source_id"],
        "proposal_id" => merged["proposal_id"],
        "plan_id" => merged["plan_id"],
        "conversation_id" => merged["conversation_id"],
        "focus" => link.focus,
        "target_surface" => link.target_surface
      }
    }

    upsert_attrs(attrs, now)
  end

  defp upsert_attrs(attrs, now) do
    owner = attrs.owner_user_id
    key = attrs.dedupe_key

    case Repo.get_by(AttentionCenterItem, owner_user_id: owner, dedupe_key: key) do
      nil ->
        %AttentionCenterItem{}
        |> AttentionCenterItem.changeset(Map.put(attrs, :seen, false))
        |> Repo.insert()
        |> case do
          {:ok, row} -> row
          {:error, _} -> nil
        end

      %AttentionCenterItem{status: status} = existing when status in ~w(resolved superseded expired) ->
        # Reactivate only when re-ingested as active attention (e.g. new maturity).
        existing
        |> AttentionCenterItem.changeset(
          Map.merge(attrs, %{
            status: "active",
            seen: false,
            resolved_at: nil,
            superseded_at: nil,
            updated_at: now
          })
        )
        |> Repo.update()
        |> case do
          {:ok, row} -> row
          {:error, _} -> existing
        end

      %AttentionCenterItem{} = existing ->
        existing
        |> AttentionCenterItem.changeset(Map.put(attrs, :updated_at, now))
        |> Repo.update()
        |> case do
          {:ok, row} -> row
          {:error, _} -> existing
        end
    end
  end

  # --- Section grammar ---

  defp section_for(item, event) do
    level = item["level"]
    reason = item["reason"] || ""
    source = item["source_type"] || event["source_type"]

    cond do
      level == "silent" ->
        nil

      level in ~w(attention urgent) and item["action_required"] == true ->
        "needs_you"

      reason in ~w(provider_confirmation plan_materially_updated) or
          source in ~w(booking_confirmed execution_confirmed confirmation plan_update) ->
        "updated"

      level == "ambient" and waiting_reason?(reason, source) ->
        "waiting"

      level == "ambient" and item["action_required"] != true ->
        if source in ~w(recommendation memory), do: nil, else: "waiting"

      true ->
        nil
    end
  end

  defp waiting_reason?(reason, source) do
    reason =~ "waiting" or
      reason in ~w(
        waiting_on_others
        waiting_on_status
        proposal_observer
        open_question_no_owner
        open_question_owned_elsewhere
        authorization_pending
        provider_failure_observer
        not_required_responder
      ) or source in ~w(waiting_on proposal open_question)
  end

  defp silent?(item) do
    item["level"] == "silent" or
      (is_nil(item["level"]) and item["action_required"] != true and is_nil(item["copy"]))
  end

  # --- Human presentation (never expose internal reason codes) ---

  defp human_title(item, event) do
    event["title"] || event["plan_name"] || event["place_name"] || item["title"] ||
      event["graph_name"] || default_title(item, event)
  end

  defp default_title(item, event) do
    case item["source_type"] || event["source_type"] do
      "proposal" -> "Plan"
      "open_question" -> "Open question"
      type when type in ~w(booking_failed provider_failure booking_confirmed execution_confirmed) ->
        "Booking"
      "booking_authorization" -> "Booking"
      "commitment" -> "Commitment"
      "waiting_on" -> "Waiting"
      _ -> "Update"
    end
  end

  defp human_detail(item, "needs_you") do
    sanitize_copy(item["copy"] || item["detail"] || "Needs your answer")
  end

  defp human_detail(item, "waiting") do
    sanitize_copy(item["copy"] || item["detail"] || "Opal is holding this")
  end

  defp human_detail(item, "updated") do
    base = sanitize_copy(item["copy"] || item["detail"] || "Updated")
    if String.contains?(base, "✓"), do: base, else: confirm_copy(base, item)
  end

  defp human_detail(item, _), do: sanitize_copy(item["copy"] || item["detail"] || "")

  defp confirm_copy(base, item) do
    if (item["reason"] || "") in ~w(provider_confirmation) or
         (item["source_type"] || "") in ~w(booking_confirmed execution_confirmed confirmation),
       do: "#{base} ✓",
       else: base
  end

  defp sanitize_copy(nil), do: nil

  defp sanitize_copy(copy) when is_binary(copy) do
    forbidden = ~w(decision_required provider_failure_attention waiting_on_due plan_time_changed
      open_question_assigned authorization_required commitment_due privately prefers private memory)

    if Enum.any?(forbidden, &String.contains?(copy, &1)) do
      cond do
        String.contains?(copy, "decision") or String.contains?(copy, "approve") ->
          "Needs your answer"

        String.contains?(copy, "waiting") ->
          "Waiting on them"

        true ->
          "Update"
      end
    else
      copy
    end
  end

  defp sanitize_copy(other), do: other

  # Canonical action target — Attention knows WHY, so open THAT action surface.
  defp deep_link_fields(item, event) do
    merged = Map.merge(event || %{}, item || %{})
    source = merged["source_type"]
    conversation_id = merged["conversation_id"]
    plan_id = merged["plan_id"]
    proposal_id = merged["proposal_id"] || merged["source_id"]

    cond do
      source == "proposal" and is_binary(conversation_id) ->
        %{
          kind: "proposal",
          id: conversation_id,
          focus: "change_proposal",
          target_surface: "alignment_proposal"
        }

      source in ~w(booking_authorization execution) and is_binary(conversation_id) ->
        %{
          kind: "reservation_auth",
          id: conversation_id,
          focus: "reservation_auth",
          target_surface: "alignment_reservation"
        }

      source == "open_question" and is_binary(conversation_id) ->
        %{
          kind: "open_question",
          id: conversation_id,
          focus: "open_question",
          target_surface: "alignment_question"
        }

      source == "commitment" and is_binary(conversation_id || plan_id) ->
        %{
          kind: "commitment",
          id: conversation_id || plan_id,
          focus: "commitment",
          target_surface: "graph_commitment"
        }

      is_binary(conversation_id) ->
        %{kind: "conversation", id: conversation_id, focus: nil, target_surface: "conversation"}

      is_binary(plan_id) ->
        %{kind: "plan", id: plan_id, focus: nil, target_surface: "graph_detail"}

      true ->
        %{kind: "home", id: nil, focus: nil, target_surface: "home"}
    end
    |> Map.put(:proposal_id, proposal_id)
  end

  defp urgency_rank(item, event) do
    mins = event["minutes_until"] || event["action_deadline_minutes"] || item["minutes_until"]

    cond do
      is_integer(mins) and mins >= 0 and mins <= 60 -> 100 - mins
      truthy?(event["provider_expiring"]) -> 90
      truthy?(event["explicit_human_urgency"]) -> 80
      item["level"] == "urgent" -> 70
      item["level"] == "attention" -> 50
      true -> 10
    end
  end

  defp truthy?(v), do: v == true or v == "true" or v == 1

  # --- Query / partition ---

  defp list_active(user_id) do
    from(i in AttentionCenterItem,
      where: i.owner_user_id == ^user_id and i.status == "active"
    )
    |> Repo.all()
  end

  defp partition(items, now) do
    needs =
      items
      |> Enum.filter(&(&1.section == "needs_you"))
      |> Enum.sort_by(&needs_sort_key/1, :desc)

    waiting =
      items
      |> Enum.filter(&(&1.section == "waiting"))
      |> Enum.sort_by(& &1.updated_at, {:desc, DateTime})

    cutoff = DateTime.add(now, -@updated_retention_hours * 3600, :second)

    updated =
      items
      |> Enum.filter(&(&1.section == "updated"))
      |> Enum.filter(fn i ->
        case i.updated_at || i.inserted_at do
          %DateTime{} = t -> DateTime.compare(t, cutoff) != :lt
          _ -> true
        end
      end)
      |> Enum.sort_by(& &1.updated_at, {:desc, DateTime})
      |> Enum.take(@updated_limit)

    {needs, waiting, updated}
  end

  defp needs_sort_key(i) do
    rank =
      case i.metadata do
        %{"urgency_rank" => n} when is_integer(n) -> n
        _ -> 0
      end

    {rank, DateTime.to_unix(i.updated_at || i.inserted_at || DateTime.utc_now())}
  end

  # --- Decision normalize ---

  defp normalize_decision(%{"items" => items} = d) when is_list(items), do: stringify(d)

  defp normalize_decision(event) when is_map(event) do
    AttentionAuthority.decide(stringify(event))
  end

  defp event_meta(event, decision) do
    e = stringify(event)

    Map.merge(
      %{
        "title" => e["title"] || e["plan_name"] || e["place_name"],
        "plan_id" => e["plan_id"],
        "conversation_id" => e["conversation_id"] || decision["conversation_id"],
        "source_type" => e["source_type"],
        "source_id" => e["source_id"],
        "minutes_until" => e["minutes_until"],
        "action_deadline_minutes" => e["action_deadline_minutes"],
        "provider_expiring" => e["provider_expiring"],
        "explicit_human_urgency" => e["explicit_human_urgency"],
        "copy" => e["copy"]
      },
      Map.take(e, ["waiting_on_display", "graph_name", "place_name", "plan_name"])
    )
  end

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), stringify_val(v)}
      {k, v} -> {to_string(k), stringify_val(v)}
    end)
  end

  defp stringify_val(v) when is_map(v), do: stringify(v)
  defp stringify_val(v) when is_list(v), do: Enum.map(v, &stringify_val/1)
  defp stringify_val(v), do: v

  defp notify_user(user_id) when is_binary(user_id) do
    Endpoint.broadcast("user:#{user_id}", "inbox:attention", %{
      "event" => "attention.changed",
      "user_id" => user_id,
      "actionable_count" => actionable_count(user_id)
    })

    :ok
  rescue
    _ -> :ok
  end

  defp notify_user(_), do: :ok
end
