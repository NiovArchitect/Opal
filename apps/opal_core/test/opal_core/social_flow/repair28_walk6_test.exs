defmodule OpalCore.SocialFlow.Repair28Walk6Test do
  @moduledoc """
  Repair #28 - founder walk #6 backend pins.

  W28-2: a plan whose stored location is byte-slice damage
  ("omething", from the retired grapheme-slice extractor) or an
  over-captured vague noun projects NO place - a decapitated
  fragment can never render as a place label again.

  W28-3: a check-in sweep sourced from a direct conversation is
  labelled with the peer's name, never the conversation's machine
  label ("direct-<id8>-<id8>"); sweeps already persisted with a
  machine label heal at read time via display_circle_label/1; the
  organizer headline is the ONE tally statement (no appended
  not-ok / still-waiting counts for other surfaces to repeat).

  W28-4: the leave-by no-start-time line no longer denies a time
  the plan's own label states - it names the real gap.
  """
  use OpalCore.DataCase, async: false

  alias OpalCore.Accounts.User
  alias OpalCore.Messages
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.{Checkin, LeaveBy, SharedPlan}

  defp fresh_user(name) do
    n = System.unique_integer([:positive])

    %User{}
    |> User.changeset(%{
      id: Ecto.UUID.generate(),
      handle: "r28-#{String.downcase(String.replace(name, " ", "-"))}-#{n}",
      display_name: name
    })
    |> Repo.insert!()
  end

  defp create_sweep!(organizer_id, source) do
    {:ok, sweep, :created} =
      Checkin.create_sweep(organizer_id, source,
        idempotency_key: "r28-#{Ecto.UUID.generate()}"
      )

    sweep
  end

  describe "W28-3 - conversation-sourced sweep labels" do
    test "a dyad sweep is labelled with the peer's name, never the machine label" do
      org = fresh_user("Sadeil Organizer")
      peer = fresh_user("Maya Peer")

      {:ok, direct} = Messages.ensure_direct_conversation(org.id, peer.id)

      sweep =
        create_sweep!(org.id, %{"kind" => "conversation", "ref_id" => direct.conversation_id})

      assert sweep.circle_label == "Maya Peer"
      refute sweep.circle_label =~ "direct-"

      {:ok, summary} = Checkin.summary_for(sweep.id, org.id)
      assert summary["sweep"]["circle_label"] == "Maya Peer"
      assert summary["copy"]["headline"] == "0 of 1 answered"
    end

    test "a legacy machine-labelled sweep heals at read time" do
      org = fresh_user("Sadeil Organizer")
      peer = fresh_user("Maya Peer")

      {:ok, direct} = Messages.ensure_direct_conversation(org.id, peer.id)

      sweep =
        create_sweep!(org.id, %{"kind" => "conversation", "ref_id" => direct.conversation_id})

      # Simulate the pre-fix persisted row.
      sweep =
        sweep
        |> Ecto.Changeset.change(circle_label: "direct-7c60530b-a4444444")
        |> Repo.update!()

      assert Checkin.display_circle_label(sweep) == "Maya Peer"

      {:ok, summary} = Checkin.summary_for(sweep.id, org.id)
      assert summary["sweep"]["circle_label"] == "Maya Peer"

      ask = Checkin.ask_copy(sweep)
      assert ask["circle_label"] == "Maya Peer"
      refute ask["body"] =~ "direct-"
    end

    test "the headline states the tally once, with no appended counts" do
      org = fresh_user("Sadeil Organizer")
      peer = fresh_user("Maya Peer")

      {:ok, direct} = Messages.ensure_direct_conversation(org.id, peer.id)

      sweep =
        create_sweep!(org.id, %{"kind" => "conversation", "ref_id" => direct.conversation_id})

      {:ok, summary} = Checkin.summary_for(sweep.id, org.id)
      headline = summary["copy"]["headline"]
      assert headline == "0 of 1 answered"
      refute headline =~ "need something"
      refute headline =~ "still to hear from"
      # The waiting truth has its own line, stated once, in words.
      assert summary["copy"]["still_waiting_line"] ==
               "Still waiting on: Maya Peer. Not answering is not the same as being okay."
    end
  end

  describe "W28-2 - damaged place values project as no place" do
    defp plan_with_location(location) do
      creator = fresh_user("Plan Maker")

      %SharedPlan{}
      |> SharedPlan.changeset(%{
        title: "Meetup",
        status: "tentative",
        timezone: "America/Los_Angeles",
        created_by_user_id: creator.id,
        source: "center",
        plan_type: "in_person",
        location: location
      })
      |> Repo.insert!()
    end

    test "byte-slice damage ('omething') is not a place" do
      plan = plan_with_location("omething")

      place = SharedPlan.place_projection(plan)
      assert place["label"] == nil
      assert place["directions_available"] == false

      contract = SharedPlan.to_contract(plan)
      assert contract["location"] == nil
      assert contract["place"]["label"] == nil
    end

    test "over-captured vague text is not a place" do
      plan = plan_with_location("something? — yes, plan something")

      assert SharedPlan.place_projection(plan)["label"] == nil
      assert SharedPlan.to_contract(plan)["location"] == nil
    end

    test "a real place survives untouched" do
      plan = plan_with_location("Juniper & Ivy")

      assert SharedPlan.place_projection(plan)["label"] == "Juniper & Ivy"
      assert SharedPlan.place_projection(plan)["directions_available"] == true
      assert SharedPlan.to_contract(plan)["location"] == "Juniper & Ivy"
    end
  end

  describe "W28-4 - leave-by no-start-time line" do
    test "a labelled-but-undated plan gets the gap-naming line" do
      owner = fresh_user("Owner One")

      plan =
        %SharedPlan{}
        |> SharedPlan.changeset(%{
          title: "Meetup",
          status: "tentative",
          timezone: "America/Los_Angeles",
          created_by_user_id: owner.id,
          source: "center",
          plan_type: "in_person",
          time_label: "8pm",
          place_lat: 32.7231,
          place_lon: -117.1683
        })
        |> Repo.insert!()

      lb = LeaveBy.for_plan(plan, owner.id)
      assert lb["state"] == "no_start_time"
      assert lb["label"] == "Set a day and time to see when to leave."
    end
  end
end
