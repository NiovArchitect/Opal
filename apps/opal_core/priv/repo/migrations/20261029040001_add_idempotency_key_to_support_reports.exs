defmodule OpalCore.Repo.Migrations.AddIdempotencyKeyToSupportReports do
  use Ecto.Migration

  # Repair #18 hardening - support intake idempotency (4.C7 follow-on).
  # A client-supplied idempotency key, scoped to the reporter: a
  # retry / double-submit carrying the same key returns the original
  # report instead of filing a duplicate. The column is nullable and
  # Postgres treats NULLs as distinct under a unique index, so
  # keyless submits keep the historical one-report-per-submit
  # semantics exactly. Additive only.
  def change do
    alter table(:support_reports) do
      add :idempotency_key, :string
    end

    create unique_index(:support_reports, [:user_id, :idempotency_key],
             name: :support_reports_user_id_idempotency_key_index
           )
  end
end
