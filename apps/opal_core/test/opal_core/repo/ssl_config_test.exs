defmodule OpalCore.Repo.SslConfigTest do
  use ExUnit.Case, async: true

  alias OpalCore.Repo.SslConfig

  test "disabled SSL returns empty opts" do
    assert SslConfig.repo_ssl_opts(enabled?: false) == []
  end

  test "enabled SSL uses verify_peer and CAStore when available" do
    opts =
      SslConfig.repo_ssl_opts(
        enabled?: true,
        hostname: "db.example.com",
        fail_closed?: true
      )

    assert Keyword.get(opts, :ssl) == true
    ssl_opts = Keyword.fetch!(opts, :ssl_opts)
    assert Keyword.get(ssl_opts, :verify) == :verify_peer
    assert Keyword.has_key?(ssl_opts, :cacertfile)
    assert Keyword.get(ssl_opts, :server_name_indication) == ~c"db.example.com"
    assert Keyword.has_key?(ssl_opts, :customize_hostname_check)
    assert SslConfig.verifies_peer?(opts)
  end

  test "missing CA fail-closed raises without credentials" do
    assert_raise RuntimeError, ~r/TLS verification configuration missing/, fn ->
      SslConfig.repo_ssl_opts(
        enabled?: true,
        hostname: "db.example.com",
        cacertfile: "/nonexistent/ca.pem",
        fail_closed?: true
      )
    end
  end

  test "hostname_from_url never requires password visibility" do
    assert SslConfig.hostname_from_url("ecto://user:s3cret@db.example.com/opal") ==
             "db.example.com"

    assert SslConfig.hostname_from_url("postgres://localhost/opal") == "localhost"
  end

  test "production runtime source forbids verify_none" do
    src = File.read!(Path.join(File.cwd!(), "config/runtime.exs"))
    # Comment may mention the forbidden mode; code path must not set it.
    refute src =~ "verify: :verify_none"
    assert src =~ "SslConfig.repo_ssl_opts"
  end
end
