defmodule OpalCoreWeb.RuntimeAuthorityController do
  @moduledoc """
  DEV/TEST ONLY — runtime provenance for crash recovery / worktree truth.
  No secrets. Not registered in production Mix.env.
  """
  use OpalCoreWeb, :controller

  alias OpalCore.Contracts

  def show(conn, _params) do
    repo_root = repo_root()
    {backend_sha, branch, dirty?, diff_fp} = git_snapshot(repo_root)

    json(conn, %{
      "frontend_build_sha" => nil,
      "backend_sha" => backend_sha,
      "branch" => branch,
      "dirty_worktree" => dirty?,
      "runtime_diff_fingerprint" => diff_fp,
      "schema_version" => Contracts.schema_version(),
      "migration_version" => migration_version(),
      "server_time" => DateTime.utc_now() |> DateTime.truncate(:second) |> DateTime.to_iso8601(),
      "server_timezone" => "UTC",
      "api_base" => api_base(conn),
      "fixture_generation_id" => fixture_generation_id(repo_root),
      "env" => to_string(Application.get_env(:opal_core, :env) || Mix.env())
    })
  end

  defp api_base(conn) do
    "#{conn.scheme}://#{conn.host}#{port_suffix(conn)}"
  end

  defp port_suffix(%{port: port, scheme: "http"}) when port in [80, nil], do: ""
  defp port_suffix(%{port: port, scheme: "https"}) when port in [443, nil], do: ""
  defp port_suffix(%{port: port}) when is_integer(port), do: ":#{port}"
  defp port_suffix(_), do: ""

  defp repo_root do
    cwd = File.cwd!()
    find_git_root(cwd) || cwd
  end

  defp find_git_root(path) do
    cond do
      File.dir?(Path.join(path, ".git")) or File.regular?(Path.join(path, ".git")) ->
        path

      path == Path.dirname(path) ->
        nil

      true ->
        find_git_root(Path.dirname(path))
    end
  end

  defp git_snapshot(repo_root) do
    sha = git(repo_root, ["rev-parse", "HEAD"]) || "unknown"
    branch = git(repo_root, ["rev-parse", "--abbrev-ref", "HEAD"]) || "unknown"
    porcelain = git(repo_root, ["status", "--porcelain"]) || ""
    dirty? = String.trim(porcelain) != ""
    diff = git(repo_root, ["diff", "HEAD"])

    fingerprint =
      cond do
        is_nil(diff) ->
          "unknown"

        String.trim(diff) == "" ->
          "clean"

        true ->
          :crypto.hash(:sha256, diff)
          |> Base.encode16(case: :lower)
          |> String.slice(0, 16)
      end

    {sha, branch, dirty?, fingerprint}
  end

  defp git(cwd, args) do
    case System.cmd("git", args, cd: cwd, stderr_to_stdout: true) do
      {out, 0} -> String.trim(out)
      _ -> nil
    end
  rescue
    _ -> nil
  end

  defp migration_version do
    case Ecto.Migrator.migrated_versions(OpalCore.Repo) do
      [] -> nil
      versions when is_list(versions) -> Enum.max(versions)
      _ -> nil
    end
  rescue
    _ -> nil
  end

  defp fixture_generation_id(repo_root) do
    from_env =
      Application.get_env(:opal_core, :fixture_generation_id) ||
        System.get_env("OPAL_FIXTURE_GENERATION_ID")

    cond do
      is_binary(from_env) and String.trim(from_env) != "" ->
        String.trim(from_env)

      true ->
        candidates = [
          Path.join(repo_root, "apps/opal_core/priv/fixture_generation_id"),
          Path.join(repo_root, "priv/fixture_generation_id"),
          Path.join(
            repo_root,
            "docs/evidence/v2-coded-experience/coherence-recovery/FOUNDER_FIXTURE_RESET.json"
          )
        ]

        Enum.find_value(candidates, fn path ->
          case File.read(path) do
            {:ok, body} ->
              trimmed = String.trim(body)

              cond do
                trimmed == "" ->
                  nil

                String.ends_with?(path, ".json") ->
                  case Jason.decode(trimmed) do
                    {:ok, %{"FIXTURE_GENERATION_ID" => id}} when is_binary(id) and id != "" ->
                      id

                    _ ->
                      nil
                  end

                true ->
                  trimmed
              end

            _ ->
              nil
          end
        end)
    end
  end
end
