defmodule Mix.Tasks.Opal.ExportOutbox do
  @shortdoc "Dev-only: export allowlisted outbox envelopes for foundation bridge"
  @moduledoc """
  Development bridge helper for Opal-Social-Foundation Phase 2.

  ## Safety

  * Refuses to run unless `OPAL_FOUNDATION_INGRESS_URL` is set **and**
    `--confirm-development-bridge` is passed.
  * Only allowlisted event types: `invitation.accepted`, `relationship.accepted`
    (same as `FoundationHttpAdapter`).
  * Default limit 25; maximum limit 100.
  * `--dry-run` reports counts only; writes nothing; publishes nothing; changes no state.
  * Never prints raw payloads, phones, contacts, messages, or tokens.

  ## Examples

      mix opal.export_outbox --confirm-development-bridge --dry-run
      mix opal.export_outbox --confirm-development-bridge --event-type invitation.accepted --limit 25
      mix opal.export_outbox --confirm-development-bridge --path /tmp/outbox.json --status pending

  Does **not** call foundation HTTP. Use foundation `npm run bridge:opal-shaped` with the
  export file when you intend to post synthetic/dev envelopes.
  """

  use Mix.Task
  import Ecto.Query

  alias OpalCore.Events.Adapters.FoundationHttpAdapter
  alias OpalCore.Events.EventOutbox
  alias OpalCore.Repo

  @default_limit 25
  @max_limit 100
  @default_status "pending"

  @impl Mix.Task
  def run(args) do
    {opts, _, _} =
      OptionParser.parse(args,
        strict: [
          path: :string,
          limit: :integer,
          status: :string,
          dry_run: :boolean,
          confirm_development_bridge: :boolean,
          event_type: :keep
        ],
        aliases: [n: :dry_run]
      )

    with :ok <- guard_environment(opts),
         {:ok, limit} <- parse_limit(opts[:limit]),
         {:ok, types} <- parse_event_types(opts),
         status <- opts[:status] || @default_status do
      Mix.Task.run("app.start")
      execute(opts, limit, types, status)
    else
      {:error, reason} ->
        Mix.shell().error("export_outbox refused: #{reason}")
        exit({:shutdown, 1})
    end
  end

  defp guard_environment(opts) do
    cond do
      opts[:confirm_development_bridge] != true ->
        {:error, "missing --confirm-development-bridge (development bridge only)"}

      not FoundationHttpAdapter.enabled?() ->
        {:error, "OPAL_FOUNDATION_INGRESS_URL is not set (bridge disabled; refusing export)"}

      true ->
        :ok
    end
  end

  defp parse_limit(nil), do: {:ok, @default_limit}

  defp parse_limit(n) when is_integer(n) and n > 0 and n <= @max_limit, do: {:ok, n}

  defp parse_limit(n) when is_integer(n) and n > @max_limit do
    {:error, "limit #{n} exceeds maximum #{@max_limit}"}
  end

  defp parse_limit(_), do: {:error, "limit must be a positive integer <= #{@max_limit}"}

  defp parse_event_types(opts) do
    requested =
      opts
      |> Keyword.get_values(:event_type)
      |> List.flatten()
      |> Enum.reject(&(&1 in [nil, ""]))

    allowed = FoundationHttpAdapter.allowed_event_types()

    cond do
      requested == [] ->
        {:ok, allowed}

      true ->
        bad = Enum.reject(requested, &(&1 in allowed))

        if bad == [] do
          {:ok, requested}
        else
          {:error, "event type(s) not allowlisted: #{Enum.join(bad, ", ")}"}
        end
    end
  end

  defp execute(opts, limit, types, status) do
    dry_run? = opts[:dry_run] == true
    path = opts[:path] || "/tmp/opal_outbox_export.json"

    considered =
      from(o in EventOutbox,
        where: o.status == ^status,
        order_by: [asc: o.inserted_at],
        limit: ^(limit * 4)
      )
      |> Repo.all()

    considered_count = length(considered)

    {eligible, skipped_type, rejected_validation} =
      Enum.reduce(considered, {[], 0, 0}, fn row, {ok, skip, rej} ->
        type = row.event_type || get_in(row.envelope, ["event_type"])

        cond do
          type not in types ->
            {ok, skip + 1, rej}

          true ->
            case FoundationHttpAdapter.validate_for_publish(row.envelope || %{}) do
              :ok ->
                {[row | ok], skip, rej}

              {:error, _} ->
                {ok, skip, rej + 1}
            end
        end
      end)

    eligible =
      eligible
      |> Enum.reverse()
      |> Enum.take(limit)

    would_submit = length(eligible)

    Mix.shell().info("""
    export_outbox summary
      dry_run=#{dry_run?}
      status=#{status}
      allowlist=#{Enum.join(types, ",")}
      limit=#{limit}
      rows_considered=#{considered_count}
      rows_eligible=#{would_submit}
      rows_skipped_by_type=#{skipped_type}
      rows_rejected_by_validation=#{rejected_validation}
      rows_that_would_be_exported=#{would_submit}
    """)

    if dry_run? do
      Mix.shell().info("dry-run: no file written; no HTTP; no state change")
      :ok
    else
      envelopes =
        Enum.map(eligible, fn row ->
          %{
            "event_id" => row.event_id,
            "event_type" => row.event_type,
            "envelope" => row.envelope
          }
        end)

      # Write envelopes only (operator already confirmed bridge); no secrets
      File.write!(
        path,
        Jason.encode!(
          %{
            envelopes: Enum.map(eligible, & &1.envelope),
            count: would_submit,
            event_ids: Enum.map(eligible, & &1.event_id),
            allowlist: types,
            status: status
          },
          pretty: true
        )
      )

      Mix.shell().info("wrote #{would_submit} allowlisted envelopes to #{path}")
      # silence unused
      _ = envelopes
      :ok
    end
  end
end
