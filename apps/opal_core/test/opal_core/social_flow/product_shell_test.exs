defmodule OpalCore.SocialFlow.ProductShellTest do
  use OpalCore.DataCase

  alias OpalCore.{Fixtures, FixturesHelper}
  alias OpalCore.Messaging.ConversationMember
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.{Family, ProductShell, TrustSafety}

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

  test "primary navigation is four destinations only" do
    nav = ProductShell.primary_navigation()
    assert length(nav["destinations"]) == 4
    assert nav["max_primary"] == 4
    assert "signals" in nav["not_primary_tabs"]
    assert "ai" in nav["not_primary_tabs"]
    assert nav["conversation_is_primary_work_surface"]
  end

  test "Journey B: returning user Home needs you and quiet success" do
    alex = Fixtures.user_alex_id()
    conv = Fixtures.conv_alex_jordan_id()
    ensure_members!(conv, [alex, Fixtures.user_jordan_id()])

    assert :ok = ProductShell.seed_journey_b_home!(alex, conv)

    home = ProductShell.home_snapshot(%{user_id: alex, display_name: "Alex"})
    assert home["greeting"] =~ "Alex"
    assert home["no_engagement_counts"]
    assert home["no_relationship_ranking"]
    assert home["no_streaks"]
    assert length(home["needs_you"]) == 2
    titles = Enum.map(home["needs_you"], & &1["title"])
    assert "Book the restaurant." in titles
    assert Enum.any?(titles, &String.contains?(&1, "area"))
    assert Enum.any?(home["coming_up"], &(&1["title"] =~ "Dinner"))

    # complete reminder
    rem = Enum.find(home["needs_you"], &(&1["title"] =~ "restaurant"))
    assert {:ok, _} = ProductShell.complete_needs_you(%{item_id: rem["id"], owner_user_id: alex})

    q = Enum.find(home["needs_you"], &String.contains?(&1["title"], "area"))
    assert {:ok, _} = ProductShell.complete_needs_you(%{item_id: q["id"], owner_user_id: alex})

    home2 = ProductShell.home_snapshot(%{user_id: alex, display_name: "Alex"})
    assert home2["needs_you"] == []
    assert home2["needs_you_empty_copy"] == "Nothing needs you right now."
    assert home2["quiet_success"]
  end

  test "Journey A path: invitation to plan surfaces on Home and Plans" do
    # Use fixture users as connected pair
    alex = Fixtures.user_alex_id()
    jordan = Fixtures.user_jordan_id()
    conv = Fixtures.conv_alex_jordan_id()
    ensure_members!(conv, [alex, jordan])

    assert {:ok, _, :created} =
             ProductShell.upsert_coming_up(%{
               owner_user_id: alex,
               title: "Dinner with Jordan",
               when_label: "Thursday at 7:00 PM",
               who_label: "Jordan",
               state: "upcoming",
               conversation_id: conv,
               idempotency_key: "cu-a-dinner"
             })

    assert {:ok, _, :created} =
             ProductShell.upsert_coming_up(%{
               owner_user_id: jordan,
               title: "Dinner with Alex",
               when_label: "Thursday at 7:00 PM",
               who_label: "Alex",
               state: "upcoming",
               conversation_id: conv,
               idempotency_key: "cu-a-dinner-j"
             })

    home = ProductShell.home_snapshot(%{user_id: alex})
    assert Enum.any?(home["coming_up"], &(&1["when_label"] =~ "Thursday"))

    plans = ProductShell.plans_snapshot(alex)
    assert plans["no_kanban"]
    assert plans["no_progress_percent"]
    assert Enum.any?(plans["upcoming"], &(&1["title"] =~ "Dinner"))

    # no duplicate coming_up on re-upsert
    assert {:ok, _, :idempotent} =
             ProductShell.upsert_coming_up(%{
               owner_user_id: alex,
               title: "Dinner with Jordan",
               when_label: "Thursday at 7:00 PM",
               idempotency_key: "cu-a-dinner"
             })

    home2 = ProductShell.home_snapshot(%{user_id: alex})
    dinners = Enum.filter(home2["coming_up"], &(&1["title"] =~ "Dinner with Jordan"))
    assert length(dinners) == 1
  end

  test "Journey C: private constraints do not leak; outsider denied" do
    alex = Fixtures.user_alex_id()
    taylor = Fixtures.user_taylor_id()
    conv = Fixtures.conv_group_friends_id()

    ensure_members!(conv, [
      alex,
      Fixtures.user_jordan_id(),
      Fixtures.user_maya_id(),
      Fixtures.user_chris_id()
    ])

    assert {:ok, _, :created} =
             ProductShell.upsert_coming_up(%{
               owner_user_id: alex,
               title: "Saturday group dinner",
               when_label: "Saturday after 7",
               state: "needs_confirmation",
               conversation_id: conv,
               idempotency_key: "cu-c-group"
             })

    home = ProductShell.home_snapshot(%{user_id: alex})
    assert Enum.any?(home["coming_up"], &(&1["title"] =~ "Saturday"))

    # Taylor is not a participant — projection of Alex's home is owner-scoped
    assert ProductShell.projection_denied_for_outsider?(taylor, alex)

    # Chris private reminder only on Chris home
    chris = Fixtures.user_chris_id()

    assert {:ok, _, :created} =
             ProductShell.upsert_needs_you(%{
               owner_user_id: chris,
               source_type: "due_reminder",
               title: "Bring gift bag.",
               explanation: "Private reminder",
               privacy_class: "private",
               idempotency_key: "ny-c-chris"
             })

    chris_home = ProductShell.home_snapshot(%{user_id: chris})
    alex_home = ProductShell.home_snapshot(%{user_id: alex})
    assert Enum.any?(chris_home["needs_you"], &(&1["title"] =~ "gift"))
    refute Enum.any?(alex_home["needs_you"], &(&1["title"] =~ "gift"))
  end

  test "Journey D: family guardian and youth homes filter private reminders" do
    marcus = Fixtures.user_marcus_id()
    evelyn = Fixtures.user_evelyn_id()
    olivia = Fixtures.user_olivia_id()
    conv = Fixtures.conv_family_carter_id()

    {:ok, fam, _} =
      Family.create_family_context(%{
        label: "Carter SF11",
        idempotency_key: "fam-sf11-#{System.unique_integer([:positive])}"
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
      idempotency_key: "gr-#{fam.id}"
    })

    ensure_members!(conv, [marcus, olivia])
    assert :ok = ProductShell.seed_journey_d_family!(marcus, olivia, conv)

    m_home = ProductShell.home_snapshot(%{user_id: marcus, display_name: "Marcus"})
    o_home = ProductShell.home_snapshot(%{user_id: olivia, display_name: "Olivia"})

    assert m_home["role_context"]["kind"] == "guardian"
    assert o_home["role_context"]["kind"] == "youth"
    assert Enum.any?(m_home["needs_you"], &(&1["title"] =~ "pickup"))
    refute Enum.any?(m_home["needs_you"], &(&1["title"] =~ "soccer"))
    assert Enum.any?(o_home["needs_you"], &(&1["title"] =~ "soccer"))
  end

  test "Journey E–F: discovery and live plan states on Plans and Home" do
    alex = Fixtures.user_alex_id()
    conv = Fixtures.conv_alex_jordan_id()

    assert {:ok, _, :created} =
             ProductShell.upsert_coming_up(%{
               owner_user_id: alex,
               title: "Dinner Saturday",
               when_label: "Saturday at 8:00 PM",
               where_label: nil,
               state: "upcoming",
               conversation_id: conv,
               idempotency_key: "cu-e-dinner"
             })

    assert {:ok, _, :created} =
             ProductShell.upsert_needs_you(%{
               owner_user_id: alex,
               source_type: "discovery_option",
               title: "Location is still open.",
               explanation: "Would you like options?",
               primary_action: "See options",
               conversation_id: conv,
               idempotency_key: "ny-e-loc"
             })

    # select venue
    assert {:ok, _, :idempotent} =
             ProductShell.upsert_coming_up(%{
               owner_user_id: alex,
               title: "Dinner Saturday",
               when_label: "Saturday at 8:00 PM",
               where_label: "Harbor Table",
               state: "live",
               conversation_id: conv,
               idempotency_key: "cu-e-dinner"
             })

    assert {:ok, _, :created} =
             ProductShell.record_recent_change(%{
               owner_user_id: alex,
               title: "Venue selected",
               explanation: "Harbor Table",
               conversation_id: conv,
               idempotency_key: "rc-e-venue"
             })

    home = ProductShell.home_snapshot(%{user_id: alex})
    assert Enum.any?(home["coming_up"], &(&1["where_label"] == "Harbor Table"))
    assert Enum.any?(home["recent_changes"], &(&1["title"] =~ "Venue"))

    # live readiness
    assert {:ok, _, :created} =
             ProductShell.upsert_needs_you(%{
               owner_user_id: alex,
               source_type: "plan_response",
               title: "Transportation is still open.",
               explanation: "Something still needed for tonight.",
               conversation_id: conv,
               idempotency_key: "ny-f-transport"
             })

    home_f = ProductShell.home_snapshot(%{user_id: alex})
    assert Enum.any?(home_f["needs_you"], &(&1["title"] =~ "Transportation"))

    transport = Enum.find(home_f["needs_you"], &(&1["title"] =~ "Transportation"))

    assert {:ok, _} =
             ProductShell.complete_needs_you(%{item_id: transport["id"], owner_user_id: alex})
  end

  test "Journey G: block reflects in conversation composer and chats" do
    olivia = Fixtures.user_olivia_id()
    noah = Fixtures.user_noah_id()
    conv = Fixtures.conv_family_carter_id()
    ensure_members!(conv, [olivia, noah])

    assert {:ok, _, :created} =
             TrustSafety.create_block(%{
               blocker_user_id: olivia,
               blocked_user_id: noah,
               idempotency_key: "blk-sf11-g"
             })

    assert {:ok, snap} =
             ProductShell.conversation_snapshot(%{user_id: olivia, conversation_id: conv})

    assert snap["safety_state"] == "blocked"
    assert snap["composer_state"]["state"] == "blocked"
    assert snap["composer_state"]["calm"]

    chats = ProductShell.chats_snapshot(%{user_id: olivia})
    entry = Enum.find(chats["chats"], &(&1["conversation_id"] == conv))
    assert entry["safety_state"] == "blocked"
    assert entry["no_relationship_score"]
  end

  test "Journey H: continuity prompt is calm single Home item" do
    alex = Fixtures.user_alex_id()

    assert {:ok, _, :created} =
             ProductShell.upsert_needs_you(%{
               owner_user_id: alex,
               source_type: "tradition",
               title: "Start planning this year’s October trip?",
               explanation: "An approved tradition is eligible again.",
               primary_action: "Start",
               secondary_action: "Remind later",
               privacy_class: "private",
               urgency_class: "low",
               idempotency_key: "ny-h-oct"
             })

    # duplicate suppressed by idempotency
    assert {:ok, _, :idempotent} =
             ProductShell.upsert_needs_you(%{
               owner_user_id: alex,
               source_type: "tradition",
               title: "Start planning this year’s October trip?",
               explanation: "An approved tradition is eligible again.",
               primary_action: "Start",
               idempotency_key: "ny-h-oct"
             })

    home = ProductShell.home_snapshot(%{user_id: alex})
    cont = Enum.filter(home["needs_you"], &(&1["title"] =~ "October"))
    assert length(cont) == 1
    refute ProductShell.prohibited_shell_copy?(hd(cont)["title"])
    assert ProductShell.signal_family("tradition") == "continuity"
  end

  test "Needs you max three and prohibited copy" do
    alex = Fixtures.user_alex_id()

    for n <- 1..5 do
      ProductShell.upsert_needs_you(%{
        owner_user_id: alex,
        source_type: "needs_answer",
        title: "Item #{n} needs a reply.",
        explanation: "Open loop #{n}",
        idempotency_key: "ny-max-#{n}"
      })
    end

    needs = ProductShell.unified_needs_you(alex)
    assert length(needs) <= 3
    assert ProductShell.prohibited_shell_copy?("streak at risk")
    refute ProductShell.prohibited_shell_copy?("Nothing needs you right now.")
  end

  test "You snapshot and conversation membership enforcement" do
    alex = Fixtures.user_alex_id()
    you = ProductShell.you_snapshot(%{user_id: alex})
    assert you["privacy"]["private_by_default"]
    assert you["safety_summary"]["no_behavior_score"]
    assert you["no_settings_maze"]

    assert {:error, :forbidden} =
             ProductShell.conversation_snapshot(%{
               user_id: alex,
               conversation_id: Fixtures.conv_maya_chris_id()
             })
  end

  test "signal families cover product taxonomy" do
    assert ProductShell.signal_family("possible_plan") == "possibility"
    assert ProductShell.signal_family("needs_answer") == "needs_action"
    assert ProductShell.signal_family("plan_changed") == "change"
    assert ProductShell.signal_family("completion_ack") == "completion"
    assert ProductShell.signal_family("block") == "safety"
  end
end
