defmodule OpalCoreWeb.CalendarController do
  @moduledoc """
  Paste W6 Phase 5 — thin product calendar read for Center "now" strip.

  GET /api/v1/product/calendar/today
  Titles on-demand only for the visible day window. Never warehouses calendars.
  """

  use OpalCoreWeb, :controller

  alias OpalCore.Calendar
  alias OpalCore.Center.NowStrip

  # GET /api/v1/product/calendar/today
  def today(conn, _params) do
    user_id = conn.assigns.current_user_id
    now = DateTime.utc_now() |> DateTime.truncate(:second)
    start_at = DateTime.add(now, -4 * 3600, :second)
    end_at = DateTime.add(now, 20 * 3600, :second)

    # Repair #17 (W4-6) — the strip's live plan events are always part of
    # the answer, calendar linked or not. Before this, a user with no
    # linked calendar got an empty list and the client fell back to a
    # hardcoded sample day (3:30 / 7:30 fixtures).
    plan_events = NowStrip.plan_events(user_id, start_at, end_at)

    if not Calendar.connected?(user_id) do
      json(conn, %{
        "connected" => false,
        "source" => if(plan_events == [], do: "none", else: "plans"),
        "events" => plan_events
      })
    else
      case Calendar.list_events(user_id, start_at, end_at,
             include_titles: true,
             max_results: 20
           ) do
        {:ok, events} when is_list(events) ->
          merged =
            (Enum.map(events, &public_event/1) ++ plan_events)
            |> Enum.sort_by(fn e -> e["start_at"] || "" end)

          json(conn, %{
            "connected" => true,
            "source" => if(plan_events == [], do: "calendar", else: "calendar+plans"),
            "events" => merged
          })

        {:error, :disconnected} ->
          json(conn, %{
            "connected" => false,
            "source" => if(plan_events == [], do: "none", else: "plans"),
            "events" => plan_events
          })

        {:error, :permission_denied} ->
          conn
          |> put_status(403)
          |> json(%{
            "connected" => true,
            "source" => "calendar",
            "events" => [],
            "error_code" => "permission_denied"
          })

        {:error, _} ->
          conn
          |> put_status(503)
          |> json(%{
            "connected" => true,
            "source" => "calendar",
            "events" => [],
            "error_code" => "calendar_unavailable"
          })
      end
    end
  end

  defp public_event(ev) when is_map(ev) do
    %{
      "id" => ev["id"],
      "title" => ev["title"] || "(busy)",
      "start_at" => iso(ev["start_at"]),
      "end_at" => iso(ev["end_at"])
    }
  end

  defp public_event(_), do: %{"id" => nil, "title" => "(busy)", "start_at" => nil, "end_at" => nil}

  defp iso(%DateTime{} = dt), do: DateTime.to_iso8601(dt)
  defp iso(s) when is_binary(s), do: s
  defp iso(_), do: nil
end
