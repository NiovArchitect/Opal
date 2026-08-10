defmodule OpalCore.SocialFlow.Ambient.GroupRecovery do
  @moduledoc """
  Preserve alignment when reality gets messy.

  WHAT IS STILL TRUE?
  WHAT ACTUALLY BROKE?
  WHAT IS THE SMALLEST THING HUMANS NEED TO DECIDE?

  Composes FailureRadius, RecoveryPreservation, GroupViability, CapacityGap,
  RoleDependency, BookingBridge, PlanVersion, SmallestOutput.
  Does not own Set. No UI. Additive only.
  """

  alias OpalCore.SocialFlow.Ambient.{
    BookingBridge,
    CapacityGap,
    FailureRadius,
    GroupViability,
    PlanVersion,
    RecoveryPreservation,
    RoleDependency,
    SmallestOutput
  }

  @doc """
  Handle a failure against a preserved alignment context.

  attrs:
  - failure_kind
  - resolved_dimensions (list)
  - set (bool)
  - plan_version
  - participants
  - in_count / capacity
  - alternate_venues
  - human_override (optional explicit correction dims)
  """
  def recover(attrs) when is_map(attrs) do
    a = stringify(attrs)
    failure = a["failure_kind"] || "restaurant_unavailable"
    resolved = List.wrap(a["resolved_dimensions"] || FailureRadius.alignment_dimensions())

    # Explicit human correction outranks recovery preference
    override_dims = List.wrap(a["human_override_invalidated"] || [])

    with {:ok, radius} <- FailureRadius.apply(failure, resolved),
         invalid <- Enum.uniq(radius["invalidated"] ++ override_dims),
         {:ok, preserve} <-
           RecoveryPreservation.measure(%{
             "resolved_before" => resolved,
             "invalidated" => invalid
           }),
         {:ok, participation} <- participation_delta(a, failure),
         {:ok, capacity} <- capacity_check(a, participation),
         {:ok, roles} <- role_check(a),
         {:ok, provider} <- provider_recovery(a, failure),
         gate <- late_payload_gate(a) do
      viable? =
        participation["viable"] != false and roles["roles_ok"] != false and
          capacity["ok"] != false

      path = recovery_path(failure, viable?, provider, capacity, roles)

      full = %{
        "failure_kind" => failure,
        "what_broke" => invalid,
        "still_true" => preserve["preserved"],
        "preservation" => preserve,
        "failure_radius" => radius,
        "participation" => participation,
        "capacity" => capacity,
        "roles" => roles,
        "provider" => provider,
        "plan_version_ok" => gate,
        "recovery_path" => path,
        "restarted_social_alignment" => radius["restart_social_alignment"] == true,
        "silent_exclusion" => false,
        "shame_holdout" => false,
        "social_set_intact" => a["set"] == true and not radius["full_plan_reset"],
        "visible_opal_moments" => visible_count(path, viable?, provider),
        "authorizes_set" => false,
        "user_work_removed" =>
          ~w(re_search re_poll recheck_time recheck_group reopen_maps retype_constraints switch_apps restart_booking)
      }

      smallest = smallest_for(path, full, a)
      {:ok, Map.put(full, "smallest", smallest)}
    end
  end

  def recover(_), do: {:error, :invalid}

  @doc "Late join: only capacity/tickets/cost — do not restart time/place/willingness."
  def late_join(attrs) when is_map(attrs) do
    a = stringify(attrs)
    in_count = to_i(a["in_count"])
    cap_total = to_i(a["capacity"] || a["seats"] || 99)
    remaining = max(cap_total - in_count, 0)
    remaining = a["provider_capacity_remaining"] || remaining
    tickets = a["tickets_remaining"] || remaining

    with {:ok, v} <-
           GroupViability.late_join(
             %{"in_count" => in_count},
             a["joiner_id"],
             provider_capacity_remaining: remaining,
             tickets_remaining: tickets,
             plan_confirmed: a["set"] == true,
             allow_late_join: a["allow_late_join"] != false
           ),
         {:ok, cap} <-
           CapacityGap.evaluate(%{
             "in_count" => in_count + if(v["can_join"], do: 1, else: 0),
             "capacity" => cap_total,
             "set" => a["set"] == true
           }) do
      if v["can_join"] and cap["ok"] do
        {:ok,
         %{
           "integrated" => true,
           "restarted_time" => false,
           "restarted_place" => false,
           "restarted_willingness" => false,
           "silent_exclusion" => false,
           "plan_intact" => true,
           "smallest" => %{"kind" => "nothing", "reason" => "late_join_smooth", "feed" => false},
           "authorizes_set" => false
         }}
      else
        {:ok,
         %{
           "integrated" => false,
           "restarted_time" => false,
           "restarted_place" => false,
           "restarted_willingness" => false,
           "silent_exclusion" => false,
           "plan_intact" => true,
           "capacity" => cap,
           "smallest" => %{
             "kind" => "minimum_question",
             "topic" => "different_place_or_smaller_group",
             "copy" => "That place may not fit everyone.",
             "feed" => false,
             "authorizes_set" => false
           },
           "authorizes_set" => false
         }}
      end
    end
  end

  def late_join(_), do: {:error, :invalid}

  @doc "Late drop: optional continues; required may need minimum question."
  def late_drop(attrs) when is_map(attrs) do
    a = stringify(attrs)
    participants = List.wrap(a["participants"])
    leaver = a["leaver_id"]

    with {:ok, v} <-
           GroupViability.late_decline(participants, leaver,
             purpose: a["purpose"] || "friends",
             min_viable: a["min_viable"],
             hard_constraints: a["hard_constraints"] || []
           ) do
      still_true = ~w(time place_area cuisine_or_category quiet budget relationship_context)

      still_true =
        if v["was_required"], do: still_true, else: ["participants" | still_true]

      {:ok, preserve} =
        RecoveryPreservation.measure(%{
          "resolved_before" =>
            ~w(time place_area cuisine_or_category participants quiet budget relationship_context),
          "invalidated" => if(v["was_required"], do: ~w(participants viability), else: [])
        })

      path = if v["viable"], do: :continue_quietly, else: :minimum_question

      smallest =
        case path do
          :continue_quietly ->
            %{"kind" => "nothing", "reason" => "optional_drop_plan_ok", "feed" => false}

          :minimum_question ->
            %{
              "kind" => "minimum_question",
              "topic" => "required_participant",
              "copy" => "This may need another approach.",
              "feed" => false,
              "authorizes_set" => false
            }
        end

      {:ok,
       %{
         "viable" => v["viable"],
         "was_required" => v["was_required"],
         "restart_entire_plan" => false,
         "graceful_miss" => v["graceful_miss"],
         "re_enter_future_ok" => true,
         "still_true" => still_true,
         "preservation" => preserve,
         "smallest" => smallest,
         "visible_opal_moments" => if(path == :continue_quietly, do: 0, else: 1),
         "shame_holdout" => false,
         "authorizes_set" => false
       }}
    end
  end

  def late_drop(_), do: {:error, :invalid}

  defp participation_delta(a, failure) do
    case failure do
      f when f in ~w(optional_participant_drop required_participant_drop driver_drop host_drop) ->
        participants = List.wrap(a["participants"])
        leaver = a["leaver_id"]

        if is_binary(leaver) and participants != [] do
          GroupViability.late_decline(participants, leaver,
            purpose: a["purpose"] || "friends",
            min_viable: a["min_viable"]
          )
        else
          {:ok, %{"viable" => true, "was_required" => failure != "optional_participant_drop"}}
        end

      _ ->
        {:ok, %{"viable" => true, "unchanged" => true}}
    end
  end

  defp capacity_check(a, _participation) do
    CapacityGap.evaluate(%{
      "in_count" => a["in_count"] || length(List.wrap(a["in_ids"])),
      "capacity" => a["capacity"] || a["provider_capacity"],
      "set" => a["set"] == true
    })
  end

  defp role_check(a) do
    roles_needed = List.wrap(a["required_roles"] || [])

    if roles_needed == [] do
      {:ok, %{"roles_ok" => true, "missing_roles" => []}}
    else
      RoleDependency.evaluate(List.wrap(a["participants"]), roles_needed)
    end
  end

  defp provider_recovery(a, failure)
       when failure in ~w(restaurant_unavailable provider_inventory slot_expired) do
    if a["set"] == true do
      case BookingBridge.recover_without_restart(a) do
        {:ok, r} ->
          {:ok,
           Map.merge(r, %{
             "uses_current_plan_version" => true,
             "stale_recovery_forbidden" => true
           })}

        err ->
          err
      end
    else
      {:ok, %{"recovered" => false, "set_required" => true}}
    end
  end

  defp provider_recovery(_, _), do: {:ok, %{"skipped" => true}}

  defp late_payload_gate(a) do
    active = %{"plan_version" => a["plan_version"] || 1, "request_id" => a["request_id"]}
    payload = a["late_provider_payload"]

    cond do
      is_map(payload) ->
        case PlanVersion.gate_late_payload(active, payload) do
          {:ok, _} -> true
          {:reject, _} -> false
        end

      true ->
        true
    end
  end

  defp recovery_path(failure, viable?, provider, capacity, roles) do
    cond do
      failure == "plan_cancelled" -> :full_reset
      roles["roles_ok"] == false -> :minimum_question
      viable? == false -> :minimum_question
      capacity["ok"] == false -> :capacity_gap_question
      provider["recovered"] == true -> :replacement_opportunity
      provider["recovered"] == false and provider["skipped"] != true -> :aligned_no_venue
      true -> :continue_quietly
    end
  end

  defp visible_count(path, _viable?, _provider) do
    case path do
      :continue_quietly -> 0
      :aligned_no_venue -> 1
      :replacement_opportunity -> 1
      :minimum_question -> 1
      :capacity_gap_question -> 1
      :full_reset -> 1
      _ -> 1
    end
  end

  defp smallest_for(path, full, a) do
    case path do
      :continue_quietly ->
        %{"kind" => "nothing", "reason" => "still_viable", "feed" => false}

      :replacement_opportunity ->
        opts = get_in(full, ["provider", "booking", "slots"]) || a["alternate_venues"] || []

        %{
          "kind" => "opportunity",
          "copy" => "That place filled up — these still fit.",
          "options" => Enum.take(List.wrap(opts), 3),
          "then_get_quiet" => true,
          "feed" => false,
          "authorizes_set" => false
        }

      :aligned_no_venue ->
        %{
          "kind" => "minimum_question",
          "topic" => "place",
          "copy" => "That place filled up — still aligned on the plan.",
          "feed" => false,
          "authorizes_set" => false
        }

      :capacity_gap_question ->
        %{
          "kind" => "minimum_question",
          "topic" => "different_place_or_smaller_group",
          "copy" => "That place may not fit the whole group.",
          "feed" => false,
          "authorizes_set" => false
        }

      :minimum_question ->
        SmallestOutput.question_from(%{
          "viability" => full["participation"] || %{},
          "actionability" => %{}
        })

      :full_reset ->
        %{
          "kind" => "minimum_question",
          "topic" => "intent",
          "copy" => "What works now?",
          "feed" => false
        }

      _ ->
        %{"kind" => "nothing", "reason" => "unknown", "feed" => false}
    end
  end

  defp to_i(n) when is_integer(n), do: n
  defp to_i(n) when is_float(n), do: trunc(n)
  defp to_i(_), do: 0

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
