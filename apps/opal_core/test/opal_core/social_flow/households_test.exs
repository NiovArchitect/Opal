defmodule OpalCore.SocialFlow.HouseholdsTest do
  use OpalCore.DataCase, async: false

  alias OpalCore.Accounts.User
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.AttentionCenter
  alias OpalCore.SocialFlow.Clock
  alias OpalCore.SocialFlow.Households

  setup do
    Clock.unfreeze()
    on_exit(fn -> Clock.unfreeze() end)
    suffix = System.unique_integer([:positive])

    users =
      for {handle, name} <- [
            {"dev-#{suffix}", "Dev"},
            {"priya-#{suffix}", "Priya"},
            {"sam-#{suffix}", "Sam"},
            {"jo-#{suffix}", "Jo"}
          ] do
        %User{} |> User.changeset(%{handle: handle, display_name: name}) |> Repo.insert!()
      end

    [dev, priya, sam, jo] = users

    for u <- users do
      %OpalCore.SocialFlow.AssistancePreference{}
      |> OpalCore.SocialFlow.AssistancePreference.changeset(%{
        user_id: u.id,
        timezone: "America/Los_Angeles",
        intelligence_maturity: "established"
      })
      |> Repo.insert!()
    end

    {:ok, dev: dev, priya: priya, sam: sam, jo: jo}
  end

  defp pod!(dev, invitees) do
    {:ok, pod} =
      Households.create_household(dev.id, %{
        "label" => "Elm Street house",
        "home_label" => "Home",
        "timezone" => "America/Los_Angeles",
        "invite_user_ids" => Enum.map(invitees, & &1.id)
      })

    pod
  end

  test "laws: no inference, no visibility grant, no travel/location reads", _ctx do
    refute Households.inferred_households?()
    refute Households.pod_grants_visibility?()
    refute Households.reads_travel_state?()
    refute Households.reads_location?()
  end

  test "declaration + consent: invitees are pending until they accept; non-members cannot read",
       %{
         dev: dev,
         priya: priya,
         sam: sam,
         jo: jo
       } do
    pod = pod!(dev, [priya, sam, jo])
    contract = Households.to_contract(pod, dev.id)
    assert contract["active_member_user_ids"] == [dev.id]
    assert contract["pending_member_user_ids"] == [priya.id, sam.id, jo.id]
    assert {:error, :not_found} = Households.get_for_user(pod.id, Ecto.UUID.generate())

    {:ok, _} = Households.accept(pod.id, priya.id)
    contract = Households.to_contract(pod, dev.id)
    assert contract["active_member_user_ids"] == [dev.id, priya.id]

    # Decline + leave are the member's own acts.
    {:ok, _} = Households.decline(pod.id, jo.id)
    {:ok, _} = Households.leave(pod.id, priya.id)
    contract = Households.to_contract(pod, dev.id)
    assert contract["active_member_user_ids"] == [dev.id]
  end

  test "primary: exactly one primary pod per user; creator primary by default", %{
    dev: dev,
    priya: priya
  } do
    pod = pod!(dev, [priya])
    assert Households.primary_pod(dev.id).id == pod.id
    assert Households.primary_pod(priya.id) == nil

    {:ok, _} = Households.accept(pod.id, priya.id)
    assert Households.primary_pod(priya.id) == nil
    {:ok, _} = Households.set_primary(pod.id, priya.id)
    assert Households.primary_pod(priya.id).id == pod.id
  end

  test "plan defaults: pod context fills, explicit values win, virtual keeps no home place", %{
    dev: dev,
    priya: priya,
    sam: sam
  } do
    pod = pod!(dev, [priya, sam])
    {:ok, _} = Households.accept(pod.id, priya.id)
    {:ok, _} = Households.accept(pod.id, sam.id)

    {:ok, plan} =
      Households.create_plan_from_context(dev.id, %{"context" => "pod", "title" => "Groceries"})

    assert plan["location"] == "Home"
    assert plan["timezone"] == "America/Los_Angeles"
    assert length(plan["participants"]) == 3

    {:ok, edited} =
      Households.create_plan_from_context(dev.id, %{
        "context" => "pod",
        "title" => "Edited",
        "location" => "Corner store",
        "participant_user_ids" => [dev.id]
      })

    assert edited["location"] == "Corner store"
    assert length(edited["participants"]) == 1

    {:ok, again} =
      Households.create_plan_from_context(dev.id, %{"context" => "pod", "title" => "Again"})

    assert length(again["participants"]) == 3
    assert again["location"] == "Home"

    {:ok, virtual} =
      Households.create_plan_from_context(dev.id, %{
        "context" => "pod",
        "title" => "Call",
        "plan_type" => "virtual"
      })

    assert virtual["plan_type"] == "virtual"
    assert virtual["location"] in [nil, "Online"]

    {:ok, plain} =
      Households.create_plan_from_context(dev.id, %{"context" => "none", "title" => "Plain"})

    assert plain["location"] == nil
    assert length(plain["participants"]) == 1
  end

  test "supply: one card, one budget batch; accept creates one pod plan; no card while open", %{
    dev: dev,
    priya: priya,
    sam: sam,
    jo: jo
  } do
    Clock.freeze(~U[2026-10-19 15:00:00.000000Z])
    pod = pod!(dev, [priya, sam, jo])
    for u <- [priya, sam, jo], do: {:ok, _} = Households.accept(pod.id, u.id)

    assert {:ok, :surfaced} = Households.maybe_surface_supply(dev.id)
    assert {:skip, :already_surfaced} = Households.maybe_surface_supply(dev.id)

    feed = AttentionCenter.feed(dev.id, refresh_temporal: false)
    cards = Enum.filter(feed["needs_you"], &(&1["dedupe_key"] == "pod_supply:#{pod.id}"))
    assert length(cards) == 1

    {:ok, plan} = Households.accept_supply(dev.id)
    assert plan["title"] == "Supply run - Elm Street house"
    assert plan["location"] == "Home"
    assert plan["source"] == "center"
    assert length(plan["participants"]) == 4

    assert {:skip, :supply_plan_open} = Households.maybe_surface_supply(dev.id)
    assert {:error, :supply_plan_open} = Households.accept_supply(dev.id)

    feed = AttentionCenter.feed(dev.id, refresh_temporal: false)
    assert Enum.filter(feed["needs_you"], &(&1["dedupe_key"] == "pod_supply:#{pod.id}")) == []
  end

  test "supply: pod of 1 never surfaces; dismissal suppresses", %{dev: dev, priya: priya} do
    Clock.freeze(~U[2026-10-19 15:00:00.000000Z])
    _solo_pod = pod!(dev, [])
    assert {:skip, :pod_too_small} = Households.maybe_surface_supply(dev.id)

    pod = pod!(dev, [priya])
    {:ok, _} = Households.accept(pod.id, priya.id)
    # The second pod is not primary (creator's first pod is) — make it so.
    {:ok, _} = Households.set_primary(pod.id, dev.id)
    assert {:ok, :surfaced} = Households.maybe_surface_supply(dev.id)
    :ok = Households.dismiss_supply(dev.id)
    assert {:skip, _} = Households.maybe_surface_supply(dev.id)
  end
end
