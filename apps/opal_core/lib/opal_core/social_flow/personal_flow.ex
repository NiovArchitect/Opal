defmodule OpalCore.SocialFlow.PersonalFlow do
  @moduledoc """
  Personal flow orchestration (Pass 14).

  Not a planner. Not a daily agenda. Not a task timeline.

  Consumes AttentionAuthority + optional work/travel/errand context and
  derives the next meaningful private consequence for one actor — or silence.

  Personal consequences stay actor-private; they do not rewrite Shared Reality.
  """

  alias OpalCore.SocialFlow.AttentionAuthority

  @doc """
  Compose one flow consequence for the actor's current day state.

  facts list: maps consumable by AttentionAuthority.evaluate/1
  ctx keys (optional):
  - `"now"` DateTime
  - `"work_ends_in_minutes"` integer
  - `"travel_minutes"` integer (authoritative/synthetic)
  - `"travel_source"` string provenance
  - `"optional_errand"` map with label/duration_minutes/feasible?
  - `"already_travelling"` boolean
  - `"hour"` integer
  """
  def compose(facts_list, ctx \\ %{}) when is_list(facts_list) do
    ctx = stringify(ctx)
    work_ends = ctx["work_ends_in_minutes"]
    travel = ctx["travel_minutes"]
    already = truthy?(ctx["already_travelling"])

    ranked =
      facts_list
      |> Enum.map(fn f ->
        f = stringify(f)
        d = AttentionAuthority.evaluate(f)
        # priority_score is private — use evaluate + minutes for relative order
        mins = f["minutes_until"]
        prio = d.priority + temporal_boost(mins) + delay_boost(f, mins)
        {prio, f, d, mins}
      end)
      |> Enum.sort_by(fn {p, _, _, _} -> -p end)

    top = List.first(ranked)

    cond do
      already ->
        silence("on_track", ["already_travelling_suppress_leave"])

      early_silence?(work_ends, top) ->
        silence("early_or_no_consequence", ["no_near_transition"])

      leave = leave_window(top, travel) ->
        leave

      optional = optional_transition(work_ends, top, travel, ctx) ->
        optional

      top && elem(top, 2).class in ~w(action_required time_sensitive critical) ->
        {_p, f, d, mins} = top

        %{
          "reality_id" => f["conversation_id"] || f["reality_id"] || "decision",
          "kind" => "decision",
          "human_consequence" => decision_copy(f),
          "actionability" => if(d.class == "time_sensitive", do: "time_sensitive", else: "required"),
          "attention" => d,
          "delivery_eligible" => d.class in ~w(time_sensitive critical),
          "supersession_key" => "decision:#{f["conversation_id"] || "x"}:#{f["next_gap"]}",
          "privacy_class" => "actor_private",
          "source_provenance" => ["attention_authority"],
          "minutes_until" => mins,
          "reasons" => [d.reason]
        }

      true ->
        silence("default", ["nothing_matters_now"])
    end
  end

  defp early_silence?(work_ends, top) do
    far_work = is_nil(work_ends) or (is_integer(work_ends) and work_ends > 90)

    weak_top =
      is_nil(top) or
        elem(top, 2).class in ~w(silence ambient) or
        not elem(top, 2).should_surface_home

    far_work and weak_top
  end

  defp leave_window(nil, _), do: nil

  defp leave_window({_p, f, _d, mins}, travel)
       when is_integer(travel) and travel > 0 and is_integer(mins) and mins >= 0 do
    leave_in = mins - travel

    if leave_in >= 0 and leave_in <= 45 do
      who = f["who"] || f["peer_name"]
      copy = leave_copy(leave_in, who)

      %{
        "reality_id" => f["conversation_id"] || "personal",
        "kind" => "leave_window",
        "human_consequence" => copy,
        "actionability" => "time_sensitive",
        "attention" =>
          AttentionAuthority.evaluate(%{
            leave_by_relevant: true,
            minutes_until: leave_in,
            conversation_id: f["conversation_id"]
          }),
        "delivery_eligible" => true,
        "supersession_key" => "leave:#{f["conversation_id"] || "x"}:#{leave_in}",
        "privacy_class" => "actor_private",
        "source_provenance" => ["attention_authority", "travel_truth", f["travel_source"] || "synthetic"],
        "minutes_until" => leave_in,
        "reasons" => ["leave_window", "travel_min:#{travel}", "event_in:#{mins}"]
      }
    else
      nil
    end
  end

  defp leave_window(_, _), do: nil

  defp optional_transition(work_ends, top, travel, ctx)
       when is_integer(work_ends) and work_ends >= 0 and work_ends <= 30 do
    errand = ctx["optional_errand"]

    if is_map(errand) and errand["feasible"] != false do
      next_mins =
        case top do
          {_, _, _, m} when is_integer(m) -> m
          _ -> nil
        end

      dur = errand["duration_minutes"] || 30
      travel_m = if is_integer(travel), do: travel, else: 0

      if is_integer(next_mins) and next_mins > work_ends + dur + travel_m + 15 do
        label = errand["label"] || "that stop"

        %{
          "reality_id" => errand["id"] || "personal-errand",
          "kind" => "optional_transition",
          "human_consequence" => "You've got time for #{label} before dinner.",
          "actionability" => "optional",
          "attention" => %{
            "class" => "useful_now",
            "should_surface_home" => false,
            "should_interrupt" => false,
            "reason" => "optional_slack"
          },
          "delivery_eligible" => false,
          "supersession_key" => "optional:#{errand["id"] || "errand"}",
          "privacy_class" => "actor_private",
          "source_provenance" => ["personal_flow", "optional_not_obligation"],
          "minutes_until" => work_ends,
          "reasons" => ["work_end_slack", "optional_errand_feasible"]
        }
      else
        nil
      end
    else
      nil
    end
  end

  defp optional_transition(_, _, _, _), do: nil

  defp leave_copy(leave_in, who) when leave_in <= 5 do
    if is_binary(who) and who != "", do: "Leave now for dinner with #{who}.", else: "Leave now for your plan."
  end

  defp leave_copy(_leave_in, who) do
    if is_binary(who) and who != "",
      do: "Leave soon for dinner with #{who}.",
      else: "Leave soon for your plan."
  end

  defp decision_copy(f) do
    case to_string(f["next_gap"] || "") do
      "place" -> "Where should dinner be?"
      "time" -> "Find a time."
      _ -> nil
    end
  end

  defp silence(reason, extra) do
    %{
      "reality_id" => "_silence",
      "kind" => "silence",
      "human_consequence" => nil,
      "actionability" => "none",
      "attention" => AttentionAuthority.evaluate(%{recompute_only: true}),
      "delivery_eligible" => false,
      "supersession_key" => "silence:#{reason}",
      "privacy_class" => "actor_private",
      "source_provenance" => ["personal_flow"],
      "minutes_until" => nil,
      "reasons" => [reason | extra]
    }
  end

  defp temporal_boost(mins) when is_integer(mins) and mins >= 0 and mins <= 60, do: 50
  defp temporal_boost(mins) when is_integer(mins) and mins <= 360, do: 30
  defp temporal_boost(mins) when is_integer(mins) and mins <= 24 * 60, do: 18
  defp temporal_boost(_), do: 0

  defp delay_boost(f, mins) do
    gap = to_string(f["next_gap"] || "")
    actionable? = gap in ~w(time place activity participants open_loop)

    cond do
      not actionable? -> 0
      is_integer(mins) and mins <= 6 * 60 -> 35
      is_integer(mins) and mins <= 24 * 60 -> 28
      true -> 5
    end
  end

  defp truthy?(v), do: v == true or v == "true" or v == 1

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
