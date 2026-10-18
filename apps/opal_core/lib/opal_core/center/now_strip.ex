defmodule OpalCore.Center.NowStrip do
  @moduledoc """
  Repair #17 (W4-6) — data path for the Center header ("now") strip.

  The strip must be fed by the user's REAL current/upcoming events from
  live plan state. Before this module, `CalendarController.today/2` only
  returned events from a linked external calendar; with no calendar
  linked it returned an empty list and the web layer fell back to a
  hardcoded SAMPLE day (Appointment 3:30 PM / Dinner 7:30 PM) — fixture
  data presented in the user's own header.

  The live source is the native Opal calendar projection
  (`OpalCalendar.Commitment`): every SharedPlan projects there through
  PlanCompletion / the revision chain (gyroscope — one plan row, one
  projection). Events are read from the plan row itself (title) joined
  with its active commitment (start/end), so a reschedule moves the strip
  with the plan. No commitments in the window → an honest empty list.

  Repair #18 (Division A, F18-09): each event also carries who and
  where, read from the real plan record — participant display names
  from PlanParticipant rows (falling back to the plan's stored
  who_label / subject_who for Center plans), and the venue from the
  plan's location or the commitment's place label (virtual plans read
  "Online"). The owner is never listed as their own companion; a solo
  plan's who is an empty list and the surface renders nothing extra.
  """

  import Ecto.Query

  alias OpalCore.Accounts.User
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.OpalCalendar.Commitment
  alias OpalCore.SocialFlow.PlanParticipant
  alias OpalCore.SocialFlow.SharedPlan

  @doc """
  Live plan events for `user_id` whose start falls in `[from_at, to_at]`,
  ascending by start. Each event: %{"id", "title", "start_at", "end_at",
  "source" => "plan", "plan_id", "who" => [display names], "where"}.
  Cancelled/completed plans and superseded/cancelled commitments never
  appear.
  """
  def plan_events(user_id, %DateTime{} = from_at, %DateTime{} = to_at)
      when is_binary(user_id) do
    rows =
      from(c in Commitment,
        join: p in SharedPlan,
        on: p.id == c.shared_plan_id,
        where:
          c.owner_user_id == ^user_id and c.status == "active" and
            is_nil(c.superseded_by_id) and is_nil(c.cancelled_at) and
            p.status in ^["tentative", "agreed", "changed"] and
            c.start_at >= ^from_at and c.start_at <= ^to_at,
        order_by: [asc: c.start_at],
        limit: 20,
        select: {c, p}
      )
      |> Repo.all()

    who_by_plan = who_by_plan(rows, user_id)
    pod_label_by_plan = pod_label_by_plan(rows, user_id)

    Enum.map(rows, fn {%Commitment{} = c, %SharedPlan{} = p} ->
      %{
        "id" => p.id,
        "plan_id" => p.id,
        "title" => plan_title(p, c),
        "start_at" => DateTime.to_iso8601(c.start_at),
        "end_at" => c.end_at && DateTime.to_iso8601(c.end_at),
        "time_label" => p.time_label,
        "source" => "plan",
        "who" => Map.get(who_by_plan, p.id, []),
        "where" => plan_where(p, c),
        # Repair #18 B5a: when the plan's participant set is exactly an
        # active pod's member set, the event names the pod context.
        "context_label" => Map.get(pod_label_by_plan, p.id)
      }
    end)
  end

  def plan_events(_, _, _), do: []

  # Pod context label per plan: the viewer's primary pod label when the
  # plan's participant set (owner included) equals the pod's active
  # member set. Read from declared pod records only.
  defp pod_label_by_plan(rows, user_id) do
    case OpalCore.SocialFlow.Households.primary_pod(user_id) do
      %OpalCore.SocialFlow.Household{} = pod ->
        members = OpalCore.SocialFlow.Households.active_member_ids(pod.id) |> MapSet.new()
        plan_ids = rows |> Enum.map(fn {_c, p} -> p.id end) |> Enum.uniq()

        sets =
          from(pp in PlanParticipant,
            where: pp.plan_id in ^plan_ids,
            select: {pp.plan_id, pp.user_id}
          )
          |> Repo.all()
          |> Enum.group_by(fn {pid, _} -> pid end, fn {_, uid} -> uid end)

        Map.new(rows, fn {_c, p} ->
          set = Map.get(sets, p.id, []) |> MapSet.new() |> MapSet.put(user_id)
          {p.id, if(MapSet.equal?(set, members), do: pod.label, else: nil)}
        end)

      _ ->
        %{}
    end
  end

  # Participant display names per plan, excluding the strip's owner.
  # Fallbacks (only when a plan has no participant rows at all): the
  # stored who_label / subject_who in the plan's alignment - the Center
  # subject persisted at creation (Repair #18), never an invention.
  defp who_by_plan(rows, owner_id) do
    plan_ids = rows |> Enum.map(fn {_c, p} -> p.id end) |> Enum.uniq()

    names_by_plan =
      from(pp in PlanParticipant,
        join: u in User,
        on: u.id == pp.user_id,
        where: pp.plan_id in ^plan_ids and pp.user_id != ^owner_id,
        order_by: [asc: pp.inserted_at],
        select: {pp.plan_id, u.display_name, u.handle}
      )
      |> Repo.all()
      |> Enum.group_by(
        fn {plan_id, _name, _handle} -> plan_id end,
        fn {_plan_id, name, handle} -> present_name(name) || present_name(handle) end
      )
      |> Map.new(fn {plan_id, names} -> {plan_id, Enum.reject(names, &is_nil/1)} end)

    Map.new(rows, fn {_c, p} ->
      who =
        case Map.get(names_by_plan, p.id, []) do
          [] -> alignment_who(p)
          names -> names
        end

      {p.id, who}
    end)
  end

  defp alignment_who(%SharedPlan{alignment: alignment}) when is_map(alignment) do
    cond do
      is_binary(alignment["who_label"]) and alignment["who_label"] != "" ->
        [alignment["who_label"]]

      is_binary(alignment["subject_who"]) and alignment["subject_who"] != "" ->
        [alignment["subject_who"]]

      true ->
        []
    end
  end

  defp alignment_who(_), do: []

  defp plan_where(%SharedPlan{plan_type: "virtual"}, _c), do: "Online"

  defp plan_where(%SharedPlan{location: location}, _c)
       when is_binary(location) and location != "",
       do: location

  defp plan_where(_p, %Commitment{place_label: label})
       when is_binary(label) and label != "",
       do: label

  defp plan_where(_, _), do: nil

  defp present_name(name) when is_binary(name) and name != "", do: name
  defp present_name(_), do: nil

  defp plan_title(%SharedPlan{title: title}, _c)
       when is_binary(title) and title != "",
       do: title

  defp plan_title(_p, %Commitment{label: label}) when is_binary(label) and label != "",
    do: label

  defp plan_title(_, _), do: "Plan"
end
