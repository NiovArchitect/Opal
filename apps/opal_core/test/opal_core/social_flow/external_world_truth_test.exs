defmodule OpalCore.SocialFlow.ExternalWorldTruthTest do
  use ExUnit.Case, async: true

  alias OpalCore.SocialFlow.ExternalWorldTruth
  alias OpalCore.SocialFlow.RealWorld.Booking.ProviderBoundary

  test "social fit never authorizes set booking or payment" do
    fit =
      ExternalWorldTruth.social_fit_from_collective(%{
        "id" => "juniper_ivy",
        "display_name" => "Juniper & Ivy"
      })

    assert fit["truth_class"] == "social_fit"
    assert fit["provider_status"] == "unknown"
    assert fit["booked"] == false
    assert fit["authorizes_set"] == false
    assert fit["authorizes_booking"] == false
    assert fit["authorizes_payment"] == false
    assert :ok = ExternalWorldTruth.assert_social_fit_boundaries!(fit)
  end

  test "overclaims_provider catches false booked language" do
    assert ExternalWorldTruth.overclaims_provider?("Table is reserved for Saturday")
    refute ExternalWorldTruth.overclaims_provider?("Juniper looks like a good fit")
  end

  test "provider fact requires provenance" do
    assert_raise RuntimeError, ~r/EXTERNAL_TRUTH/, fn ->
      ExternalWorldTruth.assert_provider_provenance!(%{"kind" => "venue_open"})
    end

    fact = ExternalWorldTruth.fixture_provider_fact(%{"id" => "juniper_ivy"})
    assert :ok = ExternalWorldTruth.assert_provider_provenance!(fact)
    assert fact["provenance"]["synthetic"] == true
    assert fact["not_social_authority"] == true
  end

  test "llm source is not accepted as provider" do
    refute ExternalWorldTruth.llm_is_not_provider?("openai")
    assert ExternalWorldTruth.llm_is_not_provider?("fixture_catalog")
    assert ExternalWorldTruth.llm_is_not_provider?("opentable")
  end

  test "booking from social rank alone is rejected" do
    assert {:error, :social_fit_is_not_booking} =
             ExternalWorldTruth.may_request_booking?(
               %{"state" => "hold_available", "from_social_rank_only" => true},
               user_authorized: true
             )
  end

  test "booking requires user authorization" do
    {:ok, inq} = ProviderBoundary.inquire(%{"venue_id" => "v1", "party_size" => 6})
    {:ok, checked} = ProviderBoundary.check_availability(inq, [%{"id" => "s1"}])

    assert {:error, :user_authorization_required} =
             ExternalWorldTruth.may_request_booking?(checked)

    assert {:ok, _} =
             ExternalWorldTruth.may_request_booking?(checked, user_authorized: true)
  end

  test "provider failure preserves social dimensions" do
    reality = %{
      "what" => "Dinner",
      "when" => "Saturday · 7:30",
      "where" => nil,
      "next_gap" => "place"
    }

    after_fail =
      ExternalWorldTruth.recompose_after_provider_failure(reality, %{
        "state" => "failed",
        "scope" => "provider"
      })

    assert after_fail["what"] == "Dinner"
    assert after_fail["when"] == "Saturday · 7:30"
    assert after_fail["booked"] == false
    assert after_fail["authorizes_set"] == false
    assert after_fail["provider_status"] == "failed"
  end

  test "classify_claim separates three truth classes" do
    assert {:ok, sf} =
             ExternalWorldTruth.classify_claim(%{
               "truth_class" => "social_fit",
               "venue_id" => "x"
             })

    assert sf["authorizes_booking"] == false

    assert {:ok, pf} =
             ExternalWorldTruth.classify_claim(%{
               "truth_class" => "provider_fact",
               "source" => "provider_availability",
               "provenance" => %{"source" => "opentable", "observed_at" => DateTime.utc_now()}
             })

    assert pf["truth_class"] == "provider_fact"
    assert pf["authorizes_set"] == false
  end
end
