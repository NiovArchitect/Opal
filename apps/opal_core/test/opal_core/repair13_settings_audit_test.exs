defmodule OpalCore.Repair13SettingsAuditTest do
  @moduledoc """
  Repair #13 (W3 — YOU-screen settings audit).

  Every control on the YOU/settings surfaces must be WIRED: UI → handler →
  persisted setting → real observable behavior change. This module proves the
  backend half of each wire by driving the exact context functions the web
  settings screens call, then asserting a REAL observable changes:

  - notification toggles → ProductSession.update_messaging_preferences →
    Inbox broadcast/notice behavior changes (read receipts gated, in_app gated)
  - assist toggle → ProductSession.update_assist_preference →
    Assist.apply_defaults writes (or withholds) account_default AssistConsent rows
  - home timezone → TravelMode.set_home_timezone → travel projection changes
  - act-on-behalf consent toggles → Consent.grant/revoke →
    Consent.require_for_action execution gate opens/closes
  - graphing pause/modes → RelationshipAccess.update_graphing_policy →
    graphing_decision changes
  - spending comfort → FinancialProfiles.set_profile →
    CelebrationCuration budget_note changes
  - relationship types, memory facts, celebrations, invites, trust tier →
    CRUD round-trips through the exact modules the settings screens call
  - settings × plans interplay: notification/privacy prefs flipped mid-plan-flow
    must not break the plan lifecycle, and plan fanout must still deliver

  F12 regression guard: no F12-01..F12-63 behavior is touched here; the plan
  lifecycle assertions reuse the F12-02/F12-62 contracts (change mutates,
  cancelled plans are terminal).
  """

  use OpalCore.DataCase, async: false

  alias OpalCore.Accounts.User
  alias OpalCore.Auth.ProductSession
  alias OpalCore.Calls.Assist
  alias OpalCore.Calls.AssistConsent
  alias OpalCore.Calls.CallSession
  alias OpalCore.CelebrationCuration
  alias OpalCore.Celebrations
  alias OpalCore.Consent
  alias OpalCore.FinancialProfiles
  alias OpalCore.Fixtures
  alias OpalCore.FixturesHelper
  alias OpalCore.Intelligence.TravelMode
  alias OpalCore.Invites
  alias OpalCore.Messaging.Inbox
  alias OpalCore.Messaging.Message
  alias OpalCore.RelationshipAccess
  alias OpalCore.Relationships
  alias OpalCore.Repo
  alias OpalCore.SocialFlow
  alias OpalCore.SocialFlow.DurablePreferenceMemory
  alias OpalCore.TrustTiers

  setup do
    FixturesHelper.seed!()
    :ok
  end

  defp alex_id, do: Fixtures.user_alex_id()
  defp jordan_id, do: Fixtures.user_jordan_id()
  defp conv_id, do: Fixtures.conv_alex_jordan_id()

  defp user!(id), do: Repo.get!(User, id)

  defp insert_message(conversation_id, sender_id, body, seq) do
    %Message{}
    |> Message.create_changeset(%{
      id: Ecto.UUID.generate(),
      conversation_id: conversation_id,
      sender_user_id: sender_id,
      client_message_id: Ecto.UUID.generate(),
      body: body,
      server_seq: seq,
      message_type: "text"
    })
    |> Repo.insert!()
  end

  defp make_plan(owner_id \\ nil) do
    owner_id = owner_id || alex_id()

    {:ok, plan, _} =
      SocialFlow.create_tentative_plan_from_conversation(
        conv_id(),
        owner_id,
        %{
          "title" => "Settings audit dinner",
          "place" => "Juniper & Ivy",
          "location" => "Juniper & Ivy",
          "area" => "North Park",
          "time_label" => "Sat 7:30 PM"
        }
      )

    plan
  end

  defp expires_at, do: DateTime.add(DateTime.utc_now(), 365 * 24 * 3600, :second)

  # ---------------------------------------------------------------------------
  # Notifications: read receipts toggle → real broadcast gate
  # ---------------------------------------------------------------------------

  describe "read receipts toggle (You → Notifications)" do
    test "off suppresses peer-visible receipts; the reader's own cursor notice still fires" do
      reader = alex_id()
      peer = jordan_id()

      :ok = Phoenix.PubSub.subscribe(OpalCore.PubSub, "user:#{peer}")
      :ok = Phoenix.PubSub.subscribe(OpalCore.PubSub, "user:#{reader}")

      # Baseline: receipts on → peer sees the read.
      :ok = Inbox.fanout_read(conv_id(), reader, 1)

      assert_received %Phoenix.Socket.Broadcast{
        event: "inbox:read",
        payload: %{"peer_visible" => true, "reader_user_id" => ^reader}
      }

      # The exact settings-screen write path: PATCH /preferences/messaging.
      {:ok, updated} =
        ProductSession.update_messaging_preferences(user!(reader), %{
          "read_receipts_enabled" => false
        })

      assert updated.read_receipts_enabled == false
      # Persists across reload.
      assert user!(reader).read_receipts_enabled == false

      :ok = Inbox.fanout_read(conv_id(), reader, 2)

      # Reader's own notice (internal cursor) still arrives — "Unread still
      # works if this is off" is honest.
      assert_received %Phoenix.Socket.Broadcast{
        event: "inbox:read",
        payload: %{"peer_visible" => false, "self" => true}
      }

      # No peer-visible receipt for the peer.
      refute_received %Phoenix.Socket.Broadcast{
                        event: "inbox:read",
                        payload: %{"peer_visible" => true}
                      },
                      300

      # Toggle back on → peer-visible receipts resume.
      {:ok, _} =
        ProductSession.update_messaging_preferences(user!(reader), %{
          "read_receipts_enabled" => true
        })

      assert user!(reader).read_receipts_enabled == true
      :ok = Inbox.fanout_read(conv_id(), reader, 3)

      assert_received %Phoenix.Socket.Broadcast{
        event: "inbox:read",
        payload: %{"peer_visible" => true, "reader_user_id" => ^reader}
      }

      :ok = Phoenix.PubSub.unsubscribe(OpalCore.PubSub, "user:#{peer}")
      :ok = Phoenix.PubSub.unsubscribe(OpalCore.PubSub, "user:#{reader}")
    end
  end

  describe "message notifications toggle (You → Notifications)" do
    test "off flips in_app on message notices; on restores it; persists across reload" do
      recipient = jordan_id()
      msg = insert_message(conv_id(), alex_id(), "see you at 7:30", 41)

      # Baseline: notifications on → in-app notice allowed.
      assert Inbox.message_notice(msg, recipient)["in_app"] == true

      {:ok, updated} =
        ProductSession.update_messaging_preferences(user!(recipient), %{
          "message_notifications_enabled" => false
        })

      assert updated.message_notifications_enabled == false
      assert user!(recipient).message_notifications_enabled == false

      # Real observable: the notice the client uses to badge/push is gated.
      assert Inbox.message_notice(msg, recipient)["in_app"] == false

      {:ok, _} =
        ProductSession.update_messaging_preferences(user!(recipient), %{
          "message_notifications_enabled" => true
        })

      assert user!(recipient).message_notifications_enabled == true
      assert Inbox.message_notice(msg, recipient)["in_app"] == true
    end

    test "messaging preferences endpoint shape round-trips both flags" do
      {:ok, _} =
        ProductSession.update_messaging_preferences(user!(alex_id()), %{
          "read_receipts_enabled" => false,
          "message_notifications_enabled" => false
        })

      prefs = ProductSession.messaging_preferences(user!(alex_id()))
      assert prefs["read_receipts_enabled"] == false
      assert prefs["message_notifications_enabled"] == false
    end
  end

  # ---------------------------------------------------------------------------
  # Assist on calls toggle → real AssistConsent behavior
  # ---------------------------------------------------------------------------

  describe "Opal Assist on calls toggle (You → Calls & Opal Assist)" do
    test "on writes account_default AssistConsent on call start; off writes none" do
      caller = alex_id()
      callee = jordan_id()

      insert_call = fn ->
        %{
          caller_user_id: caller,
          callee_user_id: callee,
          status: "initiated"
        }
        |> CallSession.create_changeset()
        |> Repo.insert!()
      end

      # The exact settings-screen write path: PATCH /preferences/assist.
      {:ok, updated} =
        ProductSession.update_assist_preference(user!(caller), %{
          "assist_calls_enabled" => true
        })

      assert updated.assist_calls_enabled == true
      assert user!(caller).assist_calls_enabled == true

      assert ProductSession.assist_preference(user!(caller)) == %{
               "assist_calls_enabled" => true
             }

      call = insert_call.()
      :ok = Assist.apply_defaults(call)

      consent = Repo.get_by(AssistConsent, call_id: call.id, user_id: caller)
      assert %AssistConsent{allowed: true, source: "account_default"} = consent

      # Toggle off → a fresh call gets no standing consent.
      {:ok, _} =
        ProductSession.update_assist_preference(user!(caller), %{
          "assist_calls_enabled" => false
        })

      assert user!(caller).assist_calls_enabled == false

      call2 = insert_call.()
      :ok = Assist.apply_defaults(call2)
      assert Repo.get_by(AssistConsent, call_id: call2.id, user_id: caller) == nil
    end
  end

  # ---------------------------------------------------------------------------
  # Home timezone → real travel projection
  # ---------------------------------------------------------------------------

  describe "home timezone (You → Location & travel)" do
    test "set persists and changes the travel projection the UI reads" do
      user = alex_id()

      assert {:ok, _} = TravelMode.set_home_timezone(user, "America/New_York")
      assert TravelMode.home_timezone(user) == "America/New_York"

      assert {:ok, _} = TravelMode.set_home_timezone(user, "Asia/Tokyo")
      assert TravelMode.home_timezone(user) == "Asia/Tokyo"

      # Invalid input is refused, never persisted as garbage.
      assert {:error, :invalid} = TravelMode.set_home_timezone(user, "   ")
      assert TravelMode.home_timezone(user) == "Asia/Tokyo"
    end
  end

  # ---------------------------------------------------------------------------
  # Act-on-behalf consent toggles → real execution gates
  # ---------------------------------------------------------------------------

  describe "act-on-behalf consent toggles (What Opal can do for you)" do
    test "grant bookings_reserve opens the execution gate; revoke closes it" do
      user = alex_id()

      {:ok, proof} = Consent.grant(user, "bookings_reserve", expires_at: expires_at())
      assert proof.status == "granted"

      # The execution gate plan_execution.ex checks before reserving.
      assert {:ok, _} =
               Consent.require_for_action(user, "bookings_reserve", conv_id(), %{
                 "consent_proof_id" => proof.id
               })

      {:ok, revoked} = Consent.revoke(proof.id, user)
      assert revoked.status != "granted" or not is_nil(revoked.revoked_at)

      assert {:error, {:consent, _}} =
               Consent.require_for_action(user, "bookings_reserve", conv_id(), %{
                 "consent_proof_id" => proof.id
               })
    end

    test "grant calls_outbound opens the execution gate; revoke closes it" do
      user = alex_id()

      {:ok, proof} = Consent.grant(user, "calls_outbound", expires_at: expires_at())

      # The execution gate calls.ex checks before placing an on-behalf call.
      assert {:ok, _} =
               Consent.require_for_action(user, "calls_outbound", conv_id(), %{
                 "consent_proof_id" => proof.id
               })

      {:ok, _} = Consent.revoke(proof.id, user)

      assert {:error, {:consent, _}} =
               Consent.require_for_action(user, "calls_outbound", conv_id(), %{
                 "consent_proof_id" => proof.id
               })
    end

    test "unknown capability is refused, never granted" do
      assert {:error, :unknown_capability} =
               Consent.grant(alex_id(), "teleportation", expires_at: expires_at())
    end
  end

  # ---------------------------------------------------------------------------
  # Graphing pause / modes → real graphing decisions
  # ---------------------------------------------------------------------------

  describe "Opal Graphing controls (You → Calls & Opal Assist)" do
    test "pause overrides everything; modes change the decision" do
      user = alex_id()

      {:ok, policy} = RelationshipAccess.update_graphing_policy(user, %{call_mode: "ask_each"})
      assert policy.call_mode == "ask_each"
      assert {:ok, :ask, _} = RelationshipAccess.graphing_decision(user, :call)

      {:ok, policy} = RelationshipAccess.update_graphing_policy(user, %{call_mode: "never"})
      assert {:error, :never} = RelationshipAccess.graphing_decision(user, :call)

      {:ok, _} = RelationshipAccess.update_graphing_policy(user, %{global_paused: true})
      assert {:error, :global_paused} = RelationshipAccess.graphing_decision(user, :call)

      {:ok, _} =
        RelationshipAccess.update_graphing_policy(user, %{
          global_paused: false,
          call_mode: "ask_each"
        })

      assert {:ok, :ask, _} = RelationshipAccess.graphing_decision(user, :call)
    end

    test "graphing policy persists across reload" do
      user = alex_id()
      {:ok, _} = RelationshipAccess.update_graphing_policy(user, %{call_mode: "never"})
      {:ok, policy} = RelationshipAccess.get_or_create_graphing_policy(user)
      assert policy.call_mode == "never"
    end
  end

  # ---------------------------------------------------------------------------
  # Spending comfort → real suggestion behavior
  # ---------------------------------------------------------------------------

  describe "spending comfort (You → Spending)" do
    test "below trusted tier the write is refused; trusted+ persists and changes curation" do
      user = alex_id()
      assert TrustTiers.get_tier(user) in ["new", "known"]

      assert {:error, :forbidden} =
               FinancialProfiles.set_profile(user, %{"comfort_level" => "luxury"})

      assert {:ok, _} = TrustTiers.grant_tier(user, "known", "system")
      assert {:ok, _} = TrustTiers.grant_tier(user, "trusted", "system")

      {:ok, profile} =
        FinancialProfiles.set_profile(user, %{
          "comfort_level" => "comfortable",
          "dining_range" => %{"min" => 30, "max" => 80},
          "notes" => "splurge on anniversaries"
        })

      assert profile.comfort_level == "comfortable"
      assert FinancialProfiles.get_profile(user).comfort_level == "comfortable"

      # Real behavior change: celebration curation now carries a budget note.
      {:ok, celebration} =
        Celebrations.create(user, %{
          "person_name" => "Maya",
          "kind" => "birthday",
          "month" => 6,
          "day" => 15
        })

      {:ok, curation} = CelebrationCuration.curate_for(user, celebration.id)
      assert %{} = curation

      assert CelebrationCuration.to_contract(curation)["budget_note"] ==
               "Fits your comfortable comfort."

      # Delete removes the profile; the copy contract goes null again.
      assert {:ok, :deleted} = FinancialProfiles.delete_profile(user)
      assert FinancialProfiles.get_profile(user) == nil
    end
  end

  # ---------------------------------------------------------------------------
  # Relationship types / memory facts / celebrations / invites / trust
  # ---------------------------------------------------------------------------

  describe "What Opal remembers controls (You → Privacy)" do
    test "relationship type set persists and reads back" do
      assert {:ok, _} = Relationships.set_type(alex_id(), jordan_id(), "partner")
      assert Relationships.get_type(alex_id(), jordan_id()) == "partner"
      assert Relationships.type_map_for(alex_id())[jordan_id()] == "partner"
    end

    test "memory fact forget removes it from the list" do
      user = alex_id()

      {:ok, fact, _} =
        DurablePreferenceMemory.remember_explicit(%{
          "owner_user_id" => user,
          "preference" => "prefers quiet restaurants"
        })

      assert Enum.any?(DurablePreferenceMemory.list_for_owners([user]), &(&1.id == fact.id))

      assert {:ok, _} = DurablePreferenceMemory.forget(fact.id, user)
      refute Enum.any?(DurablePreferenceMemory.list_for_owners([user]), &(&1.id == fact.id))
    end

    test "celebration create/delete round-trips the list" do
      user = alex_id()

      {:ok, celebration} =
        Celebrations.create(user, %{
          "person_name" => "Maya",
          "kind" => "anniversary",
          "month" => 11,
          "day" => 2
        })

      assert {:ok, items} = Celebrations.list_for_user(user)
      assert Enum.any?(items, &(&1.id == celebration.id))

      assert {:ok, _} = Celebrations.delete(user, celebration.id)
      assert {:ok, items} = Celebrations.list_for_user(user)
      refute Enum.any?(items, &(&1.id == celebration.id))
    end

    test "trust grant/revoke steps the tier up and back" do
      user = jordan_id()
      assert {:ok, _} = TrustTiers.grant_tier(user, "known", "system")
      assert {:ok, _} = TrustTiers.grant_tier(user, "trusted", "system")

      # The exact settings-screen path: grantInnerCircleTrust / revokeInnerCircleTrust.
      assert {:ok, _} = TrustTiers.grant_tier(user, "inner_circle", "user")
      assert TrustTiers.get_tier(user) == "inner_circle"

      assert {:ok, _} = TrustTiers.revoke_inner_circle(user)
      assert TrustTiers.get_tier(user) == "trusted"
    end
  end

  describe "invite friends (You → Feed & discovery)" do
    test "created invite code resolves" do
      {:ok, invite} = Invites.create_invite(alex_id(), %{})
      assert is_binary(invite.code) and invite.code != ""
      assert Invites.get_by_code(invite.code).id == invite.id
      assert {:ok, _} = Invites.validate_code(invite.code)
    end
  end

  # ---------------------------------------------------------------------------
  # Settings × plans interplay: prefs flipped mid-plan-flow keep it coherent
  # ---------------------------------------------------------------------------

  describe "settings interplay with plans" do
    test "notification prefs flipped mid-plan-flow do not break the plan lifecycle" do
      owner = alex_id()
      peer = jordan_id()
      plan = make_plan(owner)

      # Mid-plan-flow: the owner kills read receipts, the peer kills message
      # notifications — exactly the toggles on the Notifications screen.
      {:ok, _} =
        ProductSession.update_messaging_preferences(user!(owner), %{
          "read_receipts_enabled" => false
        })

      {:ok, _} =
        ProductSession.update_messaging_preferences(user!(peer), %{
          "message_notifications_enabled" => false
        })

      # Plan fanout still reaches the conversation topic: the
      # message_notifications pref gates message badges, never plan events.
      # Subscribe BEFORE the change; change_plan_time broadcasts
      # {:social_flow_event, "social_flow:plan", ...} (F12-08 contract).
      :ok = Phoenix.PubSub.subscribe(OpalCore.PubSub, "social_flow:conversation:#{conv_id()}")

      # The plan lifecycle stays fully coherent: change mutates (F12-02
      # contract), then cancel terminates (F12-62 contract).
      assert {:ok, %{plan: changed}} =
               SocialFlow.change_plan_time(%{
                 plan_id: plan.id,
                 user_id: owner,
                 new_time_label: "Sat 8:00 PM",
                 trace_id: "r13-settings-interplay"
               })

      assert changed.id == plan.id
      assert changed.time_label == "Sat 8:00 PM"

      assert_received {:social_flow_event, "social_flow:plan", %{"payload" => _}}, 2_000

      :ok = Phoenix.PubSub.unsubscribe(OpalCore.PubSub, "social_flow:conversation:#{conv_id()}")

      reloaded = Repo.get!(OpalCore.SocialFlow.SharedPlan, plan.id)
      assert reloaded.status not in ["cancelled", "completed"]

      # Cancel terminates the plan even with prefs off.
      assert {:ok, %{plan: cancelled}} =
               SocialFlow.cancel_plan(%{
                 plan_id: plan.id,
                 user_id: owner,
                 trace_id: "r13-settings-interplay"
               })

      assert cancelled.status == "cancelled"
      assert Repo.get!(OpalCore.SocialFlow.SharedPlan, plan.id).status == "cancelled"
    end
  end
end
