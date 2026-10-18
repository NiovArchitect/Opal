defmodule OpalCore.Repair18Residuals2PlansWindowTest do
  @moduledoc """
  Repair #18 real-path residuals #2 (FR-18-04) - agreed plans must not
  be crowded out of the plans list window.

  Live replay #3 evidence: GET /opal/plans returns at most 100
  entries; the walk account's window held 99 tentative plus 1 agreed,
  and the founder graph-commitment seed's AGREED plan fell outside
  the window, so the case found no entry to assert counts on. The law
  (F18-06): the cap may only ever hide noise, never a commitment -
  agreed/active plans sort ahead of tentative/forming plans, then the
  existing recency ordering applies within a tier. The cap stays.
  """
  use OpalCore.DataCase, async: false

  import Ecto.Query

  alias OpalCore.Accounts.User
  alias OpalCore.Repo
  alias OpalCore.SocialFlow
  alias OpalCore.SocialFlow.SharedPlan

  defp mk_user(name) do
    %User{}
    |> User.changeset(%{
      id: Ecto.UUID.generate(),
      handle: "r18r2-#{Ecto.UUID.generate()}",
      display_name: name
    })
    |> Repo.insert!()
  end

  defp insert_plan!(user, title, status, updated_at, time_label \\ "Thursday 7:30 PM") do
    plan =
      %SharedPlan{}
      |> SharedPlan.changeset(%{
        "title" => title,
        "status" => status,
        "created_by_user_id" => user.id,
        "source" => "center",
        "timezone" => "UTC",
        "time_label" => time_label,
        "alignment" => %{}
      })
      |> Repo.insert!()

    from(p in SharedPlan, where: p.id == ^plan.id)
    |> Repo.update_all(set: [inserted_at: updated_at, updated_at: updated_at])

    Repo.get!(SharedPlan, plan.id)
  end

  test "an old agreed plan survives 105 newer tentative plans in the default list" do
    user = mk_user("Window Owner")

    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)
    old = DateTime.add(now, -2 * 24 * 3600, :second)

    agreed = insert_plan!(user, "Agreed commitment", "agreed", old)

    for i <- 1..105 do
      insert_plan!(user, "Tentative idea #{i}", "tentative", now)
    end

    assert {:ok, plans} = SocialFlow.list_plans_for_user(user.id)
    assert length(plans) == 100

    ids = Enum.map(plans, & &1["id"])
    assert agreed.id in ids, "the agreed plan must appear inside the capped window"

    # Status tier first: every agreed/changed entry precedes every
    # tentative entry in the returned list.
    statuses = Enum.map(plans, & &1["status"])
    first_tentative = Enum.find_index(statuses, &(&1 == "tentative"))

    last_commitment =
      statuses
      |> Enum.with_index()
      |> Enum.filter(fn {s, _} -> s in ["agreed", "changed"] end)
      |> Enum.map(&elem(&1, 1))
      |> Enum.max()

    assert last_commitment < first_tentative
  end

  test "tentative ordering within the tier stays recency-first and lazy expiry does not regress" do
    user = mk_user("Tier Owner")

    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

    older_tentative =
      insert_plan!(user, "Older tentative", "tentative", DateTime.add(now, -3600, :second))

    newer_tentative = insert_plan!(user, "Newer tentative", "tentative", now)

    stale =
      insert_plan!(
        user,
        "Stale tentative",
        "tentative",
        DateTime.add(now, -20 * 24 * 3600, :second),
        "Open window"
      )

    assert {:ok, plans} = SocialFlow.list_plans_for_user(user.id)
    ids = Enum.map(plans, & &1["id"])

    # The stale start-less tentative is lazily expired on the read
    # path and excluded by default (residuals #1 behavior).
    refute stale.id in ids
    assert Repo.get!(SharedPlan, stale.id).status == "expired"

    # Within the tentative tier the existing recency ordering holds:
    # the newer tentative still precedes the older one.
    assert Enum.find_index(ids, &(&1 == newer_tentative.id)) <
             Enum.find_index(ids, &(&1 == older_tentative.id))

    # Expired stays visible in history mode.
    assert {:ok, all} = SocialFlow.list_plans_for_user(user.id, status: :all)
    assert stale.id in Enum.map(all, & &1["id"])
  end
end
