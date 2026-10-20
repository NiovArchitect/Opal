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
    PlanPrivacyMark,
    SharedPlan,
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

    assert MapSet.new(Enum.map(orbit["parties"], & &1["user_id"])) ==
             MapSet.new([a.id, b.id, c.id])

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

  # --- Projection v2 (Repair #20 amendment) ---------------------------

  defp settle_plan!(plan, attrs \\ %{}) do
    plan
    |> Ecto.Changeset.change(
      Map.merge(
        %{
          status: "completed",
          completed_at: DateTime.utc_now() |> DateTime.truncate(:microsecond)
        },
        attrs
      )
    )
    |> Repo.update!()
  end

  test "v2 subject: the next plan's title, else the conversation's own title, else nil" do
    a = fresh_user("Ana")
    b = fresh_user("Bea")
    conv = conversation_with([a.id, b.id])

    {:ok, plan, _} =
      SocialFlow.create_tentative_plan_from_conversation(conv.id, a.id, %{
        "title" => "Subject dinner #{System.unique_integer([:positive])}"
      })

    # With a next plan, the subject is the plan's topic - never a person.
    orbit = OrbitProjection.for_conversation(a.id, conv.id)
    assert orbit["subject"] == plan.title
    refute orbit["subject"] in ["Ana", "Bea"]

    # No plans: the conversation record's own title. (A FRESH pair -
    # a second conversation between the same pair legitimately
    # carries the pair's plans under NextPlan's party-set scope.)
    c = fresh_user("Cy")
    d = fresh_user("Dee")
    empty = conversation_with([c.id, d.id])
    assert OrbitProjection.for_conversation(c.id, empty.id)["subject"] == empty.label

    # A machine routing label is not a title: subject is honestly nil.
    machine =
      empty
      |> Ecto.Changeset.change(%{label: "direct-#{c.id}"})
      |> Repo.update!()

    assert OrbitProjection.for_conversation(c.id, machine.id)["subject"] == nil
  end

  test "v2 where_lines: next together first, then the pending truth in plain words" do
    a = fresh_user("Ana")
    b = fresh_user("Bea")
    conv = conversation_with([a.id, b.id])

    {:ok, plan, _} =
      SocialFlow.create_tentative_plan_from_conversation(conv.id, a.id, %{
        "title" => "Where dinner #{System.unique_integer([:positive])}"
      })

    orbit = OrbitProjection.for_conversation(a.id, conv.id)
    assert [next_line | rest] = orbit["where_lines"]
    assert next_line =~ "Next together: #{plan.title}"
    # Bea has not answered: the card names the standing truth.
    assert Enum.any?(rest, &(&1 =~ "Bea" and &1 =~ plan.title))

    # No plans at all: one honest line, nothing invented. (Fresh
    # pair, per the party-set scope note in the subject test.)
    c = fresh_user("Cy")
    d = fresh_user("Dee")
    empty = conversation_with([c.id, d.id])

    assert OrbitProjection.for_conversation(c.id, empty.id)["where_lines"] == [
             "No next plan is set yet."
           ]
  end

  test "v2 past_plans: settled plans are past, loved only with repeat evidence, vault respected" do
    a = fresh_user("Ana")
    b = fresh_user("Bea")
    conv = conversation_with([a.id, b.id])

    {:ok, loved_source, _} =
      SocialFlow.create_tentative_plan_from_conversation(conv.id, a.id, %{
        "title" => "Loved picnic #{System.unique_integer([:positive])}"
      })

    {:ok, plain_source, _} =
      SocialFlow.create_tentative_plan_from_conversation(conv.id, a.id, %{
        "title" => "Plain walk #{System.unique_integer([:positive])}"
      })

    loved_source = settle_plan!(loved_source)
    plain_source = settle_plan!(plain_source)
    assert Repo.get!(SharedPlan, loved_source.id).status == "completed"

    orbit = OrbitProjection.for_conversation(a.id, conv.id)
    past_ids = Enum.map(orbit["past_plans"], & &1["plan_id"])
    assert loved_source.id in past_ids
    assert plain_source.id in past_ids

    loved = Enum.find(orbit["past_plans"], &(&1["plan_id"] == loved_source.id))
    assert loved["state"] == "past"
    assert loved["status"] == "completed"
    assert loved["completed_at"]
    # No repeat yet: NOT loved - no evidence, no mark.
    assert loved["repeated"] == false
    assert loved["loved"] == false
    assert loved["loved_evidence"] == nil

    # The F-15 repeat: a new plan whose provenance points at the source.
    assert {:ok, _repeat, _parts, false} =
             SocialFlow.create_plan_from_graph_create(a.id, %{
               "title" => loved_source.title,
               "time_label" => "Next Saturday - around 7:00 PM",
               "participant_user_ids" => [b.id],
               "source_plan_id" => loved_source.id,
               "entry" => "repeat"
             })

    orbit2 = OrbitProjection.for_conversation(a.id, conv.id)
    loved2 = Enum.find(orbit2["past_plans"], &(&1["plan_id"] == loved_source.id))
    assert loved2["repeated"] == true
    assert loved2["loved"] == true
    assert loved2["loved_evidence"] == "repeated"

    plain2 = Enum.find(orbit2["past_plans"], &(&1["plan_id"] == plain_source.id))
    assert plain2["repeated"] == false
    assert plain2["loved"] == false

    # The viewer's own vault mark removes the plan from their past, too.
    :ok = PlanPrivacyMark.set_mark(a.id, plain_source.id, true)
    orbit3 = OrbitProjection.for_conversation(a.id, conv.id)
    refute plain_source.id in Enum.map(orbit3["past_plans"], & &1["plan_id"])
    # And the other party's past is unchanged by A's mark.
    orbit_b = OrbitProjection.for_conversation(b.id, conv.id)
    assert plain_source.id in Enum.map(orbit_b["past_plans"], & &1["plan_id"])
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

    # v2 where_lines in limbo: the waiting is named, with the
    # machinery's own remaining-window line riding along.
    lines = orbit["where_lines"]
    assert Enum.any?(lines, &(&1 =~ "Sam has not answered" and &1 =~ plan.title))
    assert Enum.any?(lines, &(&1 =~ "left in the answer window"))
  end

  test "v2 where_lines honesty: a presented fork and a window closed unanswered are named plainly" do
    creator = fresh_user("Cara")
    recipient = fresh_user("Sam")

    # Sam is in balanced mode (never auto-declines, so a closed
    # fork window escalates instead), with an empty quiet window so
    # the pinned-clock advances are never quiet-deferred.
    {:ok, _} =
      FollowThrough.update_preferences(recipient.id, %{
        assistance_level: "balanced",
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
        "title" => "Fork dinner #{System.unique_integer([:positive])}"
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

    # Grace ends mid-window: nudge. Window closes: the fork is presented.
    {:ok, :nudged} =
      NonResponseEtiquette.advance(loop.id,
        now: DateTime.add(t0, 24 * @hour + 60, :second),
        stage: "awaiting"
      )

    {:ok, :forked} =
      NonResponseEtiquette.advance(loop.id,
        now: DateTime.add(closes, 60, :second),
        stage: "nudged"
      )

    orbit =
      OrbitProjection.for_conversation(creator.id, conv.id,
        now: DateTime.add(closes, 120, :second)
      )

    assert Enum.any?(
             orbit["where_lines"],
             &(&1 =~ "A choice is in front of Sam" and &1 =~ plan.title and
                 &1 =~ "still unanswered")
           ),
           "fork line missing from: #{inspect(orbit["where_lines"])}"

    # The fork window (24h from presentation) closes unanswered:
    # balanced mode escalates - and the line names the closure
    # plainly, with no smoothing language.
    fork_close = DateTime.add(closes, 24 * @hour + 120, :second)

    {:ok, :escalated} =
      NonResponseEtiquette.advance(loop.id, now: fork_close, stage: "forked")

    orbit2 =
      OrbitProjection.for_conversation(creator.id, conv.id,
        now: DateTime.add(fork_close, 60, :second)
      )

    assert Enum.any?(
             orbit2["where_lines"],
             &(&1 =~ "Sam did not answer" and &1 =~ plan.title and
                 &1 =~ "answer window closed" and &1 =~ "still unanswered")
           ),
           "closed-window line missing from: #{inspect(orbit2["where_lines"])}"
  end
end
