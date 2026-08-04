defmodule OpalCore.Events.FoundationAdapterTest do
  use ExUnit.Case, async: true

  alias OpalCore.Events.Adapters.FoundationHttpAdapter

  test "disabled when OPAL_FOUNDATION_INGRESS_URL unset" do
    System.delete_env("OPAL_FOUNDATION_INGRESS_URL")
    refute FoundationHttpAdapter.enabled?()

    assert {:error, :foundation_ingress_disabled} =
             FoundationHttpAdapter.publish(%{
               "event_id" => "evt_x",
               "event_type" => "invitation.accepted"
             })
  end

  test "enabled when URL set" do
    System.put_env("OPAL_FOUNDATION_INGRESS_URL", "http://127.0.0.1:4100")
    assert FoundationHttpAdapter.enabled?()
    System.delete_env("OPAL_FOUNDATION_INGRESS_URL")
  end
end
