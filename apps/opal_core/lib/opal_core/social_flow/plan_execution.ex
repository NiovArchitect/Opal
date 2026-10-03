defmodule OpalCore.SocialFlow.PlanExecution do
  @moduledoc """
  Bridge from SharedPlan agreement → provider execution.

  SharedPlan = what people agreed.
  Outcomes = how that state was reached.
  ReservationExecution / BookingAuthorization = what Opal attempted externally.

  Never collapses:
  agreed → authorized → submitted → confirmed.

  LIVE partner booking is NOT claimed. Synthetic adapter is for contract proofs.
  """

  alias OpalCore.Calls.Outcomes
  alias OpalCore.Repo

  alias OpalCore.SocialFlow.{
    BookingAuthorization,
    PlaceIdentity,
    ReservationExecution,
    SharedPlan,
    SyntheticReservationProvider
  }

  alias OpalCore.SocialFlow.Ambient.ExecutionContext

  @statuses ~w(
    not_ready
    ready
    authorization_needed
    authorized
    submitting
    submitted
    confirmed
    failed
    canceled
    expired
    unavailable
  )

  def statuses, do: @statuses

  @doc """
  Evaluate execution readiness for a settled SharedPlan.

  Does not mutate the plan. Does not invent place data.
  """
  def readiness(plan_id, opts \\ []) when is_binary(plan_id) do
    with {:ok, plan, alignment} <- load_plan(plan_id) do
      place_name = get_in(alignment, ["place", "value"])
      identity = identity_from_alignment(alignment, place_name)
      identity = maybe_synthetic_bind(identity, opts)

      caps = PlaceIdentity.capabilities(identity || %{})
      settled? = settled?(alignment)
      booking_connected? = caps["reservation_booking"]["available"] == true
      can_synthetic? = Keyword.get(opts, :allow_synthetic_booking, false) and is_binary(identity && identity["provider_place_id"])

      status =
        cond do
          not settled? ->
            "not_ready"

          booking_connected? or can_synthetic? ->
            "authorization_needed"

          true ->
            "unavailable"
        end

      presentation = presentation(status, identity, caps)

      {:ok,
       %{
         "plan_id" => plan.id,
         "conversation_id" => plan.conversation_id,
         "plan_version" => alignment["plan_version"] || 0,
         "settled" => settled?,
         "status" => status,
         "place_identity" => identity,
         "capabilities" => caps,
         "maps_handoff_url" => identity && PlaceIdentity.maps_handoff_url(identity),
         "presentation" => presentation,
         "live_booking_claimed" => false,
         "false_reservation_success" => false,
         "agreed" => agreed_snapshot(alignment),
         "provider" => %{
           "reservation" => SyntheticReservationProvider.capability_status(),
           "place" => %{"source" => get_in(identity || %{}, ["provenance", "source"])}
         }
       }}
    end
  end

  @doc """
  Issue booking authorization bound to the current plan version.

  Requires settled plan. Synthetic booking path requires explicit allow + place id.
  """
  def authorize(plan_id, user_id, attrs \\ %{}) when is_binary(plan_id) and is_binary(user_id) do
    attrs = stringify(attrs)

    ready_opts = [
      allow_synthetic_booking: attrs["allow_synthetic_booking"] == true,
      provider_place_id: attrs["provider_place_id"]
    ]

    with {:ok, plan, alignment} <- load_plan(plan_id),
         true <- settled?(alignment) || {:error, :plan_not_settled},
         {:ok, ready} <- readiness(plan_id, ready_opts),
         true <- ready["status"] in ~w(authorization_needed authorized) || {:error, :booking_unavailable},
         identity when is_map(identity) <- ready["place_identity"] || {:error, :place_unresolved},
         true <- is_binary(identity["provider_place_id"]) || {:error, :provider_place_id_required} do
      plan_version = ready["plan_version"]
      when_label = ready["agreed"]["when_label"]
      party = attrs["party_size"] || party_size(alignment)

      auth_attrs = %{
        "actor_user_id" => user_id,
        "provider_place_id" => identity["provider_place_id"],
        "place_display_name" => identity["canonical_name"],
        "party_size" => party,
        "slot_label" => when_label,
        "slot_id" => attrs["slot_id"] || "plan:#{plan.id}:v#{plan_version}",
        "reality_id" => plan.conversation_id,
        "plan_id" => plan.id,
        "plan_version" => plan_version,
        "explicit_confirm" => attrs["explicit_confirm"] != false,
        "provider" => identity["provider"] || "synthetic_reservation",
        "authority_scope" => attrs["authority_scope"] || "plan_booking"
      }

      case BookingAuthorization.issue(auth_attrs) do
        {:ok, auth} ->
          _ =
            Outcomes.record_execution_lineage(plan.conversation_id, %{
              "outcome_type" => "booking_authorized",
              "plan_id" => plan.id,
              "plan_version" => plan_version,
              "actor_user_id" => user_id,
              "entity_id" => auth["authorization_id"],
              "after_value" => when_label,
              "source_type" => "execution",
              "provenance" => %{
                "kind" => "booking_authorized",
                "authorization_id" => auth["authorization_id"],
                "provider_place_id" => identity["provider_place_id"],
                "live_claimed" => false
              }
            })

          {:ok,
           %{
             "authorization" => auth,
             "plan_id" => plan.id,
             "plan_version" => plan_version,
             "status" => "authorized",
             "live_claimed" => false,
             "presentation" => %{"label" => "Approved to book", "tone" => "authorized"}
           }}

        err ->
          err
      end
    end
  end

  @doc """
  Execute booking against an authorization for this plan version.

  Stale plan_version → no provider mutation.
  Double-tap → one execution via ReservationExecution idempotency.
  """
  def execute(plan_id, user_id, attrs) when is_binary(plan_id) and is_binary(user_id) and is_map(attrs) do
    a = stringify(attrs)
    auth = stringify(a["authorization"] || %{})

    with {:ok, plan, alignment} <- load_plan(plan_id),
         true <- settled?(alignment) || {:error, :plan_not_settled},
         :ok <- BookingAuthorization.valid?(auth, a),
         :ok <- assert_plan_version(auth, alignment),
         :ok <- assert_plan_id(auth, plan.id) do
      identity = identity_from_alignment(alignment, get_in(alignment, ["place", "value"]))
      identity = maybe_synthetic_bind(identity, allow_synthetic_booking: true, provider_place_id: auth["provider_place_id"])

      request = %{
        "actor_user_id" => user_id,
        "authorization" => auth,
        "reality_id" => plan.conversation_id,
        "provider_place_id" => auth["provider_place_id"],
        "place_display_name" => auth["place_display_name"] || identity["canonical_name"],
        "party_size" => auth["party_size"] || 2,
        "slot_id" => auth["slot_id"],
        "slot_label" => auth["slot_label"],
        "idempotency_key" =>
          a["idempotency_key"] ||
            "plan-exec:#{plan.id}:v#{alignment["plan_version"] || 0}:#{auth["authorization_id"]}",
        "scenario" => a["scenario"],
        "lineage" => %{
          "plan_id" => plan.id,
          "plan_version" => alignment["plan_version"] || 0,
          "authorization_id" => auth["authorization_id"],
          "track" => "a3_plan_execution"
        }
      }

      case ReservationExecution.request_booking(request) do
        {:ok, body} ->
          exec = body["execution"] || %{}
          status = exec["status"]
          outcome_type = execution_outcome_type(status, body["idempotent"] == true)

          if outcome_type do
            _ =
              Outcomes.record_execution_lineage(plan.conversation_id, %{
                "outcome_type" => outcome_type,
                "plan_id" => plan.id,
                "plan_version" => alignment["plan_version"] || 0,
                "actor_user_id" => user_id,
                "entity_id" => exec["execution_id"],
                "after_value" => status,
                "source_type" => "execution",
                "idempotency_key" =>
                  if(body["idempotent"] == true,
                    do: "outcome:exec:#{exec["execution_id"]}:#{outcome_type}",
                    else: "outcome:exec:#{request["idempotency_key"]}:#{outcome_type}"
                  ),
                "provenance" => %{
                  "kind" => outcome_type,
                  "execution_id" => exec["execution_id"],
                  "provider_request_id" => exec["provider_request_id"],
                  "provider_response_id" => exec["provider_response_id"],
                  "authorization_id" => auth["authorization_id"],
                  "live_claimed" => exec["live_claimed"] == true,
                  "idempotent" => body["idempotent"] == true
                }
              })
          end

          {:ok,
           Map.merge(body, %{
             "plan_id" => plan.id,
             "plan_version" => alignment["plan_version"] || 0,
             "plan_preserved" => true,
             "live_claimed" => false,
             "false_reservation_success" => false
           })}

        err ->
          err
      end
    end
  end

  def execute(_, _, _), do: {:error, :invalid}

  @doc "Provider failure recovery — plan remains intact."
  def recover_after_failure(plan_id, execution) when is_binary(plan_id) do
    with {:ok, plan, alignment} <- load_plan(plan_id) do
      reality = %{
        "what" => get_in(alignment, ["activity", "value"]),
        "when" => agreed_snapshot(alignment)["when_label"],
        "where" => get_in(alignment, ["place", "value"]),
        "place_display_name" => get_in(alignment, ["place", "value"])
      }

      recovery = ReservationExecution.recover_plan(reality, execution)

      _ =
        Outcomes.record_execution_lineage(plan.conversation_id, %{
          "outcome_type" => "booking_failed",
          "plan_id" => plan.id,
          "plan_version" => alignment["plan_version"] || 0,
          "entity_id" => execution["execution_id"] || execution["id"],
          "after_value" => execution["status"] || "failed",
          "source_type" => "execution",
          "provenance" => %{
            "kind" => "booking_failed",
            "plan_preserved" => true,
            "live_claimed" => false
          }
        })

      {:ok,
       Map.merge(recovery, %{
         "plan_id" => plan.id,
         "plan_version" => alignment["plan_version"] || 0,
         "plan_intact" => true,
         "open_loop" => "reservation_not_placed"
       })}
    end
  end

  @doc "Confirm path through reconcile — adapter boundary only."
  def confirm_via_reconcile(execution_id, opts \\ []) when is_binary(execution_id) do
    case ReservationExecution.reconcile(execution_id, opts) do
      {:ok, body} ->
        exec = body["execution"] || %{}

        if exec["status"] == "confirmed" and is_binary(exec["reality_id"]) do
          _ =
            Outcomes.record_execution_lineage(exec["reality_id"], %{
              "outcome_type" => "booking_confirmed",
              "plan_id" => get_in(exec, ["lineage", "plan_id"]),
              "plan_version" => get_in(exec, ["lineage", "plan_version"]),
              "entity_id" => exec["execution_id"],
              "after_value" => "confirmed",
              "source_type" => "execution",
              "idempotency_key" => "outcome:exec:#{exec["execution_id"]}:booking_confirmed",
              "provenance" => %{
                "kind" => "booking_confirmed",
                "provider_response_id" => exec["provider_response_id"],
                "provider_resource_id" => exec["provider_resource_id"],
                "live_claimed" => exec["live_claimed"] == true,
                "sandbox" => true
              }
            })
        end

        {:ok, body}

      err ->
        err
    end
  end

  def execution_context_from_plan(plan_id, actor_user_id) when is_binary(plan_id) do
    with {:ok, plan, alignment} <- load_plan(plan_id),
         identity <- identity_from_alignment(alignment, get_in(alignment, ["place", "value"])) do
      ExecutionContext.from_resolved(%{
        "conversation_id" => plan.conversation_id,
        "plan_id" => plan.id,
        "plan_version" => alignment["plan_version"] || 0,
        "actor_user_id" => actor_user_id,
        "participant_ids" => alignment["participants"] || [],
        "party_size" => party_size(alignment),
        "when" => agreed_snapshot(alignment)["when_label"],
        "place" => identity["canonical_name"],
        "place_label" => identity["display"],
        "venue_id" => identity["provider_place_id"],
        "provider" => identity["provider"],
        "destination" => identity["display"] || identity["canonical_name"],
        "set" => settled?(alignment),
        "slot_label" => get_in(alignment, ["exact_time", "value"])
      })
    end
  end

  defp load_plan(plan_id) do
    case Repo.get(SharedPlan, plan_id) do
      %SharedPlan{} = plan ->
        alignment = plan.alignment || %{}
        {:ok, plan, alignment}

      nil ->
        {:error, :not_found}
    end
  end

  defp settled?(alignment) when is_map(alignment) do
    get_in(alignment, ["place", "state"]) == "locked" and
      get_in(alignment, ["exact_time", "state"]) == "locked" and
      alignment["commitment"] in ["aligned", "execution_ready"]
  end

  defp settled?(_), do: false

  defp agreed_snapshot(alignment) do
    date = get_in(alignment, ["date", "value"])
    time = get_in(alignment, ["exact_time", "value"])

    %{
      "activity" => get_in(alignment, ["activity", "value"]),
      "place" => get_in(alignment, ["place", "value"]),
      "date" => date,
      "exact_time" => time,
      "when_label" =>
        [date, time]
        |> Enum.reject(&(&1 in [nil, ""]))
        |> Enum.join(" · ")
    }
  end

  defp party_size(alignment) do
    case alignment["participants"] do
      list when is_list(list) and list != [] -> length(list)
      _ -> 2
    end
  end

  defp identity_from_alignment(alignment, place_name) when is_map(alignment) do
    persisted = get_in(alignment, ["place", "identity"]) || alignment["place_identity"]

    cond do
      PlaceIdentity.high_confidence?(persisted) ->
        persisted

      is_binary(place_name) ->
        PlaceIdentity.resolve(place_name)

      true ->
        nil
    end
  end

  defp identity_from_alignment(_, place_name) when is_binary(place_name),
    do: PlaceIdentity.resolve(place_name)

  defp identity_from_alignment(_, _), do: nil

  defp maybe_synthetic_bind(nil, _), do: nil

  defp maybe_synthetic_bind(identity, opts) do
    allow? = Keyword.get(opts, :allow_synthetic_booking, false)
    pid = Keyword.get(opts, :provider_place_id) || identity["provider_place_id"]

    cond do
      allow? and is_binary(pid) ->
        PlaceIdentity.bind_synthetic_provider_place(identity, pid)

      true ->
        identity
    end
  end

  defp assert_plan_version(auth, alignment) do
    auth_v = auth["plan_version"]
    plan_v = alignment["plan_version"] || 0

    cond do
      is_nil(auth_v) ->
        {:error, :authorization_plan_version_required}

      to_int(auth_v) != to_int(plan_v) ->
        {:error, :stale_authorization}

      true ->
        :ok
    end
  end

  defp assert_plan_id(auth, plan_id) do
    cond do
      is_binary(auth["plan_id"]) and auth["plan_id"] != plan_id ->
        {:error, :authorization_plan_mismatch}

      true ->
        :ok
    end
  end

  defp presentation("not_ready", _, _),
    do: %{"label" => "Plan still forming", "tone" => "forming", "reserve_control" => false}

  defp presentation("unavailable", identity, caps) do
    %{
      "label" => "Booking isn't connected yet",
      "tone" => "unavailable",
      "reserve_control" => false,
      "detail" => identity && identity["display"],
      "directions_available" => get_in(caps, ["directions", "available"]) == true
    }
  end

  defp presentation("authorization_needed", identity, _) do
    %{
      "label" => "Ready to book",
      "tone" => "needs_approval",
      "reserve_control" => true,
      "detail" => identity && identity["display"]
    }
  end

  defp presentation(status, _, _),
    do: %{"label" => status, "tone" => status, "reserve_control" => false}

  defp execution_outcome_type("confirmed", false), do: "booking_confirmed"
  defp execution_outcome_type("failed", false), do: "booking_failed"
  defp execution_outcome_type(status, false) when status in ~w(requested held reconciling), do: "booking_submitted"
  defp execution_outcome_type(_, true), do: nil
  defp execution_outcome_type(_, _), do: nil

  defp to_int(n) when is_integer(n), do: n
  defp to_int(n) when is_binary(n) do
    case Integer.parse(n) do
      {i, _} -> i
      :error -> -1
    end
  end
  defp to_int(_), do: -1

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {k, v}
    end)
  end
end
