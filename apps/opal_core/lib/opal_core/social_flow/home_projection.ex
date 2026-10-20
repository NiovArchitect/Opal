defmodule OpalCore.SocialFlow.HomeProjection do
  @moduledoc """
  Participant-scoped continuity card for one committed SharedPlan.

  Home reads this projection. It is not a second database and it is not a
  public post. A message, a time proposal, or a locked time without a place
  does not qualify. Broader sharing stays explicit.
  """

  import Ecto.Query

  alias OpalCore.Repo
  alias OpalCore.SocialFlow.DateTimeChange
  alias OpalCore.SocialFlow.JourneyAuthority
  alias OpalCore.SocialFlow.PlaceIdentity
  alias OpalCore.SocialFlow.PlanStateArbitration
  alias OpalCore.SocialFlow.SharedPlan

  @spec from_alignment(map() | nil, String.t(), non_neg_integer()) :: map() | nil
  def from_alignment(alignment, conversation_id, member_count),
    do: from_alignment(alignment, conversation_id, member_count, [])

  @doc """
  The shared plan projection every surface renders (chats list, thread,
  graphs list, inbox:plan fanout).

  Repair #18 (Division A, plan truth): when the conversation has a real
  SharedPlan with PlanParticipant rows, the card carries the ONE counter
  (JourneyAuthority.attendance_contract/2): going_count, total_count,
  interested_count and - when `viewer_id:` is given - viewer_state, the
  viewer's own canonical response state. Surfaces render these numbers;
  they never derive their own. When there is no plan or the plan has no
  participant rows, the card carries NO count fields: absence is honest.

  Repair #18 (Division A, gap-fill): a card backed by a real plan also
  carries "conflict" - the SAME F18-03 object SocialFlow.plan_payload/1
  puts on list/sync paths (SocialFlow.plan_conflict/1, or nil when the
  owner's other active plans do not overlap), so the overlap is visible
  on the chats list / thread card and not only on the plan payload. A
  card with no real plan behind it carries no "conflict" key.
  """
  @spec from_alignment(map() | nil, String.t(), non_neg_integer(), keyword()) :: map() | nil
  def from_alignment(alignment, conversation_id, member_count, opts)
      when is_map(alignment) and is_binary(conversation_id) and is_integer(member_count) do
    exact = alignment["exact_time"] || %{}
    place = alignment["place"] || %{}
    commitment = alignment["commitment"]

    eligible =
      exact["state"] == "locked" and is_binary(exact["value"]) and
        place["state"] == "locked" and is_binary(place["value"]) and
        commitment in ["aligned", "execution_ready"]

    # Repair #19 W20 (JA-02) — FIX-A's creator-only private
    # predicate on the plan feed: when the card's backing plan row
    # is private and the viewer is not its creator, the card is
    # sealed entirely (no title/time/place in the participant's
    # live payloads). The creator's own card is unchanged.
    if eligible and
         not sealed_private?(alignment, conversation_id, Keyword.get(opts, :viewer_id)) do
      date = alignment["date"] || %{}
      change_proposal = alignment["change_proposal"]
      arb = PlanStateArbitration.evaluate(alignment)
      past_shared? = arb["past_shared_reality"] == true
      past? = arb["temporal_state"] == "past"

      when_label =
        [date["value"], exact["value"]]
        |> Enum.filter(&is_binary/1)
        |> Enum.join(" · ")

      plan_type = alignment["plan_type"] || "in_person"
      meeting_link = OpalCore.SocialFlow.MeetingLinks.sanitize(alignment["meeting_link"])
      place_value = if plan_type == "virtual", do: "Online", else: place["value"]

      %{
        "lineage_id" => alignment["lineage_id"],
        "conversation_id" => conversation_id,
        "plan_version" => alignment["plan_version"],
        "visibility" => "participants",
        "participant_mode" => participant_mode(member_count),
        # Earlier together = Past Shared Reality — not Durable/Published Memory
        "kicker" => if(past_shared? or past?, do: "Earlier together", else: "Plan set ✓"),
        "when_label" => when_label,
        "place" => place_value,
        # B1: the explicit place projection object, same shape as
        # SharedPlan.place_projection/1 - surfaces render this and
        # never re-derive kind from the label string.
        "place_projection" => %{
          "kind" => plan_type,
          "label" => place_value,
          "meeting_provider" =>
            OpalCore.SocialFlow.MeetingLinks.normalize_provider(alignment["meeting_provider"]) ||
              OpalCore.SocialFlow.MeetingLinks.provider_for(meeting_link),
          "meeting_link" => if(plan_type == "virtual", do: meeting_link),
          "join_available" => plan_type == "virtual" and is_binary(meeting_link),
          "directions_available" => plan_type != "virtual" and is_binary(place["value"])
        },
        "place_identity" => place_identity_for(alignment, place),
        "activity" => get_in(alignment, ["activity", "value"]),
        "timezone" => get_in(alignment, ["date", "timezone"]) || DateTimeChange.timezone(),
        "plan_type" => plan_type,
        "meeting_link" => meeting_link,
        "online" => plan_type == "virtual",
        "execution_label" => if(past?, do: nil, else: execution_label(commitment, plan_type)),
        "execution_detail" =>
          if(past?, do: nil, else: execution_detail(commitment, plan_type, meeting_link)),
        "pending_change" => is_map(change_proposal),
        "public" => false,
        "share" => "explicit_only",
        "temporal_state" => arb["temporal_state"],
        "canonical_start_at" => arb["canonical_start_at"],
        "next_together_eligible" => arb["next_together_eligible"],
        "upcoming_ready" => arb["upcoming_ready"],
        "future_execution_actionable" => arb["future_execution_actionable"],
        "past_shared_reality" => past_shared?,
        "occurrence_state" => arb["occurrence_state"],
        "memory_label" => false
      }
      |> maybe_put_pending_proposal(change_proposal)
      |> maybe_put_plan_truth(alignment, conversation_id, Keyword.get(opts, :viewer_id))
    else
      nil
    end
  end

  def from_alignment(_, _, _, _), do: nil

  @doc """
  Repair #18 residuals (R-4b) - card resolution for plan shapes the
  fold alignment cannot qualify. A plan born outside the fold (the
  founder graph-commitment seed, a Center/graph create shared into a
  thread) carries a stored alignment with no locked exact_time / place
  fields, so from_alignment/4 returns nil and the chats list rendered
  NO card at all - no attendance, no conflict, no time - while the
  plan row itself holds every fact. When the conversation's active
  plan row has real PlanParticipant rows, the card is built from the
  row: when from its canonical time_label, place from its location,
  and the ONE attendance counter + conflict merged exactly as
  maybe_put_plan_truth/4 merges them for fold-backed cards. A plan
  with no participant rows still yields nil - absence stays honest.
  """
  @spec from_plan_row(SharedPlan.t() | nil, String.t(), non_neg_integer(), keyword()) ::
          map() | nil
  def from_plan_row(plan, conversation_id, member_count, opts \\ [])

  def from_plan_row(%SharedPlan{} = plan, conversation_id, member_count, opts)
      when is_binary(conversation_id) and is_integer(member_count) do
    viewer_id = Keyword.get(opts, :viewer_id)

    # Polish C P3 (per-viewer vault): a plan the VIEWER marked
    # private yields NO card on the viewer's surfaces - it lives
    # only in their "My private graphs". Another party's mark has
    # no effect on this viewer's card.
    if OpalCore.SocialFlow.PlanPrivacyMark.marked?(viewer_id, plan.id) do
      nil
    else
      from_plan_row_visible(plan, conversation_id, member_count, viewer_id)
    end
  end

  defp from_plan_row_visible(%SharedPlan{} = plan, conversation_id, member_count, viewer_id) do
    contract = JourneyAuthority.attendance_contract(plan.id, viewer_id)

    if contract == %{} do
      nil
    else
      alignment = plan.alignment || %{}
      # B1: the COLUMN is the authority - the mirror is a fallback
      # only when the row somehow carries none (it always does).
      plan_type = plan.plan_type || alignment["plan_type"] || "in_person"

      meeting_link =
        OpalCore.SocialFlow.MeetingLinks.sanitize(plan.meeting_link) ||
          OpalCore.SocialFlow.MeetingLinks.sanitize(alignment["meeting_link"])

      past? =
        match?(%DateTime{}, plan.start_at) and
          DateTime.compare(plan.start_at, DateTime.utc_now()) == :lt

      %{
        "lineage_id" => plan.id,
        "conversation_id" => conversation_id,
        "plan_version" => alignment["plan_version"],
        "visibility" => "participants",
        "participant_mode" => participant_mode(member_count),
        "kicker" => if(past?, do: "Earlier together", else: "Plan set ✓"),
        # Repair #18 (Walk #4, W4-04): the plan's title, read from the
        # plan row - the one title source every surface shares, so an
        # edit lands here the moment it lands on the row.
        "title" => plan.title,
        "when_label" => plan.time_label,
        "place" => if(plan_type == "virtual", do: "Online", else: plan.location),
        # B1: row-backed cards carry the row's own place projection -
        # literally SharedPlan.place_projection/1, so this surface
        # cannot diverge from the contract.
        "place_projection" => SharedPlan.place_projection(plan),
        "place_identity" => nil,
        "activity" => get_in(alignment, ["activity", "value"]),
        "timezone" => plan.timezone || DateTimeChange.timezone(),
        "plan_type" => plan_type,
        "meeting_link" => meeting_link,
        "online" => plan_type == "virtual",
        "execution_label" => nil,
        "execution_detail" => nil,
        "pending_change" => false,
        "public" => false,
        "share" => "explicit_only",
        "temporal_state" => if(past?, do: "past", else: "future"),
        "canonical_start_at" =>
          if(match?(%DateTime{}, plan.start_at), do: DateTime.to_iso8601(plan.start_at)),
        "next_together_eligible" => not past?,
        "upcoming_ready" => not past?,
        "future_execution_actionable" => not past?,
        "past_shared_reality" => past?,
        "occurrence_state" => if(past?, do: "past", else: "upcoming"),
        "memory_label" => false
      }
      |> Map.merge(contract)
      |> Map.put("conflict", OpalCore.SocialFlow.plan_conflict(plan))
    end
  rescue
    _ -> nil
  end

  def from_plan_row(_, _, _, _), do: nil

  # --- Repair #18: attendance (the one counter, carried - never derived) ---
  # --- and the F18-03 conflict (the one detector, carried - never re-derived)

  defp maybe_put_plan_truth(card, alignment, conversation_id, viewer_id) do
    case attendance_plan(alignment, conversation_id) do
      %SharedPlan{} = plan ->
        card
        |> Map.merge(JourneyAuthority.attendance_contract(plan.id, viewer_id))
        |> Map.put("conflict", OpalCore.SocialFlow.plan_conflict(plan))
        # Repair #18 (Walk #4, W4-04): fold-backed cards carry the plan
        # row's current title too - an edited title reads back here,
        # never a fold-frozen copy.
        |> Map.put("title", plan.title)

      _ ->
        card
    end
  rescue
    # Pure-projection call sites (unit tests without a DB sandbox) keep the
    # pre-R18 card shape: no plan rows are readable, so no counts are shown.
    _ -> card
  end

  # Polish C P3 (per-viewer vault): true when the card's backing
  # plan is in the VIEWER'S OWN vault. Pure-projection call sites
  # (no DB sandbox) keep the unsealed shape - no plan row is
  # readable, so nothing can be sealed (mirrors
  # maybe_put_plan_truth's rescue law).
  defp sealed_private?(alignment, conversation_id, viewer_id) do
    case attendance_plan(alignment, conversation_id) do
      %SharedPlan{} = plan ->
        OpalCore.SocialFlow.PlanPrivacyMark.marked?(viewer_id, plan.id)

      _ ->
        false
    end
  rescue
    _ -> false
  end

  # The alignment's lineage_id IS the SharedPlan id once the fold has
  # materialized the plan; before that it falls back to the conversation
  # id, so resolve the conversation's active plan as the second source.
  defp attendance_plan(alignment, conversation_id) do
    with lineage when is_binary(lineage) <- alignment["lineage_id"],
         {:ok, _} <- Ecto.UUID.cast(lineage),
         %SharedPlan{} = plan <- Repo.get(SharedPlan, lineage) do
      plan
    else
      _ -> active_plan(conversation_id)
    end
  end

  defp active_plan(conversation_id) do
    with {:ok, _} <- Ecto.UUID.cast(conversation_id) do
      from(p in SharedPlan,
        where:
          p.conversation_id == ^conversation_id and p.status in ^~w(tentative agreed changed),
        order_by: [desc: p.updated_at, desc: p.inserted_at],
        limit: 1
      )
      |> Repo.one()
    else
      _ -> nil
    end
  end

  defp participant_mode(1), do: "solo"
  defp participant_mode(2), do: "dyad"
  defp participant_mode(count) when is_integer(count) and count >= 3, do: "group"
  defp participant_mode(_), do: "solo"

  defp execution_label(_commitment, "virtual"), do: "Online"
  defp execution_label("execution_ready", _), do: "Reservation approved"
  defp execution_label(_, _), do: nil

  defp execution_detail(_commitment, "virtual", link) when is_binary(link),
    do: "Join when it starts"

  defp execution_detail(_commitment, "virtual", _), do: "Add a meeting link when you have one"
  defp execution_detail("execution_ready", _, _), do: "Booking hasn't been placed yet."
  defp execution_detail(_, _, _), do: nil

  defp maybe_put_pending_proposal(card, change_proposal) when is_map(change_proposal) do
    card
    |> maybe_put_binary("pending_proposal_value", change_proposal["value"])
    |> maybe_put_binary("pending_proposal_field", change_proposal["field"])
    # Repair #17 (W3): the proposer is genuinely missing from this projection.
    # The thread derives "action needed" from alignment.change_proposal's
    # proposed_by_user_id, but the chat list / Graphs only receive this
    # projection — without the proposer they cannot tell a proposal that
    # needs THIS viewer from one the viewer made, so their status color
    # diverged from the thread. Participant-scoped card: every participant
    # already sees the proposer in-thread.
    |> maybe_put_binary("pending_proposal_by_user_id", change_proposal["proposed_by_user_id"])
  end

  defp maybe_put_pending_proposal(card, _), do: card

  defp maybe_put_binary(card, key, value) when is_binary(value), do: Map.put(card, key, value)
  defp maybe_put_binary(card, _, _), do: card

  # Prefer persisted PlaceIdentity over weak CandidateProvider catalog labels.
  defp place_identity_for(alignment, place) when is_map(place) do
    persisted = place["identity"] || alignment["place_identity"]

    cond do
      # B1 (A9): "Online" is not a place - never run it through the
      # physical PlaceIdentity pipeline.
      alignment["plan_type"] == "virtual" ->
        nil

      PlaceIdentity.high_confidence?(persisted) ->
        PlaceIdentity.for_surface(persisted)

      is_binary(place["value"]) ->
        PlaceIdentity.for_surface(PlaceIdentity.resolve(place["value"]))

      true ->
        nil
    end
  end

  defp place_identity_for(_, _), do: nil
end
