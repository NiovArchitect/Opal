defmodule Mix.Tasks.Opal.CleanupSmokeMessages do
  @shortdoc "Remove SF17 engineering smoke-test messages from synthetic environments"
  @moduledoc """
  Deletes messages whose bodies match known smoke-test patterns
  (SF17 live ping, RT live/reply, OFF*, REG with timestamps, etc.).

  Safety:
  - Only runs when OPAL_SYNTHETIC_FIXTURE_ONLY is true, unless --force is passed
    in MIX_ENV=test.
  - Does not drop tables, users, or conversations.
  - Idempotent: second run deletes zero rows.
  - Use --dry-run to list counts without deleting.

  Examples:

      mix opal.cleanup_smoke_messages --dry-run
      mix opal.cleanup_smoke_messages
  """

  use Mix.Task

  @impl Mix.Task
  def run(args) do
    Mix.Task.run("app.start")

    {opts, _, _} =
      OptionParser.parse(args,
        strict: [dry_run: :boolean, force: :boolean],
        aliases: [n: :dry_run]
      )

    dry_run? = Keyword.get(opts, :dry_run, false)
    force? = Keyword.get(opts, :force, false) and Mix.env() == :test

    {count, ids} =
      OpalCore.SocialFlow.SmokeResidue.cleanup!(dry_run: dry_run?, force: force?)

    mode = if dry_run?, do: "would delete", else: "deleted"
    Mix.shell().info("Smoke residue cleanup: #{mode} #{count} message(s)")

    if count > 0 and count <= 50 do
      Enum.each(ids, fn id -> Mix.shell().info("  id=#{id}") end)
    end

    :ok
  end
end
