defmodule Mix.Tasks.Opal.ExportOutbox do
  @shortdoc "Export pending/published outbox envelopes as JSON (dev bridge helper)"
  @moduledoc """
  Writes eligible outbox envelopes to a JSON file for foundation Phase 2 bridge tests.

  Does not call foundation. Does not include production secrets.

      mix opal.export_outbox --path /tmp/opal_outbox_export.json --limit 50
  """

  use Mix.Task
  import Ecto.Query
  alias OpalCore.Events.EventOutbox
  alias OpalCore.Repo

  @impl Mix.Task
  def run(args) do
    Mix.Task.run("app.start")

    {opts, _, _} =
      OptionParser.parse(args,
        strict: [path: :string, limit: :integer, status: :string]
      )

    path = opts[:path] || "/tmp/opal_outbox_export.json"
    limit = opts[:limit] || 50
    status = opts[:status] || "pending"

    rows =
      from(o in EventOutbox,
        where: o.status == ^status,
        order_by: [asc: o.inserted_at],
        limit: ^limit
      )
      |> Repo.all()

    envelopes = Enum.map(rows, & &1.envelope)
    File.write!(path, Jason.encode!(%{envelopes: envelopes, count: length(envelopes)}, pretty: true))
    Mix.shell().info("wrote #{length(envelopes)} envelopes to #{path}")
  end
end
