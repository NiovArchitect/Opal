defmodule OpalCore.Relationships.RelationshipAccessTest do
  @moduledoc """
  Paste I Access A1–A6 — visibility, prompt stripping, nudge depth, upgrade/downgrade.
  """
  use OpalCore.DataCase, async: false

  import OpalCore.MultiuserHarness

  alias OpalCore.Intelligence.AttentionBudget
  alias OpalCore.Relationships
  alias OpalCore.Relationships.{Access, Behavior}

  @moduletag :relationship_matrix

  describe "A1 spouse vs business weekend visibility" do
    test "spouse sees partner weekend plan; business cannot (unless work-scoped or participant)" do
      partner = account!(%{display_name: "Partner"})
      spouse = account!(%{display_name: "Spouse"})
      biz = account!(%{display_name: "Colleague"})

      set_type!(spouse.id, partner.id, "spouse")
      set_type!(biz.id, partner.id, "business")

      weekend =
        create_shared_plan!(partner.id, [], %{
          title: "Saturday farmers market",
          alignment: %{"weekend" => true}
        })

      assert Access.can_see_plan?(spouse.id, weekend)
      refute Access.can_see_plan?(biz.id, weekend)

      work =
        create_shared_plan!(partner.id, [], %{
          title: "Q3 offsite planning",
          alignment: %{"scope" => "work"}
        })

      assert Access.can_see_plan?(biz.id, work)

      # Explicit participant overrides distant/work personal ban
      shared_with_biz =
        create_shared_plan!(partner.id, [biz.id], %{
          title: "Weekend brunch invite",
          alignment: %{"weekend" => true}
        })

      assert Access.can_see_plan?(biz.id, shared_with_biz)
    end
  end

  describe "A2 family porous vs outsider / private_1_1" do
    test "family sees family reunion; acquaintance cannot; family cannot see outsider private_1_1" do
      host = account!(%{display_name: "Host"})
      kin = account!(%{display_name: "Cousin"})
      outsider = account!(%{display_name: "Acquaintance"})

      set_type!(kin.id, host.id, "family")
      set_type!(outsider.id, host.id, "acquaintance")

      reunion =
        create_shared_plan!(host.id, [], %{
          title: "Family reunion picnic",
          alignment: %{"scope" => "family"}
        })

      assert Access.can_see_plan?(kin.id, reunion)
      refute Access.can_see_plan?(outsider.id, reunion)

      private =
        create_shared_plan!(outsider.id, [], %{
          title: "Private 1:1 coffee",
          alignment: %{"scope" => "private_1_1"}
        })

      # Even family toward outsider creator cannot pierce private_1_1
      set_type!(kin.id, outsider.id, "family")
      refute Access.can_see_plan?(kin.id, private)
      refute Access.can_see_plan?(host.id, private)
    end
  end

  describe "A3 business prompt strips personal context" do
    test "prompt_plan_facts for business strips personal_context / personal titles" do
      me = account!(%{display_name: "Me"})
      colleague = account!(%{display_name: "Colleague"})

      set_type!(me.id, colleague.id, "business")

      # Participant so personal plan is visible, but work tier still strips
      personal =
        create_shared_plan!(colleague.id, [me.id], %{
          title: "Anniversary dinner with Jordan",
          location: "Fort Oak",
          time_label: "Saturday 7pm",
          alignment: %{"weekend" => true}
        })

      work =
        create_shared_plan!(colleague.id, [me.id], %{
          title: "Board standup",
          location: "HQ",
          time_label: "Monday 9am",
          alignment: %{"scope" => "work"}
        })

      facts = Access.prompt_plan_facts(me.id, colleague.id, [personal, work])
      assert length(facts) == 2

      personal_fact = Enum.find(facts, &(&1["plan_id"] == personal.id))
      work_fact = Enum.find(facts, &(&1["plan_id"] == work.id))

      assert personal_fact["personal_context"] == false
      assert personal_fact["title"] == "shared work plan"
      assert personal_fact["location"] == nil
      refute String.contains?(inspect(personal_fact), "Anniversary")
      refute String.contains?(inspect(personal_fact), "Jordan")

      assert work_fact["title"] == "Board standup"
      assert work_fact["location"] == "HQ"
      assert work_fact["personal_context"] == false
    end
  end

  describe "A4 nudge_depth" do
    test "acquaintance birthday only; close_friend all true" do
      acq = Access.nudge_depth("acquaintance")
      assert acq.birthday == true
      assert acq.gift_suggestions == false
      assert acq.routine_tracking == false

      close = Access.nudge_depth("close_friend")
      assert close.birthday == true
      assert close.gift_suggestions == true
      assert close.routine_tracking == true
    end
  end

  describe "A5 upgrade friend → close_friend same session" do
    test "spontaneity unlocks; proactive nudge allowed; plan_proposal warms" do
      owner = account!(%{display_name: "Owner", timezone: "Asia/Tokyo", maturity: "established"})
      contact = account!(%{display_name: "Riley"})

      set_type!(owner.id, contact.id, "friend")
      assert Relationships.get_type(owner.id, contact.id) == "friend"
      refute Behavior.spontaneous_ok?("friend")

      before = Behavior.plan_proposal_copy("friend", who: "Riley")
      assert before.spontaneity == "planned"

      set_type!(owner.id, contact.id, "close_friend")
      assert Relationships.get_type(owner.id, contact.id) == "close_friend"
      assert Behavior.spontaneous_ok?("close_friend")
      assert Behavior.nudge_allowed?("close_friend", "proactive_thread")

      after_copy = Behavior.plan_proposal_copy("close_friend", who: "Riley")
      assert after_copy.spontaneity == "spontaneous"
      assert after_copy.copy != before.copy

      assert {:granted, _} =
               AttentionBudget.request_slot(owner.id, "nudge", "nudge", %{
                 person_id: contact.id,
                 topic: "upgrade_nudge",
                 provenance: "stated",
                 relationship_type: "close_friend"
               })
    end
  end

  describe "A6 downgrade close_friend → acquaintance" do
    test "weekend personal visibility drops immediately; copy never punitive" do
      owner = account!(%{display_name: "Owner", timezone: "Asia/Tokyo", maturity: "established"})
      contact = account!(%{display_name: "Casey"})

      set_type!(owner.id, contact.id, "close_friend")

      weekend =
        create_shared_plan!(contact.id, [], %{
          title: "Sunday hike",
          alignment: %{"weekend" => true}
        })

      assert Access.can_see_plan?(owner.id, weekend)

      set_type!(owner.id, contact.id, "acquaintance")
      assert Relationships.get_type(owner.id, contact.id) == "acquaintance"
      refute Access.can_see_plan?(owner.id, weekend)

      for type <- ~w(acquaintance close_friend friend spouse business) do
        proposal = Behavior.plan_proposal_copy(type)
        invite = Behavior.invite_copy(type, "Owner")
        reminder = Behavior.reminder_copy(type, "check in")
        blob = inspect(%{proposal: proposal, invite: invite, reminder: reminder}) |> String.downcase()
        refute String.contains?(blob, "downgraded")
      end

      assert {:denied, :relationship_bounds} =
               AttentionBudget.request_slot(owner.id, "nudge", "nudge", %{
                 person_id: contact.id,
                 topic: "acq_after_downgrade",
                 provenance: "stated",
                 relationship_type: "acquaintance"
               })
    end
  end
end
