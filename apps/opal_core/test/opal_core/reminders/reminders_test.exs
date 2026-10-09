defmodule OpalCore.RemindersTest do
  use OpalCore.DataCase, async: false

  alias OpalCore.Accounts.User
  alias OpalCore.Intelligence.AttentionBudget
  alias OpalCore.Reminders
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.AssistancePreference

  setup do
    account_id = Ecto.UUID.generate()

    {:ok, _} =
      %User{}
      |> User.changeset(%{
        id: account_id,
        handle: "rem_" <> String.slice(account_id, 0, 8),
        display_name: "Rem"
      })
      |> Repo.insert()

    # Daytime TZ so quiet-hours don't flake night LA CI/local runs
    {:ok, _} =
      %AssistancePreference{}
      |> AssistancePreference.changeset(%{
        user_id: account_id,
        timezone: "Asia/Tokyo",
        intelligence_maturity: "established"
      })
      |> Repo.insert()

    %{account_id: account_id}
  end

  test "create + list + cancel", %{account_id: account_id} do
    remind_at = DateTime.utc_now() |> DateTime.add(3600, :second) |> DateTime.truncate(:microsecond)

    assert {:ok, r} =
             Reminders.create(account_id, %{
               "task" => "Call Maya",
               "remind_at" => DateTime.to_iso8601(remind_at)
             })

    assert r.status == "pending"
    assert r.task == "Call Maya"

    assert {:ok, [listed]} = Reminders.list(account_id, status: "pending")
    assert listed.id == r.id

    assert {:ok, cancelled} = Reminders.cancel(account_id, r.id)
    assert cancelled.status == "cancelled"
  end

  test "natural language Thursday / in 2 hours", %{account_id: account_id} do
    assert {:ok, r1} =
             Reminders.create(account_id, %{"task" => "Send gift", "when" => "in 2 hours"})

    assert DateTime.diff(r1.remind_at, DateTime.utc_now(), :second) > 7000

    assert {:ok, r2} =
             Reminders.create(account_id, %{"task" => "Dentist", "when" => "Thursday"})

    assert r2.status == "pending"
  end

  test "recurring Tuesday creates next after deliver", %{account_id: account_id} do
    past = DateTime.utc_now() |> DateTime.add(-60, :second) |> DateTime.truncate(:microsecond)

    assert {:ok, r} =
             Reminders.create(account_id, %{
               "task" => "Team standup",
               "remind_at" => DateTime.to_iso8601(past),
               "recurrence" => "tuesday"
             })

    assert {:ok, delivered} = Reminders.deliver(r)
    assert delivered.status == "delivered"

    assert {:ok, pending} = Reminders.list(account_id, status: "pending")
    assert Enum.any?(pending, fn x -> x.task == "Team standup" and x.id != r.id end)
  end

  test "CRITICAL: reminder delivers when AttentionBudget exhausted", %{account_id: account_id} do
    # Exhaust daily budget with dummy grants.
    for i <- 1..AttentionBudget.daily_budget() do
      ref = %{person_id: "p#{i}", topic: "nudge#{i}", provenance: "stated"}
      assert {:granted, _} = AttentionBudget.request_slot(account_id, "nudge", "reminder", ref)
    end

    # Another nudge would be denied.
    assert {:denied, _} =
             AttentionBudget.request_slot(account_id, "nudge", "reminder", %{
               person_id: "extra",
               topic: "extra",
               provenance: "stated"
             })

    past = DateTime.utc_now() |> DateTime.add(-30, :second) |> DateTime.truncate(:microsecond)

    assert {:ok, r} =
             Reminders.create(account_id, %{
               "task" => "User command reminder",
               "remind_at" => DateTime.to_iso8601(past)
             })

    # Must still deliver — user command ≠ Opal nudge.
    assert {:ok, delivered} = Reminders.deliver(r)
    assert delivered.status == "delivered"
    assert delivered.overdue == true
  end

  test "past-due on fetch delivers with overdue flag", %{account_id: account_id} do
    past = DateTime.utc_now() |> DateTime.add(-120, :second) |> DateTime.truncate(:microsecond)

    assert {:ok, r} =
             Reminders.create(account_id, %{
               "task" => "Overdue task",
               "remind_at" => DateTime.to_iso8601(past)
             })

    results = Reminders.deliver_past_due(account_id)
    assert Enum.any?(results, fn {:ok, d} -> d.id == r.id and d.overdue end)
  end

  test "extractor set_reminder intent" do
    {intent, entities, _} =
      OpalCore.Intelligence.Extractor.classify_message("Remind me to call Maya in 2 hours")

    assert intent == "set_reminder"
    assert entities["task"]
    assert entities["when"]
  end
end
