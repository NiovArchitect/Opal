defmodule OpalCore.SocialFlow.ProductShell do
  @moduledoc """
  Social Flow 11: conversation-native product integration projections.

  Unifies Needs You, Home, Plans, Conversation, and You snapshots.
  Elixir owns projection authority. Python may only propose ranking after eligibility.
  Not a dashboard, feed, or score surface.
  """

  import Ecto.Query

  alias OpalCore.Accounts.User
  alias OpalCore.Messaging.ConversationMember
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.FollowThrough
  alias OpalCore.SocialFlow.TrustSafety

  alias OpalCore.SocialFlow.{
    ShellComingUpItem,
    ShellNeedsYouItem,
    ShellRecentChange
  }

  @max_needs_you 3
  @policy "sf11-dev-0.1"

  # --- Needs You lifecycle ---

  def upsert_needs_you(attrs) do
    owner = fetch!(attrs, :owner_user_id)
    source_type = fetch!(attrs, :source_type)
    title = fetch!(attrs, :title)
    explanation = fetch!(attrs, :explanation)
    primary = Map.get(attrs, :primary_action) || "Open"

    idem =
      Map.get(attrs, :idempotency_key) || "ny-#{owner}-#{source_type}-#{:erlang.phash2(title)}"

    case Repo.get_by(ShellNeedsYouItem, idempotency_key: idem) do
      %ShellNeedsYouItem{status: "completed"} = i ->
        {:ok, i, :already_completed}

      %ShellNeedsYouItem{status: "dismissed"} = i ->
        {:ok, i, :dismissed}

      %ShellNeedsYouItem{} = i ->
        {:ok, i, :idempotent}

      nil ->
        {:ok, item} =
          %ShellNeedsYouItem{}
          |> ShellNeedsYouItem.changeset(%{
            owner_user_id: owner,
            source_type: source_type,
            source_id: Map.get(attrs, :source_id),
            conversation_id: Map.get(attrs, :conversation_id),
            relationship_context_id: Map.get(attrs, :relationship_context_id),
            title: title,
            explanation: explanation,
            primary_action: primary,
            secondary_action: Map.get(attrs, :secondary_action),
            urgency_class: Map.get(attrs, :urgency_class) || "normal",
            privacy_class: Map.get(attrs, :privacy_class) || "private",
            status: "open",
            due_at: Map.get(attrs, :due_at),
            expires_at: Map.get(attrs, :expires_at),
            source_evidence: Map.get(attrs, :source_evidence) || %{},
            idempotency_key: idem
          })
          |> Repo.insert()

        {:ok, item, :created}
    end
  end

  def complete_needs_you(attrs) do
    id = fetch!(attrs, :item_id)
    owner = fetch!(attrs, :owner_user_id)

    case Repo.get(ShellNeedsYouItem, id) do
      %ShellNeedsYouItem{owner_user_id: ^owner, status: "open"} = i ->
        now = now()

        i
        |> ShellNeedsYouItem.changeset(%{status: "completed", completed_at: now})
        |> Repo.update()

      %ShellNeedsYouItem{owner_user_id: ^owner} = i ->
        {:ok, i}

      %ShellNeedsYouItem{} ->
        {:error, :forbidden}

      nil ->
        {:error, :not_found}
    end
  end

  def list_needs_you(owner_user_id) do
    now = now()

    from(i in ShellNeedsYouItem,
      where:
        i.owner_user_id == ^owner_user_id and i.status == "open" and
          (is_nil(i.expires_at) or i.expires_at > ^now),
      order_by: [asc: i.urgency_class, desc: i.inserted_at],
      limit: ^@max_needs_you
    )
    |> Repo.all()
    |> Enum.map(&ShellNeedsYouItem.to_contract/1)
  end

  # Merge attention signals from SF2 with shell items (dedupe by title prefix)
  def unified_needs_you(owner_user_id) do
    shell = list_needs_you(owner_user_id)

    attention =
      FollowThrough.needs_you(owner_user_id)
      |> Enum.map(fn s ->
        %{
          "id" => s["id"] || s[:id],
          "source_type" => s["signal_type"] || "attention",
          "source_id" => s["id"],
          "conversation_id" => s["conversation_id"],
          "title" => truncate_title(s["copy"] || "Needs attention"),
          "explanation" => s["copy"] || "",
          "primary_action" => "Open",
          "privacy_class" => s["privacy_class"] || "private",
          "urgency_class" => "normal",
          "status" => "open",
          "source_evidence" => %{"from" => "attention_signal"},
          "no_engagement_score" => true,
          "no_guilt_language" => true
        }
      end)

    # Shell items first (explicit product projections), then attention fill
    titles = MapSet.new(shell, & &1["title"])

    attention_fill =
      Enum.reject(attention, fn a -> MapSet.member?(titles, a["title"]) end)

    (shell ++ attention_fill)
    |> Enum.take(@max_needs_you)
  end

  # --- Coming up / plans ---

  def upsert_coming_up(attrs) do
    owner = fetch!(attrs, :owner_user_id)
    title = fetch!(attrs, :title)
    idem = Map.get(attrs, :idempotency_key) || "cu-#{owner}-#{:erlang.phash2(title)}"

    case Repo.get_by(ShellComingUpItem, idempotency_key: idem) do
      %ShellComingUpItem{} = i ->
        {:ok, updated} =
          i
          |> ShellComingUpItem.changeset(%{
            when_label: Map.get(attrs, :when_label) || i.when_label,
            where_label: Map.get(attrs, :where_label) || i.where_label,
            state: Map.get(attrs, :state) || i.state,
            who_label: Map.get(attrs, :who_label) || i.who_label
          })
          |> Repo.update()

        {:ok, updated, :idempotent}

      nil ->
        {:ok, item} =
          %ShellComingUpItem{}
          |> ShellComingUpItem.changeset(%{
            owner_user_id: owner,
            plan_id: Map.get(attrs, :plan_id),
            conversation_id: Map.get(attrs, :conversation_id),
            title: title,
            when_label: Map.get(attrs, :when_label),
            who_label: Map.get(attrs, :who_label),
            where_label: Map.get(attrs, :where_label),
            state: Map.get(attrs, :state) || "upcoming",
            source_type: Map.get(attrs, :source_type) || "plan",
            privacy_class: Map.get(attrs, :privacy_class) || "shared",
            idempotency_key: idem
          })
          |> Repo.insert()

        {:ok, item, :created}
    end
  end

  def plans_snapshot(owner_user_id) do
    items =
      from(i in ShellComingUpItem,
        where: i.owner_user_id == ^owner_user_id and i.state != "completed",
        order_by: [asc: i.inserted_at]
      )
      |> Repo.all()
      |> Enum.map(&ShellComingUpItem.to_contract/1)

    %{
      "schema_version" => "0.1.0",
      "user_id" => owner_user_id,
      "needs_confirmation" => Enum.filter(items, &(&1["state"] == "needs_confirmation")),
      "today" => Enum.filter(items, &(&1["state"] in ~w(today live))),
      "upcoming" => Enum.filter(items, &(&1["state"] == "upcoming")),
      "recent" =>
        from(i in ShellComingUpItem,
          where: i.owner_user_id == ^owner_user_id and i.state == "completed",
          limit: 5
        )
        |> Repo.all()
        |> Enum.map(&ShellComingUpItem.to_contract/1),
      "version" => @policy,
      "no_kanban" => true,
      "no_progress_percent" => true
    }
  end

  def record_recent_change(attrs) do
    owner = fetch!(attrs, :owner_user_id)
    title = fetch!(attrs, :title)
    explanation = fetch!(attrs, :explanation)

    idem =
      Map.get(attrs, :idempotency_key) || "rc-#{owner}-#{:erlang.phash2({title, explanation})}"

    case Repo.get_by(ShellRecentChange, idempotency_key: idem) do
      %ShellRecentChange{} = c ->
        {:ok, c, :idempotent}

      nil ->
        {:ok, c} =
          %ShellRecentChange{}
          |> ShellRecentChange.changeset(%{
            owner_user_id: owner,
            title: title,
            explanation: explanation,
            conversation_id: Map.get(attrs, :conversation_id),
            plan_id: Map.get(attrs, :plan_id),
            material: Map.get(attrs, :material, true),
            privacy_class: Map.get(attrs, :privacy_class) || "shared",
            idempotency_key: idem
          })
          |> Repo.insert()

        {:ok, c, :created}
    end
  end

  # --- Home snapshot ---

  def home_snapshot(attrs) do
    user_id = fetch!(attrs, :user_id)
    # R21 L-1 - THE GREETING IS TRUE: the name is ALWAYS the
    # signed-in viewer's own, read from their user record by their
    # own id. A caller-supplied display_name is never used (pre-L-1
    # it overrode the record, so a payload field naming another
    # person could have been greeted). The clock and timezone are
    # the viewer's too - see greeting/3.
    display = display_name(user_id)
    viewer_tz = viewer_timezone(user_id, attrs)
    role = role_context(user_id)
    needs = unified_needs_you(user_id)

    coming =
      from(i in ShellComingUpItem,
        where:
          i.owner_user_id == ^user_id and i.state in ^~w(upcoming today live needs_confirmation),
        order_by: [asc: i.inserted_at],
        limit: 5
      )
      |> Repo.all()
      |> Enum.map(&ShellComingUpItem.to_contract/1)

    changes =
      from(c in ShellRecentChange,
        where: c.owner_user_id == ^user_id and c.material == true,
        order_by: [desc: c.inserted_at],
        limit: 3
      )
      |> Repo.all()
      |> Enum.map(&ShellRecentChange.to_contract/1)

    empty? = needs == []

    %{
      "schema_version" => "0.1.0",
      "user_id" => user_id,
      "generated_at" => DateTime.to_iso8601(now()),
      "greeting" => greeting(display, Map.get(attrs, :now) || Map.get(attrs, "now"), viewer_tz),
      "greeting_context" => %{
        "display_name" => display,
        "role" => role,
        "timezone" => viewer_tz
      },
      "needs_you" => needs,
      "needs_you_empty_copy" => if(empty?, do: FollowThrough.needs_you_empty_copy(), else: nil),
      "coming_up" => coming,
      "recent_changes" => changes,
      "connection_state" => Map.get(attrs, :connection_state) || "online",
      "role_context" => role,
      "version" => @policy,
      "no_engagement_counts" => true,
      "no_relationship_ranking" => true,
      "no_streaks" => true,
      "quiet_success" => empty?
    }
  end

  # --- Conversation snapshot ---

  def conversation_snapshot(attrs) do
    user_id = fetch!(attrs, :user_id)
    conversation_id = fetch!(attrs, :conversation_id)

    with :ok <- ensure_member(conversation_id, user_id) do
      blocked =
        other_member_ids(conversation_id, user_id)
        |> Enum.any?(fn other ->
          TrustSafety.blocked?(user_id, other) or TrustSafety.blocked?(other, user_id)
        end)

      composer =
        if blocked do
          %{
            "state" => "blocked",
            "explanation" => "Messaging is unavailable for this conversation.",
            "calm" => true
          }
        else
          %{"state" => "ready", "explanation" => nil}
        end

      tray_plan =
        from(i in ShellComingUpItem,
          where: i.owner_user_id == ^user_id and i.conversation_id == ^conversation_id,
          limit: 1
        )
        |> Repo.one()

      open_need =
        from(i in ShellNeedsYouItem,
          where:
            i.owner_user_id == ^user_id and i.conversation_id == ^conversation_id and
              i.status == "open",
          limit: 1
        )
        |> Repo.one()

      {:ok,
       %{
         "schema_version" => "0.1.0",
         "conversation_id" => conversation_id,
         "user_id" => user_id,
         "participants" => other_member_ids(conversation_id, user_id),
         "active_plan" => tray_plan && ShellComingUpItem.to_contract(tray_plan),
         "open_loop" => open_need && ShellNeedsYouItem.to_contract(open_need),
         "composer_state" => composer,
         "safety_state" => if(blocked, do: "blocked", else: "ok"),
         "version" => @policy,
         "no_raw_event_names" => true
       }}
    end
  end

  # --- You snapshot ---

  def you_snapshot(attrs) do
    user_id = fetch!(attrs, :user_id)
    user = Repo.get(User, user_id)
    role = role_context(user_id)

    sessions =
      try do
        TrustSafety.list_sessions(user_id)
      rescue
        _ -> []
      end

    family =
      if role["kind"] in ~w(guardian youth co_guardian) do
        %{"present" => true, "kind" => role["kind"], "no_surveillance_copy" => true}
      else
        %{"present" => false}
      end

    %{
      "schema_version" => "0.1.0",
      "user_id" => user_id,
      "account" => %{
        "display_name" => user && user.display_name,
        "handle" => user && user.handle
      },
      "identifiers" => %{"summary" => "Verified communication identities managed in onboarding"},
      "devices" => sessions,
      "privacy" => %{"private_by_default" => true},
      "memory_summary" => %{"owner_scoped" => true},
      "safety_summary" => %{"blocks_and_reports" => true, "no_behavior_score" => true},
      "family_summary" => family,
      "accessibility" => %{"text_scaling" => true, "reduced_motion" => true},
      "version" => @policy,
      "no_settings_maze" => true
    }
  end

  # --- Chats list projection ---

  def chats_snapshot(attrs) do
    user_id = fetch!(attrs, :user_id)

    conv_ids =
      from(m in ConversationMember,
        where: m.user_id == ^user_id,
        select: m.conversation_id
      )
      |> Repo.all()

    chats =
      Enum.map(conv_ids, fn cid ->
        others = other_member_ids(cid, user_id)

        blocked =
          Enum.any?(others, fn o ->
            TrustSafety.blocked?(user_id, o) or TrustSafety.blocked?(o, user_id)
          end)

        %{
          "conversation_id" => cid,
          "participant_ids" => others,
          "safety_state" => if(blocked, do: "blocked", else: "ok"),
          "no_relationship_score" => true
        }
      end)

    # Filter expired youth contacts: if blocked only, still show with state
    %{
      "schema_version" => "0.1.0",
      "user_id" => user_id,
      "chats" => chats,
      "version" => @policy
    }
  end

  # --- Navigation model (product truth) ---

  def primary_navigation do
    %{
      "destinations" => [
        %{"id" => "home", "label" => "Home", "role" => "orientation"},
        %{"id" => "chats", "label" => "Chats", "role" => "conversations"},
        %{"id" => "plans", "label" => "Plans", "role" => "journeys"},
        %{"id" => "you", "label" => "You", "role" => "identity_privacy_safety"}
      ],
      "max_primary" => 4,
      "not_primary_tabs" =>
        ~w(signals reminders approvals memories safety family discovery traditions devices ai),
      "conversation_is_primary_work_surface" => true
    }
  end

  # --- Signal families (unified model) ---

  def signal_family(source_type) when is_binary(source_type) do
    case source_type do
      t when t in ~w(possible_plan discovery_option) ->
        "possibility"

      t when t in ~w(needs_answer plan_response invitation guardian_approval due_reminder) ->
        "needs_action"

      t when t in ~w(plan_changed late_update venue_change) ->
        "change"

      t when t in ~w(completion_ack reservation_handled) ->
        "completion"

      t when t in ~w(open_loop ambiguity) ->
        "clarification"

      t when t in ~w(block safety_report) ->
        "safety"

      t when t in ~w(tradition continuity) ->
        "continuity"

      _ ->
        "quiet_information"
    end
  end

  def prohibited_shell_copy?(text) when is_binary(text) do
    patterns = [
      ~r/streak/i,
      ~r/relationship score/i,
      ~r/social score/i,
      ~r/you are behind/i,
      ~r/losing this relationship/i,
      ~r/engagement/i,
      ~r/people you may know/i
    ]

    Enum.any?(patterns, &Regex.match?(&1, text))
  end

  def prohibited_shell_copy?(_), do: false

  # --- Privacy helpers for projections ---

  def filter_private_for_viewer(items, viewer_id) when is_list(items) do
    Enum.filter(items, fn item ->
      privacy = item["privacy_class"] || item[:privacy_class] || "private"
      owner = item["owner_user_id"] || item[:owner_user_id]

      case privacy do
        "private" -> is_nil(owner) or owner == viewer_id
        "shared" -> true
        "family" -> true
        "safety" -> true
        _ -> owner == viewer_id
      end
    end)
  end

  def projection_denied_for_outsider?(viewer_id, owner_user_id) do
    viewer_id != owner_user_id
  end

  # --- Journey helpers (synthetic integration) ---

  def seed_journey_b_home!(alex_id, conversation_id) do
    upsert_needs_you(%{
      owner_user_id: alex_id,
      source_type: "due_reminder",
      title: "Book the restaurant.",
      explanation: "Private reservation reminder is due.",
      primary_action: "Complete reminder",
      privacy_class: "private",
      conversation_id: conversation_id,
      urgency_class: "high",
      idempotency_key: "ny-b-restaurant-#{alex_id}"
    })

    upsert_needs_you(%{
      owner_user_id: alex_id,
      source_type: "needs_answer",
      title: "Jordan asked which area works best.",
      explanation: "An open question still needs your reply.",
      primary_action: "Reply",
      privacy_class: "private",
      conversation_id: conversation_id,
      idempotency_key: "ny-b-area-#{alex_id}"
    })

    upsert_coming_up(%{
      owner_user_id: alex_id,
      title: "Dinner with Jordan",
      when_label: "Thursday at 7:00 PM",
      who_label: "Jordan",
      state: "upcoming",
      conversation_id: conversation_id,
      idempotency_key: "cu-b-dinner-#{alex_id}"
    })

    :ok
  end

  def seed_journey_d_family!(marcus_id, olivia_id, conversation_id) do
    upsert_needs_you(%{
      owner_user_id: marcus_id,
      source_type: "guardian_approval",
      title: "Confirm pickup at 5:00 PM.",
      explanation: "Olivia proposed a practice-time change.",
      primary_action: "Confirm",
      privacy_class: "family",
      conversation_id: conversation_id,
      idempotency_key: "ny-d-pickup-#{marcus_id}"
    })

    upsert_needs_you(%{
      owner_user_id: olivia_id,
      source_type: "due_reminder",
      title: "Bring soccer shoes.",
      explanation: "Private youth reminder.",
      primary_action: "Done",
      privacy_class: "private",
      conversation_id: conversation_id,
      idempotency_key: "ny-d-shoes-#{olivia_id}"
    })

    :ok
  end

  # --- helpers ---

  # R21 L-1 - THE GREETING IS TRUE (founder law, 2026-10-20).
  # The hour is the VIEWER's hour at the moment of viewing: the
  # instant (`now_override`, a DateTime - the backend clock-override
  # convention, as in Connections.build's :now opt and
  # FollowThrough's attrs :now; nil means the real clock) is shifted
  # into the viewer's timezone before the word is picked. Pre-L-1
  # this read DateTime.utc_now().hour - a UTC greeting, wrong for
  # every viewer outside UTC.
  defp greeting(name, now_override, viewer_tz) do
    instant =
      case now_override do
        %DateTime{} = dt -> dt
        binary when is_binary(binary) -> parse_instant(binary)
        _ -> DateTime.utc_now()
      end

    hour =
      case DateTime.shift_zone(instant, viewer_tz) do
        {:ok, local} ->
          local.hour

        _ ->
          # House convention (AttentionBudget.local_clock,
          # TemporalFollowThrough.local_date_hour): this stack has
          # no Tzdata package, so shift_zone cannot resolve IANA
          # names - fall back to the fixed-offset table rather than
          # to the UTC hour.
          DateTime.add(instant, fixed_offset_hours(viewer_tz, instant) * 3600, :second).hour
      end

    part =
      cond do
        hour < 12 -> "Good morning"
        hour < 18 -> "Good afternoon"
        true -> "Good evening"
      end

    "#{part}, #{name}."
  end

  defp parse_instant(binary) do
    case DateTime.from_iso8601(binary) do
      {:ok, dt, _offset} -> dt
      _ -> DateTime.utc_now()
    end
  end

  # The viewer's timezone, in precedence order: an explicit viewer
  # timezone in the call (the channel passes the device timezone the
  # viewer sent with the request), then the viewer's stored
  # effective timezone (TravelMode: travel-local when travelling,
  # else their home timezone), then UTC as the last resort.
  defp viewer_timezone(user_id, attrs) do
    explicit = Map.get(attrs, :timezone) || Map.get(attrs, "timezone")

    cond do
      is_binary(explicit) and valid_timezone?(explicit) ->
        explicit

      true ->
        try do
          OpalCore.Intelligence.TravelMode.effective_tz(user_id)
        rescue
          _ -> "Etc/UTC"
        end
    end
  end

  # Without the Tzdata package, shift_zone cannot validate an IANA
  # name (AvailabilityWindow's standing note) - accept UTC and
  # IANA-shaped names; the greeting's fixed-offset fallback covers
  # the zones it knows and UTC covers the rest.
  defp valid_timezone?(tz) do
    tz in ["UTC", "Etc/UTC"] or
      Regex.match?(~r/\A[A-Za-z][A-Za-z_]*\/[A-Za-z_][A-Za-z_\/-]*\z/, tz)
  end

  # Fixed offsets when Tzdata is unavailable - the AttentionBudget
  # table, plus Auckland in the same rough-DST style as its Sydney
  # row. Pacific uses the Mar-Nov DST approximation.
  defp fixed_offset_hours("UTC", _), do: 0
  defp fixed_offset_hours("Etc/UTC", _), do: 0

  defp fixed_offset_hours("America/Los_Angeles", %DateTime{} = utc) do
    if pacific_dst?(utc), do: -7, else: -8
  end

  defp fixed_offset_hours("America/New_York", %DateTime{} = utc) do
    if pacific_dst?(utc), do: -4, else: -5
  end

  defp fixed_offset_hours("Asia/Tokyo", _), do: 9
  defp fixed_offset_hours("Asia/Shanghai", _), do: 8

  defp fixed_offset_hours("Australia/Sydney", %DateTime{} = utc) do
    if utc.month >= 10 or utc.month <= 3, do: 11, else: 10
  end

  defp fixed_offset_hours("Pacific/Auckland", %DateTime{} = utc) do
    if utc.month >= 10 or utc.month <= 3, do: 13, else: 12
  end

  defp fixed_offset_hours(_, _), do: 0

  defp pacific_dst?(%DateTime{month: m}) when m >= 3 and m <= 10, do: true
  defp pacific_dst?(_), do: false

  defp display_name(user_id) do
    case Repo.get(User, user_id) do
      %User{display_name: n} when is_binary(n) and n != "" -> n
      _ -> "there"
    end
  end

  defp role_context(user_id) do
    youth? =
      from(m in OpalCore.SocialFlow.FamilyMembership,
        where:
          m.user_id == ^user_id and m.account_kind == "guardian_managed_youth" and
            m.status == "active"
      )
      |> Repo.exists?()

    guardian? =
      from(m in OpalCore.SocialFlow.FamilyMembership,
        where:
          m.user_id == ^user_id and m.role in ^~w(guardian co_guardian) and m.status == "active"
      )
      |> Repo.exists?()

    cond do
      youth? -> %{"kind" => "youth", "home_variant" => "youth_appropriate"}
      guardian? -> %{"kind" => "guardian", "home_variant" => "guardian_appropriate"}
      true -> %{"kind" => "adult", "home_variant" => "adult"}
    end
  end

  defp ensure_member(conversation_id, user_id) do
    exists? =
      from(m in ConversationMember,
        where: m.conversation_id == ^conversation_id and m.user_id == ^user_id
      )
      |> Repo.exists?()

    if exists?, do: :ok, else: {:error, :forbidden}
  end

  defp other_member_ids(conversation_id, user_id) do
    from(m in ConversationMember,
      where: m.conversation_id == ^conversation_id and m.user_id != ^user_id,
      select: m.user_id
    )
    |> Repo.all()
  end

  defp truncate_title(copy) when is_binary(copy) do
    if String.length(copy) > 80, do: String.slice(copy, 0, 77) <> "...", else: copy
  end

  defp truncate_title(_), do: "Needs attention"

  defp now, do: DateTime.utc_now() |> DateTime.truncate(:microsecond)

  defp fetch!(attrs, key) do
    Map.get(attrs, key) || Map.get(attrs, to_string(key)) ||
      raise ArgumentError, "missing #{inspect(key)}"
  end
end
