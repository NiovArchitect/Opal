defmodule OpalCore.SocialFlow.AmbientChaosNetworkTest do
  use ExUnit.Case, async: true

  alias OpalCore.SocialFlow.Ambient.{
    BookingBridge,
    ChaosHarness,
    NetworkOpening
  }

  test "all 12 golden chaos journeys pass" do
    report = ChaosHarness.run_all()
    assert report["synthetic"]
    assert report["all_pass"], "failed: #{inspect(report["failed"])}"
    assert report["passed"] == 12
  end

  test "payment and expiry smokes" do
    assert ChaosHarness.payment_smoke()["pass"]
    assert ChaosHarness.expiry_smoke()["pass"]
  end

  test "network opening from selected contacts only — no address book dump" do
    assert {:ok, n} =
             NetworkOpening.from_selected_contacts(%{
               owner_user_id: "owner-1",
               selected_contacts: [
                 %{e164: "+15551234567", display_hint: "Alex"},
                 %{e164: "+15559876543", display_hint: "Sam"}
               ],
               matched_user_ids: ["u2"],
               nearby_matched_ids: ["u2"],
               overlapping_windows: true,
               preference_fit: 0.7,
               relationship_context: "friends"
             })

    assert n["full_address_book_uploaded"] == false
    assert n["raw_contacts_stored"] == false
    assert n["scanned_identities_exposed"] == false
    refute n["heat_map_ui"]
    assert n["network_heat"] > 0.0
  end

  test "network invite only when heat strong" do
    assert {:ok, weak} =
             NetworkOpening.invite_for_opening(%{
               owner_user_id: "o",
               conversation_id: "c",
               network_heat: 0.1
             })

    assert weak["invite"] == false
    refute weak["spam_invite"]

    assert {:ok, strong} =
             NetworkOpening.invite_for_opening(%{
               owner_user_id: "o",
               conversation_id: "c",
               network_heat: 0.8,
               shared_safe_summary: "Tonight could work."
             })

    assert strong["copy_class"] == "contextual"
    refute strong["spam_invite"]
  end

  test "booking bridge: set survives provider empty slots" do
    assert {:ok, r} =
             BookingBridge.check_for_set(%{
               set: true,
               venue_id: "harbor_table",
               conversation_id: "conv-1",
               slots: [],
               slot_label: "7:30"
             })

    assert r["social_truth_intact"]
    refute r["execution"]["execution_ready"]
    refute r["booked"]
    refute r["authorizes_set"]
  end

  test "booking bridge: open slot becomes execution-ready" do
    assert {:ok, r} =
             BookingBridge.check_for_set(%{
               set: true,
               venue_id: "harbor_table",
               conversation_id: "conv-1",
               slots: [%{"id" => "s1", "label" => "7:30"}],
               slot_label: "7:30"
             })

    assert r["may_prompt_book"]
    assert r["execution"]["execution_ready"]
    refute r["booked"]
    assert r["provider_is_not_authority"]
  end

  test "payment gate never auto-charges" do
    assert {:ok, g} =
             BookingBridge.payment_then_book_gate(%{
               participant_ids: ["a", "b"],
               venue_id: "rooftop",
               price_each: 28,
               all_agreed: true
             })

    assert g["payment"]["payment_prompt_ok"]
    refute g["authorizes_charge"]
    refute g["booked"]
  end

  test "rejects full address book path without selected contacts" do
    assert {:error, :contacts_required} =
             NetworkOpening.from_selected_contacts(%{
               owner_user_id: "o",
               selected_contacts: []
             })
  end
end
