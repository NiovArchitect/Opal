defmodule OpalCore.SocialFlow.DateTimeChangeTest do
  use ExUnit.Case, async: true

  alias OpalCore.SocialFlow.{ConversationAlignment, DateTimeChange}

  @ctx %{"exact_time" => "6:00 PM", "date" => "tomorrow", "reference_on" => "2026-09-27"}

  test "scoped 7 PM keeps the date and proposes 7:00 PM" do
    assert {:change, change} = DateTimeChange.interpret("7 PM", @ctx, scoped: true)
    assert change["exact_time"]["value"] == "7:00 PM"
    assert change["date"] == nil
    assert change["approximate"] == false
  end

  test "scoped bare 7 inherits the evening" do
    assert {:change, change} = DateTimeChange.interpret("7", @ctx, scoped: true)
    assert change["exact_time"]["value"] == "7:00 PM"
    assert change["date"] == nil
  end

  test "chat bare 7 asks instead of guessing" do
    assert {:clarify, prompt} = DateTimeChange.interpret("7", @ctx, scoped: false)
    assert prompt =~ "7:00 PM"
  end

  test "7 p.m. and change time to 7 p.m. are the same time change" do
    assert {:change, a} = DateTimeChange.interpret("7 p.m.", @ctx, scoped: false)
    assert {:change, b} = DateTimeChange.interpret("Change Time to 7 p.m.", @ctx, scoped: false)
    assert a["exact_time"]["value"] == "7:00 PM"
    assert b["exact_time"]["value"] == "7:00 PM"
    assert a["date"] == nil
  end

  test "Friday preserves time and resolves a calendar date" do
    assert {:change, change} = DateTimeChange.interpret("Friday", @ctx, scoped: true)
    assert change["date"]["value"] == "Friday"
    assert change["date"]["resolved_on"] == "2026-10-02"
    assert change["date"]["timezone"] == "America/Los_Angeles"
    assert change["exact_time"] == nil
  end

  test "Friday at 7 changes date and time" do
    assert {:change, change} = DateTimeChange.interpret("Friday at 7", @ctx, scoped: true)
    assert change["date"]["value"] == "Friday"
    assert change["exact_time"]["value"] == "7:00 PM"
    assert change["summary"] == "Friday at 7:00 PM"
  end

  test "after 7 and between 6 and 8 are windows, not exact locks" do
    assert {:change, later} = DateTimeChange.interpret("after 7", @ctx, scoped: true)
    assert later["time_window"]["value"] == "after 7 PM"
    assert later["exact_time"]["state"] == "unknown"

    assert {:change, between} = DateTimeChange.interpret("between 6 and 8", @ctx, scoped: true)
    assert between["time_window"]["start"] == "6:00"
    assert between["time_window"]["end"] == "8:00"
    assert between["exact_time"]["value"] == nil
  end

  test "7ish stays approximate and next week is not an invented date" do
    assert {:change, ish} = DateTimeChange.interpret("7ish", @ctx, scoped: true)
    assert ish["approximate"] == true
    assert ish["exact_time"]["state"] == "approximate"

    assert {:change, week} = DateTimeChange.interpret("next week sometime", @ctx, scoped: true)
    assert week["date"] == nil
    assert week["date_constraint"]["polarity"] == "unresolved"
  end

  test "not Tuesday is a negative constraint and later asks one question" do
    assert {:change, banned} = DateTimeChange.interpret("not Tuesday", @ctx, scoped: true)
    assert banned["date_constraint"]["polarity"] == "negative"
    assert banned["date"] == nil

    assert {:clarify, prompt} = DateTimeChange.interpret("later", @ctx, scoped: true)
    assert prompt =~ "time"
  end

  test "nevermind keep 6 closes the proposal" do
    assert :keep = DateTimeChange.interpret("actually nevermind keep 6", @ctx, scoped: true)
  end

  test "a calendar selection stays absolute and is not the word tomorrow" do
    assert {:ok, change} =
             DateTimeChange.from_controls(%{
               "date" => "2026-09-29",
               "time" => "19:30",
               "timezone" => "America/Los_Angeles"
             })

    assert change["resolved_on"] == "2026-09-29"
    assert change["local_time"] == "19:30"
    assert change["timezone"] == "America/Los_Angeles"
    assert change["exact_time"]["value"] == "7:30 PM"
    assert change["summary"] =~ "Sep 29"
    assert change["summary"] =~ "7:30 PM"
    refute change["summary"] =~ "tomorrow"
  end

  test "replaying a canonical proposal does not re-parse tomorrow" do
    proposal =
      ConversationAlignment.fold(
        [
          %{id: "1", body: "Can you meet tomorrow?"},
          %{id: "2", body: "Any time after 6 works."},
          %{id: "3", body: "Let's do 6:30."}
        ],
        ["user-a", "user-b"],
        [
          %{
            "kind" => "activity_lock",
            "actor_user_id" => "user-a",
            "value" => "dinner",
            "seq" => 10,
            "explicit" => true
          },
          %{
            "kind" => "place_propose",
            "actor_user_id" => "user-a",
            "value" => "Herb & Wood",
            "seq" => 11,
            "explicit" => true
          },
          %{
            "kind" => "place_confirm",
            "actor_user_id" => "user-b",
            "value" => "Herb & Wood",
            "seq" => 12,
            "explicit" => true
          },
          %{
            "kind" => "change_propose",
            "field" => "datetime",
            "proposal_id" => "p-123",
            "actor_user_id" => "user-b",
            "value" => "Tuesday · Sep 29 · 7:30 PM",
            "resolved_on" => "2026-09-29",
            "local_time" => "19:30",
            "timezone" => "America/Los_Angeles",
            "date" => %{"state" => "candidate", "value" => "Tuesday · Sep 29", "resolved_on" => "2026-09-29"},
            "exact_time" => %{"state" => "candidate", "value" => "7:30 PM"},
            "base_plan_version" => 0,
            "seq" => 20,
            "explicit" => true
          }
        ]
      )

    assert proposal["exact_time"]["value"] == "6:30 PM"
    assert proposal["date"]["value"] == "tomorrow"
    assert proposal["change_proposal"]["proposal_id"] == "p-123"
    assert proposal["change_proposal"]["value"] == "Tuesday · Sep 29 · 7:30 PM"
    assert proposal["change_proposal"]["resolved_on"] == "2026-09-29"
    assert proposal["change_proposal"]["local_time"] == "19:30"
    refute proposal["change_proposal"]["value"] =~ "tomorrow"
    refute proposal["change_proposal"]["value"] =~ "8:30"

    accepted =
      ConversationAlignment.fold(
        [
          %{id: "1", body: "Can you meet tomorrow?"},
          %{id: "2", body: "Any time after 6 works."},
          %{id: "3", body: "Let's do 6:30."}
        ],
        ["user-a", "user-b"],
        [
          %{
            "kind" => "activity_lock",
            "actor_user_id" => "user-a",
            "value" => "dinner",
            "seq" => 10,
            "explicit" => true
          },
          %{
            "kind" => "place_propose",
            "actor_user_id" => "user-a",
            "value" => "Herb & Wood",
            "seq" => 11,
            "explicit" => true
          },
          %{
            "kind" => "place_confirm",
            "actor_user_id" => "user-b",
            "value" => "Herb & Wood",
            "seq" => 12,
            "explicit" => true
          },
          %{
            "kind" => "change_propose",
            "field" => "datetime",
            "proposal_id" => "p-123",
            "actor_user_id" => "user-b",
            "value" => "Tuesday · Sep 29 · 7:30 PM",
            "resolved_on" => "2026-09-29",
            "local_time" => "19:30",
            "timezone" => "America/Los_Angeles",
            "date" => %{"state" => "candidate", "value" => "Tuesday · Sep 29", "resolved_on" => "2026-09-29"},
            "exact_time" => %{"state" => "candidate", "value" => "7:30 PM"},
            "base_plan_version" => 0,
            "seq" => 20,
            "explicit" => true
          },
          %{
            "kind" => "change_accept",
            "field" => "datetime",
            "proposal_id" => "p-123",
            "actor_user_id" => "user-a",
            "value" => "Tuesday · Sep 29 · 7:30 PM",
            "seq" => 21,
            "explicit" => true
          }
        ]
      )

    assert accepted["date"]["value"] == "Tuesday · Sep 29"
    assert accepted["date"]["resolved_on"] == "2026-09-29"
    assert accepted["exact_time"]["value"] == "7:30 PM"
    assert accepted["place"]["value"] == "Herb & Wood"
    assert accepted["activity"]["value"] == "Dinner"
    assert accepted["execution"]["state"] == "unknown"
    assert accepted["change_proposal"] == nil
    assert accepted["plan_version"] == 1
  end

  test "a superseded proposal id is not accepted" do
    state =
      ConversationAlignment.fold(
        [%{id: "1", body: "Can you meet tomorrow?"}, %{id: "2", body: "Let's do 6:30."}],
        ["user-a", "user-b"],
        [
          %{
            "kind" => "place_propose",
            "actor_user_id" => "user-a",
            "value" => "Herb & Wood",
            "seq" => 4,
            "explicit" => true
          },
          %{
            "kind" => "place_confirm",
            "actor_user_id" => "user-b",
            "value" => "Herb & Wood",
            "seq" => 5,
            "explicit" => true
          },
          %{
            "kind" => "change_propose",
            "field" => "datetime",
            "proposal_id" => "old",
            "actor_user_id" => "user-b",
            "value" => "Tuesday · Sep 29 · 7:00 PM",
            "date" => %{"value" => "Tuesday · Sep 29", "resolved_on" => "2026-09-29"},
            "exact_time" => %{"value" => "7:00 PM", "state" => "candidate"},
            "base_plan_version" => 0,
            "seq" => 6,
            "explicit" => true
          },
          %{
            "kind" => "change_propose",
            "field" => "datetime",
            "proposal_id" => "new",
            "actor_user_id" => "user-b",
            "value" => "Tuesday · Sep 29 · 7:30 PM",
            "date" => %{"value" => "Tuesday · Sep 29", "resolved_on" => "2026-09-29"},
            "exact_time" => %{"value" => "7:30 PM", "state" => "candidate"},
            "base_plan_version" => 0,
            "seq" => 7,
            "explicit" => true
          },
          %{
            "kind" => "change_accept",
            "proposal_id" => "old",
            "actor_user_id" => "user-a",
            "value" => "Tuesday · Sep 29 · 7:00 PM",
            "seq" => 8,
            "explicit" => true
          }
        ]
      )

    assert state["change_proposal"]["proposal_id"] == "new"
    assert state["exact_time"]["value"] == "6:30 PM"
  end

  test "ordinary agreement is not a datetime change" do
    assert :none = DateTimeChange.interpret("Yes, after 6pm works.", @ctx, scoped: false)
  end
end
