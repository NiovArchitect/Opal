defmodule OpalCore.SocialFlow.LeaveByMaterialityTest do
  use ExUnit.Case, async: true

  alias OpalCore.SocialFlow.Feasibility.LeaveByMateriality

  test "silence when too early" do
    leave =
      DateTime.utc_now()
      |> DateTime.add(3600, :second)
      |> DateTime.truncate(:second)

    assert {:silence, %{"reason" => "too_early"}} =
             LeaveByMateriality.evaluate(
               %{
                 "leave_by" => DateTime.to_iso8601(leave),
                 "commitment_id" => "c1",
                 "private_copy" => "Leave soon"
               },
               now: DateTime.utc_now()
             )
  end

  test "material when inside notify window" do
    leave =
      DateTime.utc_now()
      |> DateTime.add(5 * 60, :second)
      |> DateTime.truncate(:second)

    assert {:material, payload} =
             LeaveByMateriality.evaluate(
               %{
                 "leave_by" => DateTime.to_iso8601(leave),
                 "commitment_id" => "c1",
                 "owner_user_id" => "u1",
                 "private_copy" => "Leave for Juniper"
               },
               now: DateTime.utc_now()
             )

    assert payload["kind"] == "leave_by"
    assert payload["origin_exposed"] == false
    assert payload["spam"] == false
  end

  test "already notified stays silent" do
    leave = DateTime.utc_now() |> DateTime.add(60, :second)

    assert {:silence, _} =
             LeaveByMateriality.evaluate(%{"leave_by" => DateTime.to_iso8601(leave)},
               already_notified: true
             )
  end
end
