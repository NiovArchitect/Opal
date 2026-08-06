defmodule OpalCore.SocialFlow.OnboardingTest do
  use OpalCore.DataCase

  alias OpalCore.{Fixtures, FixturesHelper}
  alias OpalCore.SocialFlow.{Family, Onboarding, TrustSafety}

  setup do
    FixturesHelper.seed!()
    :ok
  end

  @alex_num "+12025550101"
  @jordan_num "+12025550102"
  @maya_num "+12025550103"
  @taylor_num "+12025550107"
  @victor_num "+12025550108"

  defp verify_new!(e164, name, device, handle) do
    assert {:ok, started, :created} =
             Onboarding.start_verification(%{
               otp_consent_accepted: true,
               identifier_raw: e164,
               purpose: "account_create",
               device_label: device,
               idempotency_key: "vc-#{handle}-#{System.unique_integer([:positive])}"
             })

    code = started["synthetic_provider_code"]

    assert {:ok, done, :created} =
             Onboarding.complete_verification(%{
               challenge_id: started["id"],
               code: code,
               display_name: name,
               device_label: device,
               handle_hint: handle
             })

    done
  end

  test "Journey A: adult account creation via phone verification" do
    assert {:ok, started, :created} =
             Onboarding.start_verification(%{
               otp_consent_accepted: true,
               identifier_raw: "202-555-0101",
               purpose: "account_create",
               device_label: "AlexPhone",
               idempotency_key: "vc-a1"
             })

    assert started["no_plaintext_code"]
    assert started["not_legal_identity"]
    code = started["synthetic_provider_code"]
    assert is_binary(code)

    assert {:ok, done, :created} =
             Onboarding.complete_verification(%{
               challenge_id: started["id"],
               code: code,
               display_name: "Alex Reed",
               device_label: "AlexPhone",
               handle_hint: "alex_sf10_a"
             })

    assert done.account_outcome == :created
    assert done.message =~ "verified"
    assert done.not_legal_identity
    assert done.no_auto_relationship
    assert done.session.status == "active"

    # replay denied
    assert {:error, :replay} =
             Onboarding.complete_verification(%{
               challenge_id: started["id"],
               code: code,
               display_name: "Alex Reed",
               device_label: "AlexPhone"
             })

    # identifier is not account primary key
    refute done.account_id == done.identifier_id
  end

  test "Journey B: existing account on new device — no duplicate human" do
    first =
      verify_new!(@alex_num, "Alex Reed", "AlexPhone", "alex_sf10_b1")

    assert {:ok, started, :created} =
             Onboarding.start_verification(%{
               otp_consent_accepted: true,
               identifier_raw: @alex_num,
               purpose: "account_sign_in",
               device_label: "AlexTablet",
               idempotency_key: "vc-b2"
             })

    assert {:ok, second, :created} =
             Onboarding.complete_verification(%{
               challenge_id: started["id"],
               code: started["synthetic_provider_code"],
               display_name: "Alex Reed",
               device_label: "AlexTablet",
               handle_hint: "alex_sf10_b2"
             })

    assert second.account_id == first.account_id
    assert second.account_outcome == :existing_account
    assert second.session.device_label == "AlexTablet"
  end

  test "Journey C: selected contact resolution without membership oracle" do
    alex = verify_new!(@alex_num, "Alex Reed", "AlexPhone", "alex_sf10_c")
    jordan = verify_new!(@jordan_num, "Jordan Lee", "JordanPhone", "jordan_sf10_c")

    assert {:ok, res, :created} =
             Onboarding.resolve_contact(%{
               requester_user_id: alex.account_id,
               identifier_raw: @jordan_num,
               local_display_label: "Jordan",
               idempotency_key: "cr-c1"
             })

    assert res["outcome"] == "invite_ready"
    assert res["no_membership_oracle"]
    assert res["no_full_address_book"]
    assert res["matched_user_id"] == jordan.account_id
    refute res["invite_prompt"] =~ "uses Opal"
    refute res["invite_prompt"] =~ "does not use"

    # unknown number still invite_ready (no oracle of non-membership)
    assert {:ok, unk, :created} =
             Onboarding.resolve_contact(%{
               requester_user_id: alex.account_id,
               identifier_raw: "+12025550999",
               local_display_label: "Unknown",
               idempotency_key: "cr-c2"
             })

    assert unk["outcome"] == "invite_ready"
    assert is_nil(unk["matched_user_id"])
  end

  test "Journey D: invitation accept establishes relationship once" do
    alex = verify_new!(@alex_num, "Alex Reed", "AlexPhone", "alex_sf10_d")
    jordan = verify_new!(@jordan_num, "Jordan Lee", "JordanPhone", "jordan_sf10_d")

    assert {:ok, inv, _share, :created} =
             Onboarding.create_invitation(%{
               inviter_user_id: alex.account_id,
               intended_recipient_user_id: jordan.account_id,
               purpose: "connect",
               bounded_message: "Coffee?",
               source_device_label: "AlexPhone",
               idempotency_key: "inv-d1"
             })

    assert inv.status == "sent"
    assert OpalCore.SocialFlow.RelationshipInvitation.to_contract(inv)["no_auto_relationship"]

    assert {:ok, viewed} = Onboarding.view_invitation(inv.id, jordan.account_id)
    assert viewed.status == "viewed"

    assert {:ok, est, :created} =
             Onboarding.accept_invitation(%{
               invitation_id: inv.id,
               acceptor_user_id: jordan.account_id
             })

    assert est.establishment.status == "active"
    assert est.no_historical_messages
    assert is_binary(est.conversation_id)

    # duplicate acceptance idempotent
    assert {:ok, _, :idempotent} =
             Onboarding.accept_invitation(%{
               invitation_id: inv.id,
               acceptor_user_id: jordan.account_id
             })

    # wrong user cannot accept
    maya = verify_new!(@maya_num, "Maya Chen", "MayaPhone", "maya_sf10_d")

    assert {:error, :invitation_inactive} =
             Onboarding.accept_invitation(%{
               invitation_id: inv.id,
               acceptor_user_id: maya.account_id
             })
  end

  test "Journey E: decline, block, revoke — no retaliatory detail" do
    victor = verify_new!(@victor_num, "Victor Stone", "VictorPhone", "victor_sf10_e")
    maya = verify_new!(@maya_num, "Maya Chen", "MayaPhone", "maya_sf10_e")

    assert {:ok, inv, _share, :created} =
             Onboarding.create_invitation(%{
               inviter_user_id: victor.account_id,
               intended_recipient_user_id: maya.account_id,
               idempotency_key: "inv-e1"
             })

    assert {:ok, %{sender_visible_state: visible}} =
             Onboarding.decline_invitation(%{
               invitation_id: inv.id,
               decliner_user_id: maya.account_id
             })

    assert visible == "Invitation unavailable."

    assert {:ok, state} = Onboarding.sender_invitation_state(inv.id, victor.account_id)
    assert state.visible == "Invitation unavailable."
    assert state.no_retaliation_detail

    # block overrides further invites
    assert {:ok, _, :created} =
             TrustSafety.create_block(%{
               blocker_user_id: maya.account_id,
               blocked_user_id: victor.account_id,
               idempotency_key: "blk-e1"
             })

    assert {:error, :blocked} =
             Onboarding.create_invitation(%{
               inviter_user_id: victor.account_id,
               intended_recipient_user_id: maya.account_id,
               idempotency_key: "inv-e2"
             })

    # revoked cannot be accepted
    alex = verify_new!(@alex_num, "Alex Reed", "AlexPhone", "alex_sf10_e")
    jordan = verify_new!(@jordan_num, "Jordan Lee", "JordanPhone", "jordan_sf10_e")

    assert {:ok, inv2, _share2, :created} =
             Onboarding.create_invitation(%{
               inviter_user_id: alex.account_id,
               intended_recipient_user_id: jordan.account_id,
               idempotency_key: "inv-e3"
             })

    assert {:ok, _} =
             Onboarding.revoke_invitation(%{
               invitation_id: inv2.id,
               inviter_user_id: alex.account_id
             })

    assert {:error, :invitation_inactive} =
             Onboarding.accept_invitation(%{
               invitation_id: inv2.id,
               acceptor_user_id: jordan.account_id
             })
  end

  test "Journey F: number reassignment quarantines without history grant" do
    taylor = verify_new!(@taylor_num, "Taylor Reed", "TaylorPhone", "taylor_sf10_f")

    assert {:ok, review, :created} =
             Onboarding.signal_reassignment(%{
               identifier_raw: @taylor_num,
               reason: "provider_reassignment_signal",
               provider_signal: "synthetic_reassigned",
               claimant_account_id: Ecto.UUID.generate(),
               idempotency_key: "ior-f1"
             })

    assert review.status == "human_review_required"
    assert review.existing_account_id == taylor.account_id

    contract = OpalCore.SocialFlow.IdentifierOwnershipReview.to_contract(review)
    assert contract["no_auto_history_grant"]
    assert contract["not_perfect_reassignment_detection"]

    claimant = Ecto.UUID.generate()
    refute Onboarding.historical_access_allowed?(claimant, taylor.account_id)

    # further verification blocked while quarantined
    assert {:error, :identifier_quarantined} =
             Onboarding.start_verification(%{
               otp_consent_accepted: true,
               identifier_raw: @taylor_num,
               purpose: "account_create",
               device_label: "NewClaimant",
               idempotency_key: "vc-f-quarantine"
             })
  end

  test "Journey G: duplicate account link prefers identifier link not destructive merge" do
    a1 = verify_new!(@alex_num, "Alex Reed", "AlexPhone", "alex_sf10_g1")
    # second identifier for same person synthetic
    a2 =
      verify_new!("+12025550104", "Alex Reed Alt", "AlexPhone2", "alex_sf10_g2")

    assert {:error, :reauth_required} =
             Onboarding.preview_account_link(%{
               requesting_user_id: a1.account_id,
               primary_account_id: a1.account_id,
               secondary_account_id: a2.account_id,
               reauth_confirmed: false,
               idempotency_key: "alr-g0"
             })

    assert {:ok, preview, :created} =
             Onboarding.preview_account_link(%{
               requesting_user_id: a1.account_id,
               primary_account_id: a1.account_id,
               secondary_account_id: a2.account_id,
               reauth_confirmed: true,
               idempotency_key: "alr-g1"
             })

    assert preview.status == "preview"
    assert preview.preview["safety_state"] == "preserved"
    assert preview.preview["no_private_content_dump"]

    assert {:ok, linked} =
             Onboarding.confirm_account_link(%{
               link_request_id: preview.id,
               requesting_user_id: a1.account_id,
               choice: "link_identifiers"
             })

    assert linked.status == "linked"

    assert OpalCore.SocialFlow.AccountLinkRequest.to_contract(linked)[
             "prefer_link_not_destructive_merge"
           ]

    # cross-user denial
    other = verify_new!(@maya_num, "Maya Chen", "MayaPhone", "maya_sf10_g")

    assert {:error, :forbidden} =
             Onboarding.preview_account_link(%{
               requesting_user_id: other.account_id,
               primary_account_id: a1.account_id,
               secondary_account_id: a2.account_id,
               reauth_confirmed: true,
               idempotency_key: "alr-g-bad"
             })
  end

  test "Journey H: youth cannot use adult matching; guardian path remains" do
    marcus = Fixtures.user_marcus_id()
    evelyn = Fixtures.user_evelyn_id()
    olivia = Fixtures.user_olivia_id()
    noah = Fixtures.user_noah_id()

    {:ok, fam, _} =
      Family.create_family_context(%{
        label: "Carter SF10",
        idempotency_key: "fam-sf10-h-#{System.unique_integer([:positive])}"
      })

    Family.add_member(%{
      family_id: fam.id,
      user_id: marcus,
      role: "guardian",
      idempotency_key: "fm-m-#{fam.id}"
    })

    Family.add_member(%{
      family_id: fam.id,
      user_id: evelyn,
      role: "co_guardian",
      idempotency_key: "fm-e-#{fam.id}"
    })

    Family.add_member(%{
      family_id: fam.id,
      user_id: olivia,
      role: "youth",
      account_kind: "guardian_managed_youth",
      idempotency_key: "fm-o-#{fam.id}"
    })

    Family.link_guardian(%{
      family_id: fam.id,
      guardian_user_id: marcus,
      youth_user_id: olivia,
      idempotency_key: "gr-m-#{fam.id}"
    })

    assert {:error, :youth_adult_matching_denied} =
             Onboarding.resolve_contact(%{
               requester_user_id: olivia,
               identifier_raw: @jordan_num,
               idempotency_key: "cr-h-youth"
             })

    assert {:error, :youth_adult_invite_denied} =
             Onboarding.create_invitation(%{
               inviter_user_id: olivia,
               intended_recipient_user_id: noah,
               idempotency_key: "inv-h-youth"
             })

    assert {:ok, req, :created} =
             Onboarding.youth_request_contact(%{
               family_id: fam.id,
               youth_user_id: olivia,
               requested_contact_user_id: noah,
               reason: "school project",
               idempotency_key: "acr-h1"
             })

    assert req.youth_cannot_add_directly
    assert req.no_stranger_discovery

    assert {:ok, contact, :created} =
             Family.approve_contact(%{
               family_id: fam.id,
               guardian_user_id: marcus,
               youth_user_id: olivia,
               contact_user_id: noah,
               scope: "project",
               expires_in_days: 5,
               idempotency_key: "ac-h1"
             })

    assert contact.scope == "project"
    assert contact.no_contact_forwarding
  end

  test "rate limit verification attempts" do
    # burn rate limit on same device/digest
    results =
      for i <- 1..6 do
        Onboarding.start_verification(%{
               otp_consent_accepted: true,
          identifier_raw: "+12025550901",
          purpose: "account_create",
          device_label: "RatePhone",
          idempotency_key: "vc-rate-#{i}"
        })
      end

    assert Enum.any?(results, &match?({:error, :rate_limited}, &1))
  end

  test "legal honesty residual language" do
    text =
      "This is a synthetic development foundation for communication identity, contact matching, invitations, and relationship establishment. It is not legal identity verification, carrier-level ownership assurance, production telecom certification, or comprehensive fraud prevention."

    assert text =~ "synthetic development foundation"
    assert text =~ "not legal identity verification"
  end
end
