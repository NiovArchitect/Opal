defmodule OpalCore.SocialFlow.NextPlan do
  @moduledoc """
  Repair #18 DIR-1 - EVENT IN CONVERSATION: the ONE shared upcoming
  plan fact (SP-3 projection from governed state).

  For a viewer and a conversation (or a single peer, for the call
  log), this module derives the soonest UPCOMING plan the viewer
  shares with that conversation's people (or that peer), from real
  SharedPlan records only:

  - Scope law: a plan is a candidate only when it is a plan OF
    these people - either it is bound to that conversation, or its
    party set (PlanParticipant rows, read through
    SocialFlow.plan_participant_ids/1, the one definition, creator
    fallback included) is exactly the conversation's people. For a
    single peer (the call log), the rule is that the viewer and the
    peer are both parties. A plan with a third person never
    surfaces in a different person's conversation row.
  - Upcoming (L8 presence discipline): the plan's governed status
    is active (tentative / agreed / changed - cancelled, completed
    and expired are terminal and never surface) AND its time has
    not passed: an end_at in the past exits it; a start_at more
    than the live window (3 hours, the arbitration live window)
    in the past exits it; a plan with no instant at all (a finished
    time_label only) is upcoming until its status says otherwise -
    there is no instant that could prove it past.
  - Exactly one: soonest first (dated plans by start, soonest
    first; undated plans after dated ones, most recently touched
    first), and only the first is projected. One plan-awareness
    element per row / thread / call row, never a stack.

  The projection is finished strings plus the governed status and
  the indicator state family, computed HERE in the service layer.
  Front ends render it; they never re-derive "shared", "upcoming",
  "next", or the state family themselves.

  Indicator state family (viewer-scoped, governed):
  - "happening" - the plan's live window is open now for this viewer;
  - "action" - the viewer's own canonical participant response is
    still pending (the plan needs their answer);
  - "ready" - the plan's governed status is agreed;
  - "forming" - everything else active (tentative / changed).
  """

  import Ecto.Query

  alias OpalCore.Messages
  alias OpalCore.Repo
  alias OpalCore.SocialFlow
  alias OpalCore.SocialFlow.PlanParticipant
  alias OpalCore.SocialFlow.SharedPlan

  @active_statuses ~w(tentative agreed changed)
  @live_window_seconds 180 * 60

  def active_statuses, do: @active_statuses

  @doc """
  The person's stable entity tint (1-6, the --person-tint-* token
  palette). Assigned from the person's stable identity (their user
  id), never re-randomized and never re-derived per surface (L9).
  """
  def entity_tint(user_id) when is_binary(user_id) and user_id != "" do
    :erlang.phash2(user_id, 6) + 1
  end

  def entity_tint(_), do: nil

  @doc "The next shared upcoming plan fact for a conversation, or nil."
  def for_conversation(viewer_id, conversation_id, opts \\ [])

  def for_conversation(viewer_id, conversation_id, opts)
      when is_binary(viewer_id) and is_binary(conversation_id) do
    member_ids = Messages.member_user_ids(conversation_id)

    if viewer_id in member_ids do
      now = Keyword.get(opts, :now) || DateTime.utc_now()

      candidates =
        plans_by_conversation(conversation_id) ++
          plans_by_participant_set(viewer_id, member_ids, :exact)

      pick_next(candidates, viewer_id, now, opts)
    else
      nil
    end
  end

  def for_conversation(_, _, _), do: nil

  @doc "The next shared upcoming plan fact for one peer, or nil (call log)."
  def for_peer(viewer_id, peer_id, opts \\ [])

  def for_peer(viewer_id, peer_id, opts)
      when is_binary(viewer_id) and is_binary(peer_id) and viewer_id != peer_id do
    now = Keyword.get(opts, :now) || DateTime.utc_now()

    candidates =
      plans_by_participant_set(viewer_id, [viewer_id, peer_id], :covers) ++
        plans_by_shared_conversations(viewer_id, peer_id)

    pick_next(candidates, viewer_id, now, opts)
  end

  def for_peer(_, _, _), do: nil

  # --- candidate sources -------------------------------------------------

  defp plans_by_conversation(conversation_id) do
    from(p in SharedPlan,
      where: p.conversation_id == ^conversation_id and p.status in ^@active_statuses
    )
    |> Repo.all()
  end

  # Plans (any source) matched on their party set (participant sets
  # come from the one definition, SocialFlow.plan_participant_ids/1):
  # - :exact (conversations) - the plan's parties ARE this
  #   conversation's people: a group plan with an extra person is
  #   not the dyad's plan, and a dyad plan is not the group's.
  # - :covers (call-log peer) - the viewer and the peer are both
  #   parties; other parties may also be on the plan, because it is
  #   still a plan the two of them share.
  defp plans_by_participant_set(viewer_id, party_ids, mode) do
    wanted = MapSet.new(party_ids)

    if MapSet.size(wanted) < 2 do
      []
    else
      plan_ids =
        from(pp in PlanParticipant,
          where: pp.user_id == ^viewer_id,
          select: pp.plan_id
        )
        |> Repo.all()

      from(p in SharedPlan,
        where: p.id in ^plan_ids and p.status in ^@active_statuses
      )
      |> Repo.all()
      |> Enum.filter(fn plan ->
        parties = MapSet.new(SocialFlow.plan_participant_ids(plan))

        case mode do
          :exact -> MapSet.equal?(parties, wanted)
          :covers -> MapSet.subset?(wanted, parties)
        end
      end)
    end
  end

  defp plans_by_shared_conversations(viewer_id, peer_id) do
    conversation_ids =
      from(cm1 in OpalCore.Messaging.ConversationMember,
        join: cm2 in OpalCore.Messaging.ConversationMember,
        on: cm1.conversation_id == cm2.conversation_id,
        where: cm1.user_id == ^viewer_id and cm2.user_id == ^peer_id,
        select: cm1.conversation_id
      )
      |> Repo.all()
      |> Enum.uniq()

    Enum.flat_map(conversation_ids, &plans_by_conversation/1)
  end

  # --- the one pick ------------------------------------------------------

  defp pick_next(candidates, viewer_id, now, opts \\ []) do
    candidates
    |> Enum.uniq_by(& &1.id)
    # Polish C P3 (per-viewer vault) — applied at this ONE pick:
    # a plan the VIEWER marked private never projects into the
    # viewer's awareness surfaces (chats list, thread strip, call
    # log) - it lives only in their "My private graphs". Other
    # parties' marks are irrelevant here and never read: their
    # awareness of the same plan is unchanged.
    |> Enum.filter(fn plan ->
      not OpalCore.SocialFlow.PlanPrivacyMark.marked?(viewer_id, plan.id)
    end)
    |> Enum.filter(&upcoming?(&1, now))
    |> Enum.sort_by(
      fn plan ->
        {
          if(match?(%DateTime{}, plan.start_at), do: 0, else: 1),
          if(match?(%DateTime{}, plan.start_at),
            do: DateTime.to_unix(plan.start_at, :microsecond),
            else: 0
          ),
          -DateTime.to_unix(plan.updated_at, :microsecond)
        }
      end
    )
    |> List.first()
    |> case do
      %SharedPlan{} = plan -> project(plan, viewer_id, now, opts)
      _ -> nil
    end
  end

  @doc "True while the plan is upcoming under the L8 rule above."
  def upcoming?(%SharedPlan{status: status} = plan, now) do
    cond do
      status not in @active_statuses ->
        false

      match?(%DateTime{}, plan.end_at) ->
        DateTime.compare(plan.end_at, now) != :lt

      match?(%DateTime{}, plan.start_at) ->
        DateTime.diff(now, plan.start_at, :second) <= @live_window_seconds

      true ->
        true
    end
  end

  def upcoming?(_, _), do: false

  # --- the finished projection -------------------------------------------

  defp project(%SharedPlan{} = plan, viewer_id, now, opts \\ []) do
    place = SharedPlan.place_projection(plan)

    fact = %{
      "plan_id" => plan.id,
      "title" => plan.title,
      "when_label" => when_label(plan),
      "starts_at" => dt(plan.start_at),
      "where_label" => place && place["label"],
      "where_kind" => place && place["kind"],
      "status" => plan.status,
      "state" => indicator_state(plan, viewer_id, now),
      "conversation_id" => plan.conversation_id
    }

    # Cluster G (P10c): leave-by rides the fact ONLY when the
    # caller opts in (the thread paths in ConversationController).
    # A routed provider call per plan has no place in the chats
    # list or call log fan-outs, which keep the byte-identical
    # fact they had. The value is the ONE LeaveBy derivation.
    if Keyword.get(opts, :leave_by) == true do
      Map.put(
        fact,
        "leave_by",
        OpalCore.SocialFlow.LeaveBy.for_plan(plan, viewer_id, now: now)
      )
    else
      fact
    end
  end

  # The finished when string: the plan's own time_label when it carries
  # one; otherwise a label built here (service layer) from its instant
  # in its own timezone - never formatted by a front end.
  defp when_label(%SharedPlan{time_label: label}) when is_binary(label) do
    if String.trim(label) == "", do: nil, else: label
  end

  defp when_label(%SharedPlan{} = plan) do
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

  defp indicator_state(%SharedPlan{} = plan, viewer_id, now) do
    cond do
      live?(plan, now) ->
        "happening"

      viewer_response(plan.id, viewer_id) == "pending" ->
        "action"

      plan.status == "agreed" ->
        "ready"

      true ->
        "forming"
    end
  end

  defp live?(%SharedPlan{start_at: %DateTime{} = start} = plan, now) do
    DateTime.compare(start, now) != :gt and upcoming?(plan, now)
  end

  defp live?(_, _), do: false

  defp viewer_response(plan_id, viewer_id) do
    case Repo.get_by(PlanParticipant, plan_id: plan_id, user_id: viewer_id) do
      %PlanParticipant{} = row -> PlanParticipant.canonical_response_state(row.response_state)
      _ -> nil
    end
  end

  defp dt(nil), do: nil
  defp dt(%DateTime{} = d), do: DateTime.to_iso8601(d)
end
