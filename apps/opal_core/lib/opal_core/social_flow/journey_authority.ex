defmodule OpalCore.SocialFlow.JourneyAuthority do
  @moduledoc """
  Graph → Journey authority (same Social Reality lineage).

  Reuses SharedPlan + PlanParticipant + LeaveTime + NavigationTransport + ReservationExecution.
  Does not invent a second planner.

  Journey eligibility: SharedPlan status in agreed|changed with grounded place+time,
  or explicit activate/commit from a ready Graph.
  """

  import Ecto.Query

  alias OpalCore.Events.Publisher
  alias OpalCore.Messaging.ConversationMember
  alias OpalCore.Repo

  alias OpalCore.SocialFlow.{
    PlanParticipant,
    SharedPlan
  }

  alias OpalCore.SocialFlow.Physical.TravelProvider
  alias OpalCore.SocialFlow.RealWorld.Cognition.LeaveTime
  alias OpalCore.SocialFlow.ReservationExecution

  @lead_roles ~w(lead co_lead)
  @material_fields ~w(time_label start_at location)

  @doc "Activate / get Journey for a conversation from Graph commitment."
  def activate(attrs) when is_map(attrs) do
    a = stringify(attrs)
    user_id = a["user_id"]
    conversation_id = a["conversation_id"]

    with true <- is_binary(user_id) and is_binary(conversation_id),
         :ok <- ensure_member(conversation_id, user_id) do
      plan =
        case find_active_plan(conversation_id) do
          %SharedPlan{} = p ->
            p

          nil ->
            {:ok, p} = create_journey_plan(a)
            p
        end

      _ = ensure_lead(plan, user_id)
      _ = ensure_participant(plan, user_id, "accepted", role_for(plan, user_id))

      {:ok, project(plan, user_id, a)}
    else
      false -> {:error, :invalid}
      {:error, _} = e -> e
    end
  end

  def activate(_), do: {:error, :invalid}

  @doc "Load Journey projection if plan is journey-eligible."
  def get(plan_id, user_id) when is_binary(plan_id) and is_binary(user_id) do
    case Repo.get(SharedPlan, plan_id) do
      %SharedPlan{} = plan ->
        with :ok <- ensure_member(plan.conversation_id, user_id),
             true <- journey_eligible?(plan) do
          {:ok, project(plan, user_id, %{})}
        else
          false -> {:error, :not_journey}
          {:error, _} = e -> e
        end

      nil ->
        {:error, :not_found}
    end
  end

  def get(_, _), do: {:error, :invalid}

  def journey_eligible?(%SharedPlan{status: status, location: loc, time_label: tl} = plan) do
    status in ~w(agreed changed) and
      ((is_binary(loc) and loc != "") or (is_binary(tl) and tl != "") or not is_nil(plan.start_at))
  end

  def journey_eligible?(_), do: false

  @doc "Participant cannot make it — does not cancel the whole Journey."
  def cant_make_it(plan_id, user_id, opts \\ %{}) when is_binary(plan_id) and is_binary(user_id) do
    note = Map.get(stringify(opts), "note")

    with %SharedPlan{} = plan <- Repo.get(SharedPlan, plan_id),
         :ok <- ensure_member(plan.conversation_id, user_id),
         %PlanParticipant{} = pp <- get_participant(plan.id, user_id) do
      now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

      {:ok, updated} =
        pp
        |> PlanParticipant.changeset(%{
          response_state: "withdrawn",
          responded_at: now,
          authority_source: "cant_make_it"
        })
        |> Repo.update()

      _ =
        Publisher.record(%{
          event_type: "journey.participant_withdrawn",
          aggregate_type: "shared_plan",
          aggregate_id: plan.id,
          partition_key: plan.id,
          privacy_class: "shared_authorized",
          purpose: "journey_participation",
          payload: %{
            "plan_id" => plan.id,
            "user_id" => user_id,
            "note_present" => is_binary(note) and note != ""
          }
        })

      {:ok,
       %{
         "plan_id" => plan.id,
         "user_id" => user_id,
         "response_state" => updated.response_state,
         "cancels_everyone" => false,
         "cancels_reservation_automatically" => false,
         "journey" => project(plan, user_id, %{})
       }}
    else
      nil -> {:error, :not_found}
      {:error, _} = e -> e
    end
  end

  @doc "Lead-only material time/place change → needs reconfirmation."
  def material_change(plan_id, user_id, changes) when is_map(changes) do
    c = stringify(changes)

    with %SharedPlan{} = plan <- Repo.get(SharedPlan, plan_id),
         :ok <- ensure_member(plan.conversation_id, user_id),
         :ok <- require_lead(plan, user_id) do
      material? = material?(c)
      attrs = %{}
      attrs = if Map.has_key?(c, "time_label"), do: Map.put(attrs, :time_label, c["time_label"]), else: attrs
      attrs = if Map.has_key?(c, "location"), do: Map.put(attrs, :location, c["location"]), else: attrs

      attrs =
        if Map.has_key?(c, "start_at") do
          case parse_dt(c["start_at"]) do
            {:ok, dt} -> Map.put(attrs, :start_at, dt)
            _ -> attrs
          end
        else
          attrs
        end

      attrs = if material?, do: Map.put(attrs, :status, "changed"), else: attrs

      {:ok, plan} =
        plan
        |> SharedPlan.changeset(attrs)
        |> Repo.update()

      if material? do
        now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

        # Mark other accepted participants as tentative pending reconfirm
        from(pp in PlanParticipant,
          where:
            pp.plan_id == ^plan.id and pp.user_id != ^user_id and
              pp.response_state == "accepted"
        )
        |> Repo.update_all(set: [response_state: "tentative", updated_at: now])
      end

      _ =
        Publisher.record(%{
          event_type: "journey.material_changed",
          aggregate_type: "shared_plan",
          aggregate_id: plan.id,
          partition_key: plan.id,
          privacy_class: "shared_authorized",
          purpose: "journey_manage",
          payload: %{
            "plan_id" => plan.id,
            "actor_user_id" => user_id,
            "material" => material?,
            "fields" => Map.keys(c)
          }
        })

      {:ok,
       %{
         "plan_id" => plan.id,
         "material" => material?,
         "requires_reconfirmation" => material?,
         "journey" => project(plan, user_id, %{})
       }}
    else
      nil -> {:error, :not_found}
      {:error, :forbidden} -> {:error, :forbidden}
      {:error, _} = e -> e
    end
  end

  def material_change(_, _, _), do: {:error, :invalid}

  @doc "Non-lead attempting material change must be denied."
  def participant_change_denied?(plan_id, user_id) do
    case Repo.get(SharedPlan, plan_id) do
      %SharedPlan{} = plan ->
        case require_lead(plan, user_id) do
          :ok -> false
          {:error, :forbidden} -> true
        end

      _ ->
        true
    end
  end

  @doc "Add people to Journey (plan participants) — not chat membership."
  def add_people(plan_id, actor_user_id, peer_user_ids) when is_list(peer_user_ids) do
    with %SharedPlan{} = plan <- Repo.get(SharedPlan, plan_id),
         :ok <- ensure_member(plan.conversation_id, actor_user_id),
         :ok <- require_lead(plan, actor_user_id) do
      now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

      added =
        for uid <- Enum.uniq(peer_user_ids), is_binary(uid), uid != actor_user_id do
          case get_participant(plan.id, uid) do
            %PlanParticipant{} = pp ->
              {:ok, _} =
                pp
                |> PlanParticipant.changeset(%{
                  response_state: "proposed",
                  responded_at: now,
                  authority_source: "journey_add_people"
                })
                |> Repo.update()

              uid

            nil ->
              %PlanParticipant{}
              |> PlanParticipant.changeset(%{
                plan_id: plan.id,
                user_id: uid,
                role: "participant",
                response_state: "proposed",
                responded_at: now,
                authority_source: "journey_add_people"
              })
              |> Repo.insert!()

              uid
          end
        end

      {:ok,
       %{
         "plan_id" => plan.id,
         "added_user_ids" => added,
         "widens_chat_automatically" => false,
         "marks_going_automatically" => false,
         "journey" => project(plan, actor_user_id, %{})
       }}
    else
      nil -> {:error, :not_found}
      {:error, _} = e -> e
    end
  end

  def add_people(_, _, _), do: {:error, :invalid}

  @doc "Reconfirm after material change."
  def reconfirm(plan_id, user_id) do
    with %SharedPlan{} = plan <- Repo.get(SharedPlan, plan_id),
         :ok <- ensure_member(plan.conversation_id, user_id),
         %PlanParticipant{} = pp <- get_participant(plan.id, user_id) do
      now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

      {:ok, _} =
        pp
        |> PlanParticipant.changeset(%{response_state: "accepted", responded_at: now})
        |> Repo.update()

      {:ok, project(plan, user_id, %{})}
    else
      nil -> {:error, :not_found}
      {:error, _} = e -> e
    end
  end

  @doc "Assign co-lead (lead only)."
  def assign_co_lead(plan_id, actor_user_id, peer_user_id) do
    with %SharedPlan{} = plan <- Repo.get(SharedPlan, plan_id),
         :ok <- require_lead(plan, actor_user_id),
         :ok <- ensure_member(plan.conversation_id, peer_user_id) do
      ensure_participant(plan, peer_user_id, "accepted", "co_lead")
      {:ok, project(plan, actor_user_id, %{})}
    else
      nil -> {:error, :not_found}
      {:error, _} = e -> e
    end
  end

  @doc "Handoff lead to another accepted participant."
  def handoff_lead(plan_id, actor_user_id, peer_user_id) do
    with %SharedPlan{} = plan <- Repo.get(SharedPlan, plan_id),
         :ok <- require_lead(plan, actor_user_id),
         :ok <- ensure_member(plan.conversation_id, peer_user_id),
         %PlanParticipant{} = peer <- get_participant(plan.id, peer_user_id),
         true <- peer.response_state in ~w(accepted tentative) do
      actor = get_participant(plan.id, actor_user_id)

      {:ok, _} =
        peer
        |> PlanParticipant.changeset(%{role: "lead"})
        |> Repo.update()

      if actor do
        {:ok, _} =
          actor
          |> PlanParticipant.changeset(%{role: "participant"})
          |> Repo.update()
      end

      {:ok, project(plan, actor_user_id, %{})}
    else
      false -> {:error, :peer_not_committed}
      nil -> {:error, :not_found}
      {:error, _} = e -> e
    end
  end

  # --- projection ---

  def project(%SharedPlan{} = plan, user_id, opts) do
    participants =
      from(pp in PlanParticipant, where: pp.plan_id == ^plan.id)
      |> Repo.all()

    leave = compute_leave(plan, opts)
    maps = maps_links(plan)
    reservation = reservation_truth(plan)
    me = Enum.find(participants, &(&1.user_id == user_id))
    lead = Enum.find(participants, &(&1.role == "lead")) || hd_or_nil(participants)
    co_leads = Enum.filter(participants, &(&1.role == "co_lead"))

    %{
      "schema_version" => "0.1.0",
      "object_type" => "journey",
      "plan_id" => plan.id,
      "conversation_id" => plan.conversation_id,
      "lineage" => %{
        "shared_plan_id" => plan.id,
        "conversation_id" => plan.conversation_id,
        "same_reality" => true
      },
      "title" => plan.title,
      "status" => plan.status,
      "place" => plan.location,
      "when_label" => format_when(plan),
      "start_at" => iso(plan.start_at),
      "journey_eligible" => journey_eligible?(plan),
      "viewer" => %{
        "user_id" => user_id,
        "role" => (me && me.role) || "participant",
        "response_state" => (me && me.response_state) || "proposed",
        "is_lead" => me != nil and me.role in @lead_roles and me.role == "lead",
        "is_co_lead" => me != nil and me.role == "co_lead",
        "can_manage" => me != nil and me.role in @lead_roles
      },
      "lead_user_id" => lead && lead.user_id,
      "co_lead_user_ids" => Enum.map(co_leads, & &1.user_id),
      "participants" =>
        Enum.map(participants, fn pp ->
          %{
            "user_id" => pp.user_id,
            "role" => pp.role,
            "response_state" => pp.response_state,
            "interested_soft" => false,
            "committed" => pp.response_state == "accepted"
          }
        end),
      "leave" => leave,
      "navigation" => maps,
      "reservation" => reservation,
      "requires_reconfirmation" => plan.status == "changed" and me != nil and me.response_state == "tentative",
      "figma" => %{"journey" => "254:280", "reference" => "201:9"}
    }
  end

  # --- leave / maps / reservation ---

  defp compute_leave(%SharedPlan{} = plan, opts) do
    travel =
      case opts["travel_minutes"] || opts[:travel_minutes] do
        n when is_number(n) ->
          %{minutes: n, traffic_aware: false, estimate_class: "provided"}

        _ ->
          case TravelProvider.estimate(%{
                 "origin" => opts["origin"] || opts[:origin],
                 "destination" => plan.location,
                 "mode" => "driving"
               }) do
            {:ok, %{"duration_minutes" => m} = est} ->
              %{
                minutes: m,
                traffic_aware: est["traffic_aware"] == true,
                estimate_class: est["estimate_class"] || "geometric_estimate"
              }

            _ ->
              nil
          end
      end

    plan_start =
      case plan.start_at do
        %DateTime{} = dt ->
          dt

        _ ->
          case parse_dt(opts["plan_start"]) do
            {:ok, dt} -> dt
            _ -> nil
          end
      end

    cond do
      is_nil(plan_start) or is_nil(travel) ->
        %{
          "available" => false,
          "reason" => "location_or_route_unavailable",
          "traffic_aware" => false,
          "fabricated" => false,
          "fallback" => "Enable location for timing or Open Maps",
          "location_permission_helpful" => true
        }

      true ->
        case LeaveTime.compute(%{
               "plan_start" => plan_start,
               "travel_minutes" => travel.minutes,
               "buffer_minutes" => opts["buffer_minutes"] || 10
             }) do
          {:ok, leave} ->
            %{
              "available" => true,
              "leave_by" => iso(leave["leave_by"]),
              "human_label" => format_ampm(leave["leave_by"]),
              "traffic_aware" => travel.traffic_aware,
              "estimate_class" => travel.estimate_class,
              "may_label_as_drive_eta" => false,
              "fabricated" => false,
              "origin_exposed" => false
            }

          _ ->
            %{
              "available" => false,
              "reason" => "insufficient_context",
              "traffic_aware" => false,
              "fabricated" => false,
              "location_permission_helpful" => true
            }
        end
    end
  end

  defp maps_links(%SharedPlan{location: loc}) when is_binary(loc) and loc != "" do
    dest = URI.encode(loc)

    %{
      "available" => true,
      "apple_maps_url" => "https://maps.apple.com/?daddr=#{dest}",
      "google_maps_url" => "https://www.google.com/maps/dir/?api=1&destination=#{dest}",
      "primary_url" => "https://maps.apple.com/?daddr=#{dest}",
      "transport" => "deep_link",
      "in_app_navigation" => false
    }
  end

  defp maps_links(_), do: %{"available" => false, "reason" => "destination_required"}

  defp reservation_truth(%SharedPlan{} = plan) do
    status = ReservationExecution.status()

    %{
      "owner" => "ReservationExecution",
      "live_execution" => status["live_execution"] || "NOT_CLAIMED",
      "synthetic_default" => true,
      "plan_id" => plan.id,
      "party_size" =>
        from(pp in PlanParticipant,
          where: pp.plan_id == ^plan.id and pp.response_state in ^~w(accepted tentative proposed)
        )
        |> Repo.aggregate(:count, :id)
        |> max(1),
      "state" => "not_requested",
      "human_label" => "Not requested",
      "fabricated_confirmed" => false
    }
  end

  # --- helpers ---

  defp create_journey_plan(a) do
    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)
    start_at =
      case parse_dt(a["start_at"]) do
        {:ok, dt} -> dt
        _ -> DateTime.add(now, 8 * 3600, :second)
      end

    %SharedPlan{}
    |> SharedPlan.changeset(%{
      conversation_id: a["conversation_id"],
      title: a["title"] || "Journey",
      status: "agreed",
      location: a["location"] || a["place"] || "Juniper & Ivy",
      time_label: a["time_label"] || a["when_label"] || "Saturday · 7:30 PM",
      start_at: start_at,
      timezone: a["timezone"] || "America/Los_Angeles",
      created_by_user_id: a["user_id"]
    })
    |> Repo.insert()
  end

  defp find_active_plan(conversation_id) do
    from(p in SharedPlan,
      where: p.conversation_id == ^conversation_id and p.status in ^~w(agreed changed tentative),
      order_by: [desc: p.inserted_at],
      limit: 1
    )
    |> Repo.one()
  end

  defp ensure_lead(%SharedPlan{} = plan, user_id) do
    case get_participant(plan.id, user_id) do
      %PlanParticipant{role: "lead"} -> :ok
      %PlanParticipant{} = pp ->
        if plan.created_by_user_id == user_id do
          pp |> PlanParticipant.changeset(%{role: "lead"}) |> Repo.update()
        else
          :ok
        end

      nil ->
        role = if plan.created_by_user_id == user_id, do: "lead", else: "participant"
        ensure_participant(plan, user_id, "accepted", role)
    end
  end

  defp ensure_participant(%SharedPlan{} = plan, user_id, state, role) do
    case get_participant(plan.id, user_id) do
      %PlanParticipant{} = pp ->
        pp
        |> PlanParticipant.changeset(%{response_state: state, role: role})
        |> Repo.update()

      nil ->
        now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

        %PlanParticipant{}
        |> PlanParticipant.changeset(%{
          plan_id: plan.id,
          user_id: user_id,
          role: role,
          response_state: state,
          responded_at: now,
          authority_source: "journey_authority"
        })
        |> Repo.insert()
    end
  end

  defp get_participant(plan_id, user_id) do
    Repo.get_by(PlanParticipant, plan_id: plan_id, user_id: user_id)
  end

  defp role_for(%SharedPlan{created_by_user_id: creator}, user_id) when creator == user_id, do: "lead"
  defp role_for(_, _), do: "participant"

  defp require_lead(%SharedPlan{} = plan, user_id) do
    case get_participant(plan.id, user_id) do
      %PlanParticipant{role: role} when role in @lead_roles -> :ok
      %PlanParticipant{} -> {:error, :forbidden}
      nil ->
        if plan.created_by_user_id == user_id, do: :ok, else: {:error, :forbidden}
    end
  end

  defp material?(changes) do
    Enum.any?(@material_fields, &Map.has_key?(changes, &1))
  end

  defp ensure_member(conversation_id, user_id) do
    case Repo.get_by(ConversationMember, conversation_id: conversation_id, user_id: user_id) do
      %ConversationMember{} -> :ok
      nil -> {:error, :forbidden}
    end
  end

  defp format_when(%SharedPlan{time_label: tl}) when is_binary(tl) and tl != "", do: ensure_ampm(tl)
  defp format_when(%SharedPlan{start_at: %DateTime{} = dt}), do: format_ampm(dt)
  defp format_when(_), do: nil

  defp ensure_ampm(label) do
    if Regex.match?(~r/\b([0-9]{1,2}:[0-9]{2})\b/i, label) and
         not Regex.match?(~r/\b(AM|PM)\b/i, label) do
      # Ambiguous clock without meridiem — append PM as honesty default for evening plans is forbidden.
      # Keep label but mark incomplete in UI via missing meridiem detection client-side.
      label
    else
      label
    end
  end

  defp format_ampm(%DateTime{} = dt) do
    # Use calendar formatting with AM/PM
    h = dt.hour
    m = dt.minute |> Integer.to_string() |> String.pad_leading(2, "0")
    {h12, mer} = if h >= 12, do: {rem(h + 11, 12) + 1, "PM"}, else: {if(h == 0, do: 12, else: h), "AM"}
    "#{h12}:#{m} #{mer}"
  end

  defp format_ampm(_), do: nil

  defp parse_dt(%DateTime{} = dt), do: {:ok, DateTime.truncate(dt, :microsecond)}

  defp parse_dt(iso) when is_binary(iso) do
    case DateTime.from_iso8601(iso) do
      {:ok, dt, _} -> {:ok, DateTime.truncate(dt, :microsecond)}
      _ -> :error
    end
  end

  defp parse_dt(_), do: :error

  defp iso(nil), do: nil
  defp iso(%DateTime{} = dt), do: DateTime.to_iso8601(dt)
  defp iso(_), do: nil

  defp hd_or_nil([]), do: nil
  defp hd_or_nil([h | _]), do: h

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
