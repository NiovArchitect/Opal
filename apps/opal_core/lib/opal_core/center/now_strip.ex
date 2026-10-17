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
  """

  import Ecto.Query

  alias OpalCore.Repo
  alias OpalCore.SocialFlow.OpalCalendar.Commitment
  alias OpalCore.SocialFlow.SharedPlan

  @doc """
  Live plan events for `user_id` whose start falls in `[from_at, to_at]`,
  ascending by start. Each event: %{"id", "title", "start_at", "end_at",
  "source" => "plan", "plan_id"}. Cancelled/completed plans and
  superseded/cancelled commitments never appear.
  """
  def plan_events(user_id, %DateTime{} = from_at, %DateTime{} = to_at)
      when is_binary(user_id) do
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
    |> Enum.map(fn {%Commitment{} = c, %SharedPlan{} = p} ->
      %{
        "id" => p.id,
        "plan_id" => p.id,
        "title" => plan_title(p, c),
        "start_at" => DateTime.to_iso8601(c.start_at),
        "end_at" => c.end_at && DateTime.to_iso8601(c.end_at),
        "time_label" => p.time_label,
        "source" => "plan"
      }
    end)
  end

  def plan_events(_, _, _), do: []

  defp plan_title(%SharedPlan{title: title}, _c)
       when is_binary(title) and title != "",
       do: title

  defp plan_title(_p, %Commitment{label: label}) when is_binary(label) and label != "",
    do: label

  defp plan_title(_, _), do: "Plan"
end
