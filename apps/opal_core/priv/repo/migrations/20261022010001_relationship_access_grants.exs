defmodule OpalCore.Repo.Migrations.RelationshipAccessGrants do
  use Ecto.Migration

  def change do
    create table(:relationship_access_grants, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :owner_user_id, references(:users, type: :binary_id, on_delete: :delete_all), null: false
      # contact | group | global
      add :scope_kind, :string, null: false
      add :contact_user_id, references(:users, type: :binary_id, on_delete: :delete_all)
      add :group_id, :binary_id
      add :data_category, :string, null: false
      # none | observe | use | disclose
      add :access_level, :string, null: false, default: "none"
      # none | suggest | prepare | execute
      add :action_ceiling, :string, null: false, default: "none"
      # private | relationship | group | self_only
      add :visibility, :string, null: false, default: "self_only"
      # explicit | template | provisional
      add :source, :string, null: false, default: "explicit"
      add :template_key, :string
      add :season_key, :string
      add :granted_at, :utc_datetime_usec, null: false
      add :expires_at, :utc_datetime_usec
      add :revoked_at, :utc_datetime_usec
      add :audit, :map, null: false, default: %{}

      timestamps(type: :utc_datetime_usec)
    end

    create index(:relationship_access_grants, [:owner_user_id])
    create index(:relationship_access_grants, [:owner_user_id, :contact_user_id])
    create index(:relationship_access_grants, [:owner_user_id, :data_category])
    create index(:relationship_access_grants, [:owner_user_id, :scope_kind])

    create unique_index(
             :relationship_access_grants,
             [:owner_user_id, :scope_kind, :contact_user_id, :group_id, :data_category],
             name: :relationship_access_grants_scope_category_uidx,
             where: "revoked_at IS NULL"
           )

    create table(:opal_graphing_policies, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :owner_user_id, references(:users, type: :binary_id, on_delete: :delete_all), null: false
      # never | ask_each | auto_eligible | selected_only
      add :call_mode, :string, null: false, default: "ask_each"
      add :chat_mode, :string, null: false, default: "ask_each"
      add :global_paused, :boolean, null: false, default: false
      add :paused_at, :utc_datetime_usec
      add :other_party_disclosure_required, :boolean, null: false, default: true
      add :audit, :map, null: false, default: %{}

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:opal_graphing_policies, [:owner_user_id])
  end
end
