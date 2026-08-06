defmodule OpalCore.SocialFlow.SocialFlow18OnboardingTest do
  use OpalCore.DataCase, async: true

  alias OpalCore.SocialFlow.Onboarding
  alias OpalCore.SocialFlow.RelationshipInvitation

  @alex "+12025550101"
  @jordan "+12025550102"
  @maya "+12025550103"

  defp verify_new!(phone, name, device, handle) do
    {:ok, started, _} =
      Onboarding.start_verification(%{
        otp_consent_accepted: true,
        identifier_raw: phone,
        purpose: "account_create",
        device_label: device,
        idempotency_key: "vc-sf18-#{handle}-#{System.unique_integer([:positive])}"
      })

    code = started["synthetic_provider_code"]

    {:ok, done, _} =
      Onboarding.complete_verification(%{
        challenge_id: started["id"],
        code: code,
        display_name: name,
        device_label: device,
        handle_hint: handle
      })

    done
  end

  test "selected contact invite creates share token without phone in URL" do
    alex = verify_new!(@alex, "Alex Reed", "AlexPhone", "alex_sf18_a")
    jordan = verify_new!(@jordan, "Jordan Lee", "JordanPhone", "jordan_sf18_a")

    assert {:ok, inv, share, :created} =
             Onboarding.create_invitation(%{
               inviter_user_id: alex.account_id,
               intended_recipient_user_id: jordan.account_id,
               local_display_label: "Jordan",
               invite_source: "selected_contact",
               bounded_message: "Want to try Opal?",
               idempotency_key: "inv-sf18-1"
             })

    assert inv.invite_source == "selected_contact"
    assert is_binary(share["share_token"])
    assert share["no_phone_in_url"] == true
    assert RelationshipInvitation.to_contract(inv)["product_status"] == "waiting_for_them"
    refute String.contains?(share["share_path"] || "", "+1")

    assert {:ok, preview} = Onboarding.preview_share_token(share["share_token"])
    assert preview["requires_acceptance"] == true
    assert preview["inviter_display_name"] == "Alex Reed"
    refute Map.has_key?(preview, "phone")
  end

  test "people summary has no follower counts and lists connections after accept" do
    alex = verify_new!(@alex, "Alex Reed", "AlexPhone", "alex_sf18_b")
    jordan = verify_new!(@jordan, "Jordan Lee", "JordanPhone", "jordan_sf18_b")

    assert {:ok, inv, _share, :created} =
             Onboarding.create_invitation(%{
               inviter_user_id: alex.account_id,
               intended_recipient_user_id: jordan.account_id,
               idempotency_key: "inv-sf18-2"
             })

    assert {:ok, payload, :created} =
             Onboarding.accept_invitation(%{
               invitation_id: inv.id,
               acceptor_user_id: jordan.account_id
             })

    assert payload.first_social_moment["kind"] == "relationship_opened"
    assert payload.first_social_moment["not_a_chatbot"] == true

    people = Onboarding.people_summary(alex.account_id)
    assert people["no_follower_counts"] == true
    assert people["no_public_feed"] == true
    assert people["connected"] != []
  end

  test "enumeration-safe prompts never say uses Opal" do
    alex = verify_new!(@alex, "Alex Reed", "AlexPhone", "alex_sf18_c")

    assert {:ok, res, _} =
             Onboarding.resolve_contact(%{
               requester_user_id: alex.account_id,
               identifier_raw: @maya,
               local_display_label: "Maya",
               idempotency_key: "cr-sf18-1"
             })

    prompt = res["invite_prompt"] || ""
    refute prompt =~ ~r/on Opal/i
    refute prompt =~ ~r/uses Opal/i
    refute prompt =~ ~r/account found/i
  end

  test "product invite outcomes are neutral" do
    assert Onboarding.product_invite_outcome("invite_ready") == "invitation_ready"
    assert Onboarding.product_invite_outcome("already_connected") == "already_connected"
    assert Onboarding.product_invite_outcome("blocked") == "could_not_invite"
  end
end
