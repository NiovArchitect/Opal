defmodule OpalCore.Repo.SslConfig do
  @moduledoc """
  R1A — managed Postgres TLS with peer + hostname verification.

  Production/staging managed SSL must never use `:verify_none`.
  Local may omit SSL entirely.
  """

  @doc """
  Build Repo `ssl` / `ssl_opts` keyword options.

  - `enabled?: false` → `[]` (no SSL)
  - `enabled?: true` → verified peer TLS using CAStore + hostname check

  Raises with a safe message (no credentials) when trust material is missing
  and `fail_closed?: true` (default for production).
  """
  def repo_ssl_opts(opts \\ []) when is_list(opts) do
    enabled? = Keyword.get(opts, :enabled?, false)
    hostname = Keyword.get(opts, :hostname)
    fail_closed? = Keyword.get(opts, :fail_closed?, true)
    cacertfile = Keyword.get(opts, :cacertfile) || default_cacertfile()

    cond do
      not enabled? ->
        []

      is_nil(cacertfile) or cacertfile == "" or not File.exists?(to_string(cacertfile)) ->
        if fail_closed? do
          raise """
          Postgres TLS verification configuration missing or invalid.
          Set a valid CA bundle (CAStore) for managed DATABASE_SSL connections.
          """
        else
          []
        end

      true ->
        ssl_opts =
          [
            verify: :verify_peer,
            cacertfile: to_charlist_path(cacertfile)
          ]
          |> maybe_hostname(hostname)

        [ssl: true, ssl_opts: ssl_opts]
    end
  end

  @doc "True when ssl_opts would use verify_peer (for proofs)."
  def verifies_peer?(ssl_kw) when is_list(ssl_kw) do
    case Keyword.get(ssl_kw, :ssl_opts) do
      opts when is_list(opts) -> Keyword.get(opts, :verify) == :verify_peer
      _ -> false
    end
  end

  def verifies_peer?(_), do: false

  @doc "Parse hostname from an Ecto/Postgres URL without logging credentials."
  def hostname_from_url(url) when is_binary(url) do
    uri = URI.parse(url)

    cond do
      is_binary(uri.host) and uri.host != "" -> uri.host
      true -> nil
    end
  rescue
    _ -> nil
  end

  def hostname_from_url(_), do: nil

  defp default_cacertfile do
    cond do
      Code.ensure_loaded?(CAStore) and function_exported?(CAStore, :file_path, 0) ->
        CAStore.file_path()

      path = System.get_env("OPAL_POSTGRES_CACERTFILE") ->
        path

      true ->
        nil
    end
  end

  defp maybe_hostname(ssl_opts, hostname) when is_binary(hostname) and hostname != "" do
    ssl_opts ++
      [
        server_name_indication: String.to_charlist(hostname),
        customize_hostname_check: [
          match_fun: :public_key.pkix_verify_hostname_match_fun(:https)
        ]
      ]
  end

  defp maybe_hostname(ssl_opts, _), do: ssl_opts

  defp to_charlist_path(path) when is_binary(path), do: String.to_charlist(path)
  defp to_charlist_path(path) when is_list(path), do: path
end
