defmodule OpalCore.SocialFlow.Repair15ProactivityTest do
  @moduledoc """
  Repair #15 (Track H) — proactivity producers.

  Before R15, TemporalFollowThrough.register/1 and
  ProductShell.upsert_coming_up/1 had NO production producers: the tick
  worker, AttentionAuthority and the Home/Plans shell all existed, but
  real plans never became loops or coming-up items. PlanCompletion.drive/3
  (already called at plan create/confirm/update) now registers both,
  idempotently, for the plan's own participants only. No notifications,
  no outbound contact, no new consent surface.
  """
  use OpalCore.DataCase, async: false

  import Ecto.Query

  alias OpalCore.Accounts.User
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.PlanCompletion
  alias OpalCore.SocialFlow.PlanParticipant
  alias OpalCore.SocialFlow.ProductShell
  alias OpalCore.SocialFlow.SharedPlan
  alias OpalCore.SocialFlow.TemporalFollowThroughLoop

  defp fresh_user do
    suffix = Ecto.UUID.generate() |> String.slice(0, 8)

    %User{}
    |> User.changeset(%{
      id: Ecto.UUID.generate(),
      handle: "r15h-#{suffix}",
      display_name: "R15H #{suffix}"
    })
    |> Repo.insert!()
  end

  defp make_plan(creator, attrs \\ %{}) do
    %SharedPlan{}
    |> SharedPlan.changeset(
      Map.merge(
        %{
          title: "Dinner plans",
          status: "agreed",
          timezone: "America/Los_Angeles",
          created_by_user_id: creator.id,
          source: "center",
          conversation_id: nil,
          alignment: %{}
        },
        attrs
      )
    )
    |> Repo.insert!()
  end

  defp add_participant(plan, user) do
    %PlanParticipant{}
    |> PlanParticipant.changeset(%{plan_id: plan.id, user_id: user.id, response_state: "accepted"})
    |> Repo.insert!()
  end

  defp future_start,
    do:
      DateTime.utc_now()
      |> DateTime.add(3 * 24 * 3600, :second)
      |> DateTime.truncate(:microsecond)

  test "drive registers a plan_approach follow-through loop for a future plan" do
    a = fresh_user()
    b = fresh_user()
    plan = make_plan(a, %{start_at: future_start()})
    add_participant(plan, a)
    add_participant(plan, b)

    assert {:ok, %{steps: steps}} = PlanCompletion.drive(plan.id, a.id)
    by_id = Map.new(steps, &{&1["id"], &1})
    assert by_id["follow_through"]["status"] == "registered"

    loop = Repo.one!(from l in TemporalFollowThroughLoop, where: l.plan_id == ^plan.id)
    assert loop.kind == "plan_approach"
    assert loop.status == "open"
    assert loop.responsibility_user_id == a.id
    assert Enum.sort(loop.participant_ids) == Enum.sort([a.id, b.id])
    assert loop.plan_start_at == plan.start_at

    # The loop matures quietly: far from the event it asks for nothing.
    result = OpalCore.SocialFlow.TemporalFollowThrough.evaluate(loop)
    assert result["maturity"] == "not_yet"
  end

  test "drive is idempotent: no duplicate loop or coming-up rows on re-drive" do
    a = fresh_user()
    plan = make_plan(a, %{start_at: future_start()})
    add_participant(plan, a)

    assert {:ok, _} = PlanCompletion.drive(plan.id, a.id)
    assert {:ok, %{steps: steps2}} = PlanCompletion.drive(plan.id, a.id)

    by_id = Map.new(steps2, &{&1["id"], &1})
    assert by_id["follow_through"]["status"] == "already_registered"
    assert by_id["coming_up"]["status"] == "projected"

    assert Repo.aggregate(
             from(l in TemporalFollowThroughLoop, where: l.plan_id == ^plan.id),
             :count
           ) == 1

    home = ProductShell.home_snapshot(%{user_id: a.id})
    mine = Enum.filter(home["coming_up"], &(&1["plan_id"] == plan.id))
    assert length(mine) == 1
    assert hd(mine)["title"] == "Dinner plans"
  end

  test "coming-up projection reaches participants only, never outsiders" do
    a = fresh_user()
    b = fresh_user()
    outsider = fresh_user()
    plan = make_plan(a, %{start_at: future_start()})
    add_participant(plan, a)
    add_participant(plan, b)

    assert {:ok, _} = PlanCompletion.drive(plan.id, a.id)

    for user <- [a, b] do
      home = ProductShell.home_snapshot(%{user_id: user.id})
      assert Enum.any?(home["coming_up"], &(&1["plan_id"] == plan.id))
    end

    outsider_home = ProductShell.home_snapshot(%{user_id: outsider.id})
    refute Enum.any?(outsider_home["coming_up"], &(&1["plan_id"] == plan.id))
  end

  test "past plans get no future attention and no loop" do
    a = fresh_user()

    past =
      DateTime.utc_now()
      |> DateTime.add(-2 * 24 * 3600, :second)
      |> DateTime.truncate(:microsecond)

    plan = make_plan(a, %{start_at: past})
    add_participant(plan, a)

    assert {:ok, %{steps: steps}} = PlanCompletion.drive(plan.id, a.id)
    by_id = Map.new(steps, &{&1["id"], &1})
    assert by_id["follow_through"]["status"] == "skipped_past"
    assert by_id["coming_up"]["status"] == "skipped_past"

    assert Repo.aggregate(
             from(l in TemporalFollowThroughLoop, where: l.plan_id == ^plan.id),
             :count
           ) == 0

    home = ProductShell.home_snapshot(%{user_id: a.id})
    refute Enum.any?(home["coming_up"], &(&1["plan_id"] == plan.id))
  end

  test "a plan with no derivable start is skipped honestly, not guessed" do
    a = fresh_user()
    plan = make_plan(a, %{time_label: "sometime next week"})
    add_participant(plan, a)

    assert {:ok, %{steps: steps}} = PlanCompletion.drive(plan.id, a.id)
    by_id = Map.new(steps, &{&1["id"], &1})
    assert by_id["follow_through"]["status"] == "skipped_no_start"

    assert Repo.aggregate(
             from(l in TemporalFollowThroughLoop, where: l.plan_id == ^plan.id),
             :count
           ) == 0
  end

  test "conversation-shaped alignment derives its canonical start for the loop" do
    a = fresh_user()
    b = fresh_user()

    plan =
      make_plan(a, %{
        alignment: %{
          "date" => %{
            "state" => "candidate",
            "value" => "tomorrow",
            "resolved_on" => "2999-01-10",
            "timezone" => "America/Los_Angeles"
          },
          "exact_time" => %{"state" => "locked", "value" => "6:30 PM"},
          "plan_timezone" => "America/Los_Angeles",
          "plan_version" => 2
        }
      })

    add_participant(plan, a)
    add_participant(plan, b)

    assert {:ok, %{steps: steps}} = PlanCompletion.drive(plan.id, a.id)
    by_id = Map.new(steps, &{&1["id"], &1})
    assert by_id["follow_through"]["status"] == "registered"

    loop = Repo.one!(from l in TemporalFollowThroughLoop, where: l.plan_id == ^plan.id)
    assert loop.plan_version == "2"
    assert loop.plan_start_at.year == 2999
  end
end
