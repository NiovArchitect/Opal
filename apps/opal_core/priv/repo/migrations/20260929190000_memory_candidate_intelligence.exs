defmodule OpalCore.Repo.Migrations.MemoryCandidateIntelligence do
  use Ecto.Migration

  def change do
    alter table(:personal_memory_candidates) do
      add :memory_class, :string
      add :evidence_kind, :string
      add :scope, :string
      add :scope_id, :string
      add :subject_user_id, :binary_id
      add :value_key, :string
      add :polarity, :string
      add :sensitive, :boolean, null: false, default: false
      add :source_type, :string
      add :observation_count, :integer, null: false, default: 1
      add :first_observed_at, :utc_datetime_usec
      add :last_observed_at, :utc_datetime_usec
      add :last_confirmed_at, :utc_datetime_usec
      add :confidence_components, :map, null: false, default: %{}
      add :provenance, :map, null: false, default: %{}
      add :context_dims, :map, null: false, default: %{}
      add :supersedes_candidate_id, :binary_id
      add :contradiction_group_id, :binary_id
      add :promoted_memory_id, :binary_id
      add :idempotency_key, :string
    end

    create unique_index(:personal_memory_candidates, [:idempotency_key],
             name: :personal_memory_candidates_idempotency_key_uniq,
             where: "idempotency_key IS NOT NULL"
           )

    create index(:personal_memory_candidates, [:owner_user_id, :memory_class, :status])
    create index(:personal_memory_candidates, [:subject_user_id, :value_key])
    create index(:personal_memory_candidates, [:scope, :scope_id])
  end
end
