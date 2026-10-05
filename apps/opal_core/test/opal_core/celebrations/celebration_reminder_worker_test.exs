defmodule OpalCore.Celebrations.CelebrationReminderWorkerTest do
  use OpalCore.DataCase, async: false
  use Oban.Testing, repo: OpalCore.Repo

  import Ecto.Query

  alias OpalCore.Accounts.User
  alias OpalCore.Celebrations
  alias OpalCore.Celebrations.Celebration
  alias OpalCore.Celebrations.CelebrationReminderWorker
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.AttentionCenterItem

  defp user!(prefix) do
    %User{}
    |> User.changeset(%{
      handle: "#{prefix}-#{System.unique_integer([:positive])}",
      display_name: prefix
    })
    |> Repo.insert!()
  end

  defp celebration!(user, attrs) do
    {:ok, c} =
      Celebrations.create(
        user.id,
        Map.merge(
          %{"person_name" => "Maya", "kind" => "birthday", "month" => 6, "day" => 15},
          attrs
        )
      )

    c
  end

  defp attention_for(user_id) do
    from(i in AttentionCenterItem,
      where: i.owner_user_id == ^user_id,
      where: i.source_type == "celebration",
      select: {i.level, i.title, i.copy, i.dedupe_key}
    )
    |> Repo.all()
  end

  test "14-day milestone → attention item with calm copy" do
    u = user!("w14")
    # today = Jun 1 → birthday Jun 15 is 14 days away
    c = celebration!(u, %{"month" => 6, "day" => 15})

    assert {:ok, 1} = CelebrationReminderWorker.remind_one(c, ~D[2026-06-01])

    items = attention_for(u.id)
    assert length(items) == 1
    {level, title, copy, key} = hd(items)
    assert level == "attention"
    assert title == "Maya's birthday is in 2 weeks"
    assert copy =~ "Want to plan something?"
    assert key == "celebration:#{c.id}:2026:14"

    c2 = Repo.get!(Celebration, c.id)
    assert Celebrations.already_reminded?(c2, 2026, 14)
  end

  test "7-day and 1-day milestones → urgent" do
    u = user!("w7")
    c = celebration!(u, %{"month" => 6, "day" => 15})

    assert {:ok, 1} = CelebrationReminderWorker.remind_one(c, ~D[2026-06-08])
    [{level7, title7, _, _}] = attention_for(u.id)
    assert level7 == "urgent"
    assert title7 == "Maya's birthday is in a week"

    # clear and test 1-day on fresh celebration
    u2 = user!("w1")
    c2 = celebration!(u2, %{"month" => 6, "day" => 15})
    assert {:ok, 1} = CelebrationReminderWorker.remind_one(c2, ~D[2026-06-14])
    [{level1, title1, _, _}] = attention_for(u2.id)
    assert level1 == "urgent"
    assert title1 == "Maya's birthday is tomorrow"
  end

  test "idempotent — second run does not double-send" do
    u = user!("widem")
    c = celebration!(u, %{"month" => 6, "day" => 15})

    assert {:ok, 1} = CelebrationReminderWorker.remind_one(c, ~D[2026-06-01])
    c = Repo.get!(Celebration, c.id)
    assert {:ok, 0} = CelebrationReminderWorker.remind_one(c, ~D[2026-06-01])
    assert length(attention_for(u.id)) == 1
  end

  test "past date this year skips until next year's window" do
    u = user!("wpast")
    # Birthday Jun 15; today Jun 20 → next is 2027-06-15 (~360 days) — not 14/7/1
    c = celebration!(u, %{"month" => 6, "day" => 15})
    assert {:ok, 0} = CelebrationReminderWorker.remind_one(c, ~D[2026-06-20])
    assert attention_for(u.id) == []
  end

  test "year-boundary December celebration in January is far, not negative" do
    u = user!("wyb")
    c = celebration!(u, %{"month" => 12, "day" => 15})
    assert Celebrations.days_until(c, ~D[2026-01-10]) > 300
    assert {:ok, 0} = CelebrationReminderWorker.remind_one(c, ~D[2026-01-10])
    assert attention_for(u.id) == []
  end

  test "perform/1 with today arg processes batch" do
    u = user!("wbatch")
    _c = celebration!(u, %{"month" => 6, "day" => 15})

    assert :ok =
             perform_job(CelebrationReminderWorker, %{"today" => "2026-06-01"})

    assert length(attention_for(u.id)) == 1
  end

  test "anniversary kind uses anniversary in copy" do
    u = user!("wann")
    c = celebration!(u, %{"person_name" => "Sam", "kind" => "anniversary", "month" => 6, "day" => 15})

    assert {:ok, 1} = CelebrationReminderWorker.remind_one(c, ~D[2026-06-01])
    [{_, title, _, _}] = attention_for(u.id)
    assert title == "Sam's anniversary is in 2 weeks"
  end
end
