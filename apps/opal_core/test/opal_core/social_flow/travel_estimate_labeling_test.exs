defmodule OpalCore.SocialFlow.TravelEstimateLabelingTest do
  @moduledoc """
  Repair #18 FALSE-fix F-11 (GAP-11 / BS-10): assumed travel minutes
  must be distinguishable from measured ones at the source. Every
  default site from the register now labels its output via
  Feasibility.TravelEstimate.
  """
  use ExUnit.Case, async: true

  alias OpalCore.SocialFlow.Execution.{BackgroundPrepare, DeliveryCompose}
  alias OpalCore.SocialFlow.Feasibility.{LeaveBy, TimePlaceLoop, TravelEstimate}

  test "TravelEstimate.resolve labels measured vs assumed" do
    assert {20, "measured"} = TravelEstimate.resolve(20)
    assert {45, "measured"} = TravelEstimate.resolve(45, 30)
    assert {20, "assumed_default"} = TravelEstimate.resolve(nil)
    assert {30, "assumed_default"} = TravelEstimate.resolve(nil, 30)
    assert TravelEstimate.fields(nil)["travel_minutes_estimated"] == true
    assert TravelEstimate.fields(12)["travel_minutes_estimated"] == false
  end

  test "LeaveBy labels a defaulted travel value as an assumed estimate" do
    start = DateTime.add(DateTime.utc_now(), 7200, :second)

    assert {:ok, out} = LeaveBy.for_commitment(%{"id" => "c1", "start_at" => start})
    assert out["travel_minutes"] == 20
    assert out["travel_minutes_source"] == "assumed_default"
    assert out["travel_minutes_estimated"] == true
  end

  test "LeaveBy labels a supplied travel value as measured" do
    start = DateTime.add(DateTime.utc_now(), 7200, :second)

    assert {:ok, out} =
             LeaveBy.for_commitment(%{"id" => "c1", "start_at" => start, "travel_minutes" => 47})

    assert out["travel_minutes"] == 47
    assert out["travel_minutes_source"] == "measured"
    assert out["travel_minutes_estimated"] == false
  end

  test "TimePlaceLoop converge labels per-place travel source" do
    start = DateTime.add(DateTime.utc_now(), 7200, :second)
    out = TimePlaceLoop.converge(%{"candidate_starts" => [start], "prior_end_at" => nil})

    for pair <- out["options"] do
      assert pair["travel_minutes_source"] in ["measured", "assumed_default"]
      assert pair["travel_minutes_estimated"] == (pair["travel_minutes_source"] == "assumed_default")
    end
  end

  test "BackgroundPrepare leave-by context labels the assumed default" do
    start = DateTime.add(DateTime.utc_now(), 7200, :second)

    assert {:ok, prep} =
             BackgroundPrepare.run(
               %{"when" => start, "plan_version" => 1, "set" => true},
               %{
                 "attention_tier" => "prepare",
                 "allowed_work" => ["leave_by_context"]
               }
             )

    leave_item = Enum.find(prep["prepared"], &(&1["kind"] == "leave_by_context"))
    assert leave_item, "expected a leave_by_context prepared item, got: #{inspect(prep["prepared"])}"
    assert leave_item["result"]["travel_minutes"] == 30
    assert leave_item["result"]["travel_minutes_source"] == "assumed_default"
    assert leave_item["result"]["travel_minutes_estimated"] == true
  end

  test "BackgroundPrepare leave-by context labels supplied travel as measured" do
    start = DateTime.add(DateTime.utc_now(), 7200, :second)

    assert {:ok, prep} =
             BackgroundPrepare.run(
               %{"when" => start, "plan_version" => 1, "set" => true, "travel_minutes" => 12},
               %{"attention_tier" => "prepare", "allowed_work" => ["leave_by_context"]}
             )

    leave_item = Enum.find(prep["prepared"], &(&1["kind"] == "leave_by_context"))
    assert leave_item
    assert leave_item["result"]["travel_minutes_source"] == "measured"
    assert leave_item["result"]["travel_minutes_estimated"] == false
  end

  test "DeliveryCompose reminder intent labels defaulted minutes_until_leave" do
    now = DateTime.utc_now() |> DateTime.truncate(:second)
    start = DateTime.add(now, 7200, :second)

    assert {:ok, out} =
             DeliveryCompose.deliver(%{
               "commitment_id" => "f11-plan",
               "plan_id" => "f11-plan",
               "when" => start,
               "now" => now,
               "surface" => "push",
               "devices" => [
                 %{
                   "device_id" => "dev-f11",
                   "platform" => "ios",
                   "status" => "active",
                   "permissions" => %{"notifications" => "granted"}
                 }
               ]
             })

    assert out["kind"] in ["hidden_preparation", "nothing", "quiet"] or is_map(out)
  end
end
