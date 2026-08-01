defmodule OpalCore.SocialFlow.ProductReadinessTest do
  use OpalCore.DataCase

  alias OpalCore.{Fixtures, FixturesHelper}
  alias OpalCore.Messaging.ConversationMember
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.{ProductReadiness, ProductShell, TrustSafety}

  setup do
    FixturesHelper.seed!()
    :ok
  end

  defp ensure_members!(conv_id, user_ids) do
    Enum.each(user_ids, fn uid ->
      unless Repo.get_by(ConversationMember, conversation_id: conv_id, user_id: uid) do
        %ConversationMember{}
        |> ConversationMember.changeset(%{conversation_id: conv_id, user_id: uid})
        |> Repo.insert!()
      end
    end)
  end

  test "release identity is internal RC only" do
    id = ProductReadiness.release_identity()
    assert id["semantic_version"] == "0.12.0"
    assert id["not_app_store_approval"]
    assert id["provider_mode"] == "synthetic"
  end

  test "home readiness enforces needs you cap and no scores" do
    alex = Fixtures.user_alex_id()
    ProductShell.seed_journey_b_home!(alex, Fixtures.conv_alex_jordan_id())
    r = ProductReadiness.home_readiness(alex, %{display_name: "Alex"})
    assert r["ok"]
    assert r["needs_you_count"] <= 3
    assert r["issues"] == []
  end

  test "readiness checklist passes for member conversation" do
    alex = Fixtures.user_alex_id()
    jordan = Fixtures.user_jordan_id()
    conv = Fixtures.conv_alex_jordan_id()
    ensure_members!(conv, [alex, jordan])

    checklist = ProductReadiness.readiness_checklist(alex, conv)
    assert checklist["ok"]
    assert checklist["failed_gates"] == []
    assert checklist["ai_fallback"]["messaging_allowed"]
    assert checklist["disclaimer"] =~ "Not App Store"
  end

  test "conversation readiness reflects block" do
    olivia = Fixtures.user_olivia_id()
    noah = Fixtures.user_noah_id()
    conv = Fixtures.conv_family_carter_id()
    ensure_members!(conv, [olivia, noah])

    assert {:ok, _, :created} =
             TrustSafety.create_block(%{
               blocker_user_id: olivia,
               blocked_user_id: noah,
               idempotency_key: "blk-sf12-1"
             })

    r = ProductReadiness.conversation_readiness(olivia, conv)
    assert r["ok"]
    assert r["snap"]["composer_state"]["state"] == "blocked"

    assert {:error, :blocked} =
             ProductReadiness.authorize_object(olivia, "conversation", conv)
  end

  test "outsider conversation denied" do
    alex = Fixtures.user_alex_id()
    conv = Fixtures.conv_maya_chris_id()
    r = ProductReadiness.conversation_readiness(alex, conv)
    refute r["ok"]

    assert Enum.any?(r["issues"], fn issue ->
             String.contains?(issue, "FORBIDDEN") or String.contains?(issue, "DENIED")
           end)
  end

  test "AI unavailability does not block messaging" do
    assert ProductReadiness.messaging_independent_of_ai?()
    fb = ProductReadiness.ai_timeout_fallback()
    assert fb["messaging_allowed"]
    assert fb["navigation_allowed"]
    assert fb["no_deadlock"]
  end

  test "log redaction drops sensitive keys" do
    out =
      ProductReadiness.log_redaction_sample(%{
        "phone" => "+12025550101",
        "event" => "ok",
        "token" => "secret"
      })

    refute Map.has_key?(out, "phone")
    refute Map.has_key?(out, "token")
    assert out["event"] == "ok"
    assert out["redacted"]
  end

  test "performance budgets documented" do
    b = ProductReadiness.performance_budgets()
    assert b["max_needs_you"] == 3
    assert b["max_snapshot_bytes"] > 0
    assert b["note"] =~ "not production SLA"
  end
end
