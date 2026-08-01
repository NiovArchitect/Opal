defmodule OpalCore.SocialFlow.FamilyTest do
  use OpalCore.DataCase

  alias OpalCore.{Fixtures, FixturesHelper}
  alias OpalCore.SocialFlow.Family

  setup do
    FixturesHelper.seed!()
    :ok
  end

  defp carter_family! do
    {:ok, fam, _} =
      Family.create_family_context(%{
        label: "Carter Family",
        idempotency_key: "fam-carter-#{System.unique_integer([:positive])}"
      })

    marcus = Fixtures.user_marcus_id()
    evelyn = Fixtures.user_evelyn_id()
    olivia = Fixtures.user_olivia_id()
    conv = Fixtures.conv_family_carter_id()

    Family.add_member(%{
      family_id: fam.id,
      user_id: marcus,
      role: "guardian",
      display_name: "Marcus",
      idempotency_key: "fm-m-#{fam.id}"
    })

    Family.add_member(%{
      family_id: fam.id,
      user_id: evelyn,
      role: "co_guardian",
      display_name: "Evelyn",
      idempotency_key: "fm-e-#{fam.id}"
    })

    Family.add_member(%{
      family_id: fam.id,
      user_id: olivia,
      role: "youth",
      account_kind: "guardian_managed_youth",
      display_name: "Olivia",
      idempotency_key: "fm-o-#{fam.id}"
    })

    Family.link_guardian(%{
      family_id: fam.id,
      guardian_user_id: marcus,
      youth_user_id: olivia,
      authority_class: "primary",
      idempotency_key: "gr-m-#{fam.id}"
    })

    Family.link_guardian(%{
      family_id: fam.id,
      guardian_user_id: evelyn,
      youth_user_id: olivia,
      authority_class: "co_guardian",
      idempotency_key: "gr-e-#{fam.id}"
    })

    Family.link_conversation(%{
      family_id: fam.id,
      conversation_id: conv,
      idempotency_key: "fc-#{fam.id}"
    })

    %{
      family: fam,
      marcus: marcus,
      evelyn: evelyn,
      olivia: olivia,
      noah: Fixtures.user_noah_id(),
      taylor: Fixtures.user_taylor_id(),
      conv: conv
    }
  end

  test "Journey A: family pickup plan confirm and revision lineage" do
    f = carter_family!()

    assert {:ok, plan, :created} =
             Family.propose_pickup_plan(%{
               family_id: f.family.id,
               conversation_id: f.conv,
               guardian_user_id: f.marcus,
               youth_user_id: f.olivia,
               time_label: "5:00 PM",
               location_label: "main gate",
               shared_copy: "Practice now ends at 5:00 PM. Marcus offered to pick Olivia up.",
               idempotency_key: "pickup-a1"
             })

    assert plan.status == "proposed"
    assert plan.no_precise_location
    assert plan.no_background_tracking

    assert {:ok, confirmed} =
             Family.confirm_pickup(%{plan_id: plan.id, guardian_user_id: f.marcus})

    assert confirmed.status == "confirmed"
    assert confirmed.copy_youth =~ "5:00"
    assert confirmed.copy_guardian =~ "5:00"

    # youth proposes earlier end — current plan stays until guardian approves
    assert {:ok, rev} =
             Family.propose_plan_revision(%{
               plan_id: plan.id,
               proposed_by_user_id: f.olivia,
               changes: %{"time_label" => "4:45 PM"},
               shared_reason: "Practice ending early",
               idempotency_key: "rev-a1"
             })

    assert rev.plan_time_unchanged == "5:00 PM"
    assert rev.requires_guardian_approval

    assert {:ok, updated} =
             Family.approve_plan_revision(%{
               plan_id: plan.id,
               guardian_user_id: f.marcus,
               changes: %{"time_label" => "4:45 PM", "location_label" => "east entrance"}
             })

    assert updated.time_label == "4:45 PM"
    assert updated.location_label == "east entrance"
    assert updated.current_revision >= 2

    assert {:error, :not_family_member} = Family.sync_family(f.taylor, f.family.id)

    assert {:error, :not_guardian} =
             Family.confirm_pickup(%{plan_id: plan.id, guardian_user_id: f.taylor})
  end

  test "Journey B: permission request silence not approval; details required" do
    f = carter_family!()

    assert {:ok, req, :created} =
             Family.create_permission_request(%{
               family_id: f.family.id,
               conversation_id: f.conv,
               youth_user_id: f.olivia,
               summary: "Olivia asked about Noah’s birthday on Saturday.",
               idempotency_key: "perm-b1"
             })

    assert req.status == "pending_review"
    assert req.youth_copy =~ "Waiting"
    assert req.missing_details != []

    assert {:error, {:missing_details, _}} =
             Family.review_permission_request(%{
               request_id: req.id,
               guardian_user_id: f.marcus,
               decision: "approve",
               details: %{}
             })

    assert {:ok, %{request: declined}} =
             Family.review_permission_request(%{
               request_id: req.id,
               guardian_user_id: f.marcus,
               decision: "decline"
             })

    assert declined.status == "declined"
    refute declined.youth_copy =~ "strict"
    refute declined.youth_copy =~ "score"

    # new request with full details
    {:ok, req2, _} =
      Family.create_permission_request(%{
        family_id: f.family.id,
        conversation_id: f.conv,
        youth_user_id: f.olivia,
        summary: "Noah birthday Saturday",
        idempotency_key: "perm-b2"
      })

    assert {:ok, %{plan: plan}} =
             Family.review_permission_request(%{
               request_id: req2.id,
               guardian_user_id: f.marcus,
               decision: "approve",
               details: %{
                 "time" => "Saturday 2:00 PM",
                 "location" => "community center",
                 "supervising_adult" => "Noah's parent",
                 "transportation" => "Marcus drop-off",
                 "approved_contact_status" => "not_yet"
               }
             })

    assert plan.status == "confirmed"
  end

  test "Journey C: approved contact project-scoped; revoke; Taylor denied" do
    f = carter_family!()

    assert {:ok, pend, :created} =
             Family.request_approved_contact(%{
               family_id: f.family.id,
               youth_user_id: f.olivia,
               requested_contact_user_id: f.noah,
               reason: "school project chat",
               idempotency_key: "acr-c1"
             })

    assert pend.youth_cannot_add_directly
    assert pend.no_stranger_discovery

    assert {:ok, contact, :created} =
             Family.approve_contact(%{
               family_id: f.family.id,
               guardian_user_id: f.marcus,
               youth_user_id: f.olivia,
               contact_user_id: f.noah,
               scope: "project",
               expires_in_days: 5,
               idempotency_key: "ac-c1"
             })

    assert contact.status == "active"
    assert contact.no_location_sharing
    assert contact.no_contact_forwarding
    assert Family.contact_active?(f.olivia, f.noah)

    assert {:ok, revoked} =
             Family.revoke_contact(%{contact_id: contact.id, guardian_user_id: f.marcus})

    assert revoked.status == "revoked"
    refute Family.contact_active?(f.olivia, f.noah)

    assert {:error, :not_guardian} =
             Family.approve_contact(%{
               family_id: f.family.id,
               guardian_user_id: f.taylor,
               youth_user_id: f.olivia,
               contact_user_id: f.noah,
               idempotency_key: "ac-bad"
             })
  end

  test "Journey D: device approve/revoke; human identity separate" do
    f = carter_family!()

    assert {:ok, tablet, :created} =
             Family.request_device(%{
               family_id: f.family.id,
               user_id: f.olivia,
               device_label: "OliviaTablet",
               platform: "tablet",
               idempotency_key: "dev-tablet"
             })

    assert tablet.status == "pending"
    assert OpalCore.SocialFlow.ApprovedDevice.to_contract(tablet)["no_cellular_required"]
    assert OpalCore.SocialFlow.ApprovedDevice.to_contract(tablet)["human_identity_separate"]

    assert {:ok, approved} =
             Family.approve_device(%{device_id: tablet.id, guardian_user_id: f.marcus})

    assert approved.status == "approved"
    assert Family.device_session_allowed?(f.olivia, tablet.id)

    {:ok, phone, _} =
      Family.request_device(%{
        family_id: f.family.id,
        user_id: f.olivia,
        device_label: "OliviaPhone",
        platform: "phone",
        idempotency_key: "dev-phone"
      })

    assert phone.status == "pending"
    refute Family.device_session_allowed?(f.olivia, phone.id)

    assert {:ok, revoked} =
             Family.revoke_device(%{device_id: tablet.id, guardian_user_id: f.marcus})

    assert revoked.status == "revoked"
    refute Family.device_session_allowed?(f.olivia, tablet.id)

    # human identity still exists as family member
    assert {:ok, sync} = Family.sync_family(f.olivia, f.family.id)
    assert sync["role"] == "youth"
  end

  test "Journey E: youth private reminder not visible to guardian" do
    f = carter_family!()

    assert {:ok, rem, :created} =
             Family.create_youth_private_reminder(%{
               family_id: f.family.id,
               owner_user_id: f.olivia,
               body: "Remind me to bring my soccer shoes.",
               idempotency_key: "ypr-e1"
             })

    assert rem.visibility == "youth_private"
    assert {:ok, _} = Family.get_youth_reminder(rem.id, f.olivia)
    assert {:error, :forbidden} = Family.get_youth_reminder(rem.id, f.marcus)
    assert {:error, :forbidden} = Family.get_youth_reminder(rem.id, f.taylor)

    {:ok, sync_g} = Family.sync_family(f.marcus, f.family.id)
    assert sync_g["private_reminders"] == []

    {:ok, sync_y} = Family.sync_family(f.olivia, f.family.id)
    assert sync_y["private_reminders"] != []
  end

  test "Journey F: offline reconnect summary after guardian change" do
    f = carter_family!()

    {:ok, plan, _} =
      Family.propose_pickup_plan(%{
        family_id: f.family.id,
        conversation_id: f.conv,
        guardian_user_id: f.marcus,
        youth_user_id: f.olivia,
        time_label: "5:00 PM",
        location_label: "main gate",
        idempotency_key: "pickup-f1"
      })

    Family.confirm_pickup(%{plan_id: plan.id, guardian_user_id: f.marcus})

    # while offline: guardian updates
    assert {:ok, updated} =
             Family.approve_plan_revision(%{
               plan_id: plan.id,
               guardian_user_id: f.marcus,
               changes: %{"time_label" => "4:45 PM", "location_label" => "east entrance"}
             })

    # reconnect view for youth
    {:ok, sync} = Family.sync_family(f.olivia, f.family.id)
    youth_plan = Enum.find(sync["plans"], &(&1["id"] == updated.id))
    assert youth_plan["time_label"] == "4:45 PM"
    assert youth_plan["location_label"] == "east entrance"
    refute youth_plan["copy"] =~ "route"
    assert youth_plan["no_precise_location"]
  end

  test "legal honesty flags on family context" do
    f = carter_family!()
    c = OpalCore.SocialFlow.FamilyContext.to_contract(f.family)
    assert c["not_coppa_certified"]
    assert c["not_production_youth_shipping"]
    assert c["jurisdiction_review_required"]
  end
end
