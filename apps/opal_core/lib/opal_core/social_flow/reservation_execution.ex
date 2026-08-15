defmodule OpalCore.SocialFlow.ReservationExecution do
  @moduledoc """
  Live execution foundation for restaurant reservations (Pass 19).

  ## Truth separation (absolute)

  SOCIAL FIT ≠ PROVIDER FACT ≠ AVAILABILITY ≠ AUTHORIZATION ≠ EXECUTION ≠ CONFIRMATION

  ## Owner

  This module owns durable reservation attempts on top of:
  - ExternalWorldTruth (truth classes + freshness)
  - ProviderBoundary (legacy state labels)
  - SyntheticReservationProvider (foundation adapter — LIVE NOT CLAIMED)
  - BookingAuthorization (explicit human confirm)
  - AttributionGraph (transaction signal only — no payout)

  ## Modes

  - synthetic_provider (default foundation proof)
  - recorded_execution_fixture
  - handoff (BookingTransport — never claims booked)

  LIVE partner booking is NOT claimed without real credentials + adapter.
  """

  alias OpalCore.Repo

  alias OpalCore.SocialFlow.{
    AttributionGraph,
    BookingAuthorization,
    ExternalWorldTruth,
    ReservationExecutionRecord,
    SyntheticReservationProvider
  }

  alias OpalCore.SocialFlow.RealWorld.Booking.ProviderBoundary

  @doc "Capability / honesty matrix for product and evidence."
  def status do
    Map.merge(SyntheticReservationProvider.capability_status(), %{
      "execution_owner" => "ReservationExecution",
      "authorization_owner" => "BookingAuthorization",
      "availability_owner" => "SyntheticReservationProvider + ExternalWorldTruth",
      "avp2" => "payments_only_not_booking",
      "live_execution" => "NOT_CLAIMED",
      "payment" => "not_required_for_synthetic_path",
      "pass18_holds" => [
        "390_audience_selector_ux_incomplete",
        "realtime_pubsub_audience_routing_audit"
      ]
    })
  end

  @doc """
  Check reservation availability (PROVIDER FACT).

  Does not authorize booking. Does not change Shared Reality.
  Minimum payload — no transcripts, relationship memory, calendar titles.
  """
  def check_availability(attrs) when is_map(attrs) do
    a = stringify(attrs)

    # Refuse over-sharing — strip forbidden keys if present
    clean = Map.take(a, [
      "provider_place_id",
      "venue_id",
      "party_size",
      "slot_id",
      "slot_label",
      "when_label",
      "when",
      "slot_starts_at",
      "scenario",
      "include_alt_slot",
      "place_display_name"
    ])

    case SyntheticReservationProvider.check_availability(clean) do
      {:ok, avail} ->
        # Also keep ProviderBoundary inquiry in sync for legacy callers
        {:ok, inquiry} =
          ProviderBoundary.inquire(%{
            venue_id: clean["provider_place_id"] || clean["venue_id"],
            conversation_id: a["reality_id"],
            party_size: clean["party_size"] || 2,
            time_window: clean["slot_label"] || clean["when_label"],
            provider: SyntheticReservationProvider.provider_id()
          })

        slots = avail["slots"] || []
        {:ok, checked} = ProviderBoundary.check_availability(inquiry, slots)

        {:ok,
         Map.merge(avail, %{
           "provider_boundary_state" => checked["state"],
           "booked" => false,
           "authorizes_booking" => false,
           "authorizes_payment" => false,
           "truth_class" => "provider_fact",
           "place_display_name" => a["place_display_name"]
         })}

      err ->
        err
    end
  end

  def check_availability(_), do: {:error, :invalid}

  @doc "Human authorization object — required before commitment."
  def authorize(attrs) when is_map(attrs) do
    BookingAuthorization.issue(attrs)
  end

  def authorize(_), do: {:error, :invalid}

  @doc """
  Request reservation after authorization.

  Idempotent on idempotency_key (reality + place + slot + authorization).
  Double-tap Confirm does not double-book.
  """
  def request_booking(attrs) when is_map(attrs) do
    a = stringify(attrs)
    auth = a["authorization"] || a["auth"] || %{}
    auth = if is_map(auth), do: stringify(auth), else: %{}

    idem =
      a["idempotency_key"] ||
        default_idempotency_key(a, auth)

    case Repo.get_by(ReservationExecutionRecord, idempotency_key: idem) do
      %ReservationExecutionRecord{} = existing ->
        {:ok, %{
          "execution" => ReservationExecutionRecord.public_contract(existing),
          "idempotent" => true,
          "origin" => "idempotent"
        }}

      nil ->
        do_request_booking(a, auth, idem)
    end
  end

  def request_booking(_), do: {:error, :invalid}

  @doc "Load execution for actor (or public shared-safe if participant path)."
  def get(execution_id) when is_binary(execution_id) do
    case Repo.get(ReservationExecutionRecord, execution_id) do
      nil -> {:error, :not_found}
      row -> {:ok, ReservationExecutionRecord.public_contract(row)}
    end
  end

  def get(_), do: {:error, :not_found}

  @doc """
  Timeout / unknown path — mark reconciling, then reconcile with provider.
  Never blind-retry booking without reconciliation.
  """
  def mark_timeout(execution_id) when is_binary(execution_id) do
    with {:ok, row} <- fetch(execution_id),
         true <- row.status in ~w(requested reconciling) || {:error, :invalid_state} do
      row
      |> ReservationExecutionRecord.changeset(%{
        status: "reconciling",
        shared_safe_summary: "Checking reservation status…",
        failure_reason: row.failure_reason || "timeout"
      })
      |> Repo.update()
      |> case do
        {:ok, updated} -> {:ok, ReservationExecutionRecord.public_contract(updated)}
        err -> err
      end
    end
  end

  def mark_timeout(_), do: {:error, :invalid}

  @doc "Reconcile local state with provider truth (idempotent)."
  def reconcile(execution_id, opts \\ [])

  def reconcile(execution_id, opts) when is_binary(execution_id) do
    with {:ok, row} <- fetch(execution_id) do
      cond do
        row.status == "confirmed" ->
          {:ok, %{
            "execution" => ReservationExecutionRecord.public_contract(row),
            "reconciled" => true,
            "already_terminal" => true
          }}

        row.status in ~w(failed cancelled expired) ->
          {:ok, %{
            "execution" => ReservationExecutionRecord.public_contract(row),
            "reconciled" => true,
            "already_terminal" => true
          }}

        is_nil(row.provider_request_id) ->
          {:error, :missing_provider_request_id}

        true ->
          force = Keyword.get(opts, :force_status)

          {:ok, prov} =
            SyntheticReservationProvider.reconcile(row.provider_request_id,
              force_status: force
            )

          apply_provider_result(row, prov)
      end
    end
  end

  def reconcile(_, _), do: {:error, :invalid}

  @doc "Cancel a confirmed or held booking via provider."
  def cancel(execution_id, actor_user_id) when is_binary(execution_id) do
    with {:ok, row} <- fetch(execution_id),
         true <- row.actor_user_id == actor_user_id || {:error, :forbidden},
         true <- row.status in ~w(confirmed held requested) || {:error, :invalid_state} do
      ref = row.provider_resource_id || row.provider_request_id || row.id
      {:ok, prov} = SyntheticReservationProvider.cancel(ref)
      now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

      row
      |> ReservationExecutionRecord.changeset(%{
        status: "cancelled",
        cancelled_at: prov["cancelled_at"] || now,
        shared_safe_summary: "Reservation cancelled.",
        failure_reason: nil
      })
      |> Repo.update()
      |> case do
        {:ok, updated} ->
          {:ok,
           %{
             "execution" => ReservationExecutionRecord.public_contract(updated),
             "shared_reality" => ReservationExecutionRecord.shared_reality_patch(updated),
             "attribution_invalidated_for_payout" => true,
             "is_payout" => false
           }}

        err ->
          err
      end
    end
  end

  def cancel(_, _), do: {:error, :invalid}

  @doc """
  Failure does not destroy the plan.

  Returns preserved dimensions + optional alternate slot suggestion.
  Does not auto-change WHEN.
  """
  def recover_plan(reality, execution_or_failure) when is_map(reality) do
    r = stringify(reality)
    f = stringify(execution_or_failure || %{})

    recompose =
      ExternalWorldTruth.recompose_after_provider_failure(
        %{
          "what" => r["what"],
          "when" => r["when"],
          "where" => r["where"] || r["place_display_name"],
          "where_social_fit" => r["where_social_fit"] || r["where"],
          "next_gap" => r["next_gap"]
        },
        %{
          "scope" => "provider",
          "state" => f["status"] || f["state"] || "failed"
        }
      )

    # Keep preferred place as social preference when booking fails
    preferred = r["place_display_name"] || r["where"] || recompose["where_social_fit"]

    %{
      "reality" =>
        recompose
        |> Map.put("where_preferred", preferred)
        |> Map.put("where_social_fit", preferred)
        |> Map.put("reservation_status", f["status"] || "failed")
        |> Map.put("restart_required", false),
      "preserved" => %{
        "who" => true,
        "what" => true,
        "when" => true,
        "where_preference" => true
      },
      "may_offer" => ["nearby_time", "nearby_place", "manual_no_reservation"],
      "auto_changed_when" => false,
      "authorizes_set" => false,
      "human_copy" =>
        "Reservation didn't go through. Your plan is still intact."
    }
  end

  def recover_plan(r, _), do: %{"reality" => r, "restart_required" => false}

  @doc "Shared-safe Reality patch from execution."
  def shared_reality_patch(execution_id) when is_binary(execution_id) do
    with {:ok, row} <- fetch(execution_id) do
      {:ok, ReservationExecutionRecord.shared_reality_patch(row)}
    end
  end

  def shared_reality_patch(_), do: {:error, :invalid}

  @doc """
  Human notification copy for execution outcomes (Pass 14 policy).
  Quiet on intermediate checking states.
  """
  def notification_for(%{"status" => status} = exec) do
    case status do
      "confirmed" ->
        place = exec["place_display_name"] || "your place"
        slot = exec["slot_label"] || "the time"
        %{
          "should_notify" => true,
          "human_consequence" => "Reservation confirmed for #{slot}.",
          "detail" => "#{place} · #{slot}",
          "class" => "notify"
        }

      "failed" ->
        %{
          "should_notify" => true,
          "human_consequence" => "Reservation didn't go through. Your plan is still intact.",
          "class" => "notify"
        }

      "cancelled" ->
        %{
          "should_notify" => true,
          "human_consequence" => "Reservation cancelled.",
          "class" => "notify"
        }

      "payment_authorization_required" ->
        %{
          "should_notify" => true,
          "human_consequence" => "Payment authorization is needed to finish the reservation.",
          "class" => "notify"
        }

      s when s in ~w(checking requested reconciling held authorized available) ->
        %{
          "should_notify" => false,
          "human_consequence" => nil,
          "class" => "silent",
          "reason" => "intermediate_execution_state"
        }

      _ ->
        %{"should_notify" => false, "class" => "silent"}
    end
  end

  def notification_for(_), do: %{"should_notify" => false, "class" => "silent"}

  @doc """
  Attribute confirmed booking as transaction signal — NOT a payout.

  Cancellation does not erase causal history but marks economic reverse later.
  """
  def attribute_if_confirmed(execution_id) when is_binary(execution_id) do
    with {:ok, row} <- fetch(execution_id) do
      attribute_row(row)
    end
  end

  def attribute_if_confirmed(_), do: {:error, :invalid}

  @doc """
  Hard privacy: booking lineage does not expand Social Moment visibility.
  Provider does not receive social audience.
  Attribution does not reveal downstream identities in booking UI.
  """
  def privacy_invariants do
    %{
      "booking_expands_moment_visibility" => false,
      "provider_sees_social_audience" => false,
      "attribution_reveals_downstream_identity_in_booking_ui" => false,
      "relationship_graph_expanded_by_execution" => false,
      "payment_details_shared_with_peers" => false,
      "authorization_shared_with_peers" => false,
      "moment_visibility_owner" => "RelationshipGraph + SocialMomentVisibility"
    }
  end

  def booking_expands_moment_visibility?, do: false

  def provider_receives_audience?, do: false

  # --- internals ---

  defp do_request_booking(a, auth, idem) do
    with :ok <- BookingAuthorization.valid?(auth, a),
         {:ok, avail} <- maybe_require_fresh_availability(a),
         true <- not payment_stop?(a) || {:error, :payment_authorization_required} do
      scenario = a["scenario"] || Map.get(avail || %{}, "scenario")
      now = DateTime.utc_now() |> DateTime.truncate(:microsecond)
      slot = pick_slot(a, avail)

      # Expired availability must not book
      if availability_expired?(a, avail) do
        {:error, :availability_expired}
      else
        base = %{
          reality_id: a["reality_id"],
          actor_user_id: auth["actor_user_id"] || a["actor_user_id"],
          provider: SyntheticReservationProvider.provider_id(),
          provider_place_id: a["provider_place_id"] || auth["provider_place_id"],
          place_display_name: a["place_display_name"] || auth["place_display_name"],
          authorization_id: auth["authorization_id"],
          idempotency_key: idem,
          status: "requested",
          party_size: parse_int(a["party_size"] || auth["party_size"], 2),
          slot_id: slot["slot_id"] || a["slot_id"] || auth["slot_id"],
          slot_label: slot["label"] || a["slot_label"] || auth["slot_label"],
          slot_starts_at: parse_dt(slot["starts_at"] || a["slot_starts_at"]),
          availability_id: a["availability_id"] || (avail && avail["availability_id"]),
          availability_expires_at: parse_dt(a["availability_expires_at"] || (avail && avail["expires_at"])),
          requested_at: now,
          authorization: auth,
          lineage: lineage_map(a),
          source_moment_id: a["source_moment_id"] || get_in(a, ["lineage", "moment_id"]),
          mode: SyntheticReservationProvider.mode(),
          live_claimed: false,
          payment_status: "not_required",
          shared_safe_summary: "Reservation requested…"
        }

        %ReservationExecutionRecord{}
        |> ReservationExecutionRecord.changeset(base)
        |> Repo.insert()
        |> case do
          {:ok, row} ->
            {:ok, prov} =
              SyntheticReservationProvider.request_reservation(%{
                "provider_place_id" => row.provider_place_id,
                "party_size" => row.party_size,
                "slot_id" => row.slot_id,
                "scenario" => scenario,
                "provider_request_id" => a["provider_request_id"]
              })

            apply_provider_result(row, prov)

          {:error, %{errors: errors} = cs} ->
            if Keyword.has_key?(errors, :idempotency_key) do
              existing = Repo.get_by!(ReservationExecutionRecord, idempotency_key: idem)

              {:ok,
               %{
                 "execution" => ReservationExecutionRecord.public_contract(existing),
                 "idempotent" => true,
                 "origin" => "idempotent_race"
               }}
            else
              {:error, cs}
            end
        end
      end
    else
      {:error, :payment_authorization_required} ->
        {:ok,
         %{
           "status" => "payment_authorization_required",
           "booked" => false,
           "payment_status" => "authorization_required",
           "execution" => nil,
           "live_claimed" => false,
           "human_copy" => "Payment authorization is needed to finish the reservation."
         }}

      {:error, _} = err ->
        err

      false ->
        {:error, :invalid}
    end
  end

  defp apply_provider_result(%ReservationExecutionRecord{} = row, prov) do
    prov = stringify(prov)
    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

    {status, summary, extra} =
      case prov["status"] do
        "confirmed" ->
          {"confirmed", confirmed_summary(row),
           %{
             confirmed_at: parse_dt(prov["confirmed_at"]) || now,
             provider_resource_id: prov["provider_resource_id"],
             provider_response_id: prov["provider_response_id"],
             provider_request_id: prov["provider_request_id"] || row.provider_request_id,
             failure_reason: nil
           }}

        "held" ->
          {"held", "Table held temporarily — not confirmed yet.",
           %{
             provider_resource_id: prov["provider_resource_id"],
             provider_response_id: prov["provider_response_id"],
             provider_request_id: prov["provider_request_id"] || row.provider_request_id,
             expires_at: parse_dt(prov["expires_at"])
           }}

        "unknown" ->
          {"reconciling", "Checking reservation status…",
           %{
             provider_request_id: prov["provider_request_id"] || row.provider_request_id,
             failure_reason: "timeout"
           }}

        "payment_authorization_required" ->
          {"failed", "Payment authorization required.",
           %{
             payment_status: "authorization_required",
             failure_reason: "payment_authorization_required",
             provider_request_id: prov["provider_request_id"]
           }}

        "cancelled" ->
          {"cancelled", "Reservation cancelled.",
           %{
             cancelled_at: parse_dt(prov["cancelled_at"]) || now,
             provider_response_id: prov["provider_response_id"]
           }}

        _ ->
          {"failed", "Reservation didn't go through. Your plan is still intact.",
           %{
             failure_reason: prov["failure_reason"] || "provider_failed",
             provider_request_id: prov["provider_request_id"] || row.provider_request_id,
             provider_response_id: prov["provider_response_id"]
           }}
      end

    changes =
      Map.merge(
        %{
          status: status,
          shared_safe_summary: summary,
          provider_request_id: extra[:provider_request_id] || row.provider_request_id,
          provider_response_id: extra[:provider_response_id],
          provider_resource_id: extra[:provider_resource_id] || row.provider_resource_id,
          confirmed_at: extra[:confirmed_at],
          cancelled_at: extra[:cancelled_at],
          expires_at: extra[:expires_at],
          failure_reason: extra[:failure_reason],
          payment_status: extra[:payment_status] || row.payment_status
        },
        %{}
      )
      |> Enum.reject(fn {_k, v} -> is_nil(v) end)
      |> Map.new()

    row
    |> ReservationExecutionRecord.changeset(changes)
    |> Repo.update()
    |> case do
      {:ok, updated} ->
        attribution =
          if updated.status == "confirmed" do
            attribute_row(updated)
          else
            %{"status" => "none", "is_payout" => false}
          end

        notice = notification_for(ReservationExecutionRecord.public_contract(updated))

        {:ok,
         %{
           "execution" => ReservationExecutionRecord.public_contract(updated),
           "shared_reality" => ReservationExecutionRecord.shared_reality_patch(updated),
           "attribution" => attribution,
           "notification" => notice,
           "idempotent" => false,
           "origin" => "created",
           "live_claimed" => false,
           "booked" => updated.status == "confirmed",
           "privacy" => privacy_invariants()
         }}

      err ->
        err
    end
  end

  defp attribute_row(%ReservationExecutionRecord{} = row) do
    status =
      case row.status do
        "confirmed" -> "completed"
        "cancelled" -> "cancelled"
        other -> other
      end

    lineage = row.lineage || %{}

    chain =
      cond do
        is_list(lineage["causal_chain"]) ->
          lineage["causal_chain"]

        is_binary(row.source_moment_id) ->
          [
            %{
              "moment_id" => row.source_moment_id,
              "author_user_id" => lineage["moment_author_user_id"],
              "hop" => 0,
              "evidence" => %{
                "seeded_reality_from_moment" => true,
                "place_remained_to_transaction" => true
              }
            }
          ]

        true ->
          []
      end

    AttributionGraph.attribute_transaction(%{
      "id" => row.id,
      "status" => status,
      "reality_id" => row.reality_id,
      "place_identity" => row.provider_place_id,
      "provider_entity_id" => row.provider_resource_id,
      "causal_chain" => chain,
      "simulation" => row.mode != "partner_api",
      "opal_recommended" => lineage["opal_recommended"] == true
    })
  end

  defp maybe_require_fresh_availability(a) do
    cond do
      a["skip_availability_check"] == true and is_map(a["availability"]) ->
        {:ok, stringify(a["availability"])}

      is_map(a["availability"]) ->
        avail = stringify(a["availability"])

        if ExternalWorldTruth.fact_fresh?(avail) or
             ExternalWorldTruth.fact_fresh?(%{"expires_at" => avail["expires_at"]}) do
          {:ok, avail}
        else
          # re-check
          check_availability(a)
        end

      true ->
        check_availability(a)
    end
  end

  defp availability_expired?(a, avail) do
    exp = a["availability_expires_at"] || (avail && avail["expires_at"])

    cond do
      is_nil(exp) -> false
      match?(%DateTime{}, exp) -> DateTime.compare(DateTime.utc_now(), exp) == :gt
      is_binary(exp) ->
        case DateTime.from_iso8601(exp) do
          {:ok, dt, _} -> DateTime.compare(DateTime.utc_now(), dt) == :gt
          _ -> false
        end

      true ->
        false
    end
  end

  defp payment_stop?(a) do
    a["scenario"] == "payment_required" or
      String.contains?(to_string(a["provider_place_id"] || ""), "pay")
  end

  defp pick_slot(a, avail) do
    slots = (avail && avail["slots"]) || []
    primary = (avail && avail["primary_slot"]) || List.first(slots) || %{}

    cond do
      is_binary(a["slot_id"]) ->
        Enum.find(slots, primary, fn s -> to_string(s["slot_id"]) == to_string(a["slot_id"]) end) ||
          primary

      true ->
        primary
    end
  end

  defp lineage_map(a) do
    base = if is_map(a["lineage"]), do: stringify(a["lineage"]), else: %{}

    base
    |> Map.put_new("moment_id", a["source_moment_id"])
    |> Map.put_new("reality_id", a["reality_id"])
    |> Enum.reject(fn {_k, v} -> is_nil(v) end)
    |> Map.new()
  end

  defp default_idempotency_key(a, auth) do
    parts = [
      a["reality_id"] || "no-reality",
      a["provider_place_id"] || auth["provider_place_id"] || "place",
      a["slot_id"] || auth["slot_id"] || a["slot_label"] || auth["slot_label"] || "slot",
      auth["authorization_id"] || "auth"
    ]

    "rex-" <> Enum.join(parts, ":")
  end

  defp confirmed_summary(row) do
    place = row.place_display_name || "Reservation"
    slot = row.slot_label || "the time"
    party = row.party_size || 2
    "Reserved #{place} · #{slot} · #{party} #{if party == 1, do: "person", else: "people"}"
  end

  defp fetch(id) do
    case Repo.get(ReservationExecutionRecord, id) do
      nil -> {:error, :not_found}
      row -> {:ok, row}
    end
  end

  defp parse_dt(nil), do: nil
  defp parse_dt(%DateTime{} = d), do: DateTime.truncate(d, :microsecond)

  defp parse_dt(s) when is_binary(s) do
    case DateTime.from_iso8601(s) do
      {:ok, dt, _} -> DateTime.truncate(dt, :microsecond)
      _ -> nil
    end
  end

  defp parse_dt(_), do: nil

  defp parse_int(n, _) when is_integer(n), do: n

  defp parse_int(n, default) when is_binary(n) do
    case Integer.parse(n) do
      {i, _} -> i
      :error -> default
    end
  end

  defp parse_int(_, default), do: default

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
