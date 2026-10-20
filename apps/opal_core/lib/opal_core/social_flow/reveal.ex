defmodule OpalCore.SocialFlow.Reveal do
  @moduledoc """
  Repair #18 DIR-4 - THE PROACTIVE REVEAL PRESENTATION derivation.

  THE SINGLE DOOR. This module - and only this module - decides what
  proactive reveal items exist for a viewer, their category (P1-P7),
  their state language, their timing, and their QUIET ceilings.
  Surfaces (Center deck entry 4, thread entry 8, chats list entry 7)
  render the items this module returns; they never re-derive
  category, timing, or state (gyroscope law).

  Spec: coordination/repair18/proactive-presentation-system.md.
  Categories are decided by section 2.1's questions, keyed to real
  records only:

  - P1 Needs your answer - this viewer's canonical plan response is
    pending on an active upcoming plan (it stops moving if they
    ignore it), or a plan proposal state that needs them.
  - P2 Ready for you - a governed plan is agreed (ready), not yet
    in its live window, and nothing is missing from it.
  - P3 Still taking shape - a forming plan missing EXACTLY ONE named
    thing (a day/time or a place) that this viewer can supply here.
    More than one missing thing is not a reveal.
  - P4 Happening now - a plan inside its live window (the NextPlan
    upcoming/live rule) and the viewer is a participant.
  - P5 Remembered for you - ONLY an explicitly saved celebration
    (a Celebrations row the user saved) at one of its truth-side
    lead-time milestones (14, 7, 1, or 0 days, the reminder
    worker's own milestones). Inferred dates never produce a P5.
    No basis line is composed (D-5 open): the item ships without
    the basis part, per the task's D-5 rule.
  - P6 What Opal did (LIMITED, D-3 open) - a material
    ShellRecentChange recorded for this viewer in the last 24
    hours, as at most ONE visit-scoped line. No trail form exists.
  - P7 Looking after people (strictest copy) - from B3/B45 truth:
    (a) an open check-in sweep addressed to this viewer that they
    have not answered (in that circle's context only), (b) an
    organizer summary that has at least one answer, rendered as
    counts only - never a member's words, never a name in the
    substance, and (c) a missed care turn that the B45 truth side
    has ALREADY surfaced once (missed_surfaced_at set), to a
    member of that rotation only. Copy never names a miss as a
    failure and never carries a count of misses.

  Entitlement (spec 2.3): in-app channels only. No push is ever
  produced here (D-4 open). No mode object is consulted (D-8 open);
  the one truth-side gate this derivation does read is the
  existing hard gate: a viewer with proactive_opt_out set gets
  no reveals at all.

  QUIET ceilings enforced HERE (spec 5.4): one lit item per
  surface order (priority P1, P7, P4, P5, P2, P3, P6 - only the
  strongest item carries lit=true); deck slot caps (Needs you 3,
  Coming up 3, Taking shape 3, report line 1); one reveal per
  plan (coalescing, spec 2.4); dismissal is permanent - a
  RevealDismissal row removes the item in every channel forever.

  Polish Cluster A (P1): a P1 plan item may also carry a
  `change_request` object - the request-a-change lane. It is
  derived in this module only (see change_request_for/2): the
  viewer must be able to propose a change through the existing
  conversation change machinery, and a real alternative time must
  exist (another party's still-open shared availability window).
  Every other item carries `change_request: nil`.

  Indicator language: plan items carry the NextPlan state family
  and the DIR-1 entity tint (NextPlan.entity_tint/1 on the first
  other participant). P5 carries no plan state; P7 carries no plan
  state. The front end maps categories and states to the
  --orb-indicator-* / PLAN_STATE_HEX tokens; no hue is decided
  anywhere else.
  """

  import Ecto.Query

  alias OpalCore.Accounts.User
  alias OpalCore.Celebrations
  alias OpalCore.Celebrations.Celebration
  alias OpalCore.Repo

  alias OpalCore.SocialFlow.{
    Availability,
    CareCheckIn,
    CareRotation,
    CheckinResponse,
    CheckinSweep,
    NextPlan,
    PlanParticipant,
    PlanRevision,
    RevealDismissal,
    SharedPlan,
    ShellRecentChange
  }

  @priority %{"P1" => 0, "P7" => 1, "P4" => 2, "P5" => 3, "P2" => 4, "P3" => 5, "P6" => 6}
  @celebration_milestones [14, 7, 1, 0]
  @p6_window_hours 24

  @kickers %{
    "P1" => "Your move",
    "P2" => "Ready for you",
    "P3" => "One thing left",
    "P4" => "Happening now",
    "P5" => "Remember this",
    "P6" => "Opal update",
    "P7" => "A gentle check-in"
  }

  def kickers, do: @kickers
  def priority, do: @priority

  # ------------------------------------------------------------------
  # Public door
  # ------------------------------------------------------------------

  @doc """
  All reveal items for a viewer, ceilings applied, strongest first.
  Returns %{"items" => [...], "deck" => %{...}} - the deck grouping
  is part of this derivation, not a surface decision.
  Options: :now (DateTime), :conversation_id (scope to one thread's
  items plus circle items for that conversation).
  """
  def for_viewer(viewer_id, opts \\ [])

  def for_viewer(viewer_id, opts) when is_binary(viewer_id) do
    now = Keyword.get(opts, :now) || DateTime.utc_now()

    if opted_out?(viewer_id) do
      empty()
    else
      dismissed = dismissed_keys(viewer_id)

      items =
        (plan_items(viewer_id, now) ++
           celebration_items(viewer_id, now) ++
           report_items(viewer_id, now) ++
           care_items(viewer_id, now))
        |> Enum.reject(&MapSet.member?(dismissed, &1["reveal_key"]))
        |> scope(Keyword.get(opts, :conversation_id))
        |> apply_ceilings()

      %{"items" => items, "deck" => deck(items)}
    end
  end

  def for_viewer(_, _), do: empty()

  @doc "Reveals for one conversation (thread entry 8 / list entry 7)."
  def for_conversation(viewer_id, conversation_id, opts \\ []) do
    for_viewer(viewer_id, Keyword.put(opts, :conversation_id, conversation_id))
  end

  @doc """
  Persist a permanent dismissal. Idempotent: dismissing twice is
  the same truth. Returns {:ok, feed} with the viewer's remaining
  reveals so the caller renders the server's answer, not a guess.
  """
  def dismiss(viewer_id, reveal_key, opts \\ [])

  def dismiss(viewer_id, reveal_key, opts)
      when is_binary(viewer_id) and is_binary(reveal_key) and reveal_key != "" do
    case Repo.get_by(RevealDismissal, viewer_user_id: viewer_id, reveal_key: reveal_key) do
      %RevealDismissal{} ->
        {:ok, for_viewer(viewer_id, opts)}

      nil ->
        %RevealDismissal{}
        |> RevealDismissal.changeset(%{viewer_user_id: viewer_id, reveal_key: reveal_key})
        |> Repo.insert()
        |> case do
          {:ok, _} -> {:ok, for_viewer(viewer_id, opts)}
          {:error, _} -> {:ok, for_viewer(viewer_id, opts)}
        end
    end
  end

  def dismiss(_, _, _), do: {:error, :invalid}

  defp empty, do: %{"items" => [], "deck" => deck([])}

  defp opted_out?(viewer_id) do
    case Repo.get(User, viewer_id) do
      %User{proactive_opt_out: true} -> true
      _ -> false
    end
  end

  defp dismissed_keys(viewer_id) do
    from(d in RevealDismissal, where: d.viewer_user_id == ^viewer_id, select: d.reveal_key)
    |> Repo.all()
    |> MapSet.new()
  end

  defp scope(items, nil), do: items

  defp scope(items, conversation_id) do
    Enum.filter(items, fn item ->
      item["conversation_id"] == conversation_id or
        (item["category"] == "P7" and item["source_ref_id"] == conversation_id)
    end)
  end

  # ------------------------------------------------------------------
  # Ceilings (spec 5.4) + deck grouping (spec entry 4)
  # ------------------------------------------------------------------

  defp apply_ceilings(items) do
    sorted = Enum.sort_by(items, &Map.fetch!(@priority, &1["category"]))

    needs = sorted |> Enum.filter(&(&1["category"] in ["P1", "P7"])) |> Enum.take(3)
    coming = sorted |> Enum.filter(&(&1["category"] in ["P4", "P2", "P5"])) |> Enum.take(3)
    shaping = sorted |> Enum.filter(&(&1["category"] == "P3")) |> Enum.take(3)
    report = sorted |> Enum.filter(&(&1["category"] == "P6")) |> Enum.take(1)

    kept = needs ++ coming ++ shaping ++ report
    kept_ids = MapSet.new(kept, & &1["reveal_key"])

    sorted
    |> Enum.filter(&MapSet.member?(kept_ids, &1["reveal_key"]))
    |> Enum.with_index()
    |> Enum.map(fn {item, idx} ->
      item
      |> Map.put("lit", idx == 0)
      # Polish Cluster A (P1): every item carries the lane key -
      # the object on the one P1 item whose derivation earned it,
      # nil everywhere else (honest absence, never a missing key a
      # surface might fill in by guessing).
      |> Map.put_new("change_request", nil)
    end)
  end

  defp deck(items) do
    %{
      "needs_you" => Enum.filter(items, &(&1["category"] in ["P1", "P7"])),
      "next_together" => Enum.filter(items, &(&1["category"] == "P4")) |> Enum.take(1),
      "coming_up" => Enum.filter(items, &(&1["category"] in ["P2", "P5"])),
      "taking_shape" => Enum.filter(items, &(&1["category"] == "P3")),
      "report_line" => Enum.filter(items, &(&1["category"] == "P6")) |> List.first()
    }
  end

  # ------------------------------------------------------------------
  # Plan items: P1 / P2 / P3 / P4 - one per plan (coalescing)
  # ------------------------------------------------------------------

  defp plan_items(viewer_id, now) do
    participant_plan_ids =
      from(pp in PlanParticipant, where: pp.user_id == ^viewer_id, select: pp.plan_id)
      |> Repo.all()

    plans =
      from(p in SharedPlan,
        where:
          p.status in ^NextPlan.active_statuses() and
            (p.created_by_user_id == ^viewer_id or p.id in ^participant_plan_ids) and
            # Repair #19 W20 (JA-02) — FIX-A's creator-only private
            # predicate: a privatized plan never becomes a reveal
            # item for its participants (the creator's own branch
            # above still carries it for the creator).
            (p.is_private == false or p.created_by_user_id == ^viewer_id)
      )
      |> Repo.all()
      |> Enum.filter(&NextPlan.upcoming?(&1, now))
      |> Enum.uniq_by(& &1.id)

    Enum.flat_map(plans, fn plan ->
      case plan_item(plan, viewer_id, now) do
        nil -> []
        item -> [item]
      end
    end)
  end

  # Repair #19 polish P12-4 - HORIZON MILESTONE RULE. A far-band
  # plan (start more than 30 calendar days out - the same threshold
  # as the web density constitution's far band) is reveal-INELIGIBLE
  # except on a milestone: it needs this viewer's answer (their
  # response is pending - a decision is needed), or it is missing
  # exactly one slot this viewer can supply (also a decision). A
  # ready or quietly-forming far plan produces NO reveal and NO
  # countdown noise; it rests in the horizon band until it migrates
  # nearer or a milestone occurs. Preparation-task completion
  # milestones ride the P6 report leg (a material ShellRecentChange),
  # which is not a plan item and is untouched by this gate.
  @horizon_days 30

  defp far_band?(%SharedPlan{start_at: %DateTime{} = start}, now) do
    DateTime.to_date(start) |> Date.diff(DateTime.to_date(now)) > @horizon_days
  end

  defp far_band?(_, _), do: false

  defp horizon_milestone?(%SharedPlan{} = plan, viewer_id) do
    viewer_response(plan.id, viewer_id) == "pending" or not is_nil(missing_slot(plan))
  end

  defp plan_item(%SharedPlan{} = plan, viewer_id, now) do
    if far_band?(plan, now) and not horizon_milestone?(plan, viewer_id) do
      nil
    else
      plan_item_near(plan, viewer_id, now)
    end
  end

  defp plan_item_near(%SharedPlan{} = plan, viewer_id, now) do
    state = plan_state(plan, viewer_id, now)
    place = SharedPlan.place_projection(plan)
    others = OpalCore.SocialFlow.plan_participant_ids(plan) -- [viewer_id]
    tint = others |> List.first() |> NextPlan.entity_tint()

    base = %{
      "plan_id" => plan.id,
      "conversation_id" => plan.conversation_id,
      "title" => plan.title,
      "when_label" => plan_when_label(plan),
      "where_label" => place && place["label"],
      "plan_state" => state,
      "entity_tint" => tint,
      "status" => plan.status
    }

    cond do
      state == "happening" ->
        item(base, "P4", "plan:#{plan.id}:happening", "View plan", nil)

      state == "action" ->
        base
        |> item("P1", "plan:#{plan.id}:needs-answer", "Confirm", nil)
        |> Map.put("change_request", change_request_for(plan, viewer_id))

      state == "ready" ->
        item(base, "P2", "plan:#{plan.id}:ready", "View plan", nil)

      true ->
        case missing_slot(plan) do
          nil ->
            nil

          slot ->
            base
            |> Map.put("missing_slot", slot)
            |> item(
              "P3",
              "plan:#{plan.id}:missing-#{slot}",
              if(slot == "time", do: "Pick a day", else: "Add a place"),
              slot
            )
        end
    end
  end

  # Viewer-scoped indicator state, same rule as NextPlan's private
  # derivation (live window, then viewer's pending answer, then
  # agreed = ready, else forming).
  defp plan_state(%SharedPlan{} = plan, viewer_id, now) do
    cond do
      live?(plan, now) -> "happening"
      viewer_response(plan.id, viewer_id) == "pending" -> "action"
      plan.status == "agreed" -> "ready"
      true -> "forming"
    end
  end

  defp live?(%SharedPlan{start_at: %DateTime{} = start} = plan, now) do
    DateTime.compare(start, now) != :gt and NextPlan.upcoming?(plan, now)
  end

  defp live?(_, _), do: false

  # ------------------------------------------------------------------
  # Polish Cluster A (P1) - the REQUEST-A-CHANGE lane on a P1 item.
  #
  # ONE explicit derivation. Inputs: the plan, the viewer, and the
  # records below. The lane exists ONLY when every input is true:
  #
  #   PERMISSION - the viewer can actually propose a change to this
  #   plan through the existing machinery (ConversationAlignment's
  #   committed-change proposals and SocialFlow.propose_revision/1,
  #   entered in the app through the plan-scoped Opal chat). That
  #   machinery is conversation-scoped and member-gated, so:
  #     * the plan must carry a conversation (a conversation-less
  #       plan - Center / trip / solo - is sender-fixed from the
  #       viewer's seat today: Confirm or Dismiss are its only
  #       truthful actions, and the lane stays absent for that
  #       whole class);
  #     * the viewer must be a member of that conversation (the
  #       Availability call below enforces exactly that gate and
  #       answers :not_a_member otherwise);
  #     * there must be another party to propose TO (a scope
  #       person: the plan's creator when they are another
  #       participant, else the first other participant - the same
  #       other-party the scoped-chat doorway validates against);
  #     * no change may already be on the table (a PlanRevision in
  #       "proposed" state owns the respond lane - Accept / Keep -
  #       not a second request).
  #
  #   ALTERNATIVES - at least one real alternative time exists:
  #   an availability window ANOTHER party shared into this
  #   conversation, still usable now, that does not start at the
  #   plan's current start (Availability.alternative_windows_for/3,
  #   the lane's one alternatives source). When the last such
  #   window closes (ends, expires, or is revoked), the next read
  #   derives nil and the action disappears - presence is
  #   state-driven, never painted.
  #
  # The object carries finished truth only: the plain label, the
  # conversation the change flow scopes to, the alternative windows
  # (shared-safe projections), and the scope person the doorway
  # needs. Surfaces render it verbatim; they derive nothing.
  # ------------------------------------------------------------------

  @change_request_label "Request a change"

  defp change_request_for(%SharedPlan{conversation_id: conversation_id} = plan, viewer_id)
       when is_binary(conversation_id) do
    if pending_revision?(plan.id) do
      nil
    else
      with {:ok, [_ | _] = alternatives} <-
             Availability.alternative_windows_for(conversation_id, viewer_id, plan.start_at),
           {person_id, person_name} <- change_scope_person(plan, viewer_id) do
        %{
          "label" => @change_request_label,
          "conversation_id" => conversation_id,
          "alternatives" => alternatives,
          "scope_person_id" => person_id,
          "scope_person_name" => person_name
        }
      else
        _ -> nil
      end
    end
  end

  defp change_request_for(%SharedPlan{}, _viewer_id), do: nil

  defp pending_revision?(plan_id) do
    from(r in PlanRevision, where: r.plan_id == ^plan_id and r.status == "proposed")
    |> Repo.exists?()
  end

  # The other party the plan-scoped change doorway scopes to: the
  # plan's creator when the creator is another participant, else
  # the first other participant (plan_participant_ids order, the
  # same order the entity tint reads). Nil when the viewer is the
  # plan's only party - there is no one to propose a change to.
  defp change_scope_person(%SharedPlan{} = plan, viewer_id) do
    others = OpalCore.SocialFlow.plan_participant_ids(plan) -- [viewer_id]

    person_id =
      cond do
        plan.created_by_user_id in others -> plan.created_by_user_id
        others != [] -> List.first(others)
        true -> nil
      end

    case person_id && Repo.get(User, person_id) do
      %User{} = user -> {user.id, user.display_name}
      _ -> nil
    end
  end

  defp viewer_response(plan_id, viewer_id) do
    case Repo.get_by(PlanParticipant, plan_id: plan_id, user_id: viewer_id) do
      %PlanParticipant{} = row -> PlanParticipant.canonical_response_state(row.response_state)
      _ -> nil
    end
  end

  # Exactly one named thing missing, or this is not a P3.
  defp missing_slot(%SharedPlan{} = plan) do
    has_time =
      match?(%DateTime{}, plan.start_at) or
        (is_binary(plan.time_label) and String.trim(plan.time_label) != "")

    has_place =
      plan.plan_type == "virtual" or
        (is_binary(plan.location) and String.trim(plan.location) != "")

    case {has_time, has_place} do
      {false, true} -> "time"
      {true, false} -> "place"
      _ -> nil
    end
  end

  defp plan_when_label(%SharedPlan{time_label: label}) when is_binary(label) do
    if String.trim(label) == "", do: nil, else: label
  end

  defp plan_when_label(%SharedPlan{} = plan) do
    case plan.start_at do
      %DateTime{} = start ->
        local =
          case DateTime.shift_zone(start, plan.timezone || "UTC") do
            {:ok, shifted} -> shifted
            _ -> start
          end

        Calendar.strftime(local, "%a, %b %d, %I:%M %p")

      _ ->
        nil
    end
  end

  # ------------------------------------------------------------------
  # P5 - explicitly saved celebrations only, at their saved moment
  # ------------------------------------------------------------------

  defp celebration_items(viewer_id, now) do
    today = DateTime.to_date(now)

    case Celebrations.list_for_user(viewer_id) do
      {:ok, celebrations} ->
        Enum.flat_map(celebrations, fn %Celebration{} = c ->
          days = Celebrations.days_until(c, today)

          if days in @celebration_milestones do
            year = Celebrations.occurrence_year(c, today)

            [
              %{
                "reveal_key" => "celebration:#{c.id}:#{year}:#{days}",
                "category" => "P5",
                "kicker" => @kickers["P5"],
                "title" => "#{c.person_name} - #{c.kind}",
                "substance" =>
                  if(days == 0,
                    do: "Today - #{Celebration.date_label(c.month, c.day)}",
                    else: "In #{days} days - #{Celebration.date_label(c.month, c.day)}"
                  ),
                "plan_id" => nil,
                "conversation_id" => nil,
                "source_ref_id" => c.id,
                "plan_state" => nil,
                "entity_tint" => nil,
                "action_label" => "Got it",
                "missing_slot" => nil,
                "lit" => false
              }
            ]
          else
            []
          end
        end)

      _ ->
        []
    end
  end

  # ------------------------------------------------------------------
  # P6 - limited form: one visit-scoped report line (D-3 open)
  # ------------------------------------------------------------------

  defp report_items(viewer_id, now) do
    since = DateTime.add(now, -@p6_window_hours * 3600, :second)

    rows =
      from(c in ShellRecentChange,
        where: c.owner_user_id == ^viewer_id and c.material == true and c.inserted_at >= ^since,
        order_by: [desc: c.inserted_at],
        limit: 1
      )
      |> Repo.all()

    Enum.map(rows, fn c ->
      %{
        "reveal_key" => "report:#{c.id}",
        "category" => "P6",
        "kicker" => @kickers["P6"],
        "title" => c.title,
        "substance" => c.explanation,
        "plan_id" => c.plan_id,
        "conversation_id" => c.conversation_id,
        "source_ref_id" => c.id,
        "plan_state" => nil,
        "entity_tint" => nil,
        "action_label" => "Got it",
        "missing_slot" => nil,
        "lit" => false
      }
    end)
  end

  # ------------------------------------------------------------------
  # P7 - care / check-in, strictest copy (counts only, no words)
  # ------------------------------------------------------------------

  defp care_items(viewer_id, now) do
    checkin_ask_items(viewer_id, now) ++
      checkin_summary_items(viewer_id) ++
      missed_care_items(viewer_id, now)
  end

  defp checkin_ask_items(viewer_id, now) do
    rows =
      from(r in CheckinResponse,
        join: s in CheckinSweep,
        on: r.sweep_id == s.id,
        where:
          r.member_user_id == ^viewer_id and r.status == "asked" and s.status == "open" and
            s.expires_at > ^now,
        order_by: [asc: s.inserted_at]
      )
      |> Repo.all()

    # One ask per sweep is already the B3 truth (pre-created rows).
    sweep_ids = rows |> Enum.map(& &1.sweep_id) |> Enum.uniq()

    sweeps =
      from(s in CheckinSweep, where: s.id in ^sweep_ids) |> Repo.all() |> Map.new(&{&1.id, &1})

    Enum.map(rows, fn r ->
      sweep = Map.fetch!(sweeps, r.sweep_id)

      %{
        "reveal_key" => "checkin-ask:#{sweep.id}:#{viewer_id}",
        "category" => "P7",
        "kicker" => @kickers["P7"],
        "title" => sweep.circle_label,
        "substance" => "A check-in is waiting for your answer.",
        "plan_id" => nil,
        "conversation_id" =>
          if(sweep.source_kind == "conversation", do: sweep.source_ref_id, else: nil),
        "source_ref_id" => sweep.source_ref_id,
        "plan_state" => nil,
        "entity_tint" => nil,
        "action_label" => "Confirm",
        "missing_slot" => nil,
        "lit" => false
      }
    end)
  end

  defp checkin_summary_items(viewer_id) do
    sweeps =
      from(s in CheckinSweep,
        where: s.organizer_user_id == ^viewer_id and s.status in ["open", "complete"],
        order_by: [desc: s.updated_at],
        limit: 5
      )
      |> Repo.all()

    Enum.flat_map(sweeps, fn sweep ->
      rows = from(r in CheckinResponse, where: r.sweep_id == ^sweep.id) |> Repo.all()
      answered = Enum.count(rows, &(&1.status in ["answered", "declined", "passed"]))

      if answered > 0 do
        [
          %{
            "reveal_key" => "checkin-summary:#{sweep.id}:#{answered}",
            "category" => "P7",
            "kicker" => @kickers["P7"],
            "title" => sweep.circle_label,
            "substance" => "#{answered} of #{length(rows)} answered.",
            "plan_id" => nil,
            "conversation_id" =>
              if(sweep.source_kind == "conversation", do: sweep.source_ref_id, else: nil),
            "source_ref_id" => sweep.source_ref_id,
            "plan_state" => nil,
            "entity_tint" => nil,
            "action_label" => "View plan",
            "missing_slot" => nil,
            "lit" => false
          }
        ]
      else
        []
      end
    end)
  end

  defp missed_care_items(viewer_id, now) do
    rows =
      from(c in CareCheckIn,
        where:
          c.assignee_user_id == ^viewer_id and not is_nil(c.missed_surfaced_at) and
            c.status in ["open", "missed"] and c.window_end_at <= ^now,
        order_by: [desc: c.missed_surfaced_at],
        limit: 3
      )
      |> Repo.all()

    Enum.flat_map(rows, fn c ->
      rotation = Repo.get(CareRotation, c.rotation_id)

      if rotation && viewer_id in (rotation.member_user_ids || []) do
        [
          %{
            "reveal_key" => "care-missed:#{c.occurrence_key}",
            "category" => "P7",
            "kicker" => @kickers["P7"],
            "title" => rotation.subject_label,
            "substance" => "A check-in turn is still open.",
            "plan_id" => nil,
            "conversation_id" => rotation.conversation_id,
            "source_ref_id" => c.rotation_id,
            "plan_state" => nil,
            "entity_tint" => nil,
            "action_label" => "Confirm",
            "missing_slot" => nil,
            "lit" => false
          }
        ]
      else
        []
      end
    end)
  end

  defp item(base, category, key, action_label, _slot) do
    %{
      "reveal_key" => key,
      "category" => category,
      "kicker" => @kickers[category],
      "title" => base["title"],
      "substance" =>
        [base["when_label"], base["where_label"]] |> Enum.reject(&is_nil/1) |> Enum.join(" - "),
      "plan_id" => base["plan_id"],
      "conversation_id" => base["conversation_id"],
      "source_ref_id" => base["plan_id"],
      "plan_state" => base["plan_state"],
      "entity_tint" => base["entity_tint"],
      "action_label" => action_label,
      "missing_slot" => base["missing_slot"],
      "lit" => false
    }
  end
end
