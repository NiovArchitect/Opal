defmodule OpalCore.SocialFlow.Execution.ProactiveCompose do
  @moduledoc """
  Proactive coordination compose: prepare early, interrupt late.

  Proactivity = do the work first, not necessarily talk first.

  Flow:
  PlanAwareness → BackgroundPrepare → (optional) DueWork schedule →
  if tier surfaceable + debt ok → SurfaceRouter → PlanMoment/JIT
  else quiet success.

  Quiet background re-eval with nothing to say is successful intelligence.
  """

  alias OpalCore.SocialFlow.Ambient.{InterruptionDebt, SocialOpening}

  alias OpalCore.SocialFlow.Execution.{
    BackgroundPrepare,
    DueWork,
    PlanAwareness,
    PlanMoment,
    ReadinessCompose,
    SurfaceRouter
  }

  @doc """
  Full proactive tick for one plan — change/event driven, not global scan.
  """
  def tick(attrs, opts \\ [])

  def tick(attrs, opts) when is_map(attrs) do
    a = stringify(attrs)
    now = a["now"] || Keyword.get(opts, :now) || DateTime.utc_now()
    a = Map.put(a, "now", now)

    with {:ok, awareness} <- PlanAwareness.evaluate(a),
         {:ok, prep} <- BackgroundPrepare.run(a, awareness),
         due <- maybe_schedule_due(a, awareness, opts),
         {:ok, decision} <- decide_surface(a, awareness, prep) do
      {:ok,
       %{
         "attention_tier" => awareness["attention_tier"],
         "awareness" => summarize_awareness(awareness),
         "preparation" => summarize_prep(prep),
         "due_work" => due,
         "decision" => decision,
         "surface" => decision["surface_payload"],
         "visible" => decision["visible"] == true,
         "quiet_success" => decision["visible"] != true,
         "prepare_early_interrupt_late" => true,
         "push_is_exception" => true,
         "proactivity_means_work_first" => true,
         "workflow_ui" => false,
         "plan_dashboard" => false,
         "authorizes_set" => false,
         "private" => decision["visible"] != true
       }}
    end
  end

  def tick(_, _), do: {:error, :invalid}

  @doc """
  Material state transition triggers re-evaluation (not polling).
  """
  def on_material_change(attrs, change) when is_map(attrs) do
    a = stringify(attrs)
    c = to_string(change)

    material? =
      c in ~w(
        willingness
        time_narrowed
        required_participant_resolved
        location_relevant
        provider_deadline
        plan_version_bump
        set
        participant_change
        topic_changed
        humans_changed_direction
      )

    if material? do
      tick(
        Map.merge(a, %{
          "material_change" => c,
          "material_participant_change" => c == "participant_change"
        })
      )
    else
      {:ok,
       %{
         "skipped" => true,
         "reason" => "non_material_change",
         "visible" => false,
         "quiet_success" => true
       }}
    end
  end

  def on_material_change(_, _), do: {:error, :invalid}

  @doc """
  Fire due work: private re-eval; surface only if newly justified.
  """
  def on_due(attrs, opts \\ [])

  def on_due(attrs, opts) when is_map(attrs) do
    a = stringify(attrs)
    now = Keyword.get(opts, :now) || a["now"] || DateTime.utc_now()

    {:ok, fire} = DueWork.fire_due(Map.put(a, "now", now), now: now)

    # Always re-tick after due fire for private re-eval
    {:ok, t} = tick(Map.put(a, "now", now), due_fires: fire["fires"])

    {:ok,
     Map.merge(t, %{
       "due_fires" => fire["fires"],
       "due_auto_surface" => false,
       "idempotent_due" => true
     })}
  end

  def on_due(_, _), do: {:error, :invalid}

  @doc """
  Proactive social opening path — prepare privately; surface only if debt allows.
  Never cold recommendations.
  """
  def opening_tick(attrs) when is_map(attrs) do
    a = stringify(attrs)

    {:ok, opening} =
      SocialOpening.detect(
        Map.merge(a, %{
          "participant_ids" => a["participant_ids"] || [],
          "viable_participant_ids" => a["viable_participant_ids"] || a["participant_ids"],
          "time_compatible" => a["time_compatible"] != false,
          "willingness_ok" => a["willingness_ok"] != false,
          "proximity_ok" => a["proximity_ok"] != false,
          "world_opportunity" => a["world_opportunity"] == true
        })
      )

    quality_band = opening["quality_band"] || "thin"

    # Weak / cold: never surface, limited prep
    if opening["exists"] != true or quality_band in ~w(thin none) or
         a["cold_recommendation"] == true do
      {:ok,
       %{
         "visible" => false,
         "quiet_success" => true,
         "reason" => "weak_or_cold_opening",
         "opening" => opening,
         "cold_recommendation" => false,
         "proactive_surface_ok" => false
       }}
    else
      tick(
        Map.merge(a, %{
          "social_opening" => true,
          "opening_exists" => true,
          "proactive_surface_ok" => opening["proactive_surface_ok"] == true,
          "opening_quality_band" => quality_band,
          "intent_strength" => a["intent_strength"] || "active_desire",
          "quality_band" => quality_band
        })
      )
    end
  end

  def opening_tick(_), do: {:error, :invalid}

  @doc """
  Asymmetric private preparation per member — shared plan stays simple.
  """
  def asymmetric_prep(plan_attrs, members) when is_map(plan_attrs) and is_list(members) do
    p = stringify(plan_attrs)

    Enum.map(members, fn m ->
      m = stringify(m)
      role = m["role"] || "participant"

      focus =
        cond do
          role == "organizer" and p["reservation_needed"] != false ->
            "booking_context"

          m["long_distance"] == true ->
            "leave_by_later"

          m["nearby"] == true ->
            "nothing"

          true ->
            "shared_quiet"
        end

      %{
        "user_id" => m["user_id"],
        "role" => role,
        "private_focus" => focus,
        "surface" => false,
        "shared_plan_simple" => true,
        "group_manager_ui" => false
      }
    end)
  end

  def asymmetric_prep(_, _), do: []

  @doc """
  Required-person private follow-up — not public call-out.
  """
  def required_follow_up(attrs) when is_map(attrs) do
    a = stringify(attrs)

    cond do
      a["required_participant_unresolved"] != true ->
        %{
          "kind" => "nothing",
          "reason" => "no_required_unresolved",
          "visible" => false
        }

      a["optional_only_silent"] == true ->
        %{
          "kind" => "nothing",
          "reason" => "silence_ne_decline_optional",
          "visible" => false,
          "nag_optional" => false
        }

      true ->
        %{
          "kind" => "minimum_question",
          "private" => true,
          "audience" => "required_person_only",
          "user_id" => a["required_user_id"],
          "copy" => a["copy"] || "Still good for Saturday?",
          "public_callout" => false,
          "group_burden" => false,
          "visible" => true
        }
    end
  end

  def required_follow_up(_), do: %{"kind" => "nothing"}

  @doc """
  7-day noise benchmark: many internal events → very few visible surfaces.
  Headline regression for prepare-early/interrupt-late.
  """
  def noise_benchmark(base_attrs \\ %{}) do
    base =
      stringify(
        Map.merge(
          %{
            "set" => true,
            "plan_type" => "dinner",
            "place" => "Harbor Table",
            "destination" => "Harbor Table",
            "when" => ~U[2026-08-20 19:00:00Z],
            "plan_id" => "noise-bench",
            "conversation_id" => "c-noise",
            "plan_version" => 1,
            "party_size" => 2,
            "actor_user_id" => "u1"
          },
          stringify(base_attrs)
        )
      )

    start = base["when"]

    # Simulate from T-7d through T+1h with many internal ticks.
    # Stateful flags model reality: once handled, do not re-surface.
    offsets_hours = [
      -7 * 24,
      -5 * 24,
      -3 * 24,
      -2 * 24,
      -24,
      -12,
      -6,
      -3,
      -1,
      -0.75,
      -0.5,
      -0.25,
      0,
      1
    ]

    {events, _state} =
      Enum.reduce(offsets_hours, {[], %{}}, fn h, {acc, state} ->
        now = DateTime.add(start, trunc(h * 3600), :second)

        ticks = [
          {"heartbeat", %{}},
          {"freshness_refresh", %{}},
          {"provider_metadata", %{"provider_metadata_changed" => true}},
          {"participant_ping", %{"optional_silent" => true}}
        ]

        Enum.reduce(ticks, {acc, state}, fn {name, extra}, {evs, st} ->
          attrs =
            Map.merge(base, extra)
            |> Map.put("now", now)
            |> Map.put("event", name)
            |> Map.merge(st)
            # Humans book ~1 day out — after that no booking surfaces
            |> then(fn m ->
              if h >= -24 do
                Map.merge(m, %{
                  "human_reports_booked" => true,
                  "provider_confirmed" => true
                })
              else
                m
              end
            end)

          case tick(attrs) do
            {:ok, r} ->
              visible? = r["visible"] == true

              st2 =
                cond do
                  visible? and get_in(r, ["surface", "capability"]) == "navigation" ->
                    Map.merge(st, %{
                      "navigation_started" => true,
                      "directions_started" => true,
                      "already_presented_surfaces" =>
                        Enum.uniq([
                          get_in(r, ["surface", "delivery_surface"])
                          | List.wrap(st["already_presented_surfaces"])
                        ])
                    })

                  visible? and get_in(r, ["surface", "capability"]) == "booking_handoff" ->
                    Map.merge(st, %{
                      "booking_declined" => false,
                      "human_reports_booked" => true,
                      "already_presented_surfaces" =>
                        Enum.uniq([
                          get_in(r, ["surface", "delivery_surface"])
                          | List.wrap(st["already_presented_surfaces"])
                        ])
                    })

                  visible? ->
                    Map.put(
                      st,
                      "already_presented_surfaces",
                      Enum.uniq([
                        get_in(r, ["surface", "delivery_surface"])
                        | List.wrap(st["already_presented_surfaces"])
                      ])
                    )

                  true ->
                    st
                end

              ev = %{
                "t_hours" => h,
                "event" => name,
                "tier" => r["attention_tier"],
                "visible" => visible?,
                "prepared" => get_in(r, ["preparation", "prepared_count"]) || 0
              }

              {[ev | evs], st2}

            _ ->
              {[
                 %{"t_hours" => h, "event" => name, "visible" => false, "error" => true} | evs
               ], st}
          end
        end)
      end)

    events = Enum.reverse(events)
    visible = Enum.count(events, &(&1["visible"] == true))
    total = length(events)
    prepared_events = Enum.count(events, &((&1["prepared"] || 0) > 0))

    %{
      "total_internal_events" => total,
      "visible_surfaces" => visible,
      "preparation_ticks" => prepared_events,
      "visibility_ratio" => if(total > 0, do: visible / total, else: 0.0),
      "pass" => visible <= 4 and total >= 40,
      "headline" => "prepare_many_surface_few",
      "events_sample" => Enum.take(events, 5),
      "less_software" => true
    }
  end

  @doc "Organizer labor removed estimate for less-software benchmark."
  def labor_removed_estimate(attrs) when is_map(attrs) do
    a = stringify(attrs)

    manual = ~w(
      poll_everyone
      follow_up_silence
      compare_calendars
      search_venue
      calculate_travel
      remind_everyone
    )

    opal_does =
      [
        if(a["set"] == true, do: "compare_calendars"),
        if(a["place"] || a["destination"], do: "search_venue"),
        "calculate_travel",
        if(a["reminder_useful"] != false, do: "remind_everyone"),
        "follow_up_silence"
      ]
      |> Enum.reject(&is_nil/1)

    %{
      "manual_steps" => manual,
      "opal_private_steps" => opal_does,
      "human_visible_steps" => ["talk", "one_meaningful_choice", "one_jit_action"],
      "steps_removed" => length(manual) - 3,
      "group_manager_ui" => false,
      "task_assignments" => false
    }
  end

  def labor_removed_estimate(_), do: %{}

  # --- internals ---

  defp maybe_schedule_due(a, awareness, opts) do
    if Keyword.get(opts, :schedule_due, true) and awareness["may_prepare"] do
      hints = DueWork.suggest_schedule(awareness, a)

      scheduled =
        Enum.map(hints, fn h ->
          case DueWork.schedule(h) do
            {:ok, rec} -> rec
            _ -> nil
          end
        end)
        |> Enum.reject(&is_nil/1)

      %{"scheduled" => scheduled, "count" => length(scheduled), "global_scan" => false}
    else
      %{"scheduled" => [], "count" => 0, "skipped" => true}
    end
  end

  defp decide_surface(a, awareness, prep) do
    tier = awareness["attention_tier"]

    cond do
      a["humans_already_solved"] == true or a["topic_changed"] == true ->
        {:ok, quiet("humans_solved_or_topic_changed")}

      a["humans_changed_direction"] == true ->
        {:ok, quiet("direction_changed_discard_prep")}

      not awareness["may_surface"] and a["human_asked"] != true ->
        {:ok, quiet_success(tier, prep)}

      true ->
        # Revalidate prep before any surface
        {:ok, reval} = BackgroundPrepare.revalidate_for_surface(prep, a)

        if reval["usable"] == false and awareness["attention_tier"] != "urgent_actionable" do
          {:ok, quiet(reval["reason"] || "prep_not_usable")}
        else
          # PREPARED ≠ READY — promotion gate before human attention
          readiness_attrs =
            Map.merge(a, %{
              "attention_tier" => tier,
              "prepared_count" => prep["prepared_count"] || 0,
              "candidate_prepared" => (prep["prepared_count"] || 0) > 0,
              "minutes_to_start" => awareness["minutes_to_start"],
              "minutes_to_leave" => awareness["minutes_to_leave"]
            })

          case ReadinessCompose.maybe_promote(readiness_attrs) do
            {:ok, %{"visible" => true} = promo} ->
              # Ready for attention — choose WHAT via PlanMoment
              route_and_maybe_moment(
                Map.merge(a, %{
                  "readiness_state" => get_in(promo, ["readiness", "readiness_state"]),
                  "readiness_promoted" => true
                }),
                awareness
              )

            {:ok, promo} ->
              {:ok,
               Map.merge(quiet_success(tier, prep), %{
                 "readiness_reason" => promo["reason"],
                 "prepared_ne_ready" => true,
                 "readiness_state" => get_in(promo, ["readiness", "readiness_state"])
               })}

            _ ->
              route_and_maybe_moment(a, awareness)
          end
        end
    end
  end

  defp route_and_maybe_moment(a, awareness) do
    route =
      SurfaceRouter.route(
        Map.merge(a, %{
          "attention_tier" => awareness["attention_tier"],
          "minutes_to_start" => awareness["minutes_to_start"],
          "minutes_to_leave" => awareness["minutes_to_leave"],
          "quality_band" => a["opening_quality_band"] || a["quality_band"] || "solid"
        })
      )

    if route["present"] != true do
      {:ok, Map.merge(quiet(route["reason"] || "route_none"), %{"route" => route})}
    else
      # Only now consult PlanMoment / JIT for WHAT
      case PlanMoment.evaluate(a) do
        {:ok, moment} ->
          surface = moment["surface"] || %{}

          if surface["kind"] in ~w(nothing) or is_nil(surface["kind"]) do
            {:ok, quiet_success(awareness["attention_tier"], %{"prepared_count" => 0})}
          else
            # Final debt check on chosen surface
            debt =
              InterruptionDebt.evaluate(%{
                "effort_removed" => 0.8,
                "uncertainty_removed" => 0.6,
                "this_got_easy" => true,
                "actionable" => true,
                "confidence" => 0.9,
                "surface" => route["surface"],
                "quality_band" => a["quality_band"] || "strong",
                "option_count" => 1,
                "human_asked" => a["human_asked"] == true
              })

            if debt["surface_ok"] or a["human_asked"] == true do
              {:ok,
               %{
                 "visible" => true,
                 "surface_payload" => %{
                   "kind" => surface["kind"],
                   "capability" => surface["capability"],
                   "copy" => surface["copy"],
                   "topic" => surface["topic"],
                   "answers" => surface["answers"],
                   "delivery_surface" => route["surface"],
                   "then_get_quiet" => true
                 },
                 "route" => route,
                 "moment" => moment,
                 "interruption_debt" => debt,
                 "one_action" => true
               }}
            else
              {:ok, quiet("final_debt_block")}
            end
          end

        _ ->
          {:ok, quiet("moment_unavailable")}
      end
    end
  end

  defp quiet_success(tier, prep) do
    %{
      "visible" => false,
      "quiet_success" => true,
      "reason" => "prepared_or_watched_nothing_to_say",
      "attention_tier" => tier,
      "prepared_count" => prep["prepared_count"] || 0,
      "surface_payload" => %{"kind" => "nothing", "reason" => "quiet_success"}
    }
  end

  defp quiet(reason) do
    %{
      "visible" => false,
      "quiet_success" => true,
      "reason" => reason,
      "surface_payload" => %{"kind" => "nothing", "reason" => reason}
    }
  end

  defp summarize_awareness(aw) do
    Map.take(aw, ~w(
      attention_tier may_surface may_prepare may_push max_surface
      signals phase minutes_to_start prepare_early_interrupt_late
      visible_plan_awareness
    ))
  end

  defp summarize_prep(prep) do
    Map.take(prep, ~w(
      prepared_count surface ask notify live_provider_called model_called
      sunk_cost_privilege provider_tier private
    ))
  end

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
