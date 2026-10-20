defmodule OpalCore.SocialFlow.Repair20OrbitProjectionTest do
  @moduledoc """
  Repair #20 (F-19) — the ORBIT PROJECTION pins: a thread's full
  party set, its plans as ring stones (the NextPlan one-pick
  pipeline, list form), per-party pending reads from the
  participant rows' canonical states, and per-party limbo from the
  etiquette machinery's own export. Scope legs: a plan whose party
  set differs never enters another thread's orbit; a non-member
  gets no orbit at all.
  """
  use OpalCore.DataCase, async: false

  import Ecto.Query

  alias OpalCore.Accounts.User
  alias OpalCore.Messaging.{Conversation, ConversationMember}
  alias OpalCore.Relationships.RelationshipType
  alias OpalCore.Repo
  alias OpalCore.SocialFlow

  alias OpalCore.SocialFlow.{
    FollowThrough,
    NextPlan,
    NonResponseEtiquette,
    OrbitProjection,
    TemporalFollowThroughLoop
  }

  @hour 3600

  defp fresh_user(name) do
    suffix = Ecto.UUID.generate() |> String.slice(0, 8)

    %User{}
    |> User.changeset(%{id: Ecto.UUID.generate(), handle: "r20-#{suffix}", display_name: name})
    |> Repo.insert!()
  end

  defp conversation_with(members) do
    conv =
      %Conversation{}
      |> Conversation.changeset(%{id: Ecto.UUID.generate(), label: "r20-#{Ecto.UUID.generate()}"})
      |> Repo.insert!()

    for uid <- members do
      %ConversationMember{}
      |> ConversationMember.changeset(%{conversation_id: conv.id, user_id: uid})
      |> Repo.insert!()
    end

    conv
  end

  defp loop_for(plan_id, recipient_id) do
    from(l in TemporalFollowThroughLoop,
      where: l.plan_id == ^plan_id and l.kind == "invitation_response",
      where: fragment("? ->> 'recipient_user_id' = ?", l.metadata, ^recipient_id)
    )
    |> Repo.one()
  end

  test "dyad orbit: viewer first, the peer pending, the plan a stone with its party read" do
    a = fresh_user("Ana")
    b = fresh_user("Bea")
    conv = conversation_with([a.id, b.id])

    {:ok, plan, _participants} =
      SocialFlow.create_tentative_plan_from_conversation(conv.id, a.id, %{
        "title" => "Orbit dinner #{System.unique_integer([:positive])}"
      })

    orbit = OrbitProjection.for_conversation(a.id, conv.id)
    assert orbit["conversation_id"] == conv.id
    assert orbit["composition"] == "dyad"

    assert [viewer, peer] = orbit["parties"]
    assert viewer["user_id"] == a.id
    assert viewer["is_viewer"] == true
    assert peer["user_id"] == b.id
    assert peer["display_name"] == "Bea"
    assert peer["entity_tint"] in 1..6
    # Bea was invited and has not answered: her light is pending.
    assert peer["pending"] == true
    assert peer["limbo"] == false
    assert viewer["pending"] == false

    assert [stone] = orbit["plans"]
    assert stone["plan_id"] == plan.id
    assert stone["state"] in ["forming", "action", "ready", "happening"]

    by_user = Map.new(stone["participants"], &{&1["user_id"], &1})
    assert by_user[b.id]["pending"] == true
    assert by_user[b.id]["response_state"] == "pending"
    assert by_user[b.id]["limbo"] == false
    assert by_user[a.id]["pending"] == false

    # The orbit's next-together IS the NextPlan one pick, and the
    # stone list's first element is that same pick (one pipeline).
    assert orbit["next_plan"]["plan_id"] == plan.id
    all = NextPlan.all_for_conversation(a.id, conv.id)
    assert hd(all)["plan_id"] == NextPlan.for_conversation(a.id, conv.id)["plan_id"]
  end

  test "group orbit: the full party set is the anchor party; a dyad plan never leaks in" do
    a = fresh_user("Ana")
    b = fresh_user("Bea")
    c = fresh_user("Cy")
    group = conversation_with([a.id, b.id, c.id])
    dyad = conversation_with([a.id, b.id])

    {:ok, group_plan, _} =
      SocialFlow.create_tentative_plan_from_conversation(group.id, a.id, %{
        "title" => "Orbit group hike #{System.unique_integer([:positive])}"
      })

    {:ok, dyad_plan, _} =
      SocialFlow.create_tentative_plan_from_conversation(dyad.id, a.id, %{
        "title" => "Orbit dyad dinner #{System.unique_integer([:positive])}"
      })

    orbit = OrbitProjection.for_conversation(a.id, group.id)
    assert orbit["composition"] == "group"
    assert length(orbit["parties"]) == 3
    assert MapSet.new(Enum.map(orbit["parties"], & &1["user_id"])) == MapSet.new([a.id, b.id, c.id])

    plan_ids = Enum.map(orbit["plans"], & &1["plan_id"])
    assert group_plan.id in plan_ids
    refute dyad_plan.id in plan_ids

    # And the dyad's orbit holds only its own plan.
    dyad_orbit = OrbitProjection.for_conversation(a.id, dyad.id)
    assert Enum.map(dyad_orbit["plans"], & &1["plan_id"]) == [dyad_plan.id]
  end

  test "a non-member gets no orbit" do
    a = fresh_user("Ana")
    b = fresh_user("Bea")
    outsider = fresh_user("Ola")
    conv = conversation_with([a.id, b.id])

    assert OrbitProjection.for_conversation(outsider.id, conv.id) == nil
    assert OrbitProjection.for_conversation(a.id, Ecto.UUID.generate()) == nil
  end

  test "limbo: the etiquette machinery's cooling lands on the person's light and stone read" do
    creator = fresh_user("Cara")
    recipient = fresh_user("Sam")

    {:ok, _} =
      FollowThrough.update_preferences(recipient.id, %{
        assistance_level: "proactive",
        timezone: "UTC",
        quiet_hours_start: "12:00",
        quiet_hours_end: "12:00"
      })

    %RelationshipType{}
    |> RelationshipType.changeset(%{
      user_id: creator.id,
      contact_user_id: recipient.id,
      type: "friend"
    })
    |> Repo.insert!()

    conv = conversation_with([creator.id, recipient.id])

    {:ok, plan, _} =
      SocialFlow.create_tentative_plan_from_conversation(conv.id, creator.id, %{
        "title" => "Orbit limbo dinner #{System.unique_integer([:positive])}"
      })

    assert {:ok, _plan} =
             SocialFlow.set_plan_response_window(%{
               plan_id: plan.id,
               user_id: creator.id,
               recipient_id: recipient.id,
               window_seconds: 48 * @hour
             })

    loop = loop_for(plan.id, recipient.id)
    {:ok, t0, _} = DateTime.from_iso8601(loop.metadata["requested_at"])
    {:ok, closes, _} = DateTime.from_iso8601(loop.metadata["window_closes_at"])
    total = DateTime.diff(closes, t0, :second)

    {:ok, :nudged} =
      NonResponseEtiquette.advance(loop.id,
        now: DateTime.add(t0, div(total, 2) + 60, :second),
        stage: "awaiting"
      )

    # The machinery's own export names the recipient, in limbo.
    # The read clock is pinned mid-window (the machinery's own test
    # discipline) so the fraction is deterministic.
    mid = DateTime.add(t0, div(total, 2) + 120, :second)
    assert [entry] = NonResponseEtiquette.limbo_recipients(plan.id, now: mid)
    assert entry["recipient_id"] == recipient.id
    assert entry["stage"] == "nudged"
    assert entry["window_fraction_remaining"] > 0
    assert entry["window_fraction_remaining"] < 1

    orbit = OrbitProjection.for_conversation(creator.id, conv.id, now: mid)
    sam = Enum.find(orbit["parties"], &(&1["user_id"] == recipient.id))
    assert sam["pending"] == true
    assert sam["limbo"] == true
    assert sam["limbo_fraction_remaining"] > 0
    assert sam["limbo_fraction_remaining"] < 1

    stone = Enum.find(orbit["plans"], &(&1["plan_id"] == plan.id))
    sam_read = Enum.find(stone["participants"], &(&1["user_id"] == recipient.id))
    assert sam_read["limbo"] == true
    assert sam_read["limbo_stage"] == "nudged"
  end
end
