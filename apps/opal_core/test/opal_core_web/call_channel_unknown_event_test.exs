defmodule OpalCoreWeb.CallChannelUnknownEventTest do
  @moduledoc """
  Repair #18 FALSE-fix F-15: the call channel's catch-all used to return
  `{:noreply, socket}` for every unknown event, so a client typo during
  a live call failed silently for everyone. Unknown events now reply
  `{:error, %{reason: "unknown_event"}}`.
  """
  use ExUnit.Case, async: true

  alias OpalCoreWeb.CallChannel

  test "unknown event replies with an unknown_event error, never silence" do
    socket = %Phoenix.Socket{}

    assert {:reply, {:error, %{reason: "unknown_event"}}, %Phoenix.Socket{}} =
             CallChannel.handle_in("bogus_event", %{}, socket)

    assert {:reply, {:error, %{reason: "unknown_event"}}, %Phoenix.Socket{}} =
             CallChannel.handle_in("signal_typo", %{"type" => "offer"}, socket)
  end

  test "malformed signal keeps its specific invalid_signal error" do
    socket = %Phoenix.Socket{}

    assert {:reply, {:error, %{reason: "invalid_signal"}}, %Phoenix.Socket{}} =
             CallChannel.handle_in("signal", %{"nope" => true}, socket)
  end
end
