defmodule OpalCore.Repo.Migrations.VirtualPlansAndUsualMeetingLink do
  use Ecto.Migration

  def change do
    alter table(:shared_plans) do
      add :plan_type, :string, null: false, default: "in_person"
      add :meeting_link, :string
    end

    create index(:shared_plans, [:plan_type])

    alter table(:user_assistance_preferences) do
      add :usual_meeting_link, :string
    end
  end
end
