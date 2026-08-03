defmodule OpalCore.Release do
  @moduledoc """
  Release tasks for hosted environments (migrate without Mix).
  """

  @app :opal_core

  def migrate do
    load_app()

    for repo <- repos() do
      {:ok, _, _} = Ecto.Migrator.with_repo(repo, &Ecto.Migrator.run(&1, :up, all: true))
    end
  end

  def seed do
    load_app()
    # Only when OPAL_RUN_SEEDS is intentionally set by operators.
    path = Application.app_dir(@app, "priv/repo/seeds.exs")

    if File.exists?(path) do
      Code.eval_file(path)
    end
  end

  defp repos do
    Application.fetch_env!(@app, :ecto_repos)
  end

  defp load_app do
    Application.load(@app)
  end
end
