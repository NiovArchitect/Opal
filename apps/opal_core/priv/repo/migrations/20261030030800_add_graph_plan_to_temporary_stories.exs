defmodule OpalCore.Repo.Migrations.AddGraphPlanToTemporaryStories do
  use Ecto.Migration

  # Repair #24 WS-2 (additive only): the graph anchor for a story.
  # A story anchored to a SharedPlan (a graph) is visible to exactly
  # that plan's parties; a NULL anchor is the person story that has
  # always existed. If a plan row is ever hard-removed, the anchor
  # nilifies and the story falls back to author-only eligibility
  # (its stored visibility is "graph", which no person branch
  # matches) - it never widens.
  def change do
    alter table(:temporary_stories) do
      add :graph_plan_id,
          references(:shared_plans, type: :binary_id, on_delete: :nilify_all)
    end

    create index(:temporary_stories, [:graph_plan_id])
  end
end
