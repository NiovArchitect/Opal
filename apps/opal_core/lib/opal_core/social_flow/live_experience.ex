defmodule OpalCore.SocialFlow.LiveExperience do
  @moduledoc """
  Social Flow 6: live social experience orchestration.

  Server-authoritative day-of readiness, late notices, ETA envelopes,
  venue-change candidates, arrival states, and post-experience follow-ups.

  No continuous tracking, no attendance scoring, no autonomous rescheduling.
  """

  import Ecto.Query

  alias OpalCore.Repo
  alias OpalCore.Messaging.ConversationMember
  alias OpalCore.SocialFlow.AuditEvent
  alias OpalCore.SocialFlow.GroupSharedPlan

  alias OpalCore.SocialFlow.{
    ETAEnvelope,
    ExperienceChangeCandidate,
    ExperienceFollowUp,
    ExperienceParticipantState,
    ExperienceReadinessItem,
    SocialExperience
  }

  @trace "trace-social-flow-6"
  @prohibited_blame ~w(unreliable holding always late attendance score)

  # --- Create from settled plan ---

  def open_experience(attrs) do
    conversation_id = fetch!(attrs, :conversation_id)
    user_id = fetch!(attrs, :user_id)
    plan_id = Map.get(attrs, :plan_id)
    idem = Map.get(attrs, :idempotency_key) || "exp-#{conversation_id}-#{plan_id || "none"}"
    trace_id = Map.get(attrs, :trace_id) || @trace

    with :ok <- ensure_member(conversation_id, user_id) do
      case Repo.get_by(SocialExperience, idempotency_key: idem) do
        %SocialExperience{} = e ->
          {:ok, e, :idempotent}

        nil ->
          {title, location, time_label, participants} = plan_facts(plan_id, conversation_id)

          {:ok, exp} =
            %SocialExperience{}
            |> SocialExperience.changeset(%{
              conversation_id: conversation_id,
              plan_id: plan_id,
              experience_type: Map.get(attrs, :experience_type) || "dinner",
              status: "settled_plan",
              title: title,
              location_label: location,
              time_label: time_label,
              timezone: "UTC",
              readiness_state: "unknown",
              idempotency_key: idem,
              participant_ids: participants
            })
            |> Repo.insert()

          Enum.each(participants, fn pid ->
            %ExperienceParticipantState{}
            |> ExperienceParticipantState.changeset(%{
              experience_id: exp.id,
              user_id: pid,
              attendance_state: "expected",
              arrival_state: "no_update",
              visibility: "group",
              source: "system",
              idempotency_key: "pstate-#{exp.id}-#{pid}"
            })
            |> Repo.insert()
          end)

          seed_readiness!(exp, attrs)

          audit!(
            conversation_id,
            user_id,
            "experience.opened",
            %{
              "experience_id" => exp.id,
              "plan_id" => plan_id
            },
            trace_id
          )

          {:ok, exp, :created}
      end
    end
  end

  defp plan_facts(nil, conversation_id) do
    {"Group plan", nil, nil, member_ids(conversation_id)}
  end

  defp plan_facts(plan_id, conversation_id) do
    case Repo.get(GroupSharedPlan, plan_id) do
      %GroupSharedPlan{} = p ->
        {p.title || "Group plan", p.location, p.time_label,
         p.participant_ids || member_ids(conversation_id)}

      nil ->
        {"Group plan", nil, nil, member_ids(conversation_id)}
    end
  end

  defp seed_readiness!(exp, attrs) do
    reservation = Map.get(attrs, :reservation_handled, true)
    transport_owner = Map.get(attrs, :transport_owner_user_id)

    items = [
      {"time", "Time confirmed", nil, "handled"},
      {"location", "Location confirmed", nil,
       if(exp.location_label, do: "handled", else: "open")},
      {"reservation", "Reservation handled", nil, if(reservation, do: "handled", else: "open")},
      {"transportation", "Transportation", transport_owner, "open"}
    ]

    Enum.each(items, fn {type, desc, owner, status} ->
      now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

      %ExperienceReadinessItem{}
      |> ExperienceReadinessItem.changeset(%{
        experience_id: exp.id,
        item_type: type,
        description: desc,
        owner_user_id: owner,
        status: status,
        visibility: "shared",
        completed_at: if(status == "handled", do: now),
        idempotency_key: "ready-#{exp.id}-#{type}"
      })
      |> Repo.insert()
    end)
  end

  # --- Journey A: day-of readiness ---

  def enter_day_of(%{experience_id: id, user_id: user_id} = attrs) do
    trace_id = Map.get(attrs, :trace_id) || @trace

    with %SocialExperience{} = exp <- Repo.get(SocialExperience, id),
         :ok <- ensure_member(exp.conversation_id, user_id),
         true <- exp.status in ~w(settled_plan preparation ready day_of) do
      copy =
        "Dinner is tonight at #{exp.time_label || "the planned time"}. The reservation is handled."

      {:ok, exp} =
        exp
        |> SocialExperience.changeset(%{
          status: "day_of",
          day_of_copy: copy,
          readiness_state: readiness_state_for(exp.id)
        })
        |> Repo.update()

      summary = readiness_summary(exp.id, user_id)

      broadcast(
        exp.conversation_id,
        "social_flow:experience_day_of",
        %{
          "experience" => SocialExperience.to_contract(exp),
          "readiness" => summary
        },
        trace_id
      )

      {:ok, %{experience: exp, readiness: summary}}
    else
      nil -> {:error, :not_found}
      false -> {:error, :invalid_status}
      {:error, _} = e -> e
    end
  end

  def complete_readiness_item(attrs) do
    item_id = fetch!(attrs, :item_id)
    user_id = fetch!(attrs, :user_id)
    trace_id = Map.get(attrs, :trace_id) || @trace

    with %ExperienceReadinessItem{} = item <- Repo.get(ExperienceReadinessItem, item_id),
         %SocialExperience{} = exp <- Repo.get(SocialExperience, item.experience_id),
         :ok <- ensure_member(exp.conversation_id, user_id),
         true <- is_nil(item.owner_user_id) or item.owner_user_id == user_id do
      if item.status in ~w(handled completed) do
        {:ok, %{item: item, readiness: readiness_summary(exp.id, user_id)}, :idempotent}
      else
        now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

        {:ok, item} =
          item
          |> ExperienceReadinessItem.changeset(%{status: "handled", completed_at: now})
          |> Repo.update()

        exp
        |> SocialExperience.changeset(%{readiness_state: readiness_state_for(exp.id)})
        |> Repo.update()

        summary = readiness_summary(exp.id, user_id)

        broadcast(
          exp.conversation_id,
          "social_flow:experience_readiness",
          %{
            "readiness" => summary
          },
          trace_id
        )

        audit!(
          exp.conversation_id,
          user_id,
          "experience.readiness.handled",
          %{
            "item_id" => item.id,
            "item_type" => item.item_type
          },
          trace_id
        )

        {:ok, %{item: item, readiness: summary}, :created}
      end
    else
      nil -> {:error, :not_found}
      false -> {:error, :forbidden}
      {:error, _} = e -> e
    end
  end

  def readiness_summary(experience_id, viewer_id) do
    items =
      from(i in ExperienceReadinessItem, where: i.experience_id == ^experience_id)
      |> Repo.all()

    open = Enum.filter(items, &(&1.status == "open"))
    handled = Enum.filter(items, &(&1.status in ~w(handled completed)))

    group_copy =
      cond do
        open == [] and handled != [] ->
          "Everything needed for tonight is handled."

        Enum.any?(open, &(&1.item_type == "transportation")) ->
          "Transportation is still open."

        true ->
          "#{length(open)} readiness item(s) remain."
      end

    private_owner_copy =
      open
      |> Enum.filter(&(&1.owner_user_id == viewer_id))
      |> Enum.map(fn i ->
        case i.item_type do
          "transportation" -> "You offered to confirm transportation."
          _ -> "You still own: #{i.description}"
        end
      end)

    %{
      "experience_id" => experience_id,
      "open_count" => length(open),
      "handled_count" => length(handled),
      "items" => Enum.map(items, &ExperienceReadinessItem.to_contract/1),
      "group_copy" => group_copy,
      "private_owner_copy" => private_owner_copy,
      "no_percent_complete" => true,
      "no_participant_ranking" => true,
      "all_ready" => open == []
    }
  end

  defp readiness_state_for(experience_id) do
    open? =
      from(i in ExperienceReadinessItem,
        where: i.experience_id == ^experience_id and i.status == "open"
      )
      |> Repo.exists?()

    if open?, do: "partial", else: "ready"
  end

  # --- Journey B: late arrival ---

  def propose_late_notice(attrs) do
    experience_id = fetch!(attrs, :experience_id)
    user_id = fetch!(attrs, :user_id)
    delay_minutes = Map.get(attrs, :delay_minutes) || 20
    arrival_label = Map.get(attrs, :arrival_label) || "around 8:20"
    share = Map.get(attrs, :share, false)
    idem = Map.get(attrs, :idempotency_key) || "late-#{experience_id}-#{user_id}"
    trace_id = Map.get(attrs, :trace_id) || @trace

    with %SocialExperience{} = exp <- Repo.get(SocialExperience, experience_id),
         :ok <- ensure_member(exp.conversation_id, user_id),
         true <- user_id in (exp.participant_ids || []) do
      private_prompt = "Share that you may arrive #{arrival_label}?"

      if share do
        now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

        state =
          case Repo.get_by(ExperienceParticipantState,
                 experience_id: experience_id,
                 user_id: user_id
               ) do
            %ExperienceParticipantState{} = s ->
              {:ok, s} =
                s
                |> ExperienceParticipantState.changeset(%{
                  arrival_state: "running_late",
                  expected_arrival_label: arrival_label,
                  shared_note: "expects to arrive #{arrival_label}",
                  visibility: "group",
                  source: "explicit",
                  effective_at: now,
                  expires_at: DateTime.add(now, 4 * 3600, :second),
                  idempotency_key: s.idempotency_key
                })
                |> Repo.update()

              s

            nil ->
              {:ok, s} =
                %ExperienceParticipantState{}
                |> ExperienceParticipantState.changeset(%{
                  experience_id: experience_id,
                  user_id: user_id,
                  arrival_state: "running_late",
                  expected_arrival_label: arrival_label,
                  shared_note: "expects to arrive #{arrival_label}",
                  visibility: "group",
                  source: "explicit",
                  effective_at: now,
                  expires_at: DateTime.add(now, 4 * 3600, :second),
                  idempotency_key: idem
                })
                |> Repo.insert()

              s
          end

        group_copy = group_late_copy(user_id, arrival_label)
        refute_blame!(group_copy)

        # Plan time unchanged
        plan_time = exp.time_label

        broadcast(
          exp.conversation_id,
          "social_flow:experience_late",
          %{
            "participant_state" => ExperienceParticipantState.to_public_contract(state),
            "group_copy" => group_copy,
            "plan_time_unchanged" => plan_time,
            "actions" => ["keep plan time", "wait", "propose a revision"]
          },
          trace_id
        )

        audit!(
          exp.conversation_id,
          user_id,
          "experience.late.shared",
          %{
            "experience_id" => experience_id,
            "delay_minutes" => delay_minutes,
            "no_precise_location" => true
          },
          trace_id
        )

        {:ok,
         %{
           private_prompt: private_prompt,
           shared: true,
           group_copy: group_copy,
           state: state,
           plan_time: plan_time
         }, :shared}
      else
        {:ok,
         %{
           private_prompt: private_prompt,
           shared: false,
           actions: ["Share with group", "Edit", "Keep private", "Dismiss"]
         }, :private_only}
      end
    else
      nil -> {:error, :not_found}
      false -> {:error, :forbidden}
      {:error, _} = e -> e
    end
  end

  defp group_late_copy(_user_id, arrival_label) do
    # Avoid blaming language; use neutral fact
    "A participant expects to arrive #{arrival_label}."
  end

  defp refute_blame!(copy) do
    low = String.downcase(copy)

    if Enum.any?(@prohibited_blame, &String.contains?(low, &1)) do
      raise "blame language forbidden"
    end

    :ok
  end

  # --- Journey C: ETA ---

  def share_eta(attrs) do
    experience_id = fetch!(attrs, :experience_id)
    user_id = fetch!(attrs, :user_id)
    window_label = Map.get(attrs, :arrival_window_label) || "between 7:50 and 8:00"
    scope = Map.get(attrs, :visibility_scope) || "group"
    precision = Map.get(attrs, :precision_class) || "approximate_window"
    idem = Map.get(attrs, :idempotency_key) || "eta-#{experience_id}-#{user_id}"
    trace_id = Map.get(attrs, :trace_id) || @trace

    with %SocialExperience{} = exp <- Repo.get(SocialExperience, experience_id),
         :ok <- ensure_member(exp.conversation_id, user_id),
         true <- precision in ~w(approximate_window coarse_status),
         true <- scope in ~w(group organizer selected) do
      case Repo.get_by(ETAEnvelope, idempotency_key: idem) do
        %ETAEnvelope{status: "active"} = e ->
          {:ok, e, :idempotent}

        _ ->
          now = DateTime.utc_now() |> DateTime.truncate(:microsecond)
          expires = DateTime.add(now, 90 * 60, :second)

          # supersede prior active ETAs for owner
          from(e in ETAEnvelope,
            where:
              e.experience_id == ^experience_id and e.owner_user_id == ^user_id and
                e.status == "active"
          )
          |> Repo.update_all(set: [status: "superseded", superseded_at: now])

          {:ok, eta} =
            %ETAEnvelope{}
            |> ETAEnvelope.changeset(%{
              experience_id: experience_id,
              owner_user_id: user_id,
              visibility_scope: scope,
              arrival_window_label: window_label,
              precision_class: precision,
              source_class: "user_stated",
              confidence: 0.75,
              generated_at: now,
              expires_at: expires,
              status: "active",
              idempotency_key: idem
            })
            |> Repo.insert()

          broadcast(
            exp.conversation_id,
            "social_flow:experience_eta",
            %{
              "eta" => ETAEnvelope.to_public_contract(eta),
              "copy" => "A participant expects to arrive #{window_label}."
            },
            trace_id
          )

          audit!(
            exp.conversation_id,
            user_id,
            "experience.eta.shared",
            %{
              "eta_id" => eta.id,
              "precision_class" => precision,
              "no_coordinates" => true
            },
            trace_id
          )

          {:ok, eta, :created}
      end
    else
      nil -> {:error, :not_found}
      false -> {:error, :forbidden}
      {:error, _} = e -> e
    end
  end

  def revoke_eta(%{eta_id: id, user_id: user_id}) do
    with %ETAEnvelope{} = eta <- Repo.get(ETAEnvelope, id),
         true <- eta.owner_user_id == user_id do
      now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

      eta
      |> ETAEnvelope.changeset(%{status: "revoked", revoked_at: now})
      |> Repo.update()
    else
      nil -> {:error, :not_found}
      false -> {:error, :forbidden}
    end
  end

  def expire_stale_etas(experience_id, now \\ DateTime.utc_now()) do
    now = DateTime.truncate(now, :microsecond)

    from(e in ETAEnvelope,
      where: e.experience_id == ^experience_id and e.status == "active" and e.expires_at < ^now
    )
    |> Repo.update_all(set: [status: "expired"])
  end

  def get_eta_for_user(eta_id, user_id) do
    case Repo.get(ETAEnvelope, eta_id) do
      %ETAEnvelope{status: "active"} = eta ->
        with %SocialExperience{} = exp <- Repo.get(SocialExperience, eta.experience_id),
             :ok <- ensure_member(exp.conversation_id, user_id) do
          if eta.owner_user_id == user_id or eta.visibility_scope == "group" do
            {:ok, ETAEnvelope.to_public_contract(eta)}
          else
            {:error, :forbidden}
          end
        end

      %ETAEnvelope{} ->
        {:error, :expired_or_revoked}

      nil ->
        {:error, :not_found}
    end
  end

  # --- Journey D: venue change ---

  def report_venue_unavailable(attrs) do
    experience_id = fetch!(attrs, :experience_id)
    user_id = fetch!(attrs, :user_id)
    venue = Map.get(attrs, :venue_label) || "Harbor Table"
    source_ref = Map.get(attrs, :source_reference) || "synthetic_provider"
    idem = Map.get(attrs, :idempotency_key) || "vchg-#{experience_id}-#{venue}"
    trace_id = Map.get(attrs, :trace_id) || @trace

    with %SocialExperience{} = exp <- Repo.get(SocialExperience, experience_id),
         :ok <- ensure_member(exp.conversation_id, user_id) do
      # Untrusted external signal — never auto-cancel
      case Repo.get_by(ExperienceChangeCandidate, idempotency_key: idem) do
        %ExperienceChangeCandidate{} = c ->
          {:ok, c, :idempotent}

        nil ->
          copy = "#{venue} may no longer be available."

          {:ok, cand} =
            %ExperienceChangeCandidate{}
            |> ExperienceChangeCandidate.changeset(%{
              experience_id: experience_id,
              change_type: "venue_unavailable",
              source_class: "provider",
              source_reference: source_ref,
              proposed_changes: %{"venue" => venue, "status" => "unavailable"},
              shared_copy: copy,
              confidence: 0.7,
              status: "proposed",
              idempotency_key: idem
            })
            |> Repo.insert()

          # Plan location unchanged until explicit acceptance
          broadcast(
            exp.conversation_id,
            "social_flow:experience_change",
            %{
              "change" => ExperienceChangeCandidate.to_contract(cand),
              "plan_location" => exp.location_label,
              "auto_cancelled" => false
            },
            trace_id
          )

          {:ok, cand, :created}
      end
    end
  end

  def resolve_venue_change(attrs) do
    change_id = fetch!(attrs, :change_id)
    user_id = fetch!(attrs, :user_id)
    decision = fetch!(attrs, :decision)
    replacement = Map.get(attrs, :replacement_location)
    trace_id = Map.get(attrs, :trace_id) || @trace

    with %ExperienceChangeCandidate{} = cand <- Repo.get(ExperienceChangeCandidate, change_id),
         %SocialExperience{} = exp <- Repo.get(SocialExperience, cand.experience_id),
         :ok <- ensure_member(exp.conversation_id, user_id),
         true <- cand.status == "proposed" do
      now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

      case decision do
        "keep_current" ->
          {:ok, cand} =
            cand
            |> ExperienceChangeCandidate.changeset(%{
              status: "kept_current",
              resolved_at: now
            })
            |> Repo.update()

          {:ok, %{change: cand, experience: exp}}

        "accept_replacement" when is_binary(replacement) ->
          {:ok, cand} =
            cand
            |> ExperienceChangeCandidate.changeset(%{
              status: "accepted",
              resolved_at: now,
              proposed_changes: Map.put(cand.proposed_changes || %{}, "replacement", replacement)
            })
            |> Repo.update()

          {:ok, exp} =
            exp
            |> SocialExperience.changeset(%{location_label: replacement})
            |> Repo.update()

          if exp.plan_id do
            case Repo.get(GroupSharedPlan, exp.plan_id) do
              %GroupSharedPlan{} = plan ->
                plan
                |> GroupSharedPlan.changeset(%{location: replacement})
                |> Repo.update()

              _ ->
                :ok
            end
          end

          broadcast(
            exp.conversation_id,
            "social_flow:experience_change",
            %{
              "change" => ExperienceChangeCandidate.to_contract(cand),
              "plan_location" => replacement,
              "reconnect_copy" => "The location changed while you were away."
            },
            trace_id
          )

          {:ok, %{change: cand, experience: exp}}

        "find_alternatives" ->
          {:ok, cand} =
            cand
            |> ExperienceChangeCandidate.changeset(%{status: "alternatives", resolved_at: now})
            |> Repo.update()

          {:ok, %{change: cand, experience: exp, next: "discovery_intent_required"}}

        _ ->
          {:error, :invalid_decision}
      end
    else
      nil -> {:error, :not_found}
      false -> {:error, :forbidden}
      {:error, _} = e -> e
    end
  end

  # --- Journey E: arrival ---

  def set_arrival_state(attrs) do
    experience_id = fetch!(attrs, :experience_id)
    user_id = fetch!(attrs, :user_id)
    state = fetch!(attrs, :arrival_state)
    visibility = Map.get(attrs, :visibility) || "group"
    idem = Map.get(attrs, :idempotency_key) || "arr-#{experience_id}-#{user_id}-#{state}"
    trace_id = Map.get(attrs, :trace_id) || @trace

    with %SocialExperience{} = exp <- Repo.get(SocialExperience, experience_id),
         :ok <- ensure_member(exp.conversation_id, user_id),
         true <- state in ~w(no_update on_the_way running_late arrived left cannot_attend),
         true <- visibility in ~w(group organizer private selected) do
      now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

      {attendance, arrival} =
        if state == "cannot_attend" do
          {"cannot_attend", "unknown"}
        else
          {"expected", state}
        end

      result =
        case Repo.get_by(ExperienceParticipantState,
               experience_id: experience_id,
               user_id: user_id
             ) do
          %ExperienceParticipantState{} = s ->
            s
            |> ExperienceParticipantState.changeset(%{
              arrival_state: arrival,
              attendance_state: attendance,
              visibility: visibility,
              source: "explicit",
              effective_at: now,
              idempotency_key: s.idempotency_key
            })
            |> Repo.update()

          nil ->
            %ExperienceParticipantState{}
            |> ExperienceParticipantState.changeset(%{
              experience_id: experience_id,
              user_id: user_id,
              arrival_state: arrival,
              attendance_state: attendance,
              visibility: visibility,
              source: "explicit",
              effective_at: now,
              idempotency_key: idem
            })
            |> Repo.insert()
        end

      with {:ok, ps} <- result do
        if exp.status in ~w(settled_plan preparation ready day_of) and arrival == "arrived" do
          exp
          |> SocialExperience.changeset(%{
            status: "active_experience",
            started_at: exp.started_at || now
          })
          |> Repo.update()
        end

        broadcast(
          exp.conversation_id,
          "social_flow:experience_arrival",
          %{
            "participant_state" => ExperienceParticipantState.to_public_contract(ps),
            "copy" => arrival_copy(ps),
            "no_attendance_score" => true
          },
          trace_id
        )

        {:ok, ps}
      end
    else
      nil -> {:error, :not_found}
      false -> {:error, :forbidden}
      {:error, _} = e -> e
    end
  end

  defp arrival_copy(%ExperienceParticipantState{arrival_state: "arrived"}),
    do: "A participant arrived."

  defp arrival_copy(%ExperienceParticipantState{arrival_state: "on_the_way"}),
    do: "A participant is on the way."

  defp arrival_copy(%ExperienceParticipantState{arrival_state: "running_late"}),
    do: "A participant is running late."

  defp arrival_copy(%ExperienceParticipantState{arrival_state: "cannot_attend"}),
    do: "A participant cannot attend."

  defp arrival_copy(%ExperienceParticipantState{arrival_state: "no_update"}),
    do: "No arrival update shared."

  defp arrival_copy(_), do: "Arrival status updated."

  # Never infer arrival from time alone
  def infer_arrival_from_time(_experience_id, _now), do: {:error, :time_does_not_imply_arrival}

  # --- Journey F: completion + follow-ups ---

  def complete_experience(attrs) do
    experience_id = fetch!(attrs, :experience_id)
    user_id = fetch!(attrs, :user_id)
    trace_id = Map.get(attrs, :trace_id) || @trace

    with %SocialExperience{} = exp <- Repo.get(SocialExperience, experience_id),
         :ok <- ensure_member(exp.conversation_id, user_id) do
      now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

      {:ok, exp} =
        exp
        |> SocialExperience.changeset(%{
          status: "completion",
          completed_at: now
        })
        |> Repo.update()

      # Expire transient ETA and late states
      expire_stale_etas(experience_id, now)

      from(e in ETAEnvelope,
        where: e.experience_id == ^experience_id and e.status == "active"
      )
      |> Repo.update_all(set: [status: "expired"])

      from(p in ExperienceParticipantState,
        where: p.experience_id == ^experience_id and p.arrival_state == "running_late"
      )
      |> Repo.update_all(set: [arrival_state: "unknown", superseded_at: now])

      broadcast(
        exp.conversation_id,
        "social_flow:experience_complete",
        %{
          "experience" => SocialExperience.to_contract(exp)
        },
        trace_id
      )

      {:ok, exp}
    end
  end

  def add_follow_up(attrs) do
    experience_id = fetch!(attrs, :experience_id)
    user_id = fetch!(attrs, :owner_user_id)
    description = fetch!(attrs, :description)
    visibility = Map.get(attrs, :visibility) || "private"

    idem =
      Map.get(attrs, :idempotency_key) || "fu-#{experience_id}-#{:erlang.phash2(description)}"

    with %SocialExperience{} = exp <- Repo.get(SocialExperience, experience_id),
         :ok <- ensure_member(exp.conversation_id, user_id) do
      case Repo.get_by(ExperienceFollowUp, idempotency_key: idem) do
        %ExperienceFollowUp{} = f ->
          {:ok, f, :idempotent}

        nil ->
          {:ok, f} =
            %ExperienceFollowUp{}
            |> ExperienceFollowUp.changeset(%{
              experience_id: experience_id,
              owner_user_id: user_id,
              description: description,
              visibility: visibility,
              status: "open",
              source_message_ids: Map.get(attrs, :source_message_ids) || [],
              idempotency_key: idem
            })
            |> Repo.insert()

          exp
          |> SocialExperience.changeset(%{status: "follow_up"})
          |> Repo.update()

          {:ok, f, :created}
      end
    end
  end

  def complete_follow_up(%{follow_up_id: id, user_id: user_id}) do
    with %ExperienceFollowUp{} = f <- Repo.get(ExperienceFollowUp, id),
         true <- f.owner_user_id == user_id do
      now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

      f
      |> ExperienceFollowUp.changeset(%{status: "completed", completed_at: now})
      |> Repo.update()
    else
      nil -> {:error, :not_found}
      false -> {:error, :forbidden}
    end
  end

  def close_experience(%{experience_id: id, user_id: user_id} = attrs) do
    trace_id = Map.get(attrs, :trace_id) || @trace

    with %SocialExperience{} = exp <- Repo.get(SocialExperience, id),
         :ok <- ensure_member(exp.conversation_id, user_id) do
      open_fu =
        from(f in ExperienceFollowUp,
          where: f.experience_id == ^id and f.status == "open" and f.owner_user_id == ^user_id
        )
        |> Repo.all()

      now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

      {status, copy} =
        if open_fu == [] do
          {"closed", "Everything from dinner is handled."}
        else
          {"follow_up", "Dinner is complete. #{length(open_fu)} follow-up(s) remain."}
        end

      {:ok, exp} =
        exp
        |> SocialExperience.changeset(%{
          status: status,
          closed_at: if(status == "closed", do: now)
        })
        |> Repo.update()

      private_signal =
        if open_fu == [] do
          nil
        else
          %{
            "copy" => "#{length(open_fu)} follow-ups may still need attention.",
            "items" => Enum.map(open_fu, & &1.description)
          }
        end

      broadcast(
        exp.conversation_id,
        "social_flow:experience_close",
        %{
          "experience" => SocialExperience.to_contract(exp),
          "copy" => copy
        },
        trace_id
      )

      {:ok, %{experience: exp, copy: copy, private_signal: private_signal}}
    end
  end

  # --- Sync / privacy ---

  def sync_experience(user_id, conversation_id) do
    with :ok <- ensure_member(conversation_id, user_id) do
      experiences =
        from(e in SocialExperience,
          where: e.conversation_id == ^conversation_id,
          order_by: [desc: e.inserted_at],
          limit: 5
        )
        |> Repo.all()

      snapshots =
        Enum.map(experiences, fn exp ->
          expire_stale_etas(exp.id)

          etas =
            from(e in ETAEnvelope,
              where: e.experience_id == ^exp.id and e.status == "active"
            )
            |> Repo.all()
            |> Enum.map(&ETAEnvelope.to_public_contract/1)

          states =
            from(p in ExperienceParticipantState, where: p.experience_id == ^exp.id)
            |> Repo.all()
            |> Enum.map(&ExperienceParticipantState.to_public_contract/1)

          follow_ups =
            from(f in ExperienceFollowUp, where: f.experience_id == ^exp.id)
            |> Repo.all()
            |> Enum.map(&ExperienceFollowUp.to_contract(&1, user_id))

          changes =
            from(c in ExperienceChangeCandidate,
              where: c.experience_id == ^exp.id and c.status == "proposed"
            )
            |> Repo.all()
            |> Enum.map(&ExperienceChangeCandidate.to_contract/1)

          %{
            "experience" => SocialExperience.to_contract(exp),
            "readiness" => readiness_summary(exp.id, user_id),
            "participant_states" => states,
            "active_etas" => etas,
            "changes" => changes,
            "follow_ups" => follow_ups,
            "no_precise_location" => true,
            "no_attendance_score" => true
          }
        end)

      {:ok, %{"experiences" => snapshots}}
    end
  end

  def get_experience_for_user(experience_id, user_id) do
    case Repo.get(SocialExperience, experience_id) do
      %SocialExperience{} = exp ->
        if member?(exp.conversation_id, user_id), do: {:ok, exp}, else: {:error, :forbidden}

      nil ->
        {:error, :not_found}
    end
  end

  # --- helpers ---

  defp member_ids(conversation_id) do
    from(m in ConversationMember,
      where: m.conversation_id == ^conversation_id,
      select: m.user_id
    )
    |> Repo.all()
  end

  defp member?(conversation_id, user_id) do
    from(m in ConversationMember,
      where: m.conversation_id == ^conversation_id and m.user_id == ^user_id
    )
    |> Repo.exists?()
  end

  defp ensure_member(conversation_id, user_id) do
    if member?(conversation_id, user_id), do: :ok, else: {:error, :not_a_member}
  end

  defp fetch!(attrs, key) do
    Map.get(attrs, key) || Map.get(attrs, to_string(key)) ||
      raise ArgumentError, "missing #{inspect(key)}"
  end

  defp audit!(conversation_id, actor, event_type, payload, trace_id) do
    %AuditEvent{}
    |> AuditEvent.changeset(%{
      conversation_id: conversation_id,
      actor_user_id: actor,
      event_type: event_type,
      payload: payload,
      trace_id: trace_id
    })
    |> Repo.insert!()
  end

  defp broadcast(conversation_id, event, payload, trace_id) do
    OpalCoreWeb.Endpoint.broadcast(
      "conversation:#{conversation_id}",
      event,
      Map.put(payload, "trace_id", trace_id)
    )
  end
end
