defmodule OpalCore.Repo.Migrations.AddIntelligenceMaturity do
  use Ecto.Migration

  def change do
    alter table(:user_assistance_preferences) do
      add_if_not_exists :intelligence_maturity, :string, default: "new", null: false
      add_if_not_exists :onboarding_seed_completed_at, :utc_datetime_usec
      add_if_not_exists :learning_questions_on, :date
      add_if_not_exists :learning_questions_count, :integer, default: 0, null: false
    end
  end
end
