defmodule OpalCore.Repo.Migrations.AttentionCenterItems do
  use Ecto.Migration

  def change do
    create table(:attention_center_items, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :owner_user_id, :string, null: false
      add :dedupe_key, :string, null: false
      add :section, :string, null: false
      add :level, :string, null: false, default: "ambient"
      add :reason, :string
      add :title, :string, null: false
      add :detail, :string
      add :copy, :string
      add :action_required, :boolean, null: false, default: false
      add :badge_eligible, :boolean, null: false, default: false
      add :seen, :boolean, null: false, default: false
      add :status, :string, null: false, default: "active"
      add :conversation_id, :string
      add :plan_id, :string
      add :deep_link_kind, :string
      add :deep_link_id, :string
      add :muted, :boolean, null: false, default: false
      add :source_type, :string
      add :privacy_safe, :boolean, null: false, default: true
      add :metadata, :map, null: false, default: %{}
      add :resolved_at, :utc_datetime_usec
      add :superseded_at, :utc_datetime_usec

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:attention_center_items, [:owner_user_id, :dedupe_key],
             name: :attention_center_items_owner_dedupe_uniq
           )

    create index(:attention_center_items, [:owner_user_id, :section, :status])
  end
end
