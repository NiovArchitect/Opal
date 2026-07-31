defmodule OpalCoreWeb.ChannelCase do
  use ExUnit.CaseTemplate

  using do
    quote do
      import Phoenix.ChannelTest
      @endpoint OpalCoreWeb.Endpoint
    end
  end

  setup tags do
    OpalCore.DataCase.setup_sandbox(tags)
    :ok
  end
end
