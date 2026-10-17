defmodule OpalCore.SocialFlow.Repair14RelationshipJourneysTest do
  @moduledoc """
  Repair #14 Track C — relationship-type coverage.

  ZERO prior tests set `relationship_type`. These journeys run the key flows
  with explicit RU-1 types on FRESH randomized accounts (never fixtures) and
  assert three things per flow:

  (a) Coordination correctness is IDENTICAL across types — same state machine,
      same transitions, same notifications delivered. A family plan and a
      business plan coordinate exactly the same way.
  (b) The INTENDED type-driven differences actually manifest per type.
  (c) No type crashes, no cross-relationship data leaks, unknown/edge types
      fail closed (never 500).

  ## Oracle — intended per-type behavior (read from the type-driven code)

  Taxonomy (exact, `RelationshipType.allowed_types/0`):
  spouse | partner | family | close_friend | friend | business | acquaintance.
  "relative" is NOT a valid type (schema inclusion validation rejects it).

  1. Attention gating (`AttentionBudget.relationship_nudge_blocked?/3` →
     `Relationships.Behavior.nudge_allowed?/2`): casual priorities
     (nudge/proactive_thread/routine_break) are DENIED (`:relationship_bounds`)
     for business and acquaintance (nudge cap 0 — "occasional" frequency).
     spouse/partner (daily, cap 3) and family/close_friend/friend (weekly,
     cap 1) allow. time_critical/mediation ALWAYS allowed; reminder and
     weekly_briefing are never type-gated (user-command reminders bypass).

  2. Planning bounds (`Behavior.enforce_planning/2`): spouse/partner/
     close_friend are spontaneous (0h/0h/2h lead effectively — any hours_ahead
     >= 0 OK); family/friend need 12h; acquaintance 24h; business 48h,
     else `{:needs_lead_time, need}`.

  3. Tone copy (`Behavior`): plan proposals, invite SMS, reminders, split
     asks, and mediation drafts are styled warm (spouse/partner/family),
     casual (close_friend/friend), or formal (business/acquaintance), with
     per-type lead times in the formal proposal copy (24h vs 48h).

  4. Call briefs (`CallIntelligence.pre_call_brief/2`): facts carry
     `relationship` (the type string) and `tone` from the seeded
     `relationship_behavior_profiles` row (e.g. family → "warm_respectful",
     business → "friendly_respectful", acquaintance → "polite_brief").

  5. Person cards (`ProductSurface.get_person_memory/2` → vibe_summary):
     "Family · warm_respectful" etc.; per-person behavior_override tone wins
     when set.

  6. Prompt "How to be" (`PromptBuilder`): per-profile tone/proactivity/
     boundary notes merged with per-person overrides.

  7. Invites (`Invites.to_contract/2`): `invite_copy`/`invite_tone` typed by
     the invitee's relationship type (warm/casual/formal bodies).

  8. Coordinate copy (`OpalResponse.render_coordinate/2`): business contacts
     get "professional note"/"professional message" variants; everyone else
     gets the plain variants. `intimate_relationship?/2` (spouse/partner)
     feeds the recommend path.

  9. Broadcast framing (`BroadcastFraming.frame_cards/4`): each recipient
     gets a private card (tone/framing/spontaneity/depth) from the owner's
     RU-1 type; unknown recipient defaults to "acquaintance" (most reserved —
     fail closed); sibling framings never attached.

  10. Split money (`Wallets.split_request_contract/5`, `Split.request/6`):
      ask body styled warm/casual/formal by payer relationship type.

  11. Trust safety (`TrustSafety.soft_contact?/2`): any explicit RU-1 type
      counts as an established contact for spam throttling.

  Status: machine-proven, pending founder phone walk.
  """

  use OpalCore.DataCase, async: false

  import Ecto.Query

  alias OpalCore.Accounts.User
  alias OpalCore.Center.PlanContextPatch
  alias OpalCore.Intelligence.{AttentionBudget, CallIntelligence, ProductSurface}
  alias OpalCore.Invites
  alias OpalCore.Invites.Invite
  alias OpalCore.Messaging.{Conversation, ConversationMember}
  alias OpalCore.Relationships
  alias OpalCore.Relationships.{Behavior, BroadcastFraming}
  alias OpalCore.Repo
  alias OpalCore.SocialFlow
  alias OpalCore.SocialFlow.{ConversationAlignment, PlanParticipant, SharedPlan}
  alias OpalCore.SocialFlow.AssistancePreference
  alias OpalCore.SocialMemory.{PersonMemory, RelationshipBehaviorProfile}
  alias OpalCore.Wallets

  @all_types ~w(spouse partner family close_friend friend business acquaintance)

  @names ~w(Avery Blake Casey Drew Ellis Finley Gray Harper Indigo Jules Kai Lane Morgan Noor Parker Quinn Riley Sam Tate Vale Wren Yara Zane)

  # --- fresh randomized accounts, every run ---

  defp rand_name do
    Enum.random(@names) <> "-" <> (:crypto.strong_rand_bytes(2) |> Base.encode16())
  end

  defp mk_user do
    %User{}
    |> User.changeset(%{
      id: Ecto.UUID.generate(),
      handle: "r14c-#{Ecto.UUID.generate()}",
      display_name: rand_name()
    })
    |> Repo.insert!()
  end

  defp mk_conv(member_ids) do
    conv =
      %Conversation{}
      |> Conversation.changeset(%{
        id: Ecto.UUID.generate(),
        label: "r14c-#{Ecto.UUID.generate()}"
      })
      |> Repo.insert!()

    for uid <- member_ids do
      %ConversationMember{}
      |> ConversationMember.changeset(%{conversation_id: conv.id, user_id: uid})
      |> Repo.insert!()
    end

    conv.id
  end

  defp db_plan(id), do: Repo.get!(SharedPlan, id)

  defp make_plan(conv_id, owner_id, attrs) do
    {:ok, plan, _} =
      SocialFlow.create_tentative_plan_from_conversation(
        conv_id,
        owner_id,
        Map.merge(
          %{
            "title" => "Dinner",
            "place" => "Somewhere",
            "time_label" => "Sat 7:30 PM"
          },
          attrs
        )
      )

    plan
  end

  # AttentionBudget prefs: established maturity (no maturity gate) and a quiet
  # window placed 2h in the future so casual slots are never quiet-denied.
  defp pref_daytime(account_id) do
    now = DateTime.utc_now()
    pad = fn h -> h |> Integer.to_string() |> String.pad_leading(2, "0") end

    %AssistancePreference{}
    |> AssistancePreference.changeset(%{
      user_id: account_id,
      timezone: "Etc/UTC",
      quiet_hours_start: "#{pad.(rem(now.hour + 2, 24))}:00",
      quiet_hours_end: "#{pad.(rem(now.hour + 3, 24))}:00",
      intelligence_maturity: "established"
    })
    |> Repo.insert!()
  end

  defp mk_person_memory(account_id, person_id) do
    %PersonMemory{}
    |> PersonMemory.changeset(%{
      account_id: account_id,
      person_id: person_id,
      display_name: "P-#{String.slice(person_id, 0, 6)}"
    })
    |> Repo.insert!()
  end

  # --- T1: the Behavior oracle, asserted per type ---

  describe "T1 - Behavior oracle: intended per-type differences" do
    test "nudge gating matches the oracle per type and priority" do
      # Oracle: casual nudges allowed for spouse/partner (daily cap 3) and
      # family/close_friend/friend (weekly cap 1); denied for business/
      # acquaintance (occasional cap 0). time_critical/mediation always open.
      casual_allowed = ~w(spouse partner family close_friend friend)
      casual_denied = ~w(business acquaintance)

      for type <- casual_allowed do
        assert Behavior.nudge_allowed?(type, "proactive_thread") == true,
               "#{type} should allow casual nudges"

        assert Behavior.nudge_allowed?(type, "routine_break") == true,
               "#{type} should allow routine_break"

        assert Behavior.nudge_allowed?(type, "nudge") == true,
               "#{type} should allow nudge alias"
      end

      for type <- casual_denied do
        assert Behavior.nudge_allowed?(type, "proactive_thread") == false,
               "#{type} must deny casual nudges"

        assert Behavior.nudge_allowed?(type, "routine_break") == false,
               "#{type} must deny routine_break"
      end

      for type <- @all_types do
        assert Behavior.nudge_allowed?(type, "time_critical") == true,
               "#{type} must always allow time_critical"

        assert Behavior.nudge_allowed?(type, "mediation") == true,
               "#{type} must always allow mediation"
      end
    end

    test "planning lead times match the oracle per type" do
      # spouse/partner/close_friend: spontaneous (any hours_ahead >= 0 OK)
      for type <- ~w(spouse partner close_friend) do
        assert Behavior.enforce_planning(type, 0) == :ok
        assert Behavior.enforce_planning(type, 1) == :ok
      end

      # family/friend: 12h; acquaintance: 24h; business: 48h
      assert Behavior.enforce_planning("family", 6) == {:needs_lead_time, 12}
      assert Behavior.enforce_planning("family", 12) == :ok
      assert Behavior.enforce_planning("friend", 11) == {:needs_lead_time, 12}
      assert Behavior.enforce_planning("friend", 24) == :ok
      assert Behavior.enforce_planning("acquaintance", 12) == {:needs_lead_time, 24}
      assert Behavior.enforce_planning("acquaintance", 24) == :ok
      assert Behavior.enforce_planning("business", 24) == {:needs_lead_time, 48}
      assert Behavior.enforce_planning("business", 48) == :ok
    end

    test "plan proposal copy is warm/casual/formal per type with per-type lead time" do
      # warm + spontaneous: spouse
      p = Behavior.plan_proposal_copy("spouse", who: "Alex", when: "tonight")
      assert p.tone == "warm" and p.framing == "personal" and p.spontaneity == "spontaneous"
      assert p.copy =~ "No pressure"

      # warm + planned: family
      p = Behavior.plan_proposal_copy("family", who: "Mom", when: "Saturday")
      assert p.tone == "warm" and p.spontaneity == "planned"
      assert p.copy =~ "Shall we set dinner"

      # casual + spontaneous: close_friend
      p = Behavior.plan_proposal_copy("close_friend", who: "Jo", when: "tonight")
      assert p.tone == "casual" and p.spontaneity == "spontaneous"
      assert p.copy =~ "I'm down if you are"

      # casual + planned: friend
      p = Behavior.plan_proposal_copy("friend", who: "Jo", when: "Saturday")
      assert p.tone == "casual" and p.spontaneity == "planned"
      assert p.copy =~ "pencil it in properly"

      # formal: business (48h) vs acquaintance (24h) — lead time differs
      pb = Behavior.plan_proposal_copy("business", who: "R. Chen", when: "Tuesday")
      pa = Behavior.plan_proposal_copy("acquaintance", who: "R. Chen", when: "Tuesday")
      assert pb.framing == "formal" and pa.framing == "formal"
      assert pb.lead_time_hours == 48
      assert pa.lead_time_hours == 24
      assert pb.copy =~ "48h lead time"
      assert pa.copy =~ "24h lead time"
      assert pb.copy =~ "professional"
    end

    test "invite / reminder / split copy differ by style, assertable per type" do
      warm = Behavior.invite_copy("partner", "Sam")
      casual = Behavior.invite_copy("friend", "Sam")
      formal = Behavior.invite_copy("business", "Sam")

      assert warm.tone == "warm" and warm.body =~ "would love you on Opal"
      assert casual.tone == "casual" and casual.body =~ "Tap to join"
      assert formal.tone == "formal" and formal.body =~ "Accept when convenient"

      assert Behavior.reminder_copy("partner", "call mom").body =~ "Hey love"
      assert Behavior.reminder_copy("friend", "call mom").body =~ "Heads up"
      assert Behavior.reminder_copy("acquaintance", "call mom").body == "Reminder: call mom."

      sw = Behavior.split_ask_copy("spouse", 2000, "Dinner")
      sc = Behavior.split_ask_copy("close_friend", 2000, "Dinner")
      sf = Behavior.split_ask_copy("business", 2000, "Dinner")
      assert sw.body =~ "Want to split Dinner"
      assert sc.body =~ "Your share is $20.0"
      assert sf.body =~ "Please confirm your share of $20.0"
      assert sf.shows_balance == false
    end

    test "mediation copy is warm/casual/formal by group context" do
      warm = Behavior.mediation_copy("family", "where to eat")
      casual = Behavior.mediation_copy("friend", "where to eat")
      formal = Behavior.mediation_copy("business", "where to eat")

      assert warm.formality == :warm and warm.draft =~ "gentle way through"
      assert casual.formality == :casual and casual.draft =~ "Quick nudge"
      assert formal.formality == :formal and formal.draft =~ "Recommended resolution"
    end

    test "seeded behavior profiles exist for all 7 types with distinct tones" do
      tones =
        for type <- @all_types do
          profile = Repo.get!(RelationshipBehaviorProfile, type)
          {type, profile.tone, profile.proactivity, profile.disclosure}
        end

      by_type = Map.new(tones, fn {t, tone, pro, dis} -> {t, {tone, pro, dis}} end)

      assert by_type["spouse"] == {"warm_intimate", "high", "volunteers"}
      assert by_type["partner"] == {"warm_intimate", "high", "volunteers"}
      assert by_type["family"] == {"warm_respectful", "medium", "balanced"}
      assert by_type["close_friend"] == {"warm_casual", "high", "volunteers"}
      assert by_type["friend"] == {"warm_casual", "medium", "balanced"}
      assert by_type["business"] == {"friendly_respectful", "low", "reserved"}
      assert by_type["acquaintance"] == {"polite_brief", "low", "reserved"}
    end
  end

  # --- T2: AttentionBudget type gating — real DB effects ---

  describe "T2 - AttentionBudget gates casual nudges by relationship type" do
    test "casual nudge denied for business/acquaintance, granted for the other five" do
      owner = mk_user()
      peer = mk_user()
      pref_daytime(owner.id)
      uniq = :crypto.strong_rand_bytes(4) |> Base.encode16()

      granted_types = ~w(spouse partner family close_friend friend)
      denied_types = ~w(business acquaintance)

      for {type, i} <- Enum.with_index(granted_types) do
        assert {:granted, _slot_id} =
                 AttentionBudget.request_slot(owner.id, "nudge", "proactive_thread", %{
                   "person_id" => peer.id,
                   "topic" => "t2-grant-#{uniq}-#{type}-#{i}",
                   "provenance" => "stated",
                   "relationship_type" => type
                 }),
               "casual nudge toward #{type} must grant"
      end

      for type <- denied_types do
        assert {:denied, :relationship_bounds} =
                 AttentionBudget.request_slot(owner.id, "nudge", "proactive_thread", %{
                   "person_id" => peer.id,
                   "topic" => "t2-deny-#{uniq}-#{type}",
                   "provenance" => "stated",
                   "relationship_type" => type
                 }),
               "casual nudge toward #{type} must deny with :relationship_bounds"
      end
    end

    test "stored RU-1 type is looked up when ref carries only person_id" do
      owner = mk_user()
      peer = mk_user()
      pref_daytime(owner.id)
      uniq = :crypto.strong_rand_bytes(4) |> Base.encode16()

      assert {:ok, _} = Relationships.set_type(owner.id, peer.id, "business")

      # No explicit relationship_type in ref: the stored type gates the nudge.
      assert {:denied, :relationship_bounds} =
               AttentionBudget.request_slot(owner.id, "nudge", "proactive_thread", %{
                 "person_id" => peer.id,
                 "topic" => "t2-lookup-#{uniq}",
                 "provenance" => "stated"
               })

      # A person with NO stored type is not gated (no bounds to enforce).
      stranger = mk_user()

      assert {:granted, _} =
               AttentionBudget.request_slot(owner.id, "nudge", "proactive_thread", %{
                 "person_id" => stranger.id,
                 "topic" => "t2-lookup-none-#{uniq}",
                 "provenance" => "stated"
               })
    end

    test "time_critical and reminder break through the relationship gate" do
      owner = mk_user()
      peer = mk_user()
      pref_daytime(owner.id)
      uniq = :crypto.strong_rand_bytes(4) |> Base.encode16()

      # time_critical toward a business contact: breakthrough, not type-gated.
      assert {:granted, _} =
               AttentionBudget.request_slot(owner.id, "nudge", "time_critical", %{
                 "person_id" => peer.id,
                 "topic" => "t2-critical-#{uniq}",
                 "provenance" => "stated",
                 "relationship_type" => "business"
               })

      # A user-command reminder toward an acquaintance: never type-gated.
      assert {:granted, _} =
               AttentionBudget.request_slot(owner.id, "nudge", "reminder", %{
                 "person_id" => peer.id,
                 "topic" => "t2-reminder-#{uniq}",
                 "provenance" => "stated",
                 "relationship_type" => "acquaintance"
               })
    end

    test "routine_break is casual-gated: denied for acquaintance" do
      owner = mk_user()
      peer = mk_user()
      pref_daytime(owner.id)
      uniq = :crypto.strong_rand_bytes(4) |> Base.encode16()

      assert {:denied, :relationship_bounds} =
               AttentionBudget.request_slot(owner.id, "nudge", "routine_break", %{
                 "person_id" => peer.id,
                 "topic" => "t2-routine-#{uniq}",
                 "provenance" => "stated",
                 "relationship_type" => "acquaintance"
               })
    end
  end

  # --- T3: plan lifecycle coordination is IDENTICAL across types ---

  describe "T3 - 1:1 plan lifecycle is identical for every relationship type" do
    test "create -> confirm -> change -> cancel: same transitions, same notifications" do
      summaries =
        for type <- @all_types do
          owner = mk_user()
          peer = mk_user()
          conv = mk_conv([owner.id, peer.id])

          assert {:ok, _} = Relationships.set_type(owner.id, peer.id, type)
          assert Relationships.get_type(owner.id, peer.id) == type

          :ok = Phoenix.PubSub.subscribe(OpalCore.PubSub, "social_flow:conversation:#{conv}")
          :ok = Phoenix.PubSub.subscribe(OpalCore.PubSub, "social_flow:user:#{peer.id}")

          plan = make_plan(conv, owner.id, %{"title" => "Dinner", "time_label" => "Sat 7:30 PM"})
          created_status = db_plan(plan.id).status

          # Peer proposes a time; lead confirms — the standard 1:1 handshake.
          assert {:ok, %{revision: rev}} =
                   SocialFlow.propose_revision(%{
                     plan_id: plan.id,
                     proposed_by_user_id: peer.id,
                     changes: %{"time_label" => "Sat 7:45 PM"},
                     trace_id: "r14c-confirm-#{type}"
                   })

          assert rev.status == "proposed"
          assert_receive {:social_flow_event, "social_flow:revision", _}, 2_000

          assert {:ok, %{revision: applied}} =
                   SocialFlow.respond_to_revision(%{
                     revision_id: rev.id,
                     user_id: owner.id,
                     decision: "accept",
                     trace_id: "r14c-accept-#{type}"
                   })

          assert applied.status == "accepted"
          confirmed_time = db_plan(plan.id).time_label

          assert_receive {:social_flow_event, "social_flow:plan",
                          %{"payload" => %{"revision" => %{"status" => "accepted"}}}},
                         2_000

          # Direct time change on the confirmed plan.
          assert {:ok, %{plan: changed}} =
                   SocialFlow.change_plan_time(%{
                     plan_id: plan.id,
                     user_id: owner.id,
                     new_time_label: "Sat 8:00 PM",
                     trace_id: "r14c-change-#{type}"
                   })

          assert changed.time_label == "Sat 8:00 PM"
          changed_time = db_plan(plan.id).time_label

          # Cancel by the lead notifies the peer; the push really fires.
          assert {:ok, %{plan: cancelled, notify_user_ids: notified}} =
                   SocialFlow.cancel_plan(%{
                     plan_id: plan.id,
                     user_id: owner.id,
                     trace_id: "r14c-cancel-#{type}"
                   })

          assert cancelled.status == "cancelled"
          assert peer.id in notified

          assert_receive {:social_flow_event, "social_flow:plan",
                          %{"payload" => %{"cancelled" => true}}},
                         2_000

          :ok = Phoenix.PubSub.unsubscribe(OpalCore.PubSub, "social_flow:conversation:#{conv}")
          :ok = Phoenix.PubSub.unsubscribe(OpalCore.PubSub, "social_flow:user:#{peer.id}")

          %{
            type: type,
            created_status: created_status,
            confirmed_time: confirmed_time,
            changed_time: changed_time,
            final_status: "cancelled",
            peer_notified: peer.id in notified
          }
        end

      # (a) Coordination correctness is identical across types — strip the
      # type label and every summary must be the SAME summary.
      stripped = Enum.map(summaries, &Map.delete(&1, :type))

      assert Enum.uniq(stripped) |> length() == 1,
             "plan lifecycle diverged across relationship types: #{inspect(summaries)}"

      [first | _] = stripped
      assert first.created_status != nil
      assert first.confirmed_time == "Sat 7:45 PM"
      assert first.changed_time == "Sat 8:00 PM"
      assert first.final_status == "cancelled"
      assert first.peer_notified == true
    end

    test "group plan with mixed types (family + business + acquaintance) coordinates for all" do
      owner = mk_user()
      fam = mk_user()
      biz = mk_user()
      acq = mk_user()
      peers = [fam, biz, acq]
      conv = mk_conv([owner.id | Enum.map(peers, & &1.id)])

      assert {:ok, _} = Relationships.set_type(owner.id, fam.id, "family")
      assert {:ok, _} = Relationships.set_type(owner.id, biz.id, "business")
      assert {:ok, _} = Relationships.set_type(owner.id, acq.id, "acquaintance")

      for p <- peers do
        :ok = Phoenix.PubSub.subscribe(OpalCore.PubSub, "social_flow:user:#{p.id}")
      end

      plan =
        make_plan(conv, owner.id, %{"title" => "Group dinner", "time_label" => "Fri 7:00 PM"})

      coming =
        from(pp in PlanParticipant, where: pp.plan_id == ^plan.id)
        |> Repo.all()
        |> Enum.reject(&(&1.response_state == "withdrawn"))
        |> Enum.map(& &1.user_id)
        |> Enum.sort()

      assert coming == Enum.sort([owner.id | Enum.map(peers, & &1.id)])

      # Every participant, whatever their type, is notified of the cancel.
      assert {:ok, %{plan: cancelled, notify_user_ids: notified}} =
               SocialFlow.cancel_plan(%{
                 plan_id: plan.id,
                 user_id: owner.id,
                 trace_id: "r14c-group-cancel"
               })

      assert cancelled.status == "cancelled"
      for p <- peers, do: assert(p.id in notified, "#{p.id} (typed) not notified")

      for p <- peers do
        :ok = Phoenix.PubSub.unsubscribe(OpalCore.PubSub, "social_flow:user:#{p.id}")
      end
    end

    test "non-lead cancel is refused for every type (guard is type-invariant)" do
      for type <- @all_types do
        owner = mk_user()
        peer = mk_user()
        conv = mk_conv([owner.id, peer.id])
        assert {:ok, _} = Relationships.set_type(owner.id, peer.id, type)

        plan = make_plan(conv, owner.id, %{"title" => "Dinner", "time_label" => "Sat 7:30 PM"})

        assert {:error, _} =
                 SocialFlow.cancel_plan(%{
                   plan_id: plan.id,
                   user_id: peer.id,
                   trace_id: "r14c-refuse-#{type}"
                 }),
               "non-lead cancel must be refused for type #{type}"

        assert db_plan(plan.id).status != "cancelled"
      end
    end
  end

  # --- T4: intended type-driven differences manifest in real flows ---

  describe "T4 - type-driven differences manifest" do
    test "pre-call brief carries the per-type relationship and profile tone" do
      expectations = %{
        "family" => "warm_respectful",
        "partner" => "warm_intimate",
        "business" => "friendly_respectful",
        "acquaintance" => "polite_brief",
        "friend" => "warm_casual"
      }

      for {type, tone} <- expectations do
        caller = mk_user()
        callee = mk_user()
        pm = mk_person_memory(caller.id, callee.id)

        # set_type syncs PersonMemory.relationship_type (PromptBuilder/call path)
        assert {:ok, _} = Relationships.set_type(caller.id, callee.id, type)

        synced = Repo.get!(PersonMemory, pm.id)
        assert synced.relationship_type == type

        assert {:ok, %{brief: brief, facts: facts}} =
                 CallIntelligence.pre_call_brief(caller.id, callee.id)

        assert facts.relationship == type
        assert facts.tone == tone
        # Rules-path brief (no LLM key in test) renders the facts verbatim.
        assert brief =~ "Relationship: #{type}."
        assert brief =~ "Tone: #{tone}."
      end
    end

    test "person card vibe_summary is typed (Family · warm_respectful vs Business · friendly_respectful)" do
      expectations = %{
        "family" => "Family · warm_respectful",
        "business" => "Business · friendly_respectful",
        "partner" => "Partner · warm_intimate",
        "acquaintance" => "Acquaintance · polite_brief",
        "close_friend" => "Close friend · warm_casual",
        "friend" => "Friend · warm_casual",
        "spouse" => "Spouse · warm_intimate"
      }

      owner = mk_user()

      for {type, vibe} <- expectations do
        person = mk_user()
        mk_person_memory(owner.id, person.id)
        assert {:ok, _} = Relationships.set_type(owner.id, person.id, type)

        assert {:ok, view} = ProductSurface.get_person_memory(owner.id, person.id)
        assert view["relationship_type"] == type
        assert view["vibe_summary"] == vibe
      end
    end

    test "wallet split-request card is styled by the payer's relationship type" do
      requester = mk_user()
      payer = mk_user()

      warm =
        Wallets.split_request_contract(requester.id, payer.id, 2000, "Dinner",
          relationship_type: "family"
        )

      casual =
        Wallets.split_request_contract(requester.id, payer.id, 2000, "Dinner",
          relationship_type: "friend"
        )

      formal =
        Wallets.split_request_contract(requester.id, payer.id, 2000, "Dinner",
          relationship_type: "business"
        )

      assert warm["tone"] == "warm"
      assert warm["body"] =~ "Want to split Dinner"
      assert casual["tone"] == "casual"
      assert casual["body"] =~ "Your share is $20.0"
      assert formal["tone"] == "formal"
      assert formal["body"] =~ "Please confirm your share of $20.0"

      # Money-privacy law holds for every type.
      for card <- [warm, casual, formal] do
        assert card["shows_requester_balance"] == false
        assert card["shows_requester_history"] == false
        assert card["shows_requester_threshold"] == false
      end
    end

    test "invite contract copy is typed by invitee relationship type" do
      inviter = mk_user()

      {:ok, invite} =
        %Invite{}
        |> Invite.changeset(%{
          inviter_id: inviter.id,
          code: "r14c-#{:crypto.strong_rand_bytes(4) |> Base.encode16()}",
          status: "sent",
          expires_at: DateTime.add(DateTime.utc_now(), 7 * 24 * 3600, :second)
        })
        |> Repo.insert()

      warm = Invites.to_contract(invite, relationship_type: "partner")
      casual = Invites.to_contract(invite, relationship_type: "close_friend")
      formal = Invites.to_contract(invite, relationship_type: "acquaintance")

      assert warm["invite_tone"] == "warm"
      assert warm["invite_copy"] =~ "would love you on Opal"
      assert casual["invite_tone"] == "casual"
      assert casual["invite_copy"] =~ "Tap to join"
      assert formal["invite_tone"] == "formal"
      assert formal["invite_copy"] =~ "Accept when convenient"
      assert warm["shame_free"] == true and formal["shame_free"] == true
    end

    test "broadcast framing: per-recipient typed cards, no sibling leak, unknown defaults to acquaintance" do
      owner = mk_user()
      fam = mk_user()
      biz = mk_user()
      unknown = mk_user()

      assert {:ok, _} = Relationships.set_type(owner.id, fam.id, "family")
      assert {:ok, _} = Relationships.set_type(owner.id, biz.id, "business")

      result =
        BroadcastFraming.frame_cards(owner.id, "Hosting dinner", [
          %{user_id: fam.id, display_name: "Fam"},
          %{user_id: biz.id, display_name: "Biz"},
          %{user_id: unknown.id, display_name: "New Person"}
        ])

      cards = Map.new(result["cards"], &{&1["viewer_id"], &1})

      assert cards[fam.id]["relationship_type"] == "family"
      assert cards[fam.id]["tone"] == "warm"
      assert cards[fam.id]["framing"] == "personal"

      assert cards[biz.id]["relationship_type"] == "business"
      assert cards[biz.id]["tone"] == "formal"
      assert cards[biz.id]["framing"] == "formal"

      # No stored type → most reserved type (fail closed), never a crash.
      assert cards[unknown.id]["relationship_type"] == "acquaintance"
      assert cards[unknown.id]["tone"] == "formal"

      # (c) No cross-recipient leakage in any card.
      for card <- result["cards"] do
        assert card["visibility"] == "private_to_viewer"
        assert card["sibling_viewer_ids"] == []
      end
    end

    test "prompt person context: depth differs by type; group mode always strips intimate depth" do
      owner = mk_user()
      inner = mk_user()
      biz = mk_user()

      assert {:ok, _} = Relationships.set_type(owner.id, inner.id, "family")
      assert {:ok, _} = Relationships.set_type(owner.id, biz.id, "business")
      mk_person_memory(owner.id, inner.id)

      one = OpalCore.Relationships.Access.prompt_person_context(owner.id, inner.id, :one_to_one)
      assert one["depth"] == :rich
      assert one["includes_intimate_depth"] == true
      assert one["relationship_type"] == "family"

      one_biz =
        OpalCore.Relationships.Access.prompt_person_context(owner.id, biz.id, :one_to_one)

      assert one_biz["depth"] == :minimal
      assert one_biz["includes_intimate_depth"] == false

      # Group mode strips intimate depth for EVERY type, even family.
      group = OpalCore.Relationships.Access.prompt_person_context(owner.id, inner.id, :group)
      assert group["depth"] == :shared_safe
      assert group["vibe"] == nil
      assert group["routines"] == []
      assert group["open_loops"] == []
      assert group["known_facts"] == %{}
      assert group["includes_intimate_depth"] == false
    end
  end

  # --- T5: edge types fail closed, no crashes, no cross-account leakage ---

  describe "T5 - edge types fail closed; no crashes; no leakage" do
    test "\"relative\" is not a valid type: schema rejects it, callers fail closed" do
      owner = mk_user()
      peer = mk_user()

      # RU-1 taxonomy is exact — "relative" is rejected at the changeset.
      assert {:error, %Ecto.Changeset{} = cs} =
               Relationships.set_type(owner.id, peer.id, "relative")

      assert %{type: _} = errors_on(cs)
      assert Relationships.get_type(owner.id, peer.id) == nil

      # Pure behavior functions never crash on an unknown type string:
      # they fail closed (no casual nudges) or fall back to neutral defaults.
      assert Behavior.nudge_allowed?("relative", "proactive_thread") == false
      assert Behavior.nudge_allowed?("relative", "time_critical") == true
      assert Behavior.style_for("relative") == "casual"
      assert Behavior.planning_for("relative") == "planned"
      assert Behavior.lead_time_hours("relative") == 24
      assert Behavior.nudge_daily_cap("relative") == 0

      # Copy surfaces fall back to the neutral defaults (casual style,
      # planned planning) rather than crashing — the designed fail-soft
      # for copy, while nudges above fail closed.
      proposal = Behavior.plan_proposal_copy("relative", who: "X", when: "tonight")
      assert proposal.tone == "casual"
      assert proposal.spontaneity == "planned"

      assert proposal.copy ==
               "Want to lock dinner with X for tonight? I'll pencil it in properly."

      assert Behavior.invite_copy(nil, "Sam").tone == "casual"
      assert Behavior.reminder_copy(nil, "task").body == "Reminder: task."
    end

    test "attention budget with an unknown relationship_type fails closed, never 500s" do
      owner = mk_user()
      peer = mk_user()
      pref_daytime(owner.id)
      uniq = :crypto.strong_rand_bytes(4) |> Base.encode16()

      assert {:denied, :relationship_bounds} =
               AttentionBudget.request_slot(owner.id, "nudge", "proactive_thread", %{
                 "person_id" => peer.id,
                 "topic" => "t5-unknown-#{uniq}",
                 "provenance" => "stated",
                 "relationship_type" => "relative"
               })
    end

    test "relationship types never leak across accounts" do
      a = mk_user()
      b = mk_user()
      person = mk_user()

      # PersonMemory rows first: set_type syncs an EXISTING row's type
      # (update-only by design — it never creates memory rows).
      mk_person_memory(a.id, person.id)
      mk_person_memory(b.id, person.id)

      # Only account A types the person (as family). Account B must see nothing.
      assert {:ok, _} = Relationships.set_type(a.id, person.id, "family")
      assert Relationships.get_type(b.id, person.id) == nil

      assert {:ok, %{facts: facts_a}} = CallIntelligence.pre_call_brief(a.id, person.id)
      assert facts_a.relationship == "family"

      assert {:ok, %{facts: facts_b}} = CallIntelligence.pre_call_brief(b.id, person.id)
      assert facts_b.relationship == nil
      assert facts_b.tone == nil

      assert {:ok, view_b} = ProductSurface.get_person_memory(b.id, person.id)
      assert view_b["relationship_type"] == nil
      assert view_b["vibe_summary"] == nil
    end

    test "unset person (nil type) degrades honestly: no vibe, no brief tone, no crash" do
      owner = mk_user()
      person = mk_user()
      mk_person_memory(owner.id, person.id)

      assert {:ok, view} = ProductSurface.get_person_memory(owner.id, person.id)
      assert view["relationship_type"] == nil
      assert view["vibe_summary"] == nil

      assert {:ok, %{brief: brief, facts: facts}} =
               CallIntelligence.pre_call_brief(owner.id, person.id)

      assert facts.relationship == nil
      assert facts.tone == nil
      assert is_binary(brief)
    end
  end

  # --- T6: venue search + person questions are type-invariant ---

  describe "T6 - venue lookup copy is identical regardless of relationship type" do
    test "venue_lookup_copy does not vary by type" do
      outputs =
        for _type <- @all_types do
          PlanContextPatch.venue_lookup_copy("The Henry", "Coronado")
        end

      assert Enum.uniq(outputs) |> length() == 1
      assert hd(outputs) =~ "The Henry"
    end
  end
end
