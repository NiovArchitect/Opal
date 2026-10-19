defmodule OpalCore.Repo.Migrations.CreateCallGraphingEvents do
  @moduledoc """
  Repair #19 W12 (scope item 16c): consent lineage for call graphing.

  One append-only row per graphing transition on a call — who changed it,
  what changed, and the graphing state the call landed in. Additive only;
  nothing existing is altered. Rows delete with their call, like the
  per-call Assist consents and transcript segments they lineage.
  """
  use Ecto.Migration

  def change do
    create table(:call_graphing_events, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :call_id, references(:call_sessions, type: :binary_id, on_delete: :delete_all),
        null: false

      add :actor_user_id, references(:users, type: :binary_id, on_delete: :nilify_all)
      # graphing_on | graphing_paused | graphing_resumed | graphing_off
      add :action, :string, null: false
      # graphing | paused | waiting_for_other | off — state AFTER the transition
      add :resulting_state, :string, null: false
      # call | account — mirrors the Assist consent scope that caused it
      add :scope, :string, null: false, default: "call"

      timestamps(type: :utc_datetime_usec, updated_at: false)
    end

    create index(:call_graphing_events, [:call_id, :inserted_at])
  end
end
