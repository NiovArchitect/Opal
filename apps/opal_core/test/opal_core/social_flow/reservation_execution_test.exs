defmodule OpalCore.SocialFlow.ReservationExecutionTest do
  use OpalCore.DataCase

  alias OpalCore.Fixtures
  alias OpalCore.FixturesHelper

  alias OpalCore.SocialFlow.{
    BookingAuthorization,
    ExternalWorldTruth,
    RelationshipGraph,
    ReservationExecution,
    SyntheticReservationProvider
  }

  setup do
    FixturesHelper.seed!()
    :ok
  end

  defp actor, do: Fixtures.user_alex_id()
  defp jordan, do: Fixtures.user_jordan_id()

  defp issue_auth!(overrides \\ %{}) do
    base = %{
      "actor_user_id" => actor(),
      "provider_place_id" => "rest-juniper-ivy",
      "place_display_name" => "Juniper & Ivy",
      "party_size" => 2,
      "slot_label" => "Thursday · 7:30 PM",
      "slot_id" => "slot-730",
      "reality_id" => Fixtures.conv_alex_jordan_id(),
      "explicit_confirm" => true
    }

    {:ok, auth} = BookingAuthorization.issue(Map.merge(base, overrides))
    auth
  end

  describe "capability honesty" do
    test "live execution not claimed" do
      s = ReservationExecution.status()
      assert s["live_execution"] == "NOT_CLAIMED" or s["live_claimed"] == false
      assert SyntheticReservationProvider.live_claimed?() == false
      assert s["avp2"] == "payments_only_not_booking"
      assert "390_audience_selector_ux_incomplete" in s["pass18_holds"]
      assert "realtime_pubsub_audience_routing_audit" in s["pass18_holds"]
    end
  end

  describe "availability is provider fact" do
    test "available slots carry freshness and provenance" do
      assert {:ok, avail} =
               ReservationExecution.check_availability(%{
                 "provider_place_id" => "rest-juniper-ivy",
                 "party_size" => 2,
                 "slot_label" => "7:30 PM",
                 "place_display_name" => "Juniper & Ivy"
               })

      assert avail["available"] == true
      assert avail["truth_class"] == "provider_fact"
      assert avail["authorizes_booking"] == false
      assert avail["booked"] == false
      assert is_binary(avail["availability_id"])
      assert match?(%DateTime{}, avail["expires_at"])
      assert avail["live_claimed"] == false
      assert ExternalWorldTruth.fact_fresh?(avail["envelope"])
    end

    test "unavailable place" do
      assert {:ok, avail} =
               ReservationExecution.check_availability(%{
                 "provider_place_id" => "rest-full-unavailable",
                 "party_size" => 4,
                 "slot_label" => "7:30 PM"
               })

      assert avail["available"] == false
      assert avail["status"] == "unavailable"
      assert avail["slots"] == []
    end

    test "does not infer from hours/ratings alone — needs provider_place_id" do
      assert {:error, :provider_place_id_required} =
               ReservationExecution.check_availability(%{"party_size" => 2})
    end
  end

  describe "authorization" do
    test "alignment alone is not enough — explicit confirm required" do
      assert {:error, :explicit_confirm_required} =
               BookingAuthorization.issue(%{
                 "actor_user_id" => actor(),
                 "provider_place_id" => "x",
                 "place_display_name" => "Juniper & Ivy",
                 "party_size" => 2
               })
    end

    test "human copy is concrete" do
      auth = issue_auth!()
      assert auth["proof"]["copy"] =~ "Juniper"
      assert auth["proof"]["copy"] =~ "7:30"
      assert auth["authorizes_payment"] == false
      assert auth["avp2"] == false
    end

    test "revoked authorization cannot book" do
      auth = issue_auth!() |> BookingAuthorization.revoke()

      assert {:error, :authorization_revoked} =
               ReservationExecution.request_booking(%{
                 "authorization" => auth,
                 "provider_place_id" => "rest-juniper-ivy",
                 "party_size" => 2,
                 "slot_id" => "slot-730",
                 "idempotency_key" => "rex-revoked-1"
               })
    end
  end

  describe "happy path confirmation" do
    test "availability → authorize → confirm" do
      {:ok, avail} =
        ReservationExecution.check_availability(%{
          "provider_place_id" => "rest-juniper-ivy",
          "party_size" => 2,
          "slot_label" => "Thursday · 7:30 PM"
        })

      auth = issue_auth!(%{"slot_id" => hd(avail["slots"])["slot_id"]})

      assert {:ok, result} =
               ReservationExecution.request_booking(%{
                 "authorization" => auth,
                 "provider_place_id" => "rest-juniper-ivy",
                 "place_display_name" => "Juniper & Ivy",
                 "party_size" => 2,
                 "slot_id" => auth["slot_id"],
                 "slot_label" => "Thursday · 7:30 PM",
                 "availability" => avail,
                 "reality_id" => Fixtures.conv_alex_jordan_id(),
                 "idempotency_key" => "rex-happy-1",
                 "source_moment_id" => Ecto.UUID.generate(),
                 "lineage" => %{
                   "moment_author_user_id" => jordan(),
                   "causal_chain" => [
                     %{
                       "moment_id" => "m1",
                       "author_user_id" => jordan(),
                       "hop" => 0,
                       "evidence" => %{
                         "seeded_reality_from_moment" => true,
                         "place_remained_to_transaction" => true
                       }
                     }
                   ]
                 }
               })

      exec = result["execution"]
      assert exec["status"] == "confirmed"
      assert exec["booked"] == true
      assert exec["live_claimed"] == false
      assert result["shared_reality"]["booked"] == true
      assert result["shared_reality"]["reservation"]["confirmed"] == true
      refute Map.has_key?(result["shared_reality"]["reservation"], "authorization")
      assert result["attribution"]["is_payout"] == false
      assert result["attribution"]["status"] == "attributed"
      assert result["notification"]["should_notify"] == true
      assert result["notification"]["human_consequence"] =~ "confirmed"
      assert result["privacy"]["booking_expands_moment_visibility"] == false
    end
  end

  describe "idempotency double-book guard" do
    test "double confirm same key returns same execution" do
      auth = issue_auth!()

      attrs = %{
        "authorization" => auth,
        "provider_place_id" => "rest-juniper-ivy",
        "place_display_name" => "Juniper & Ivy",
        "party_size" => 2,
        "slot_id" => "slot-730",
        "slot_label" => "Thursday · 7:30 PM",
        "idempotency_key" => "rex-idem-42",
        "reality_id" => Fixtures.conv_alex_jordan_id()
      }

      assert {:ok, r1} = ReservationExecution.request_booking(attrs)
      assert {:ok, r2} = ReservationExecution.request_booking(attrs)
      assert r1["execution"]["execution_id"] == r2["execution"]["execution_id"]
      assert r2["idempotent"] == true
    end
  end

  describe "failure preserves plan" do
    test "provider fail does not restart" do
      auth =
        issue_auth!(%{
          "provider_place_id" => "rest-fail-slot",
          "place_display_name" => "Juniper & Ivy"
        })

      assert {:ok, result} =
               ReservationExecution.request_booking(%{
                 "authorization" => auth,
                 "provider_place_id" => "rest-fail-slot",
                 "place_display_name" => "Juniper & Ivy",
                 "party_size" => 2,
                 "slot_id" => "slot-730",
                 "scenario" => "fail",
                 "idempotency_key" => "rex-fail-1",
                 "reality_id" => Fixtures.conv_alex_jordan_id()
               })

      assert result["execution"]["status"] == "failed"
      assert result["execution"]["booked"] == false

      recovered =
        ReservationExecution.recover_plan(
          %{
            "what" => "dinner",
            "when" => "Thursday 7:30",
            "where" => "Juniper & Ivy",
            "place_display_name" => "Juniper & Ivy"
          },
          result["execution"]
        )

      assert recovered["restart_required"] == false or recovered["reality"]["restart_required"] == false
      assert recovered["preserved"]["who"] == true
      assert recovered["preserved"]["what"] == true
      assert recovered["preserved"]["when"] == true
      assert recovered["auto_changed_when"] == false
      assert recovered["human_copy"] =~ "still intact"
    end
  end

  describe "expired availability" do
    test "stale slot rejected" do
      auth = issue_auth!()
      past = DateTime.add(DateTime.utc_now(), -600, :second)

      assert {:error, :availability_expired} =
               ReservationExecution.request_booking(%{
                 "authorization" => auth,
                 "provider_place_id" => "rest-juniper-ivy",
                 "party_size" => 2,
                 "slot_id" => "slot-730",
                 "availability" => %{
                   "available" => true,
                   "expires_at" => past,
                   "availability_id" => "stale",
                   "slots" => [%{"slot_id" => "slot-730", "label" => "7:30 PM"}]
                 },
                 "skip_availability_check" => true,
                 "availability_expires_at" => past,
                 "idempotency_key" => "rex-stale-1"
               })
    end
  end

  describe "timeout and reconcile" do
    test "timeout → reconciling → reconcile confirmed" do
      auth =
        issue_auth!(%{
          "provider_place_id" => "rest-timeout-place",
          "place_display_name" => "Harbor Table"
        })

      assert {:ok, result} =
               ReservationExecution.request_booking(%{
                 "authorization" => auth,
                 "provider_place_id" => "rest-timeout-place",
                 "place_display_name" => "Harbor Table",
                 "party_size" => 2,
                 "slot_id" => "slot-730",
                 "scenario" => "timeout",
                 "idempotency_key" => "rex-timeout-1",
                 "reality_id" => Fixtures.conv_alex_jordan_id()
               })

      id = result["execution"]["execution_id"]
      assert result["execution"]["status"] == "reconciling"
      assert result["execution"]["booked"] == false

      assert {:ok, rec} = ReservationExecution.reconcile(id, force_status: "confirmed")
      assert rec["execution"]["status"] == "confirmed"
      assert rec["execution"]["booked"] == true
    end
  end

  describe "hold vs confirmed" do
    test "held is not reserved" do
      auth =
        issue_auth!(%{
          "provider_place_id" => "rest-hold-table",
          "place_display_name" => "Green Lantern"
        })

      assert {:ok, result} =
               ReservationExecution.request_booking(%{
                 "authorization" => auth,
                 "provider_place_id" => "rest-hold-table",
                 "place_display_name" => "Green Lantern",
                 "party_size" => 2,
                 "slot_id" => "slot-730",
                 "scenario" => "hold",
                 "idempotency_key" => "rex-hold-1"
               })

      assert result["execution"]["status"] == "held"
      assert result["execution"]["booked"] == false
      refute result["shared_reality"]["reservation"]["confirmed"]
    end
  end

  describe "cancellation" do
    test "confirmed can cancel" do
      auth = issue_auth!()

      assert {:ok, result} =
               ReservationExecution.request_booking(%{
                 "authorization" => auth,
                 "provider_place_id" => "rest-juniper-ivy",
                 "place_display_name" => "Juniper & Ivy",
                 "party_size" => 2,
                 "slot_id" => "slot-730",
                 "idempotency_key" => "rex-cancel-1"
               })

      id = result["execution"]["execution_id"]
      assert {:ok, cancelled} = ReservationExecution.cancel(id, actor())
      assert cancelled["execution"]["status"] == "cancelled"
      assert cancelled["attribution_invalidated_for_payout"] == true
      assert cancelled["is_payout"] == false
    end
  end

  describe "payment gate" do
    test "payment_required stops without charging" do
      auth =
        issue_auth!(%{
          "provider_place_id" => "rest-pay-deposit",
          "place_display_name" => "Deposit Bistro"
        })

      assert {:ok, result} =
               ReservationExecution.request_booking(%{
                 "authorization" => auth,
                 "provider_place_id" => "rest-pay-deposit",
                 "party_size" => 2,
                 "slot_id" => "slot-730",
                 "scenario" => "payment_required",
                 "idempotency_key" => "rex-pay-1"
               })

      assert result["status"] == "payment_authorization_required"
      assert result["booked"] == false
      assert result["payment_status"] == "authorization_required"
    end
  end

  describe "personal and group" do
    test "one-person reservation works" do
      auth = issue_auth!(%{"party_size" => 1, "slot_label" => "Tonight · 6:00 PM"})

      assert {:ok, result} =
               ReservationExecution.request_booking(%{
                 "authorization" => auth,
                 "provider_place_id" => "rest-juniper-ivy",
                 "place_display_name" => "Juniper & Ivy",
                 "party_size" => 1,
                 "slot_id" => "slot-730",
                 "slot_label" => "Tonight · 6:00 PM",
                 "idempotency_key" => "rex-solo-1"
               })

      assert result["execution"]["status"] == "confirmed"
      assert result["execution"]["party_size"] == 1
    end

    test "group booking actor is sole authorizer" do
      auth = issue_auth!(%{"party_size" => 6})

      assert {:ok, result} =
               ReservationExecution.request_booking(%{
                 "authorization" => auth,
                 "provider_place_id" => "rest-juniper-ivy",
                 "place_display_name" => "Juniper & Ivy",
                 "party_size" => 6,
                 "slot_id" => "slot-730",
                 "idempotency_key" => "rex-group-1",
                 "reality_id" => Fixtures.conv_group_friends_id()
               })

      assert result["execution"]["status"] == "confirmed"
      assert result["shared_reality"]["reservation"]["booked_by_user_id"] == actor()
      assert result["execution"]["party_size"] == 6
    end
  end

  describe "privacy and social trust non-regression" do
    test "booking does not expand moment visibility" do
      assert ReservationExecution.booking_expands_moment_visibility?() == false
      assert ReservationExecution.provider_receives_audience?() == false
      # Pass 18 still holds
      refute RelationshipGraph.inference_expands_audience?()
      refute RelationshipGraph.attribution_expands_visibility?()
    end
  end

  describe "notifications quiet on intermediate" do
    test "checking is silent" do
      n = ReservationExecution.notification_for(%{"status" => "checking"})
      assert n["should_notify"] == false
      assert n["class"] == "silent"
    end
  end

  describe "chronology distinction" do
    test "social place choice is not confirmation" do
      fit =
        ExternalWorldTruth.social_fit_from_collective(%{
          "id" => "rest-juniper-ivy",
          "name" => "Juniper & Ivy"
        })

      assert fit["booked"] == false
      assert fit["execution_state"] == "unverified"
      assert :ok = ExternalWorldTruth.assert_social_fit_boundaries!(fit)
    end
  end
end
