defmodule OpalCoreWeb.CorsOriginsTest do
  use ExUnit.Case, async: true

  alias OpalCoreWeb.Plugs.Cors

  test "local Vite origins include common bumped ports" do
    origins = Cors.allowed_origins()

    for host <- ["localhost", "127.0.0.1"], port <- [5173, 5174, 5175] do
      assert "http://#{host}:#{port}" in origins
    end

    assert "https://opal.niovlabs.com" in origins
  end
end
