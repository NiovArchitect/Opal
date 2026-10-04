defmodule OpalCore.ConsentActOnBehalfTest do
  use OpalCore.DataCase, async: false

  alias OpalCore.Accounts.User
  alias OpalCore.Calls
  alias OpalCore.Consent
  alias OpalCore.Messaging.{Conversation, ConversationMember, Message}
  alias OpalCore.Repo

  alias OpalCore.SocialFlow.{
    ConversationAlignment,
    PlanExecution,
    SharedPlan
  }

  setup do
    a =
      %User{}
      |> User.changeset(%{handle: "p1b-a-#{System.unique_integer([:positive])}", display_name: "A"})
      |> Repo.insert!()

    b =
      %User{}
      |> User.changeset(%{handle: "p1b-b-#{System.unique_integer([:positive])}", display_name: "B"})
      |> Repo.insert!()

    %{a: a, b: b}
  end

  describe "grant" do
    test "creates granted proof with expires_at", %{a: a} do
      expires = DateTime.utc_now() |> DateTime.add(3600, :second) |> DateTime.truncate(:microsecond)

      assert {:ok, proof} =
               Consent.grant(a.id, "calls_outbound", expires_at: expires)

      assert proof.status == "granted"
      assert proof.capability == "calls_outbound"
      assert proof.user_id == a.id
      assert proof.expires_at == expires
      assert is_nil(proof.conversation_id)
      assert proof.policy_version == Consent.current_policy_version()
    end

    test "accepts product label mapping calls:outbound", %{a: a} do
      expires = DateTime.utc_now() |> DateTime.add(3600, :second)

      assert {:ok, proof} =
               Consent.grant(a.id, "calls:outbound", expires_at: expires)

      assert proof.capability == "calls_outbound"
    end

    test "rejects unknown capability", %{a: a} do
      expires = DateTime.utc_now() |> DateTime.add(3600, :second)

      assert {:error, :unknown_capability} =
               Consent.grant(a.id, "telepathy:mind_read", expires_at: expires)
    end

    test "requires expires_at", %{a: a} do
      assert {:error, :expires_at_required} = Consent.grant(a.id, "calls_outbound", [])
    end

    test "registers messaging_business; execution reported ABSENT (no send stub)", %{a: a} do
      expires = DateTime.utc_now() |> DateTime.add(3600, :second)

      assert {:ok, proof} =
               Consent.grant(a.id, "messaging_business", expires_at: expires)

      assert proof.capability == "messaging_business"
      assert "messaging_business" in Consent.act_on_behalf_capabilities()
      assert Consent.execution_status("messaging_business") == :absent
      assert Consent.execution_status("messaging:business") == :absent
      assert Consent.execution_status("calls_outbound") == :gated
      assert Consent.execution_status("bookings_reserve") == :gated
      # No dishonest MessagingBusiness.send/1 stub — function_exported? must be false.
      refute function_exported?(OpalCore.MessagingBusiness, :send, 1)
      refute Code.ensure_loaded?(OpalCore.MessagingBusiness)
    end
  end

  describe "revoke" do
    test "owner revokes ok; validate_for_job returns :revoked", %{a: a} do
      expires = DateTime.utc_now() |> DateTime.add(3600, :second)
      {:ok, proof} = Consent.grant(a.id, "calls_outbound", expires_at: expires)

      assert {:ok, revoked} = Consent.revoke(proof.id, a.id)
      assert revoked.status == "revoked"
      assert not is_nil(revoked.revoked_at)

      assert {:error, :revoked} =
               Consent.validate_for_job(%{
                 consent_proof_id: proof.id,
                 capability: "calls_outbound",
                 user_id: a.id,
                 conversation_id: nil
               })
    end

    test "non-owner gets user_mismatch", %{a: a, b: b} do
      expires = DateTime.utc_now() |> DateTime.add(3600, :second)
      {:ok, proof} = Consent.grant(a.id, "calls_outbound", expires_at: expires)

      assert {:error, :user_mismatch} = Consent.revoke(proof.id, b.id)
    end
  end

  describe "calls_outbound gating" do
    test "valid proof allows invite; revoked blocks", %{a: a, b: b} do
      expires = DateTime.utc_now() |> DateTime.add(3600, :second)
      {:ok, proof} = Consent.grant(a.id, "calls_outbound", expires_at: expires)

      assert {:ok, call} =
               Calls.invite(a.id, %{
                 "callee_user_id" => b.id,
                 "consent_proof_id" => proof.id
               })

      assert call.status == "ringing"

      assert {:ok, _} = Consent.revoke(proof.id, a.id)

      assert {:error, {:consent, :revoked}} =
               Calls.invite(a.id, %{
                 "callee_user_id" => b.id,
                 "consent_proof_id" => proof.id
               })
    end

    test "expired proof blocks invite", %{a: a, b: b} do
      expires = DateTime.utc_now() |> DateTime.add(-60, :second) |> DateTime.truncate(:microsecond)
      {:ok, proof} = Consent.grant(a.id, "calls_outbound", expires_at: expires)

      assert {:error, {:consent, :expired}} =
               Calls.invite(a.id, %{
                 "callee_user_id" => b.id,
                 "consent_proof_id" => proof.id
               })
    end

    test "missing proof blocks invite", %{a: a, b: b} do
      assert {:error, {:consent, :not_found}} =
               Calls.invite(a.id, %{"callee_user_id" => b.id})
    end
  end

  describe "bookings_reserve gating" do
    test "valid proof allows authorize; revoked/expired/missing block", %{a: a, b: b} do
      {plan, consent_id} = settled_plan(a, b)

      assert {:ok, auth_body} =
               PlanExecution.authorize(plan.id, a.id, %{
                 "consent_proof_id" => consent_id,
                 "allow_synthetic_booking" => true,
                 "provider_place_id" => "synthetic:p1b-fort",
                 "explicit_confirm" => true
               })

      assert auth_body["status"] == "authorized"

      assert {:ok, _} = Consent.revoke(consent_id, a.id)

      assert {:error, {:consent, :revoked}} =
               PlanExecution.authorize(plan.id, a.id, %{
                 "consent_proof_id" => consent_id,
                 "allow_synthetic_booking" => true,
                 "provider_place_id" => "synthetic:p1b-fort-2",
                 "explicit_confirm" => true
               })

      assert {:error, {:consent, :not_found}} =
               PlanExecution.authorize(plan.id, a.id, %{
                 "allow_synthetic_booking" => true,
                 "provider_place_id" => "synthetic:p1b-fort-3",
                 "explicit_confirm" => true
               })

      expired =
        DateTime.utc_now() |> DateTime.add(-120, :second) |> DateTime.truncate(:microsecond)

      {:ok, expired_proof} =
        Consent.grant(a.id, "bookings_reserve",
          expires_at: expired,
          conversation_id: plan.conversation_id
        )

      assert {:error, {:consent, :expired}} =
               PlanExecution.execute(plan.id, a.id, %{
                 "consent_proof_id" => expired_proof.id,
                 "authorization" => auth_body["authorization"],
                 "scenario" => "available"
               })
    end
  end

  test "capability label map is documented" do
    assert Consent.capability_label_map() == %{
             "calls:outbound" => "calls_outbound",
             "bookings:reserve" => "bookings_reserve",
             "messaging:business" => "messaging_business"
           }
  end

  defp settled_plan(a, b) do
    conv =
      %Conversation{}
      |> Conversation.changeset(%{label: "p1b-#{System.unique_integer([:positive])}"})
      |> Repo.insert!()

    for u <- [a, b] do
      %ConversationMember{}
      |> ConversationMember.changeset(%{conversation_id: conv.id, user_id: u.id})
      |> Repo.insert!()
    end

    for {body, seq, sender} <- [
          {"Can you meet tomorrow?", 10, a.id},
          {"Any time after 6 works.", 11, b.id},
          {"Let's do 8:00.", 12, a.id}
        ] do
      %Message{}
      |> Message.create_changeset(%{
        conversation_id: conv.id,
        sender_user_id: sender,
        client_message_id: "p1b-#{seq}-#{System.unique_integer([:positive])}",
        message_type: "text",
        body: body,
        server_seq: seq
      })
      |> Repo.insert!()
    end

    actions = [
      %{
        "kind" => "activity_lock",
        "actor_user_id" => a.id,
        "value" => "dinner",
        "seq" => 10,
        "truth" => "user_stated",
        "explicit" => true
      },
      %{
        "kind" => "place_propose",
        "actor_user_id" => a.id,
        "value" => "Fort Oak",
        "seq" => 11,
        "truth" => "proposed",
        "explicit" => true
      },
      %{
        "kind" => "place_confirm",
        "actor_user_id" => b.id,
        "value" => "Fort Oak",
        "seq" => 12,
        "truth" => "agreed",
        "explicit" => true
      },
      %{
        "kind" => "reservation_authorize",
        "actor_user_id" => a.id,
        "value" => "Fort Oak",
        "seq" => 13,
        "truth" => "proposed",
        "explicit" => true
      },
      %{
        "kind" => "reservation_authorize",
        "actor_user_id" => b.id,
        "value" => "Fort Oak",
        "seq" => 14,
        "truth" => "agreed",
        "explicit" => true
      }
    ]

    state =
      ConversationAlignment.fold(
        [
          %{id: "1", body: "Can you meet tomorrow?", sender_user_id: a.id, seq: 10},
          %{id: "2", body: "Any time after 6 works.", sender_user_id: b.id, seq: 11},
          %{id: "3", body: "Let's do 8:00.", sender_user_id: a.id, seq: 12}
        ],
        [a.id, b.id],
        actions
      )
      |> put_in(["exact_time"], %{
        "state" => "locked",
        "value" => "8:00 PM",
        "truth" => "locked",
        "explicit" => true,
        "schema_version" => 1
      })
      |> Map.put("commitment", "aligned")
      |> Map.put("plan_version", 1)
      |> Map.put("participants", [a.id, b.id])

    plan =
      %SharedPlan{}
      |> SharedPlan.changeset(%{
        conversation_id: conv.id,
        title: "Fort Oak",
        status: "agreed",
        timezone: "America/Los_Angeles",
        location: "Fort Oak",
        time_label: "Tuesday · 8:00 PM",
        created_by_user_id: a.id,
        alignment: state
      })
      |> Repo.insert!()

    consent =
      grant_act_on_behalf!(a.id, "bookings_reserve", conversation_id: conv.id)

    {plan, consent}
  end
end
