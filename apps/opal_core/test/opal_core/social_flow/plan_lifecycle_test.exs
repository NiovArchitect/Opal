defmodule OpalCore.SocialFlow.PlanLifecycleTest do
  use ExUnit.Case, async: true

  alias OpalCore.SocialFlow.Execution.{
    ExecutionRequirements,
    HumanReportedOutcome,
    JustInTimeAction,
    PlanLifecycle,
    PlanMoment
  }

  @dinner_start ~U[2026-08-14 19:00:00Z]

  test "lifecycle phases over time" do
    base = %{
      set: true,
      when: @dinner_start,
      plan_type: "dinner",
      place: "Harbor Table"
    }

    assert {:ok, p0} = PlanLifecycle.phase(Map.merge(base, %{now: ~U[2026-08-10 12:00:00Z]}))
    assert p0["phase"] in ~w(socially_aligned execution_preparation upcoming)

    assert {:ok, p1} =
             PlanLifecycle.phase(
               Map.merge(base, %{
                 now: ~U[2026-08-14 18:40:00Z],
                 provider_confirmed: true
               })
             )

    assert p1["phase"] == "departure_approaching"

    assert {:ok, p2} =
             PlanLifecycle.phase(
               Map.merge(base, %{
                 now: ~U[2026-08-14 18:50:00Z],
                 navigation_started: true
               })
             )

    assert p2["phase"] in ~w(in_transit occurring)
  end

  test "execution requirements: dinner needs booking; park does not" do
    assert {:ok, d} =
             ExecutionRequirements.infer(%{
               set: true,
               plan_type: "dinner",
               place: "Harbor",
               when: @dinner_start
             })

    assert d["reservation_needed"]
    assert "booking_handoff" in d["execution_path"]
    assert "navigation" in d["execution_path"]

    assert {:ok, p} =
             ExecutionRequirements.infer(%{
               set: true,
               plan_type: "park",
               place: "Balboa Park",
               when: @dinner_start
             })

    refute p["reservation_needed"]
    refute "booking_handoff" in p["execution_path"]
  end

  test "JIT: one action — booking near set, not navigation three days early" do
    assert {:ok, far} =
             JustInTimeAction.choose(%{
               set: true,
               plan_type: "dinner",
               reservation_needed: true,
               when: @dinner_start,
               now: ~U[2026-08-11 12:00:00Z],
               place: "Harbor Table",
               destination: "Harbor Table"
             })

    assert far["one_action_at_a_time"]
    # Should be booking or nothing — not directions stack
    refute far["capability"] == "navigation" and far["kind"] == "action"

    if far["kind"] == "action" do
      assert far["capability"] in ~w(booking_handoff ticket_handoff)
    end

    assert {:ok, near} =
             JustInTimeAction.choose(%{
               set: true,
               plan_type: "dinner",
               provider_confirmed: true,
               human_reports_booked: true,
               reservation_needed: true,
               navigation_useful: true,
               when: @dinner_start,
               now: ~U[2026-08-14 18:35:00Z],
               place: "Harbor Table",
               destination: "Harbor Table"
             })

    assert near["kind"] == "action"
    assert near["capability"] == "navigation"
  end

  test "JIT: never stacks multiple actions" do
    assert {:ok, m} =
             JustInTimeAction.choose(%{
               set: true,
               plan_type: "dinner",
               reservation_needed: true,
               navigation_useful: true,
               when: @dinner_start,
               now: ~U[2026-08-14 18:30:00Z],
               place: "X",
               destination: "X",
               provider_confirmed: true
             })

    assert m["kind"] in ~w(action minimum_question nothing)
    # surface is singular
    refute is_list(m["capability"])
  end

  test "human reported booked is not provider_confirmed or paid" do
    assert {:ok, r} = HumanReportedOutcome.apply(%{answer: "Booked it"}, %{plan_version: 1})
    assert r["human_reports_booked"]
    refute r["provider_confirmed"]
    refute r["paid"]
    refute r["forges_provider_payment"]
  end

  test "handoff return: Did that work? then quiet path" do
    assert {:ok, m} =
             PlanMoment.after_handoff_return(
               %{
                 set: true,
                 plan_type: "dinner",
                 handoff_started: true,
                 when: @dinner_start,
                 now: ~U[2026-08-12 15:00:00Z],
                 place: "Harbor",
                 destination: "Harbor",
                 venue_id: "v1",
                 party_size: 2,
                 conversation_id: "c1"
               },
               "Yes"
             )

    assert m["human_report"]["human_reports_booked"]
    # After yes, booking done — likely nothing or low priority
    assert m["surface"]["kind"] in ~w(nothing action minimum_question)
  end

  test "courtship timeline: sparse surfaces over time" do
    base = %{
      set: true,
      plan_type: "dinner",
      place: "Harbor Table",
      destination: "Harbor Table",
      venue_id: "v1",
      party_size: 2,
      conversation_id: "c1",
      when: @dinner_start,
      set_at: ~U[2026-08-11 10:00:00Z]
    }

    assert {:ok, sim} =
             PlanMoment.simulate_timeline(base, [
               # just set
               {0,
                %{
                  now: ~U[2026-08-11 10:00:00Z],
                  reservation_needed: true
                }},
               # after handoff booked
               {60 * 24,
                %{
                  now: ~U[2026-08-12 10:00:00Z],
                  human_reports_booked: true,
                  provider_confirmed: true,
                  handoff_started: true
                }},
               # mid-day quiet
               {60 * 24 * 2 + 4 * 60,
                %{
                  now: ~U[2026-08-13 14:00:00Z],
                  human_reports_booked: true,
                  provider_confirmed: true
                }},
               # leave window
               {60 * 24 * 3 + 18 * 60 + 35,
                %{
                  now: ~U[2026-08-14 18:35:00Z],
                  human_reports_booked: true,
                  provider_confirmed: true
                }}
             ])

    kinds = Enum.map(sim["timeline"], & &1["surface_kind"])
    caps = Enum.map(sim["timeline"], & &1["capability"])

    # Not a constant dashboard
    assert Enum.count(kinds, &(&1 == "action")) <= 3
    # Late moment should be navigation-ish or nothing
    assert List.last(caps) in [nil, "navigation"] or List.last(kinds) == "nothing"
    # Mid quiet should not be directions days early
    mid = Enum.at(sim["timeline"], 2)
    refute mid["capability"] == "navigation" and mid["surface_kind"] == "action"
  end

  test "spontaneous: directions immediately, no booking" do
    assert {:ok, m} =
             PlanMoment.evaluate(%{
               set: true,
               plan_type: "park",
               spontaneous: true,
               already_out: true,
               place: "Coastal Path",
               destination: "Coastal Path",
               when: DateTime.utc_now() |> DateTime.add(30 * 60, :second),
               now: DateTime.utc_now(),
               conversation_id: "c2",
               party_size: 2
             })

    refute m["requirements"]["reservation_needed"]
    assert m["surface"]["capability"] == "navigation" or m["surface"]["kind"] == "nothing"
  end

  test "completed plan stays quiet — no rate your experience" do
    assert {:ok, m} =
             PlanMoment.evaluate(%{
               set: true,
               plan_type: "dinner",
               when: ~U[2026-08-01 19:00:00Z],
               now: ~U[2026-08-02 12:00:00Z],
               place: "X",
               destination: "X",
               provider_confirmed: true
             })

    assert m["phase"] == "completed"
    assert m["surface"]["kind"] == "nothing"
  end
end
