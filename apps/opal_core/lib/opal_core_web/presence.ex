defmodule OpalCoreWeb.Presence do
  @moduledoc """
  Ephemeral conversation presence. Not durable relationship intelligence.
  """

  use Phoenix.Presence,
    otp_app: :opal_core,
    pubsub_server: OpalCore.PubSub
end
