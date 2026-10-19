defmodule OpalCore.Repo.Migrations.CreateProactiveRevealDismissals do
  use Ecto.Migration

  def change do
    create table(:proactive_reveal_dismissals, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :viewer_user_id, references(:users, type: :binary_id, on_delete: :delete_all),
        null: false

      add :reveal_key, :string, null: false, size: 300
      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:proactive_reveal_dismissals, [:viewer_user_id, :reveal_key],
             name: :proactive_reveal_dismissals_viewer_key_uniq
           )

    create index(:proactive_reveal_dismissals, [:viewer_user_id])
  end
end
