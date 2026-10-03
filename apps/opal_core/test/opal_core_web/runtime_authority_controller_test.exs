defmodule OpalCoreWeb.RuntimeAuthorityControllerTest do
  use OpalCoreWeb.ConnCase

  test "GET /api/dev/runtime-authority returns provenance without secrets", %{conn: conn} do
    conn = get(conn, "/api/dev/runtime-authority")
    body = json_response(conn, 200)

    assert is_binary(body["backend_sha"])
    assert is_binary(body["branch"])
    assert is_boolean(body["dirty_worktree"])
    assert is_binary(body["runtime_diff_fingerprint"])
    assert is_binary(body["schema_version"])
    assert is_binary(body["server_time"])
    assert body["server_timezone"] == "UTC"
    assert is_binary(body["api_base"])
    refute Map.has_key?(body, "secret")
    refute Map.has_key?(body, "token")
    refute Map.has_key?(body, "api_key")
    # No credential-looking values
    encoded = Jason.encode!(body)
    refute encoded =~ ~r/postgres:\/\//
    refute encoded =~ ~r/DEEPGRAM/
  end
end
