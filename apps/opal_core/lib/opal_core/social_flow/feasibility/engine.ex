defmodule OpalCore.SocialFlow.Feasibility.Engine do
  @moduledoc """
  Compose native commitments + travel + place into private feasibility decisions.

  A time is not viable merely because a calendar slot is empty.
  """

  alias OpalCore.SocialFlow.Feasibility.{LeaveBy, TimePlaceLoop, Travel}
  alias OpalCore.SocialFlow.OpalCalendar
  alias OpalCore.SocialFlow.OpalCalendar.ReminderDelivery

  @doc """
  Evaluate a candidate window for an owner in a conversation.

  Returns private guidance only — never peer details of other commitments.
  """
  def evaluate(attrs) when is_map(attrs) do
    a = stringify(attrs)
    owner = a["owner_user_id"]
    start_at = parse_dt(a["candidate_start"])
    end_at = parse_dt(a["candidate_end"]) || (start_at && DateTime.add(start_at, 7200, :second))
    conv = a["conversation_id"]

    with true <- is_binary(owner),
         %DateTime{} <- start_at do
      prior = prior_commitment_end(owner, start_at, conv)

      travel_min = a["travel_minutes"] || 20

      {:ok, travel} =
        Travel.assess(%{
          "prior_end_at" => prior,
          "candidate_start" => start_at,
          "travel_minutes" => travel_min,
          "mode" => a["mode"]
        })

      calendar_conflict =
        OpalCalendar.conflicts?(owner, start_at, end_at, exclude_conversation_id: conv)

      conflict_guidance =
        if calendar_conflict do
          OpalCalendar.private_conflict_guidance(owner, start_at, end_at,
            exclude_conversation_id: conv
          )
        else
          %{"conflicts" => false}
        end

      viable? =
        not calendar_conflict and Travel.usable?(travel)

      alternate =
        if not viable? and match?(%DateTime{}, prior) do
          case TimePlaceLoop.suggest_adjusted_start(prior, travel_min) do
            {:ok, adj} -> adj
            _ -> nil
          end
        end

      leave =
        case LeaveBy.for_commitment(
               %{"id" => a["commitment_id"], "start_at" => start_at, "owner_user_id" => owner},
               travel_minutes: travel_min
             ) do
          {:ok, l} -> l
          _ -> nil
        end

      {:ok,
       %{
         "viable" => viable?,
         "feasibility" => travel["feasibility"],
         "leave_by" => leave && leave["leave_by"],
         "leave_copy" => leave && leave["private_copy"],
         "calendar_conflict" => calendar_conflict,
         "conflict" => conflict_guidance,
         "alternate_start" => alternate,
         "origin_exposed" => false,
         "other_plan_revealed" => false,
         "authorizes_set" => false,
         "trace" => %{
           "native_conflict" => calendar_conflict,
           "travel_feasible" => Travel.usable?(travel),
           "feasibility" => travel["feasibility"],
           "alternate_windows" => if(alternate, do: 1, else: 0)
         }
       }}
    else
      _ -> {:error, :invalid}
    end
  end

  def evaluate(_), do: {:error, :invalid}

  @doc "Post-Set private leave-by reminder queue."
  def schedule_leave_by_reminders(commitment, opts \\ []) when is_map(commitment) do
    with {:ok, leave} <- LeaveBy.for_commitment(commitment, opts) do
      intent =
        leave
        |> LeaveBy.as_reminder_intent()
        |> Map.put("owner_user_id", commitment["owner_user_id"] || commitment[:owner_user_id])

      {:ok, ReminderDelivery.queue([intent], opts)}
    end
  end

  defp prior_commitment_end(owner, start_at, exclude_conv) do
    owner
    |> OpalCalendar.busy_blocks_for_user(%{
      start_at: DateTime.add(start_at, -6 * 3600, :second),
      end_at: start_at
    })
    |> Enum.reject(fn b -> exclude_conv && b["conversation_id"] == exclude_conv end)
    |> Enum.map(& &1["end_at"])
    |> Enum.filter(&match?(%DateTime{}, &1))
    |> case do
      [] -> nil
      list -> Enum.max_by(list, &DateTime.to_unix(&1, :microsecond))
    end
  end

  defp parse_dt(%DateTime{} = dt), do: DateTime.truncate(dt, :microsecond)

  defp parse_dt(iso) when is_binary(iso) do
    case DateTime.from_iso8601(iso) do
      {:ok, dt, _} -> DateTime.truncate(dt, :microsecond)
      _ -> nil
    end
  end

  defp parse_dt(_), do: nil

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
