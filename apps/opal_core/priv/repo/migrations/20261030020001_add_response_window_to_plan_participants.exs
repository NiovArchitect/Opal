defmodule OpalCore.Repo.Migrations.AddResponseWindowToPlanParticipants do
  @moduledoc """
  P14 (Founder Polish Wave) - additive only: the creator-opt-in
  response window is data on the request (the PlanParticipant row).
  Both columns nullable; nil = no window was ever set on this request.
  No existing column, row, or meaning changes.
  """
  use Ecto.Migration

  def change do
    alter table(:plan_participants) do
      add :response_window_seconds, :integer
      add :response_window_closes_at, :utc_datetime_usec
    end
  end
end
