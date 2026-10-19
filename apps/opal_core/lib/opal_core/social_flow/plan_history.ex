defmodule OpalCore.SocialFlow.PlanHistory do
  @moduledoc """
  Repair #18 adoption wave 1, ST-G - the plan's own history.

  One derivation, from the plan's own governed records only:

  - the `SharedPlan` row itself (created, dropped/cancelled stamps);
  - its `social_flow_audit_events` rows (the transition record every
    gated mutation writes: schedule set, details edited, place moved,
    agreed, cancelled, shared);
  - its `PlanRevision` rows (a material day/place change proposed or
    applied on the Journey track writes a revision where no audit row
    exists);
  - its `PlanParticipant` rows (who answered, and when they answered).

  The Who list and the counts come from the canonical participation
  projection - `JourneyAuthority.project/3` for names and roles and
  `JourneyAuthority.attendance_contract/2` for the counts - so the
  names and the counts agree by construction (Div A single source).
  Nothing here reads any viewer's private memory: the history is the
  shared truth of the plan, identical for every viewer who may read
  the plan, and nothing else.
  """

  import Ecto.Query

  alias OpalCore.Accounts.User
  alias OpalCore.Repo
  alias OpalCore.SocialFlow
  alias OpalCore.SocialFlow.AuditEvent
  alias OpalCore.SocialFlow.JourneyAuthority
  alias OpalCore.SocialFlow.PlanParticipant
  alias OpalCore.SocialFlow.PlanRevision
  alias OpalCore.SocialFlow.SharedPlan

  @doc """
  The history + Who projection for one plan, for one viewer.

  Access is the plan's own access law (`SocialFlow.get_plan_for_user/2`):
  a viewer who cannot read the plan gets the same error that reader
  gives, and no history leaks.
  """
  def for_plan(plan_id, viewer_id)
      when is_binary(plan_id) and is_binary(viewer_id) do
    case SocialFlow.get_plan_for_user(plan_id, viewer_id) do
      {:ok, %SharedPlan{} = plan} ->
        {:ok,
         %{
           "plan_id" => plan.id,
           "history" => history_lines(plan),
           "who" => who_list(plan, viewer_id),
           "counts" => JourneyAuthority.attendance_contract(plan.id, viewer_id)
         }}

      {:error, _} = error ->
        error
    end
  end

  def for_plan(_, _), do: {:error, :invalid}

  # --- history -----------------------------------------------------------

  defp history_lines(%SharedPlan{} = plan) do
    names = names_for(plan)

    entries =
      [created_entry(plan, names)] ++
        audit_entries(plan, names) ++
        revision_entries(plan, names) ++
        participant_entries(plan, names) ++
        terminal_entries(plan, names)

    entries
    |> Enum.reject(&is_nil/1)
    |> Enum.sort_by(fn e -> {DateTime.to_unix(e.at, :microsecond), e.seq} end, :desc)
    |> Enum.map(fn e ->
      %{"line" => e.line, "kind" => e.kind, "at" => DateTime.to_iso8601(e.at)}
    end)
  end

  defp created_entry(plan, names) do
    %{
      at: plan.inserted_at,
      seq: 0,
      kind: "created",
      line: "Created by #{name_of(names, plan.created_by_user_id)}."
    }
  end

  defp audit_entries(plan, names) do
    rows =
      from(a in AuditEvent,
        where: a.plan_id == ^plan.id,
        order_by: [asc: a.inserted_at]
      )
      |> Repo.all()

    Enum.map(rows, fn a ->
      case audit_line(a, plan, names) do
        nil ->
          nil

        {kind, line} ->
          %{at: a.inserted_at, seq: 10, kind: kind, line: line}
      end
    end)
  end

  # Every line traces to one audit row. Event types with no human line
  # here (plan.created - the row's own creation entry above covers it)
  # are skipped, never paraphrased into a guess.
  defp audit_line(%AuditEvent{event_type: "plan.schedule_changed"} = a, _plan, names) do
    actor = name_of(names, a.actor_user_id)
    field = a.payload["field"]
    value = a.payload["new_value"]

    cond do
      field in ["time_label", "date_label"] and is_binary(value) and value != "" ->
        {"day_set", "#{actor} set the day to #{value}."}

      field == "location" and is_binary(value) and value != "" ->
        {"place_set", "#{actor} set the place to #{value}."}

      true ->
        {"changed", "#{actor} updated the plan."}
    end
  end

  defp audit_line(%AuditEvent{event_type: "plan.details_edited"} = a, plan, names) do
    actor = name_of(names, a.actor_user_id)
    fields = List.wrap(a.payload["fields"])

    line =
      cond do
        "location" in fields ->
          case plan.location do
            loc when is_binary(loc) and loc != "" -> "#{actor} set the place to #{loc}."
            _ -> "#{actor} updated the place."
          end

        "title" in fields ->
          "#{actor} updated the plan's name."

        true ->
          "#{actor} updated the plan's details."
      end

    {"edited", line}
  end

  defp audit_line(%AuditEvent{event_type: "plan.place_type_changed"} = a, plan, names) do
    actor = name_of(names, a.actor_user_id)

    if SharedPlan.virtual?(plan) do
      {"place_set", "#{actor} moved this plan online."}
    else
      {"place_set", "#{actor} moved this plan to a place."}
    end
  end

  defp audit_line(%AuditEvent{event_type: "plan.agreed"} = a, _plan, names) do
    {"agreed", "#{name_of(names, a.actor_user_id)} locked in the plan."}
  end

  defp audit_line(%AuditEvent{event_type: "plan.cancelled"} = a, _plan, names) do
    {"dropped", "#{name_of(names, a.actor_user_id)} dropped this plan."}
  end

  defp audit_line(%AuditEvent{event_type: "plan.shared_to_conversation"} = a, _plan, names) do
    {"shared", "#{name_of(names, a.actor_user_id)} shared this plan to a chat."}
  end

  defp audit_line(%AuditEvent{event_type: type} = a, _plan, names)
       when type in ["plan.restored", "plan.revived"] do
    {"restored", "#{name_of(names, a.actor_user_id)} restored this plan."}
  end

  defp audit_line(_, _, _), do: nil

  # Journey-track material changes write an accepted PlanRevision (and
  # no audit row). Schedule-change revisions (kind "schedule_change")
  # DO have an audit row, so they are skipped here to avoid a double
  # line for one change.
  defp revision_entries(plan, names) do
    rows =
      from(r in PlanRevision,
        where: r.plan_id == ^plan.id,
        order_by: [asc: r.inserted_at]
      )
      |> Repo.all()

    Enum.flat_map(rows, fn r ->
      changes = r.proposed_changes || %{}

      cond do
        changes["kind"] == "schedule_change" ->
          []

        r.status == "proposed" ->
          [
            %{
              at: r.inserted_at,
              seq: 20,
              kind: "change_proposed",
              line: "#{name_of(names, r.proposed_by_user_id)} suggested a change."
            }
          ]

        r.status == "accepted" ->
          line =
            cond do
              is_binary(changes["time_label"]) and changes["time_label"] != "" ->
                "#{name_of(names, r.proposed_by_user_id)} set the day to #{changes["time_label"]}."

              is_binary(changes["location"]) and changes["location"] != "" ->
                "#{name_of(names, r.proposed_by_user_id)} set the place to #{changes["location"]}."

              is_binary(changes["start_at"]) ->
                "#{name_of(names, r.proposed_by_user_id)} set the day."

              true ->
                nil
            end

          if line,
            do: [%{at: r.accepted_at || r.inserted_at, seq: 20, kind: "changed", line: line}],
            else: []

        true ->
          []
      end
    end)
  end

  # Who answered: one line per participant who actually answered
  # (responded_at set), after the plan existed. The creator's own
  # at-creation "accepted" row is the creation itself, not an answer.
  defp participant_entries(plan, names) do
    rows =
      from(pp in PlanParticipant,
        where: pp.plan_id == ^plan.id and not is_nil(pp.responded_at),
        order_by: [asc: pp.responded_at]
      )
      |> Repo.all()

    Enum.flat_map(rows, fn pp ->
      if pp.user_id == plan.created_by_user_id and
           DateTime.diff(pp.responded_at, plan.inserted_at, :second) <= 2 do
        []
      else
        case PlanParticipant.canonical_response_state(pp.response_state) do
          "accepted" ->
            [
              %{
                at: pp.responded_at,
                seq: 30,
                kind: "answered",
                line: "#{name_of(names, pp.user_id)} said they are going."
              }
            ]

          "declined" ->
            [
              %{
                at: pp.responded_at,
                seq: 30,
                kind: "answered",
                line: "#{name_of(names, pp.user_id)} said they cannot make it."
              }
            ]

          # A pending row that still carries a responded_at is the
          # material-change reconfirm reset (JourneyAuthority sets
          # accepted participants back to pending and leaves
          # responded_at standing): the person DID answer - going -
          # at that time, and the change lines around it tell the
          # rest of the story. The Who list shows their current
          # state; this line is the past fact, in order.
          "pending" ->
            [
              %{
                at: pp.responded_at,
                seq: 30,
                kind: "answered",
                line: "#{name_of(names, pp.user_id)} said they are going."
              }
            ]

          _ ->
            []
        end
      end
    end)
  end

  # The plan row's own terminal stamps are the fallback record of a
  # drop when the cancelling path wrote no audit row for this plan.
  defp terminal_entries(plan, names) do
    audited_cancel? =
      Repo.exists?(
        from(a in AuditEvent, where: a.plan_id == ^plan.id and a.event_type == "plan.cancelled")
      )

    entries = []

    entries =
      if match?(%DateTime{}, plan.cancelled_at) and not audited_cancel? do
        [
          %{
            at: plan.cancelled_at,
            seq: 40,
            kind: "dropped",
            line: "This plan was dropped by #{name_of(names, plan.created_by_user_id)}."
          }
          | entries
        ]
      else
        entries
      end

    if match?(%DateTime{}, plan.completed_at) do
      [
        %{
          at: plan.completed_at,
          seq: 40,
          kind: "completed",
          line: "This plan happened."
        }
        | entries
      ]
    else
      entries
    end
  end

  # --- who ---------------------------------------------------------------

  # Names + answers from the ONE participation projection
  # (JourneyAuthority.project/3). Its participant rows carry the
  # canonical response state; this module only attaches the person's
  # name and the human word for their answer.
  defp who_list(%SharedPlan{} = plan, viewer_id) do
    participants =
      case JourneyAuthority.project(plan, viewer_id, %{}) do
        %{"participants" => rows} when is_list(rows) -> rows
        _ -> []
      end

    names =
      participants
      |> Enum.map(& &1["user_id"])
      |> names_by_id()

    Enum.map(participants, fn row ->
      state = row["response_state"]

      %{
        "user_id" => row["user_id"],
        "name" => Map.get(names, row["user_id"]) || "Someone",
        "role" => row["role"],
        "response_state" => state,
        "response_label" => response_label(state)
      }
      |> Map.merge(location_fields(plan, row["user_id"]))
    end)
  end

  # R19 W7 - where they are, from the per-plan sharing backbone ONLY
  # (PlanLocationShare: the joiner's own opt-in for THIS plan). No
  # fresh share row -> "not_sharing" and NO distance, ever. A fresh
  # share + the plan place's own coordinates -> a measured coarse
  # distance (DeviceLocation.distance_label, the one distance
  # function; basis named "measured" because both endpoints are real
  # recorded coords, coarse at ~110 m). A fresh share without place
  # coordinates -> sharing, distance honestly unavailable with the
  # reason in the finished label.
  defp location_fields(%SharedPlan{} = plan, user_id) when is_binary(user_id) do
    case OpalCore.SocialFlow.PlanLocationShare.fresh_for(plan.id, user_id) do
      %OpalCore.SocialFlow.PlanLocationShare{} = share ->
        distance =
          if is_number(plan.place_lat) and is_number(plan.place_lon) do
            OpalCore.Center.DeviceLocation.distance_label(
              share.lat,
              share.lon,
              plan.place_lat,
              plan.place_lon
            )
          end

        label =
          if distance do
            "Sharing location - #{distance} from the place (measured from the location they shared for this plan)"
          else
            "Sharing location - distance unavailable: this plan's place has no coordinates yet"
          end

        %{
          "location_state" => "sharing",
          "location_label" => label,
          "distance_label" => distance,
          "distance_basis" => if(distance, do: "measured", else: nil)
        }

      _ ->
        %{
          "location_state" => "not_sharing",
          "location_label" => "Not sharing location",
          "distance_label" => nil,
          "distance_basis" => nil
        }
    end
  end

  defp location_fields(_, _) do
    %{
      "location_state" => "not_sharing",
      "location_label" => "Not sharing location",
      "distance_label" => nil,
      "distance_basis" => nil
    }
  end

  defp response_label("accepted"), do: "Going"
  defp response_label("pending"), do: "Waiting to answer"
  defp response_label("declined"), do: "Cannot make it"
  defp response_label(_), do: "Waiting to answer"

  # --- names ---------------------------------------------------------------

  defp names_for(%SharedPlan{} = plan) do
    ids =
      [plan.created_by_user_id] ++
        SocialFlow.plan_participant_ids(plan) ++
        audit_actor_ids(plan.id)

    names_by_id(ids)
  end

  defp audit_actor_ids(plan_id) do
    from(a in AuditEvent,
      where: a.plan_id == ^plan_id and not is_nil(a.actor_user_id),
      select: a.actor_user_id,
      distinct: true
    )
    |> Repo.all()
  end

  defp names_by_id(ids) do
    ids =
      ids
      |> Enum.filter(&is_binary/1)
      |> Enum.uniq()

    if ids == [] do
      %{}
    else
      from(u in User, where: u.id in ^ids, select: {u.id, u.display_name})
      |> Repo.all()
      |> Map.new(fn {id, name} -> {id, present_name(name)} end)
    end
  end

  defp name_of(names, user_id), do: Map.get(names, user_id) || "Someone"

  defp present_name(name) when is_binary(name) do
    case String.trim(name) do
      "" -> "Someone"
      trimmed -> trimmed
    end
  end

  defp present_name(_), do: "Someone"
end
