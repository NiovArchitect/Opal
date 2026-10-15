defmodule OpalCoreWeb.Repair11RoutingGateTest do
  @moduledoc """
  Phase 3 adversarial gates that need the ROUTING track's merged code.

  These tests are tagged :requires_routing_merge and are EXPECTED TO FAIL
  until the routing/channel track merges:
    1. handle_in("social_flow:change_plan_time" | "social_flow:change_plan_date")
       in conversation_channel.ex (the mobile client already pushes these;
       repair #11 socialflow track owns the SocialFlow.* functions only).
    2. NL routing of chat text "I confirm" -> AI result_type
       "revision_confirmation" -> SocialFlow.confirm_pending_revision/1.

  Run the gate with:
    mix test apps/opal_core/test/opal_core_web/repair11_routing_gate_test.exs --include requires_routing_merge

  Written 2026-10-15. NOT RUN on this VM (no Elixir toolchain).
  """

  use OpalCoreWeb.ChannelCase

  @moduletag :requires_routing_merge

  alias OpalCore.{Fixtures, FixturesHelper, SocialFlow}
  alias OpalCoreWeb.UserSocket

  setup do
    FixturesHelper.seed!()
    :ok
  end

  defp connect_user(user_id, device_id \\ "device-1") do
    {:ok, socket} =
      connect(UserSocket, %{
        "user_id" => user_id,
        "device_id" => device_id,
        "app_state" => "foreground",
        "client_version" => "test-0.1.0"
      })

    socket
  end

  defp conv, do: Fixtures.conv_alex_jordan_id()
  defp alex, do: Fixtures.user_alex_id()
  defp jordan, do: Fixtures.user_jordan_id()

  # Drives proposal -> coordination -> both-accept via the SocialFlow API.
  # jordan accepts last, so jordan is created_by and (repair #11) the lead.
  defp drive_to_plan! do
    {:ok, proposal} =
      %SocialFlow.Proposal{}
      |> SocialFlow.Proposal.changeset(%{
        conversation_id: conv(),
        created_by_user_id: alex(),
        capability: "social_flow_plan_extract",
        status: "visible",
        activity_label: "Dinner",
        expires_at:
          DateTime.add(DateTime.utc_now(), 7 * 24 * 3600, :second)
          |> DateTime.truncate(:microsecond)
      })
      |> OpalCore.Repo.insert()

    {:ok, option} =
      %SocialFlow.PlanOption{}
      |> SocialFlow.PlanOption.changeset(%{
        proposal_id: proposal.id,
        label: "Thursday at 7:00 PM",
        status: "open",
        sort_order: 0
      })
      |> OpalCore.Repo.insert()

    assert {:ok, _} =
             SocialFlow.approve_coordination(%{
               proposal_id: proposal.id,
               user_id: alex(),
               trace_id: "t"
             })

    assert {:ok, :awaiting_others} =
             SocialFlow.respond_to_option(%{
               option_id: option.id,
               user_id: alex(),
               response: "accept",
               trace_id: "t1"
             })

    assert {:ok, %{plan: plan}} =
             SocialFlow.respond_to_option(%{
               option_id: option.id,
               user_id: jordan(),
               response: "accept",
               trace_id: "t2"
             })

    plan
  end

  test "lead change_plan_time via channel applies (routing track handle_in)" do
    plan = drive_to_plan!()

    socket = connect_user(jordan())
    {:ok, _, sock} = subscribe_and_join(socket, "conversation:#{conv()}", %{})

    ref =
      push(sock, "social_flow:change_plan_time", %{
        "plan_id" => plan.id,
        "new_time_label" => "Friday at 9:00 PM",
        "trace_id" => "trace-gate-1"
      })

    # The routing track's handle_in must delegate to
    # SocialFlow.change_plan_time/1 and reply :ok. Fails until merged.
    assert_reply ref, :ok, %{"plan" => updated}

    assert updated["time_label"] == "Friday at 9:00 PM"
  end

  test "non-lead change_plan_date via channel is refused (routing track handle_in)" do
    plan = drive_to_plan!()

    socket = connect_user(alex())
    {:ok, _, sock} = subscribe_and_join(socket, "conversation:#{conv()}", %{})

    ref =
      push(sock, "social_flow:change_plan_date", %{
        "plan_id" => plan.id,
        "new_date_label" => "Saturday",
        "trace_id" => "trace-gate-2"
      })

    # Delegates to SocialFlow.change_plan_date/1, which returns
    # {:error, :not_authorized} for the non-lead. Fails until merged.
    assert_reply ref, :error, _
  end

  test "\"I confirm\" chat text applies the pending revision end-to-end (routing track NL)" do
    plan = drive_to_plan!()

    assert {:ok, _} =
             SocialFlow.propose_revision(%{
               plan_id: plan.id,
               proposed_by_user_id: alex(),
               changes: %{"time_label" => "Friday at 8:00 PM"},
               trace_id: "t"
             })

    # Drain setup broadcasts; only the confirm-path broadcast may match below.
    Phoenix.PubSub.subscribe(OpalCore.PubSub, "social_flow:conversation:#{conv()}")
    flush_setup()

    socket = connect_user(jordan())
    {:ok, _, sock} = subscribe_and_join(socket, "conversation:#{conv()}", %{})

    ref =
      push(sock, "message:send", %{
        "schema_version" => "0.1.0",
        "client_message_id" => "gate-confirm-1",
        "conversation_id" => conv(),
        "body" => "I confirm",
        "trace_id" => "trace-gate-3"
      })

    assert_reply ref, :ok, _

    # The routing track must classify "I confirm" as revision_confirmation and
    # route to SocialFlow.confirm_pending_revision/1, which broadcasts the
    # applied plan. Fails until merged.
    assert_receive {:social_flow_event, "social_flow:plan", envelope}, 5_000
    assert envelope["payload"]["plan"]["time_label"] == "Friday at 8:00 PM"
  end

  defp flush_setup do
    receive do
      {:social_flow_event, _, _} -> flush_setup()
    after
      100 -> :ok
    end
  end
end
