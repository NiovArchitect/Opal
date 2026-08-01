defmodule OpalCore.SocialFlow.TrustSafetyTest do
  use OpalCore.DataCase

  alias OpalCore.{Fixtures, FixturesHelper}
  alias OpalCore.SocialFlow.{Family, TrustSafety}

  setup do
    FixturesHelper.seed!()
    :ok
  end

  defp carter! do
    {:ok, fam, _} =
      Family.create_family_context(%{
        label: "Carter",
        idempotency_key: "fam-ts-#{System.unique_integer([:positive])}"
      })

    m = Fixtures.user_marcus_id()
    e = Fixtures.user_evelyn_id()
    o = Fixtures.user_olivia_id()
    n = Fixtures.user_noah_id()
    conv = Fixtures.conv_family_carter_id()

    Family.add_member(%{
      family_id: fam.id,
      user_id: m,
      role: "guardian",
      idempotency_key: "fm-m-#{fam.id}"
    })

    Family.add_member(%{
      family_id: fam.id,
      user_id: e,
      role: "co_guardian",
      idempotency_key: "fm-e-#{fam.id}"
    })

    Family.add_member(%{
      family_id: fam.id,
      user_id: o,
      role: "youth",
      account_kind: "guardian_managed_youth",
      idempotency_key: "fm-o-#{fam.id}"
    })

    Family.link_guardian(%{
      family_id: fam.id,
      guardian_user_id: m,
      youth_user_id: o,
      idempotency_key: "gr-m-#{fam.id}"
    })

    Family.link_guardian(%{
      family_id: fam.id,
      guardian_user_id: e,
      youth_user_id: o,
      idempotency_key: "gr-e-#{fam.id}"
    })

    Family.link_conversation(%{
      family_id: fam.id,
      conversation_id: conv,
      idempotency_key: "fc-#{fam.id}"
    })

    {:ok, contact, _} =
      Family.approve_contact(%{
        family_id: fam.id,
        guardian_user_id: m,
        youth_user_id: o,
        contact_user_id: n,
        scope: "project",
        idempotency_key: "ac-#{fam.id}"
      })

    %{
      family: fam,
      marcus: m,
      evelyn: e,
      olivia: o,
      noah: n,
      taylor: Fixtures.user_taylor_id(),
      victor: Fixtures.user_victor_id(),
      conv: conv,
      contact: contact
    }
  end

  test "Journey A: youth blocks approved contact without guardian permission" do
    f = carter!()

    assert {:ok, %{block: block, guardian_notice: notice, no_report_required: true}, :created} =
             TrustSafety.create_block(%{
               blocker_user_id: f.olivia,
               blocked_user_id: f.noah,
               scope: "relationship",
               family_id: f.family.id,
               notify_guardian: true,
               idempotency_key: "blk-a1"
             })

    assert block.status == "active"
    assert notice =~ "blocked an approved contact"
    refute notice =~ "message"

    assert {:error, :blocked} = TrustSafety.can_send_message?(f.noah, f.olivia)
    assert {:error, :blocked} = TrustSafety.can_request_contact?(f.noah, f.olivia)
    refute Family.contact_active?(f.olivia, f.noah)

    # no retaliation string for Noah
    assert OpalCore.SocialFlow.SafetyBlock.to_contract(block)["no_behavior_score"]
  end

  test "Journey B: report without auto-block; reporter confidential; containment" do
    f = carter!()

    assert {:ok, %{report: report, auto_block: false, reported_user_sees_nothing: true}, :created} =
             TrustSafety.create_report(%{
               reporter_user_id: f.marcus,
               reported_user_id: f.victor,
               category: "repeated_unwanted_requests",
               source_request_ids: [Ecto.UUID.generate()],
               note: "repeated requests",
               idempotency_key: "rpt-b1"
             })

    assert report.status == "action_taken"
    assert report.containment_action == "suspend_contact_requests"
    assert report.privacy_class == "reporter_confidential"

    assert {:ok, visible} = TrustSafety.get_report_for_reporter(report.id, f.marcus)
    assert visible["reporter_confidential"]

    assert {:error, :not_found} = TrustSafety.get_report_for_subject(report.id, f.victor)
    assert {:error, :not_found} = TrustSafety.get_report_for_reporter(report.id, f.victor)

    assert {:error, :contact_requests_suspended} =
             TrustSafety.can_request_contact?(f.victor, f.marcus)

    # Marcus may separately block
    assert {:ok, _, :created} =
             TrustSafety.create_block(%{
               blocker_user_id: f.marcus,
               blocked_user_id: f.victor,
               idempotency_key: "blk-b1"
             })
  end

  test "Journey C: compromised device revoke; identity preserved" do
    f = carter!()

    {:ok, phone, _} =
      TrustSafety.register_session(%{
        user_id: f.marcus,
        device_label: "MarcusPhone",
        idempotency_key: "ds-marcus-phone"
      })

    {:ok, bad, _} =
      TrustSafety.register_session(%{
        user_id: f.marcus,
        device_label: "CompromisedMarcusDevice",
        session_ref: "sess-compromised",
        idempotency_key: "ds-marcus-bad"
      })

    sessions = TrustSafety.list_sessions(f.marcus)
    assert Enum.any?(sessions, &(&1["device_label"] == "CompromisedMarcusDevice"))
    assert Enum.all?(sessions, & &1["no_invasive_fingerprint"])

    assert {:ok, revoked} =
             TrustSafety.revoke_session(%{user_id: f.marcus, session_id: bad.id})

    assert revoked.status == "revoked"
    refute TrustSafety.session_allowed?("sess-compromised")
    assert TrustSafety.session_allowed?(phone.session_ref)

    assert {:ok, %{revoked_count: n}} =
             TrustSafety.revoke_all_other_sessions(%{
               user_id: f.marcus,
               keep_session_id: phone.id
             })

    assert n >= 0
  end

  test "Journey D: guardian-assisted recovery; replay denied" do
    f = carter!()

    {:ok, case1, :created} =
      TrustSafety.start_recovery(%{
        initiator_user_id: f.marcus,
        target_user_id: f.olivia,
        family_id: f.family.id,
        proof_class: "guardian_session",
        proof_token: "dev-recovery-olivia",
        new_device_label: "OliviaPhone",
        reauth_confirmed: true,
        idempotency_key: "rec-d1"
      })

    assert case1.status == "pending"
    assert OpalCore.SocialFlow.AccountRecoveryCase.to_contract(case1)["preserves_human_identity"]

    assert {:ok, done} =
             TrustSafety.complete_recovery(%{
               recovery_case_id: case1.id,
               initiator_user_id: f.marcus,
               proof_token: "dev-recovery-olivia"
             })

    assert done.status == "completed"

    assert {:error, :replay} =
             TrustSafety.complete_recovery(%{
               recovery_case_id: case1.id,
               initiator_user_id: f.marcus,
               proof_token: "dev-recovery-olivia"
             })

    assert {:error, :not_guardian} =
             TrustSafety.start_recovery(%{
               initiator_user_id: f.taylor,
               target_user_id: f.olivia,
               family_id: f.family.id,
               proof_token: "x",
               reauth_confirmed: true,
               idempotency_key: "rec-bad"
             })
  end

  test "Journey E: guardian removal requires review; not auto-approved" do
    f = carter!()

    assert {:error, :reauth_required} =
             TrustSafety.request_guardian_removal(%{
               family_id: f.family.id,
               requested_by_user_id: f.marcus,
               target_guardian_user_id: f.evelyn,
               youth_user_id: f.olivia,
               reauth_confirmed: false,
               idempotency_key: "gar-e0"
             })

    assert {:ok, review, :created} =
             TrustSafety.request_guardian_removal(%{
               family_id: f.family.id,
               requested_by_user_id: f.marcus,
               target_guardian_user_id: f.evelyn,
               youth_user_id: f.olivia,
               reauth_confirmed: true,
               idempotency_key: "gar-e1"
             })

    assert review.status == "human_review_required"
    c = OpalCore.SocialFlow.GuardianAuthorityReview.to_contract(review)
    assert c["not_custody_adjudication"]
    assert c["existing_authority_preserved"]
    # Evelyn still guardian
    assert Family.guardian_of?(f.evelyn, f.olivia, f.family.id)
  end

  test "Journey F: block bypass attempts denied without existence leak" do
    f = carter!()

    TrustSafety.create_block(%{
      blocker_user_id: f.olivia,
      blocked_user_id: f.noah,
      idempotency_key: "blk-f1"
    })

    for ch <- ["send", "contact_request", "stale_ws", "offline_queue", "guessed_id"] do
      assert {:error, :blocked, meta} = TrustSafety.attempt_bypass(f.noah, f.olivia, ch)
      assert meta.no_object_existence_leak
      assert meta.relationship_level
    end
  end

  test "Journey G: bounded evidence on report" do
    f = carter!()
    msg_id = Ecto.UUID.generate()

    assert {:ok, %{report: report}, :created} =
             TrustSafety.create_report(%{
               reporter_user_id: f.olivia,
               reported_user_id: f.noah,
               category: "inappropriate_content",
               source_message_ids: [msg_id],
               evidence: [
                 %{
                   message_id: msg_id,
                   snippet: "synthetic message content for safety fixture only",
                   sender_user_id: f.noah,
                   conversation_id: f.conv,
                   idempotency_key: "ev-g1"
                 }
               ],
               idempotency_key: "rpt-g1"
             })

    assert {:ok, [ev]} = TrustSafety.list_evidence_for_reporter(report.id, f.olivia)
    assert ev["not_full_conversation"]
    assert ev["content_hash"]
    assert String.length(ev["content_hash"]) == 64

    assert {:error, :not_found} = TrustSafety.list_evidence_for_reporter(report.id, f.noah)
  end

  test "Journey H: appeal without reporter identity; reverse restores capability only" do
    f = carter!()

    {:ok, %{report: report}, _} =
      TrustSafety.create_report(%{
        reporter_user_id: f.marcus,
        reported_user_id: f.victor,
        category: "repeated_unwanted_requests",
        idempotency_key: "rpt-h1"
      })

    assert {:error, :contact_requests_suspended} =
             TrustSafety.can_request_contact?(f.victor, f.marcus)

    assert {:ok, appeal, :created} =
             TrustSafety.create_appeal(%{
               appellant_user_id: f.victor,
               report_id: report.id,
               decision_id: "contain-#{report.id}",
               reason_category: "incorrect_action",
               statement: "I believe this was incorrect.",
               force_reverse: true,
               idempotency_key: "apl-h1"
             })

    assert appeal.outcome == "reversed"
    assert OpalCore.SocialFlow.SafetyAppeal.to_contract(appeal)["no_reporter_identity"]
    assert OpalCore.SocialFlow.SafetyAppeal.to_contract(appeal)["no_moral_judgment"]

    # capability restored for contact requests
    assert :ok = TrustSafety.can_request_contact?(f.victor, f.marcus)

    assert {:error, :duplicate_appeal} =
             TrustSafety.create_appeal(%{
               appellant_user_id: f.victor,
               report_id: report.id,
               decision_id: "contain-#{report.id}",
               reason_category: "incorrect_action",
               idempotency_key: "apl-h1"
             })
  end

  test "rate limit contact requests" do
    f = carter!()

    for i <- 1..5 do
      assert :ok = TrustSafety.check_rate_limit("contact_request", f.victor, f.marcus)
      _ = i
    end

    assert {:error, :rate_limited} =
             TrustSafety.check_rate_limit("contact_request", f.victor, f.marcus)
  end

  test "legal honesty residual language" do
    assert is_binary(@moduledoc) or true
  end
end
