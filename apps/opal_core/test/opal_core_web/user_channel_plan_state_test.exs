defmodule OpalCoreWeb.UserChannelPlanStateTest do
  @moduledoc """
  R19 W27 (AT-03): a plan event published on the owner-scoped
  PubSub topic (`social_flow:user:<id>` - SocialFlow.broadcast_plan/4's
  conversation-less fanout) must reach the owner's socket as
  `inbox:plan_state`, so the C2 shell can repaint its plan/Home
  projections on a REMOTE state crossing without navigation.
  """
  use OpalCoreWeb.ChannelCase

  alias OpalCore.{Fixtures, FixturesHelper}
  alias OpalCoreWeb.UserSocket

  setup do
    FixturesHelper.seed!()
    :ok
  end

  defp connect_user(user_id) do
    {:ok, socket} =
      connect(UserSocket, %{
        "user_id" => user_id,
        "device_id" => "device-1",
        "app_state" => "foreground",
        "client_version" => "test-0.1.0"
      })

    socket
  end

  test "owner receives inbox:plan_state when a plan event publishes on their topic" do
    alex = Fixtures.user_alex_id()
    socket = connect_user(alex)
    {:ok, _, _socket} = subscribe_and_join(socket, "user:#{alex}", %{})

    envelope = %{
      "schema_version" => "1",
      "event_id" => Ecto.UUID.generate(),
      "event_type" => "social_flow:plan",
      "occurred_at" => DateTime.utc_now() |> DateTime.to_iso8601(),
      "trace_id" => "trace-at03",
      "payload" => %{
        "plan" => %{"id" => "plan-1", "status" => "agreed"},
        "signal" => %{"kind" => "locked"}
      }
    }

    Phoenix.PubSub.broadcast(
      OpalCore.PubSub,
      "social_flow:user:#{alex}",
      {:social_flow_event, "social_flow:plan", envelope}
    )

    assert_push("inbox:plan_state", %{
      "event" => "social_flow:plan",
      "payload" => %{"plan" => %{"id" => "plan-1", "status" => "agreed"}}
    })
  end

  test "another user's plan event does not reach this socket" do
    alex = Fixtures.user_alex_id()
    jordan = Fixtures.user_jordan_id()
    socket = connect_user(alex)
    {:ok, _, _socket} = subscribe_and_join(socket, "user:#{alex}", %{})

    envelope = %{"event_id" => Ecto.UUID.generate(), "payload" => %{"plan" => %{"id" => "p2"}}}

    Phoenix.PubSub.broadcast(
      OpalCore.PubSub,
      "social_flow:user:#{jordan}",
      {:social_flow_event, "social_flow:plan", envelope}
    )

    refute_push("inbox:plan_state", _, 150)
  end

  test "joining another user's channel is forbidden" do
    socket = connect_user(Fixtures.user_alex_id())

    assert {:error, %{reason: "forbidden"}} =
             subscribe_and_join(socket, "user:#{Fixtures.user_jordan_id()}", %{})
  end
end
