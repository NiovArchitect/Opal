defmodule OpalCore.Release do
  @moduledoc """
  Release tasks for hosted environments (migrate without Mix).

  ## Operator surface — write defaults stated (FALSE-fix F-14)

  Release tasks:

  - `migrate/0` — runs all pending migrations up. Writes schema.
  - `seed/0` — evaluates `priv/repo/seeds.exs`. WRITES seed data.
    Gated: runs ONLY when the operator env `OPAL_RUN_SEEDS` is exactly
    `"true"` or `"1"` (see `seeds_allowed?/0`); otherwise it logs and
    returns `{:error, :seeds_not_enabled}` without evaluating the file.

  Mix tasks (dev/operator shells) and their write defaults:

  - `mix opal.backfill_memory` — WRITES BY DEFAULT; `--dry-run` to only report.
  - `mix opal.backfill_temporal` — DRY-RUN BY DEFAULT; `--apply` to write.
  - `mix opal.cleanup_smoke_messages` — DELETES BY DEFAULT (guarded to
    synthetic-fixture environments unless `--force` in test); `--dry-run` to list.
  - `mix opal.export_outbox` — refuses unless `OPAL_FOUNDATION_INGRESS_URL`
    is set AND `--confirm-development-bridge` is passed; `--dry-run` writes nothing.

  The two backfills have OPPOSITE defaults — that asymmetry is why this
  list exists: never assume one task's convention from the other's.
  """

  require Logger

  @app :opal_core

  def migrate do
    load_app()

    for repo <- repos() do
      {:ok, _, _} = Ecto.Migrator.with_repo(repo, &Ecto.Migrator.run(&1, :up, all: true))
    end
  end

  @doc """
  True only when the operator has intentionally enabled seeding via
  the `OPAL_RUN_SEEDS` env var (`"true"` or `"1"`). This is the gate
  `seed/0` enforces — Repair #18 FALSE-fix F-14: the previous code
  claimed this gate in a comment and never checked it.
  """
  def seeds_allowed? do
    System.get_env("OPAL_RUN_SEEDS") in ["true", "1"]
  end

  def seed do
    if seeds_allowed?() do
      load_app()
      path = Application.app_dir(@app, "priv/repo/seeds.exs")

      if File.exists?(path) do
        Code.eval_file(path)
      end

      :ok
    else
      Logger.warning(
        "release.seed skipped — OPAL_RUN_SEEDS is not set to true/1; seeds file NOT evaluated"
      )

      {:error, :seeds_not_enabled}
    end
  end

  defp repos do
    Application.fetch_env!(@app, :ecto_repos)
  end

  defp load_app do
    Application.load(@app)
  end
end
