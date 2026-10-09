defmodule OpalCore.SocialFlow.VirtualPlanTest do
  use OpalCore.DataCase, async: false

  import Ecto.Query

  alias OpalCore.Accounts.User
  alias OpalCore.Messaging.{Conversation, ConversationMember}
  alias OpalCore.OpalIntent
  alias OpalCore.OpalPlanConfirm
  alias OpalCore.Repo
  alias OpalCore.SocialFlow
  alias OpalCore.SocialFlow.{AssistancePreference, MeetingLinks, PlanReminder, SharedPlan}

  setup do
    a = Ecto.UUID.generate()
    b = Ecto.UUID.generate()

    for {id, name} <- [{a, "Alex"}, {b, "Maya"}] do
      {:ok, _} =
        %User{}
        |> User.changeset(%{
          id: id,
          handle: "v_" <> String.slice(id, 0, 8),
          display_name: name
        })
        |> Repo.insert()
    end

    {:ok, conv} =
      %Conversation{}
      |> Conversation.changeset(%{label: "virtual-dyad"})
      |> Repo.insert()

    for uid <- [a, b] do
      %ConversationMember{}
      |> ConversationMember.changeset(%{conversation_id: conv.id, user_id: uid})
      |> Repo.insert!()
    end

    {:ok, a: a, b: b, conversation_id: conv.id}
  end

  test "Schedule a Zoom with Maya Tuesday → plan_create virtual, no invented URL" do
    ctx = %{
      social: %{frequent_contacts: [%{display_name: "Maya", user_id: "x"}]}
    }

    assert {:ok, intent} =
             OpalIntent.classify("Schedule a Zoom with Maya Tuesday", ctx)

    assert intent.intent == :plan_create
    assert intent.entities.plan_type == "virtual"
    assert intent.entities.what in ["Zoom", "zoom"] or intent.entities.what == "Zoom"
    assert intent.entities.when == "Tuesday"
    assert "Maya" in (intent.entities.who || [])
    refute Map.has_key?(intent.entities, :meeting_link)
    assert MeetingLinks.extract_from_text(intent.raw_text) == nil
  end

  test "pasted Zoom URL is kept; javascript: is stripped" do
    ctx = %{social: %{frequent_contacts: []}}

    assert {:ok, good} =
             OpalIntent.classify(
               "Schedule a Zoom with Maya Tuesday https://zoom.us/j/555",
               ctx
             )

    assert good.entities.plan_type == "virtual"
    assert good.entities.meeting_link == "https://zoom.us/j/555"

    assert {:ok, bad} =
             OpalIntent.classify(
               "Schedule a Zoom with Maya Tuesday javascript:alert(1)",
               ctx
             )

    assert bad.entities.plan_type == "virtual"
    refute Map.get(bad.entities, :meeting_link)
  end

  test "create virtual SharedPlan stores Online + validated link; never invents URL", %{
    a: a,
    conversation_id: cid
  } do
    assert {:ok, plan, _} =
             SocialFlow.create_tentative_plan_from_conversation(cid, a, %{
               "title" => "Zoom Tuesday with Maya",
               "time_label" => "Tuesday",
               "plan_type" => "virtual",
               "meeting_link" => "https://zoom.us/j/42"
             })

    assert plan.plan_type == "virtual"
    assert plan.location == "Online"
    assert plan.meeting_link == "https://zoom.us/j/42"

    contract = SharedPlan.to_contract(plan)
    assert contract["online"] == true
    assert contract["location"] == "Online"
    assert contract["meeting_link"] == "https://zoom.us/j/42"

    # Unsafe link is sanitized to nil — never stored, never invented
    cs =
      SharedPlan.changeset(%SharedPlan{}, %{
        title: "Bad",
        status: "tentative",
        created_by_user_id: a,
        conversation_id: cid,
        timezone: "UTC",
        plan_type: "virtual",
        meeting_link: "javascript:alert(1)"
      })

    assert Ecto.Changeset.get_change(cs, :meeting_link) in [nil] or
             is_nil(Ecto.Changeset.get_field(cs, :meeting_link))
  end

  test "virtual plan schedules join reminder with http(s) action only", %{
    a: a,
    conversation_id: cid
  } do
    assert {:ok, plan, _} =
             SocialFlow.create_tentative_plan_from_conversation(cid, a, %{
               "title" => "Zoom with Maya",
               "time_label" => "Tuesday",
               "plan_type" => "virtual",
               "meeting_link" => "https://meet.google.com/abc-defg-hij"
             })

    reminder =
      from(r in PlanReminder, where: r.plan_id == ^plan.id)
      |> Repo.one()

    assert reminder
    assert reminder.content_summary =~ "Online"
    actions = get_in(reminder.source_lineage, ["actions", "items"]) || []
    join = Enum.find(actions, &(&1["id"] == "join"))
    assert join["url"] == "https://meet.google.com/abc-defg-hij"
    refute join["url"] =~ "javascript:"
  end

  test "plan_confirm virtual uses usual link and never invents", %{a: a, b: b} do
    {:ok, _} =
      %AssistancePreference{}
      |> AssistancePreference.changeset(%{
        user_id: a,
        timezone: "America/Los_Angeles",
        usual_meeting_link: "https://zoom.us/j/usual"
      })
      |> Repo.insert()

    ctx = %{
      social: %{frequent_contacts: [%{display_name: "Maya", user_id: b}]}
    }

    assert {:ok, result} =
             OpalPlanConfirm.execute(
               a,
               %{
                 what: "Zoom",
                 when: "Tuesday",
                 who: ["Maya"],
                 plan_type: "virtual",
                 use_usual_meeting_link: true
               },
               ctx
             )

    plan = Repo.get!(SharedPlan, result.plan_id)
    assert plan.plan_type == "virtual"
    assert plan.location == "Online"
    assert plan.meeting_link == "https://zoom.us/j/usual"
    refute is_nil(plan.meeting_link)
  end

  test "virtual without link still creates Online plan with nil meeting_link", %{
    a: a,
    conversation_id: cid
  } do
    assert {:ok, plan, _} =
             SocialFlow.create_tentative_plan_from_conversation(cid, a, %{
               "title" => "Zoom Tuesday",
               "plan_type" => "virtual"
             })

    assert plan.plan_type == "virtual"
    assert plan.location == "Online"
    assert is_nil(plan.meeting_link)
    assert SharedPlan.to_contract(plan)["meeting_link"] == nil
  end
end
