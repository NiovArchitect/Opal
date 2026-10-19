defmodule OpalCore.Repo.Migrations.CreateMemoryWalletsAndCapsules do
  use Ecto.Migration

  # Repair #18 SM scoped build (phase 5) - additive only.
  # W-GAP-01: one memory wallet per account. This is the MEMORY wallet;
  # the money wallet (wallets / wallet_transactions, Stripe loads) is a
  # different construct and is untouched (WALLET_MAP section A1 name
  # collision, registered there).
  # W-GAP-02 first form: personal-memory capsules as ONE object -
  # payload + provenance + scope policy (the map section A field
  # groups and the 8 scope dimensions) stored AS DATA on the row.
  # Version note: 20261029050001, verified against the merged
  # migrations directory, which holds 20261029010001 (DIR-4),
  # 20261029020001 (adopt1), 20261029030001 (adopt2), and
  # 20261029040001 (the hardening wave's support idempotency column,
  # merged in parallel). This migration was first created as
  # 20261029040001 on this branch and RENAMED to 20261029050001 on
  # the coordinator's instruction before any shared-DB run, so the
  # two 040001 migrations never coexist (see sm-report.md).
  def change do
    create table(:memory_wallets, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :owner_user_id, :binary_id, null: false

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:memory_wallets, [:owner_user_id],
             name: :memory_wallets_owner_user_id_index
           )

    create table(:memory_capsules, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :wallet_id, :binary_id, null: false
      add :owner_user_id, :binary_id, null: false
      # The capsule as one object: three maps, all data.
      add :payload, :map, null: false, default: %{}
      add :provenance, :map, null: false, default: %{}
      add :scope_policy, :map, null: false, default: %{}
      # Denormalized enforcement columns, kept in step with
      # scope_policy by the capsule module (the policy map governs;
      # these exist so the mediated read can filter in the query).
      add :scope_kind, :string, null: false, default: "user"
      add :scope_id, :string
      add :purpose, :string
      add :expires_at, :utc_datetime_usec
      add :review_at, :utc_datetime_usec
      add :version, :integer, null: false, default: 1
      add :supersedes_id, :binary_id
      add :status, :string, null: false, default: "active"

      timestamps(type: :utc_datetime_usec)
    end

    create index(:memory_capsules, [:owner_user_id, :status])
    create index(:memory_capsules, [:wallet_id])
    create index(:memory_capsules, [:owner_user_id, :scope_kind, :scope_id])
  end
end
