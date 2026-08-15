defmodule OpalCore.Repo.Migrations.CreateFollowEdges do
  use Ecto.Migration

  def change do
    create table(:follow_edges, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :follower_user_id, :binary_id, null: false
      add :creator_user_id, :binary_id, null: false
      add :status, :string, null: false, default: "active"
      add :grants_friend_visibility, :boolean, null: false, default: false
      add :meta, :map, null: false, default: %{}

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:follow_edges, [:follower_user_id, :creator_user_id],
             name: :follow_edges_follower_creator_index
           )

    create index(:follow_edges, [:creator_user_id, :status])
    create index(:follow_edges, [:follower_user_id, :status])
  end
end
